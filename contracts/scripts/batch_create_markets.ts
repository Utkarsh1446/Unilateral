import { ethers } from "hardhat";

/**
 * Batch create BTC markets for the next day
 * Creates 96 markets (one per 15-minute slot)
 * 
 * Usage: npx hardhat run scripts/batch_create_markets.ts --network baseSepolia
 */

async function main() {
    console.log("🚀 Batch Creating BTC Markets for Next Day\n");

    const [deployer] = await ethers.getSigners();
    console.log("Creating markets with account:", deployer.address);

    // Get factory contract
    const FACTORY_ADDRESS = process.env.BTC_FACTORY_ADDRESS || "";
    if (!FACTORY_ADDRESS) {
        throw new Error("Please set BTC_FACTORY_ADDRESS in .env");
    }

    const factory = await ethers.getContractAt("BTCMarketFactory", FACTORY_ADDRESS);
    console.log("Factory address:", FACTORY_ADDRESS);

    // Calculate tomorrow's date at 00:00 UTC
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    const startOfDay = Math.floor(tomorrow.getTime() / 1000);
    console.log("\nCreating markets for:", tomorrow.toISOString());
    console.log("Start timestamp:", startOfDay);

    // Create 96 markets (24 hours * 4 per hour = 96)
    const INTERVAL = 15; // 15 minutes
    const TOTAL_MARKETS = 96;
    const createdMarkets: string[] = [];

    console.log(`\n📊 Creating ${TOTAL_MARKETS} markets...\n`);

    for (let i = 0; i < TOTAL_MARKETS; i++) {
        const startTime = startOfDay + (i * 15 * 60); // Each market starts 15 min after previous
        const marketTime = new Date(startTime * 1000);

        try {
            console.log(`[${i + 1}/${TOTAL_MARKETS}] Creating market for ${marketTime.toISOString().substring(11, 16)} UTC...`);

            const tx = await factory.createBTCMarket(INTERVAL, startTime);
            const receipt = await tx.wait();

            // Extract marketId from event
            const event = receipt?.logs.find((log: any) => {
                try {
                    const parsed = factory.interface.parseLog(log);
                    return parsed?.name === "BTCMarketCreated";
                } catch {
                    return false;
                }
            });

            if (event) {
                const parsed = factory.interface.parseLog(event);
                const marketId = parsed?.args[0];
                createdMarkets.push(marketId);
                console.log(`   ✅ Market created: ${marketId}`);
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error: any) {
            console.log(`   ❌ Failed: ${error.message}`);

            // Continue with next market even if one fails
            if (error.message.includes("Market already exists")) {
                console.log("   ⏭️  Skipping duplicate market");
            }
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`✅ Successfully created ${createdMarkets.length}/${TOTAL_MARKETS} markets`);
    console.log("=".repeat(60));

    // Save market IDs to file
    const fs = require("fs");
    const outputFile = `markets_${tomorrow.toISOString().split('T')[0]}.json`;
    fs.writeFileSync(
        outputFile,
        JSON.stringify({
            date: tomorrow.toISOString(),
            startTimestamp: startOfDay,
            totalMarkets: createdMarkets.length,
            marketIds: createdMarkets
        }, null, 2)
    );

    console.log(`\n📝 Market IDs saved to: ${outputFile}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
