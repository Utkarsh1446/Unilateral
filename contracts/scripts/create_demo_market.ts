import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Creating market with account:", deployer.address);

    const factoryAddress = "0x1AD5617dEcdd32620200A416223F1eE009b42555"; // From walkthrough
    const factory = await ethers.getContractAt("OpinionMarketFactory", factoryAddress);

    const questionId = ethers.id("Will Ethereum reach $10,000 by Q4 2025? " + Date.now());
    const initialLiquidity = ethers.parseUnits("100", 18);
    const feeAmount = 0; // Free for demo
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    const chainId = (await ethers.provider.getNetwork()).chainId;

    // Generate Signature
    // Hash: address user, bytes32 questionId, uint256 initialLiquidity, uint256 feeAmount, uint256 deadline, uint256 chainId
    const hash = ethers.solidityPackedKeccak256(
        ["address", "bytes32", "uint256", "uint256", "uint256", "uint256"],
        [deployer.address, questionId, initialLiquidity, feeAmount, deadline, chainId]
    );

    const signature = await deployer.signMessage(ethers.getBytes(hash));

    console.log("Creating market...");
    const tx = await factory.createMarket(
        questionId,
        initialLiquidity,
        feeAmount,
        deadline,
        signature
    );

    const receipt = await tx.wait();

    let marketAddress;
    for (const log of receipt.logs) {
        try {
            const parsed = factory.interface.parseLog(log);
            if (parsed && parsed.name === "MarketCreated") {
                marketAddress = parsed.args[0];
                break;
            }
        } catch (e) {
            // Ignore logs that don't match
        }
    }

    console.log("Demo Market Deployed to:", marketAddress);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
