import { ethers } from "hardhat";

async function main() {
    console.log("Deploying BTCMarketFactory...");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Get existing contract addresses
    const CONDITIONAL_TOKENS = "0xE60AC9b3Bdb8161aD1276519F2b47C45cFeA3E83";
    const PLATFORM_TOKEN = "0xC59FD3678fCCB26284f763832579463AED36304D";
    const ORDERBOOK = "0x8a4C5c686F6c682b0b7F6e3F8E0F3b3F8E0F3b3F"; // TODO: Update with actual OrderBook address
    const PRICE_ORACLE = deployer.address; // Backend service address (update later)

    // Deploy BTCMarketFactory
    const BTCMarketFactory = await ethers.getContractFactory("BTCMarketFactory");
    const factory = await BTCMarketFactory.deploy(
        CONDITIONAL_TOKENS,
        PLATFORM_TOKEN,
        ORDERBOOK,
        PRICE_ORACLE
    );

    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();

    console.log("✅ BTCMarketFactory deployed to:", factoryAddress);

    // Fund factory with initial USDC for liquidity seeding
    // This would need to be done manually or via script
    console.log("\n📝 Next steps:");
    console.log("1. Fund factory with USDC for liquidity seeding");
    console.log("2. Update PRICE_ORACLE address to backend service");
    console.log("3. Update OrderBook address if needed");
    console.log("4. Verify contract on BaseScan");

    // Save deployment info
    const deploymentInfo = {
        network: "baseSepolia",
        BTCMarketFactory: factoryAddress,
        ConditionalTokens: CONDITIONAL_TOKENS,
        PlatformToken: PLATFORM_TOKEN,
        OrderBook: ORDERBOOK,
        PriceOracle: PRICE_ORACLE,
        deployedAt: new Date().toISOString(),
        deployer: deployer.address
    };

    console.log("\n📄 Deployment Info:");
    console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
