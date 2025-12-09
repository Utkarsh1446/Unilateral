import { ethers } from "hardhat";

async function main() {
    console.log("Redeploying CreatorShareFactory with updated CreatorShare...");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Existing addresses from current deployment
    const feeCollectorAddress = "0x8D99A4C5C13885350A9Be5Fa810Deb9f75e7056d";
    const platformTokenAddress = "0xC59FD3678fCCB26284f763832579463AED36304D"; // USDC on Base Sepolia
    const adminControllerAddress = "0x1cCe371908eBEb0ce1A78e9af69D7Bb14D97ec8a";

    // Deploy new CreatorShareFactory
    console.log("Deploying CreatorShareFactory...");
    const CreatorShareFactory = await ethers.getContractFactory("CreatorShareFactory");
    const creatorShareFactory = await CreatorShareFactory.deploy(
        feeCollectorAddress,
        platformTokenAddress,
        adminControllerAddress
    );
    await creatorShareFactory.waitForDeployment();
    const newFactoryAddress = await creatorShareFactory.getAddress();

    console.log("\n========== DEPLOYMENT COMPLETE ==========");
    console.log("NEW CreatorShareFactory:", newFactoryAddress);
    console.log("\n⚠️  UPDATE REQUIRED:");
    console.log("1. Update frontend/src/lib/contracts.ts with new address");
    console.log("2. Update backend .env or config with new address");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
