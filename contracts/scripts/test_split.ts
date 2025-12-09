import { ethers } from "hardhat";

async function main() {
    const [admin] = await ethers.getSigners();
    console.log("Testing Split with account:", admin.address);

    const platformTokenAddress = "0x4B81Df87b1e782aae8a3C5520704EBbD9662cfF3";
    // Deploy Fresh ConditionalTokens
    console.log("Deploying Fresh ConditionalTokens...");
    const CTFactory = await ethers.getContractFactory("ConditionalTokens");
    const conditionalTokens = await CTFactory.deploy();
    await conditionalTokens.waitForDeployment();
    const conditionalTokensAddress = await conditionalTokens.getAddress();
    console.log("Fresh ConditionalTokens deployed to:", conditionalTokensAddress);

    const platformToken = await ethers.getContractAt("PlatformToken", platformTokenAddress);

    // 1. Prepare Condition
    const oracle = admin.address;
    const questionId = ethers.keccak256(ethers.toUtf8Bytes("Test Split " + Date.now()));
    const outcomeSlotCount = 2;

    console.log("Preparing condition...");
    const tx = await conditionalTokens.prepareCondition(oracle, questionId, outcomeSlotCount);
    const receipt = await tx.wait();

    const event = receipt.logs.find((log: any) => {
        try {
            return conditionalTokens.interface.parseLog(log)?.name === "ConditionPrepared";
        } catch (e) { return false; }
    });
    const realConditionId = conditionalTokens.interface.parseLog(event!)?.args[0];
    console.log(`Real Condition ID: ${realConditionId}`);

    // Calculate Condition ID manually
    // keccak256(abi.encodePacked(oracle, questionId, outcomeSlotCount))
    const conditionId = ethers.solidityPackedKeccak256(
        ["address", "bytes32", "uint256"],
        [oracle, questionId, outcomeSlotCount]
    );
    console.log("Calculated ID:", conditionId);

    if (realConditionId !== conditionId) {
        console.error("Condition ID Mismatch!");
        // Use real ID
    }

    const useId = realConditionId || conditionId;

    console.log("Waiting 5 seconds...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check Condition
    const condition = await conditionalTokens.conditions(useId);
    console.log(`Condition Oracle: ${condition[0]}`);
    console.log(`Condition QuestionId: ${condition[1]}`);
    console.log(`Condition Slots: ${condition[2]}`);

    if (condition[0] === ethers.ZeroAddress) {
        console.error("Condition NOT prepared!");
        process.exit(1);
    }

    // 2. Approve USDC
    const amount = ethers.parseUnits("10", 6);
    console.log("Approving USDC...");
    await platformToken.approve(conditionalTokensAddress, amount);

    // Test TransferFrom manually (Admin -> Admin)
    console.log("Testing Manual TransferFrom (Admin -> Admin)...");
    await platformToken.approve(admin.address, amount);
    await platformToken.transferFrom(admin.address, admin.address, amount);
    console.log("Manual TransferFrom (Admin -> Admin) worked");

    // Test TransferFrom (Admin -> ConditionalTokens) - This requires Admin to be spender?
    // No, ConditionalTokens calls it. We can't simulate ConditionalTokens calling it unless we are ConditionalTokens.
    // But we can check if Admin can transfer to ConditionalTokens.
    await platformToken.transfer(conditionalTokensAddress, amount);
    console.log("Manual Transfer (Admin -> ConditionalTokens) worked");

    // 3. Split Position
    console.log("Splitting Position...");
    try {
        await conditionalTokens.splitPosition.staticCall(platformTokenAddress, useId, amount);
        console.log("Static Call Successful!");
        await conditionalTokens.splitPosition(platformTokenAddress, useId, amount, { gasLimit: 500000 });
        console.log("Split Successful!");
    } catch (e) {
        console.error("Split Failed:", e);
        // Try with 0 amount
        console.log("Trying with 0 amount...");
        try {
            await conditionalTokens.splitPosition.staticCall(platformTokenAddress, useId, 0);
            console.log("Static Call 0 Successful!");
            await conditionalTokens.splitPosition(platformTokenAddress, useId, 0);
            console.log("Split with 0 worked!");
        } catch (e2) {
            console.error("Split 0 Failed:", e2);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
