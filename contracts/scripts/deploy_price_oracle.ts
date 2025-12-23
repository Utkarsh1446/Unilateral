import { ethers } from "hardhat";

/**
 * Deploy PythPriceOracle contract for Base Sepolia
 * 
 * Pyth Network on Base Sepolia:
 * - Pyth Contract: 0xA2aa501b19aff244D90cc15a4Cf739D2725B5729
 * - BTC/USD Price Feed ID: 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43
 */

async function main() {
    console.log("🚀 Deploying PythPriceOracle to Base Sepolia...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    // Pyth Network addresses for Base Sepolia
    const PYTH_CONTRACT = "0xA2aa501b19aff244D90cc15a4Cf739D2725B5729";
    const BTC_USD_PRICE_ID = "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";

    // Deploy PythPriceOracle
    console.log("📡 Deploying PythPriceOracle...");
    const PythPriceOracle = await ethers.getContractFactory("PythPriceOracle");
    const oracle = await PythPriceOracle.deploy(PYTH_CONTRACT, BTC_USD_PRICE_ID);
    await oracle.waitForDeployment();

    const oracleAddress = await oracle.getAddress();
    console.log("✅ PythPriceOracle deployed to:", oracleAddress);

    // Test oracle by fetching current price
    console.log("\n🧪 Testing oracle...");
    try {
        const currentPrice = await oracle.getCurrentPrice();
        const priceInUSD = Number(currentPrice) / 1e8;
        console.log("✅ Current BTC price:", priceInUSD.toLocaleString(), "USD");
    } catch (error: any) {
        console.log("⚠️  Warning: Could not fetch current price:", error.message);
        console.log("   This is normal if Pyth doesn't have recent data on testnet");
    }

    // Save deployment info
    console.log("\n📝 Deployment Summary:");
    console.log("=".repeat(60));
    console.log("PythPriceOracle:", oracleAddress);
    console.log("Pyth Contract:", PYTH_CONTRACT);
    console.log("BTC/USD Feed ID:", BTC_USD_PRICE_ID);
    console.log("=".repeat(60));

    console.log("\n📋 Next Steps:");
    console.log("1. Update BTCMarketFactory with oracle address:");
    console.log(`   await factory.setPriceOracleContract("${oracleAddress}")`);
    console.log("\n2. Or redeploy factory with oracle in constructor");
    console.log("\n3. Verify contract on BaseScan:");
    console.log(`   npx hardhat verify --network baseSepolia ${oracleAddress} "${PYTH_CONTRACT}" "${BTC_USD_PRICE_ID}"`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
