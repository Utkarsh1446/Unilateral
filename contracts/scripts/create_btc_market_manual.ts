import { ethers } from "hardhat";

/**
 * Manually create a single BTC market for testing
 * Updated to work with dynamic strike prices (no startPrice parameter)
 * 
 * Usage: npx hardhat run scripts/create_btc_market_manual.ts --network baseSepolia
 */

async function main() {
    console.log("🚀 Creating BTC Market Manually\n");

    const [signer] = await ethers.getSigners();
    console.log("Signer:", signer.address);

    // Contract addresses (update these with your deployed addresses)
    const FACTORY_ADDRESS = process.env.BTC_FACTORY_ADDRESS || "";
    const USDC_ADDRESS = process.env.USDC_ADDRESS || "";

    if (!FACTORY_ADDRESS || !USDC_ADDRESS) {
        throw new Error("Please set BTC_FACTORY_ADDRESS and USDC_ADDRESS in .env");
    }

    const factory = await ethers.getContractAt("BTCMarketFactory", FACTORY_ADDRESS);
    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);

    console.log("Factory:", FACTORY_ADDRESS);
    console.log("USDC:", USDC_ADDRESS);

    // Market parameters
    const INTERVAL = 15; // 15 minutes

    // Create market starting 5 minutes from now
    const now = Math.floor(Date.now() / 1000);
    const startTime = now + (5 * 60); // 5 minutes from now
    const endTime = startTime + (INTERVAL * 60);

    console.log("\n📊 Market Parameters:");
    console.log("Interval:", INTERVAL, "minutes");
    console.log("Start time:", new Date(startTime * 1000).toISOString());
    console.log("End time:", new Date(endTime * 1000).toISOString());
    console.log("Note: Strike price will be determined at start time by oracle\n");

    // Check if factory has enough USDC for liquidity seeding
    const factoryBalance = await usdc.balanceOf(FACTORY_ADDRESS);
    const requiredLiquidity = ethers.parseUnits("10000", 6); // 10k USDC

    console.log("Factory USDC balance:", ethers.formatUnits(factoryBalance, 6));
    console.log("Required for seeding:", ethers.formatUnits(requiredLiquidity, 6));

    if (factoryBalance < requiredLiquidity) {
        console.log("\n⚠️  Warning: Factory doesn't have enough USDC for liquidity seeding");
        console.log("You may need to fund the factory first:");
        console.log(`   await usdc.transfer("${FACTORY_ADDRESS}", "${requiredLiquidity}")`);
        console.log("\nProceeding anyway (liquidity seeding may fail)...\n");
    }

    // Create market
    console.log("Creating market...");
    const tx = await factory.createBTCMarket(INTERVAL, startTime);
    console.log("Transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");

    // Extract market details from event
    let marketId = null;
    let marketAddress = null;

    for (const log of receipt?.logs || []) {
        try {
            const parsed = factory.interface.parseLog(log);
            if (parsed && parsed.name === "BTCMarketCreated") {
                marketId = parsed.args[0];
                marketAddress = parsed.args[1];
                break;
            }
        } catch (e) { }
    }

    if (!marketId || !marketAddress) {
        throw new Error("Market creation event not found");
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ BTC Market Created Successfully!");
    console.log("=".repeat(60));
    console.log("Market ID:", marketId);
    console.log("Market Address:", marketAddress);
    console.log("Start Time:", new Date(startTime * 1000).toISOString());
    console.log("End Time:", new Date(endTime * 1000).toISOString());
    console.log("Strike Price: Will be locked at start time");
    console.log("=".repeat(60));

    console.log("\n📋 Next Steps:");
    console.log("1. Wait for market to start (5 minutes)");
    console.log("2. Oracle will lock the strike price at start time");
    console.log("3. Users can trade during the 15-minute window");
    console.log("4. After end time, run auto_resolve_markets.ts to resolve");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
