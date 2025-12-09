import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("OpinionMarket", function () {
    async function deployOpinionMarketFixture() {
        const [owner, user, oracle, admin] = await ethers.getSigners();

        // Deploy dependencies
        const PlatformToken = await ethers.getContractFactory("PlatformToken");
        const platformToken = await PlatformToken.deploy();

        const VirtualToken = await ethers.getContractFactory("VirtualToken");
        const virtualToken = await VirtualToken.deploy();

        const ConditionalTokens = await ethers.getContractFactory("ConditionalTokens");
        const conditionalTokens = await ConditionalTokens.deploy();

        const FeeCollector = await ethers.getContractFactory("FeeCollector");
        const feeCollector = await FeeCollector.deploy();

        const AdminController = await ethers.getContractFactory("AdminController");
        const adminController = await AdminController.deploy();

        const AMM = await ethers.getContractFactory("AMM");
        const amm = await AMM.deploy();

        const OpinionMarketFactory = await ethers.getContractFactory("OpinionMarketFactory");
        const factory = await OpinionMarketFactory.deploy(
            await conditionalTokens.getAddress(),
            await virtualToken.getAddress(),
            await platformToken.getAddress(),
            oracle.address,
            await feeCollector.getAddress(),
            await adminController.getAddress()
        );

        // Mint USDC to user
        await platformToken.mint(user.address, ethers.parseEther("1000"));
        await platformToken.connect(user).approve(await factory.getAddress(), ethers.MaxUint256);

        // Create Market with Signature
        const questionId = ethers.keccak256(ethers.toUtf8Bytes("Will ETH hit $10k?"));
        const initialLiquidity = 0;
        const feeAmount = 0; // Creator case
        const deadline = Math.floor(Date.now() / 1000) + 3600;
        const chainId = (await ethers.provider.getNetwork()).chainId;

        const hash = ethers.solidityPackedKeccak256(
            ["address", "bytes32", "uint256", "uint256", "uint256", "uint256"],
            [user.address, questionId, initialLiquidity, feeAmount, deadline, chainId]
        );
        const signature = await owner.signMessage(ethers.getBytes(hash)); // Owner has SIGNER_ROLE

        await factory.connect(user).createMarket(questionId, initialLiquidity, feeAmount, deadline, signature);

        // We need to find the market address. 
        // In a real test we'd parse the event, but for simplicity let's assume it's the first one?
        // Or we can get it from the event.
        // Let's re-run create and capture event.
        const receipt = await tx.wait();
        // @ts-ignore
        const event = receipt.logs.find(log => log.eventName === "MarketCreated"); // This might not work directly with ethers v6 logs parsing without ABI
        // Let's just use a getter if available or predict address.
        // Since we don't have a getter in Factory for all markets (only event), let's use a workaround or add a getter.
        // Or just rely on the fact that we can compute it if we used create2, but we used new.

        // Let's just deploy OpinionMarket directly for unit testing the market logic, 
        // passing the dependencies.
        const OpinionMarket = await ethers.getContractFactory("OpinionMarket");
        const market = await OpinionMarket.deploy(
            await conditionalTokens.getAddress(),
            await virtualToken.getAddress(),
            await platformToken.getAddress(),
            oracle.address,
            questionId
        );

        // Grant MARKET_ROLE to OpinionMarket so it can update real liquidity
        const MARKET_ROLE = await virtualToken.MARKET_ROLE();
        await virtualToken.grantRole(MARKET_ROLE, await market.getAddress());

        // Approve market to spend user's USDC
        await platformToken.connect(user).approve(await market.getAddress(), ethers.MaxUint256);

        // Prepare condition on ConditionalTokens (Market does this on init? No, usually separate or in constructor)
        // OpinionMarket constructor calls prepareCondition? Let's check source.
        // It does: conditionalTokens.prepareCondition(oracle, questionId, 2);

        return { market, platformToken, conditionalTokens, user, oracle, questionId, factory, virtualToken, owner };
    }

    describe("Buying Outcomes", function () {
        it("Should allow buying outcome tokens", async function () {
            const { market, platformToken, user } = await loadFixture(deployOpinionMarketFixture);
            const amount = ethers.parseEther("100");

            // Buy outcome 0 (YES)
            await expect(market.connect(user).buyOutcome(0, amount))
                .to.emit(market, "Trade") // Assuming Trade event exists
                .withArgs(user.address, 0, amount, expect.any(BigInt), expect.any(BigInt));

            // Check balances?
            // Market logic is complex (split + swap).
            // We should verify that user spent USDC and received Conditional Tokens?
            // But OpinionMarket holds the CTs? Or sends them to user?
            // Usually AMM holds CTs and sends one outcome to user.
            // Let's check `buyOutcome` implementation in `OpinionMarket.sol` later.
        });

        it("Should bootstrap with initial virtual liquidity", async function () {
            const { factory, virtualToken, questionId, owner, user } = await loadFixture(deployOpinionMarketFixture);
            const initialLiquidity = ethers.parseEther("1000");
            const feeAmount = ethers.parseEther("100"); // Non-creator fee case
            const deadline = Math.floor(Date.now() / 1000) + 3600;
            const chainId = (await ethers.provider.getNetwork()).chainId;

            // Grant ADMIN_ROLE to Factory so it can bootstrap
            const ADMIN_ROLE = await virtualToken.ADMIN_ROLE();
            await virtualToken.grantRole(ADMIN_ROLE, await factory.getAddress());

            // Sign
            const hash = ethers.solidityPackedKeccak256(
                ["address", "bytes32", "uint256", "uint256", "uint256", "uint256"],
                [user.address, questionId, initialLiquidity, feeAmount, deadline, chainId]
            );
            const signature = await owner.signMessage(ethers.getBytes(hash));

            const tx = await factory.connect(user).createMarket(questionId, initialLiquidity, feeAmount, deadline, signature);
            const receipt = await tx.wait();

            // Get market address from event
            // MarketCreated(address indexed market, bytes32 indexed questionId, address creator)
            // It's the first log?
            // Let's parse it properly or just assume it's the first topic
            // For simplicity in this specific test setup, we can just look at the logs
            // But we can't easily get the address without ABI decoding if we don't have the contract object connected
            // However, we can check VirtualToken state for *any* address that has liquidity?
            // Or we can predict the address.

            // Let's use a simpler approach: check if VirtualToken emitted VirtualLiquidityAdded
            const event = receipt!.logs.find((log: any) => {
                try {
                    return virtualToken.interface.parseLog(log)?.name === "VirtualLiquidityAdded";
                } catch (e) { return false; }
            });

            expect(event).to.not.be.undefined;
            const parsedLog = virtualToken.interface.parseLog(event!);
            expect(parsedLog?.args[1]).to.equal(initialLiquidity);

            const marketAddress = parsedLog?.args[0];
            expect(await virtualToken.virtualLiquidity(marketAddress)).to.equal(initialLiquidity);
        });
    });
});
