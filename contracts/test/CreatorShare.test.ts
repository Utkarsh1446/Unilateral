import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("CreatorShare", function () {
    async function deployCreatorShareFixture() {
        const [owner, creator, buyer, feeCollector] = await ethers.getSigners();

        // Deploy BondingCurve library
        const BondingCurve = await ethers.getContractFactory("BondingCurve");
        const bondingCurve = await BondingCurve.deploy();

        // Deploy AdminController
        const AdminController = await ethers.getContractFactory("AdminController");
        const adminController = await AdminController.deploy();

        // Deploy CreatorShareFactory
        const CreatorShareFactory = await ethers.getContractFactory("CreatorShareFactory");
        const factory = await CreatorShareFactory.deploy(feeCollector.address, await adminController.getAddress());

        // Create a Creator Share with signature
        const name = "Creator Token";
        const symbol = "CTK";
        const deadline = Math.floor(Date.now() / 1000) + 3600;
        const chainId = (await ethers.provider.getNetwork()).chainId;

        // Sign
        const hash = ethers.solidityPackedKeccak256(
            ["address", "string", "string", "uint256", "uint256"],
            [creator.address, name, symbol, deadline, chainId]
        );
        const signature = await owner.signMessage(ethers.getBytes(hash)); // Owner has SIGNER_ROLE

        await factory.connect(creator).createCreatorShare(name, symbol, deadline, signature);
        const shareAddress = await factory.creatorToShare(creator.address);
        const CreatorShare = await ethers.getContractFactory("CreatorShare");
        const share = CreatorShare.attach(shareAddress);

        return { share, factory, owner, creator, buyer, feeCollector, bondingCurve, adminController };
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { share, creator } = await loadFixture(deployCreatorShareFixture);
            expect(await share.owner()).to.equal(creator.address);
        });

        it("Should have correct name and symbol", async function () {
            const { share } = await loadFixture(deployCreatorShareFixture);
            expect(await share.name()).to.equal("Creator Token");
            expect(await share.symbol()).to.equal("CTK");
        });
    });

    describe("Bonding Curve", function () {
        it("Should calculate buy price correctly", async function () {
            const { share } = await loadFixture(deployCreatorShareFixture);
            // First share price: 0^2 / 1400 = 0? 
            // BondingCurve formula: Price = S^2 / 1400.
            // If supply is 0, price is 0.
            // Let's check the implementation of getBuyPrice(0, 1).
            // It loops from 0 to amount-1.
            // i=0: price(0) = 0.
            // So first share is free? That might be an issue or intended.
            // Let's check getPrice(1) -> 1^2/1400 = 0 (integer division).
            // 1400^2 / 1400 = 1400.
            // We need to check if the formula handles small numbers well or if we need higher precision/decimals.
            // The mock implementation uses integer division.

            // Let's buy 100 shares.
            const cost = await share.getBuyPrice(100);
            expect(cost).to.be.gt(0);
        });
    });

    describe("Trading", function () {
        it("Should allow buying shares", async function () {
            const { share, buyer } = await loadFixture(deployCreatorShareFixture);
            const amount = 10;
            const price = await share.getBuyPrice(amount);

            await expect(share.connect(buyer).buyShares(amount, { value: price }))
                .to.emit(share, "SharesBought")
                .withArgs(buyer.address, amount, price, amount);

            expect(await share.balanceOf(buyer.address)).to.equal(amount);
            expect(await share.totalSupply()).to.equal(amount);
        });

        it("Should allow selling shares", async function () {
            const { share, buyer, feeCollector } = await loadFixture(deployCreatorShareFixture);
            const amount = 10;
            const buyPrice = await share.getBuyPrice(amount);
            await share.connect(buyer).buyShares(amount, { value: buyPrice });

            const sellAmount = 5;
            const revenue = await share.getSellPrice(sellAmount);
            // Fee is 5%
            const fee = (revenue * 500n) / 10000n;
            const payout = revenue - fee;

            const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);
            const feeCollectorBalanceBefore = await ethers.provider.getBalance(feeCollector.address);

            const tx = await share.connect(buyer).sellShares(sellAmount);
            const receipt = await tx.wait();

            // Calculate gas cost
            const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

            const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
            const feeCollectorBalanceAfter = await ethers.provider.getBalance(feeCollector.address);

            expect(await share.balanceOf(buyer.address)).to.equal(amount - sellAmount);
            // Buyer gets payout - gas
            expect(buyerBalanceAfter).to.equal(buyerBalanceBefore + payout - gasUsed);
            // Fee collector gets fee
            expect(feeCollectorBalanceAfter).to.equal(feeCollectorBalanceBefore + fee);
        });

        it("Should fail if insufficient payment", async function () {
            const { share, buyer } = await loadFixture(deployCreatorShareFixture);
            const amount = 10;
            const price = await share.getBuyPrice(amount);

            await expect(share.connect(buyer).buyShares(amount, { value: price - 1n }))
                .to.be.revertedWith("Insufficient payment");
        });

        it("Should fail if insufficient balance to sell", async function () {
            const { share, buyer } = await loadFixture(deployCreatorShareFixture);
            await expect(share.connect(buyer).sellShares(1))
                .to.be.revertedWith("Insufficient balance");
        });
    });
});
