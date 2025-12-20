import { ethers } from "hardhat";

/**
 * Quick test script to verify BTC markets setup before deployment
 */
async function main() {
    console.log("🔍 BTC Markets Pre-Deployment Check\n");

    const [deployer] = await ethers.getSigners();
    console.log("✅ Deployer account:", deployer.address);

    // Check balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "ETH");

    if (balance < ethers.parseEther("0.01")) {
        console.log("⚠️  Warning: Low balance. You may need more ETH for deployment.");
    }

    // Check contract addresses
    const CONDITIONAL_TOKENS = "0xE60AC9b3Bdb8161aD1276519F2b47C45cFeA3E83";
    const PLATFORM_TOKEN = "0xC59FD3678fCCB26284f763832579463AED36304D";
    const ORDERBOOK = "0x54fC379D88bF6be411E1F4719fAF4bC84725616A";

    console.log("\n📋 Contract Addresses:");
    console.log("  ConditionalTokens:", CONDITIONAL_TOKENS);
    console.log("  PlatformToken:", PLATFORM_TOKEN);
    console.log("  OrderBook:", ORDERBOOK);

    // Verify contracts exist
    const ctCode = await ethers.provider.getCode(CONDITIONAL_TOKENS);
    const ptCode = await ethers.provider.getCode(PLATFORM_TOKEN);
    const obCode = await ethers.provider.getCode(ORDERBOOK);

    console.log("\n🔍 Contract Verification:");
    console.log("  ConditionalTokens:", ctCode !== "0x" ? "✅ Deployed" : "❌ Not found");
    console.log("  PlatformToken:", ptCode !== "0x" ? "✅ Deployed" : "❌ Not found");
    console.log("  OrderBook:", obCode !== "0x" ? "✅ Deployed" : "❌ Not found");

    // Test Binance API
    console.log("\n🌐 Testing Binance API...");
    try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
        const data = await response.json();
        const price = parseFloat(data.price);
        console.log("  Current BTC Price: $" + price.toLocaleString('en-US', { minimumFractionDigits: 2 }));
        console.log("  ✅ Binance API working");
    } catch (error) {
        console.log("  ❌ Binance API failed:", error);
    }

    console.log("\n✅ Pre-deployment check complete!");
    console.log("\nNext steps:");
    console.log("1. Run: npx hardhat run scripts/deploy_btc_factory.ts --network baseSepolia");
    console.log("2. Update backend .env with BTC_FACTORY_ADDRESS");
    console.log("3. Run database migration");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
