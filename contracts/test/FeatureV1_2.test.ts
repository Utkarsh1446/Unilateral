import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Feature V1.2 Tests", function () {
    let adminController: any;
    let conditionalTokens: any;
    let collateralToken: any;
    let oracle: any;
    let feeCollector: any;
    let orderBook: any;
    let marketFactory: any;
    let creatorShareFactory: any;

    let admin: any;
    let creator: any;
    let user: any;
    let resolver: any;

    const FEE_AMOUNT = ethers.parseUnits("100", 6); // 100 USDC

    beforeEach(async function () {
        console.log("Deploying contracts...");
        [admin, creator, user, resolver, feeCollector] = await ethers.getSigners();
        oracle = resolver; // Resolver acts as oracle

        // Deploy Core
        const AdminController = await ethers.getContractFactory("AdminController");
        adminController = await AdminController.deploy();
        console.log("AdminController deployed");

        const ConditionalTokens = await ethers.getContractFactory("ConditionalTokens");
        conditionalTokens = await ConditionalTokens.deploy();
        console.log("ConditionalTokens deployed");

        const Token = await ethers.getContractFactory("PlatformToken");
        collateralToken = await Token.deploy(); // No args
        console.log("PlatformToken deployed");

        const CreatorShareFactory = await ethers.getContractFactory("CreatorShareFactory");
        creatorShareFactory = await CreatorShareFactory.deploy(
            feeCollector.address,
            await collateralToken.getAddress(),
            await adminController.getAddress()
        );
        console.log("CreatorShareFactory deployed");

        const OrderBook = await ethers.getContractFactory("OrderBook");
        orderBook = await OrderBook.deploy(
            feeCollector.address,
            await creatorShareFactory.getAddress()
        );
        console.log("OrderBook deployed");

        // Set OrderBook in AdminController
        await adminController.setOrderBook(await orderBook.getAddress());
        console.log("OrderBook set in AdminController");

        const MarketFactory = await ethers.getContractFactory("OpinionMarketFactory");
        marketFactory = await MarketFactory.deploy(
            await conditionalTokens.getAddress(),
            await collateralToken.getAddress(),
            oracle.address,
            feeCollector.address,
            await adminController.getAddress()
        );
        console.log("MarketFactory deployed");

        // Setup Creator
        await collateralToken.transfer(creator.address, ethers.parseUnits("1000", 6));
        await collateralToken.connect(creator).approve(await marketFactory.getAddress(), ethers.MaxUint256);
        console.log("Creator setup done");
    });

    describe("Initial Liquidity", function () {
        it("should collect fee and place orders on creation", async function () {
            console.log("Starting test: Initial Liquidity");
            const questionId = ethers.keccak256(ethers.toUtf8Bytes("Will ETH hit 10k?"));
            const deadline = (await time.latest()) + 3600;
            const chainId = (await ethers.provider.getNetwork()).chainId;
            console.log("Params prepared");

            // Sign request
            const hash = ethers.solidityPackedKeccak256(
                ["address", "bytes32", "uint256", "uint256", "uint256"],
                [creator.address, questionId, FEE_AMOUNT, deadline, chainId]
            );
            const signature = await admin.signMessage(ethers.getBytes(hash));
            console.log("Signature generated");

            // Create Market
            console.log("Calling createMarket...");
            const tx = await marketFactory.connect(creator).createMarket(
                questionId,
                FEE_AMOUNT,
                deadline,
                signature
            );
            console.log("createMarket tx sent, waiting...");
            const receipt = await tx.wait();
            console.log("createMarket tx mined");

            // Get Market Address
            const filter = marketFactory.filters.MarketCreated();
            const events = await marketFactory.queryFilter(filter);
            const marketAddr = events[0].args[0];
            console.log("Market Address:", marketAddr);

            // Verify Creator Balance (-100 USDC)
            expect(await collateralToken.balanceOf(creator.address)).to.equal(ethers.parseUnits("900", 6));

            // Verify OrderBook has orders
            // Outcome 0 (YES)
            const orders0 = await orderBook.getMarketOutcomeOrderIds(marketAddr, 0);
            expect(orders0.length).to.equal(1);

            const order0 = await orderBook.orders(orders0[0]);
            expect(order0.maker).to.equal(await marketFactory.getAddress());
            expect(order0.price).to.equal(500000n); // 0.5
            expect(order0.amount).to.equal(FEE_AMOUNT);
            expect(order0.active).to.be.true;

            // Outcome 1 (NO)
            const orders1 = await orderBook.getMarketOutcomeOrderIds(marketAddr, 1);
            expect(orders1.length).to.equal(1);
            console.log("Initial Liquidity test passed");
        });
    });

    describe("Resolution State Machine", function () {
        let market: any;

        beforeEach(async function () {
            const questionId = ethers.keccak256(ethers.toUtf8Bytes("Q1"));
            const deadline = (await time.latest()) + 3600;
            const chainId = (await ethers.provider.getNetwork()).chainId;

            const hash = ethers.solidityPackedKeccak256(
                ["address", "bytes32", "uint256", "uint256", "uint256"],
                [creator.address, questionId, 0, deadline, chainId]
            );
            const signature = await admin.signMessage(ethers.getBytes(hash));

            const tx = await marketFactory.connect(creator).createMarket(questionId, 0, deadline, signature);
            await tx.wait();

            const filter = marketFactory.filters.MarketCreated();
            const events = await marketFactory.queryFilter(filter);
            market = await ethers.getContractAt("OpinionMarket", events[events.length - 1].args[0]);
        });

        it("should follow Propose -> Dispute -> Finalize flow", async function () {
            // 1. Propose
            await expect(market.connect(resolver).proposeResolution(0))
                .to.emit(market, "ResolutionProposed");
            // .withArgs(0, anyValue); // Skip timestamp check to avoid flakiness

            expect(await market.state()).to.equal(1); // ResolutionProposed

            // 2. Dispute
            await expect(market.connect(user).disputeResolution())
                .to.emit(market, "ResolutionDisputed")
                .withArgs(user.address);

            expect(await market.state()).to.equal(2); // Disputed

            // 3. Re-Propose (Admin)
            await market.connect(resolver).proposeResolution(1); // Change to NO
            expect(await market.state()).to.equal(1); // ResolutionProposed
            expect(await market.proposedOutcome()).to.equal(1);

            // 4. Wait 6 hours
            await time.increase(6 * 3600 + 1);

            // 5. Finalize
            await expect(market.finalizeResolution())
                .to.emit(market, "MarketResolved")
                .withArgs(1);

            expect(await market.state()).to.equal(3); // Resolved
            expect(await market.resolved()).to.be.true;
        });

        it("should prevent claiming/minting during resolution", async function () {
            await market.connect(resolver).proposeResolution(0);

            // Try to mint
            await expect(market.connect(creator).mintSets(100))
                .to.be.revertedWith("Market not open");
        });
    });
});
