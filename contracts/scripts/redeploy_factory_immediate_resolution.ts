import { ethers } from "hardhat";

async function main() {
    console.log("Redeploying OpinionMarketFactory with updated OpinionMarket...");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Existing contract addresses from frontend/src/lib/contracts.ts
    const CONTRACTS = {
        PlatformToken: "0xC59FD3678fCCB26284f763832579463AED36304D", // USDC
        ConditionalTokens: "0xE60AC9b3Bdb8161aD1276519F2b47C45cFeA3E83",
        FeeCollector: "0x8D99A4C5C13885350A9Be5Fa810Deb9f75e7056d",
        AdminController: "0x1cCe371908eBEb0ce1A78e9af69D7Bb14D97ec8a",
    };

    console.log("\nUsing existing contracts:");
    console.log("PlatformToken:", CONTRACTS.PlatformToken);
    console.log("ConditionalTokens:", CONTRACTS.ConditionalTokens);
    console.log("FeeCollector:", CONTRACTS.FeeCollector);
    console.log("AdminController:", CONTRACTS.AdminController);

    // Deploy new OpinionMarketFactory
    console.log("\nDeploying new OpinionMarketFactory...");
    const OpinionMarketFactory = await ethers.getContractFactory("OpinionMarketFactory");
    const opinionMarketFactory = await OpinionMarketFactory.deploy(
        CONTRACTS.ConditionalTokens,
        CONTRACTS.PlatformToken,
        deployer.address, // Oracle (Admin)
        CONTRACTS.FeeCollector,
        CONTRACTS.AdminController
    );
    await opinionMarketFactory.waitForDeployment();
    const factoryAddress = await opinionMarketFactory.getAddress();
    console.log("✅ OpinionMarketFactory deployed to:", factoryAddress);

    console.log("\n========== DEPLOYMENT COMPLETE ==========");
    console.log("New OpinionMarketFactory:", factoryAddress);
    console.log("==========================================");
    console.log("\n⚠️  IMPORTANT: Update frontend/src/lib/contracts.ts with the new factory address:");
    console.log(`OpinionMarketFactory: "${factoryAddress}"`);
    console.log("\nNew markets created through this factory will have immediate resolution!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
