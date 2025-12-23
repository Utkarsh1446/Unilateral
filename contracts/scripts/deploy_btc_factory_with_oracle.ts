import { ethers } from "hardhat";

/**
 * Deploy BTCMarketFactory with Oracle Integration
 * Updated to include PythPriceOracle contract parameter
 */

async function main() {
    console.log("🚀 Deploying BTCMarketFactory with Oracle Integration...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    // Existing contract addresses
    const CONDITIONAL_TOKENS = "0xE60AC9b3Bdb8161aD1276519F2b47C45cFeA3E83";
    const PLATFORM_TOKEN = "0xC59FD3678fCCB26284f763832579463AED36304D";
    const ORDERBOOK = "0x54fC379D88bF6be411E1F4719fAF4bC84725616A";
    const PRICE_ORACLE_BACKEND = deployer.address; // Backend service address

    // Newly deployed oracle contract
    const PRICE_ORACLE_CONTRACT = "0xF883074b12C2C2F4B8dd2334ad90C792AF04c37E";

    console.log("Using contract addresses:");
    console.log("  ConditionalTokens:", CONDITIONAL_TOKENS);
    console.log("  PlatformToken (USDC):", PLATFORM_TOKEN);
    console.log("  OrderBook:", ORDERBOOK);
    console.log("  PriceOracle Backend:", PRICE_ORACLE_BACKEND);
    console.log("  PriceOracle Contract:", PRICE_ORACLE_CONTRACT);
    console.log();

    // Deploy BTCMarketFactory
    console.log("📦 Deploying BTCMarketFactory...");
    const BTCMarketFactory = await ethers.getContractFactory("BTCMarketFactory");
    const factory = await BTCMarketFactory.deploy(
        CONDITIONAL_TOKENS,
        PLATFORM_TOKEN,
        ORDERBOOK,
        PRICE_ORACLE_BACKEND,
        PRICE_ORACLE_CONTRACT  // ← New parameter
    );

    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();

    console.log("✅ BTCMarketFactory deployed to:", factoryAddress);

    // Save deployment info
    const deploymentInfo = {
        network: "baseSepolia",
        BTCMarketFactory: factoryAddress,
        ConditionalTokens: CONDITIONAL_TOKENS,
        PlatformToken: PLATFORM_TOKEN,
        OrderBook: ORDERBOOK,
        PriceOracleBackend: PRICE_ORACLE_BACKEND,
        PriceOracleContract: PRICE_ORACLE_CONTRACT,
        deployedAt: new Date().toISOString(),
        deployer: deployer.address
    };

    console.log("\n" + "=".repeat(60));
    console.log("📄 Deployment Summary");
    console.log("=".repeat(60));
    console.log(JSON.stringify(deploymentInfo, null, 2));
    console.log("=".repeat(60));

    console.log("\n📋 Next Steps:");
    console.log("1. Fund factory with USDC for liquidity seeding:");
    console.log(`   npx hardhat run scripts/fund_factory_usdc.ts --network baseSepolia`);
    console.log("\n2. Create a test market:");
    console.log(`   BTC_FACTORY_ADDRESS=${factoryAddress} npx hardhat run scripts/create_btc_market_manual.ts --network baseSepolia`);
    console.log("\n3. Verify contracts on BaseScan:");
    console.log(`   npx hardhat verify --network baseSepolia ${factoryAddress} "${CONDITIONAL_TOKENS}" "${PLATFORM_TOKEN}" "${ORDERBOOK}" "${PRICE_ORACLE_BACKEND}" "${PRICE_ORACLE_CONTRACT}"`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
