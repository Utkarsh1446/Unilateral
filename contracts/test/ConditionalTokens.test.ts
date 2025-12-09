import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("ConditionalTokens", function () {
    async function deployConditionalTokensFixture() {
        const [owner, user, oracle] = await ethers.getSigners();

        const ConditionalTokens = await ethers.getContractFactory("ConditionalTokens");
        const conditionalTokens = await ConditionalTokens.deploy();

        const PlatformToken = await ethers.getContractFactory("PlatformToken");
        const collateralToken = await PlatformToken.deploy();
        await collateralToken.mint(user.address, ethers.parseEther("1000"));
        await collateralToken.connect(user).approve(await conditionalTokens.getAddress(), ethers.MaxUint256);

        const CTHelpers = await ethers.getContractFactory("CTHelpers");
        const ctHelpers = await CTHelpers.deploy();

        return { conditionalTokens, collateralToken, user, oracle, ctHelpers };
    }

    describe("Conditions", function () {
        it("Should prepare a condition", async function () {
            const { conditionalTokens, oracle } = await loadFixture(deployConditionalTokensFixture);
            const questionId = ethers.keccak256(ethers.toUtf8Bytes("Question 1"));
            const outcomeSlotCount = 2;

            await expect(conditionalTokens.prepareCondition(oracle.address, questionId, outcomeSlotCount))
                .to.emit(conditionalTokens, "ConditionPrepared")
                .withArgs(expect.any(String), oracle.address, questionId, outcomeSlotCount);
        });
    });

    describe("Splitting and Redeeming", function () {
        it("Should split collateral into outcome tokens", async function () {
            const { conditionalTokens, collateralToken, user, oracle } = await loadFixture(deployConditionalTokensFixture);
            const questionId = ethers.keccak256(ethers.toUtf8Bytes("Question 1"));
            const outcomeSlotCount = 2;

            await conditionalTokens.prepareCondition(oracle.address, questionId, outcomeSlotCount);

            // Calculate condition ID manually or fetch from event?
            // We can use the helper library if we linked it or just rely on the contract to calculate it correctly.
            // But splitPosition needs conditionId.
            // Let's get it from the event or calculate it in test.
            // CTHelpers.getConditionId(oracle, questionId, outcomeSlotCount)

            // We can use the deployed CTHelpers to calculate it?
            // Or just replicate the logic: keccak256(abi.encodePacked(oracle, questionId, outcomeSlotCount))
            const conditionId = ethers.solidityPackedKeccak256(
                ["address", "bytes32", "uint256"],
                [oracle.address, questionId, outcomeSlotCount]
            );

            const amount = ethers.parseEther("10");
            await conditionalTokens.connect(user).splitPosition(await collateralToken.getAddress(), conditionId, amount);

            // Check balances of outcome tokens
            // Token ID for outcome 0: CTHelpers.getTokenId(collateralToken, conditionId, 0)
            // Token ID logic: keccak256(abi.encodePacked(collateralToken, conditionId, index))

            const tokenId0 = ethers.solidityPackedKeccak256(
                ["address", "bytes32", "uint256"],
                [await collateralToken.getAddress(), conditionId, 0]
            );
            const tokenId1 = ethers.solidityPackedKeccak256(
                ["address", "bytes32", "uint256"],
                [await collateralToken.getAddress(), conditionId, 1]
            );

            expect(await conditionalTokens.balanceOf(user.address, tokenId0)).to.equal(amount);
            expect(await conditionalTokens.balanceOf(user.address, tokenId1)).to.equal(amount);
        });
    });
});
