import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Deploying Guessly Contracts with Trading Fees...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    // 1. Deploy AdminController
    console.log("📋 Deploying AdminController...");
    const AdminController = await ethers.getContractFactory("AdminController");
    const adminController = await AdminController.deploy();
    await adminController.waitForDeployment();
    const adminControllerAddress = await adminController.getAddress();
    console.log("✅ AdminController deployed to:", adminControllerAddress);

    // 2. Deploy PlatformToken (USDC mock)
    console.log("\n💰 Deploying PlatformToken (USDC)...");
    const PlatformToken = await ethers.getContractFactory("PlatformToken");
    const platformToken = await PlatformToken.deploy();
    await platformToken.waitForDeployment();
    const platformTokenAddress = await platformToken.getAddress();
    console.log("✅ PlatformToken deployed to:", platformTokenAddress);

    // 3. Deploy ConditionalTokens
    console.log("\n🎲 Deploying ConditionalTokens...");
    const ConditionalTokens = await ethers.getContractFactory("ConditionalTokens");
    const conditionalTokens = await ConditionalTokens.deploy();
    await conditionalTokens.waitForDeployment();
    const conditionalTokensAddress = await conditionalTokens.getAddress();
    console.log("✅ ConditionalTokens deployed to:", conditionalTokensAddress);

    // 4. Deploy VirtualToken
    console.log("\n🌐 Deploying VirtualToken...");
    const VirtualToken = await ethers.getContractFactory("VirtualToken");
    const virtualToken = await VirtualToken.deploy();
    await virtualToken.waitForDeployment();
    const virtualTokenAddress = await virtualToken.getAddress();
    console.log("✅ VirtualToken deployed to:", virtualTokenAddress);

    // 5. Deploy CreatorShareFactory
    console.log("\n👥 Deploying CreatorShareFactory...");
    const feeCollector = deployer.address; // Platform fee collector
    const CreatorShareFactory = await ethers.getContractFactory("CreatorShareFactory");
    const creatorShareFactory = await CreatorShareFactory.deploy(feeCollector, platformTokenAddress, adminControllerAddress);
    await creatorShareFactory.waitForDeployment();
    const creatorShareFactoryAddress = await creatorShareFactory.getAddress();
    console.log("✅ CreatorShareFactory deployed to:", creatorShareFactoryAddress);

    // 6. Deploy OpinionMarketFactory
    console.log("\n🏭 Deploying OpinionMarketFactory...");
    const oracle = deployer.address; // Oracle address
    const OpinionMarketFactory = await ethers.getContractFactory("OpinionMarketFactory");
    const opinionMarketFactory = await OpinionMarketFactory.deploy(
        conditionalTokensAddress,
        virtualTokenAddress,
        platformTokenAddress,
        oracle,
        feeCollector,
        creatorShareFactoryAddress,
        adminControllerAddress
    );
    await opinionMarketFactory.waitForDeployment();
    const opinionMarketFactoryAddress = await opinionMarketFactory.getAddress();
    console.log("✅ OpinionMarketFactory deployed to:", opinionMarketFactoryAddress);

    // 7. Grant Roles
    console.log("\n🔐 Granting roles...");

    // Grant SIGNER_ROLE to deployer for market creation signatures
    const SIGNER_ROLE = await adminController.SIGNER_ROLE();
    await adminController.grantRole(SIGNER_ROLE, deployer.address);
    console.log("✅ Granted SIGNER_ROLE to deployer");

    // Grant MARKET_ROLE to OpinionMarketFactory for virtual token management
    const MARKET_ROLE = await virtualToken.MARKET_ROLE();
    await virtualToken.grantRole(MARKET_ROLE, opinionMarketFactoryAddress);
    console.log("✅ Granted MARKET_ROLE to OpinionMarketFactory");

    // 8. Summary
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log("\n📝 Contract Addresses:\n");
    console.log("AdminController:        ", adminControllerAddress);
    console.log("PlatformToken (USDC):   ", platformTokenAddress);
    console.log("ConditionalTokens:      ", conditionalTokensAddress);
    console.log("VirtualToken:           ", virtualTokenAddress);
    console.log("CreatorShareFactory:    ", creatorShareFactoryAddress);
    console.log("OpinionMarketFactory:   ", opinionMarketFactoryAddress);
    console.log("\n💡 Fee Configuration:");
    console.log("Platform Fee Collector: ", feeCollector);
    console.log("Trading Fee:            ", "1.5% (0.75% platform + 0.75% creator)");
    console.log("\n📋 Update these addresses in:");
    console.log("  - frontend/src/lib/contracts.ts");
    console.log("  - backend/.env (if needed)");
    console.log("\n" + "=".repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
