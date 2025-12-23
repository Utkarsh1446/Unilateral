import { ethers } from "hardhat";

/**
 * Auto-resolve expired BTC markets using oracle
 * Finds all unresolved markets where endTime has passed and resolves them
 * 
 * Usage: npx hardhat run scripts/auto_resolve_markets.ts --network baseSepolia
 * 
 * Can be run as a cron job every 5-10 minutes
 */

async function main() {
    console.log("🔍 Auto-Resolving Expired BTC Markets\n");

    const [deployer] = await ethers.getSigners();
    console.log("Resolving with account:", deployer.address);

    // Get factory contract
    const FACTORY_ADDRESS = process.env.BTC_FACTORY_ADDRESS || "";
    if (!FACTORY_ADDRESS) {
        throw new Error("Please set BTC_FACTORY_ADDRESS in .env");
    }

    const factory = await ethers.getContractAt("BTCMarketFactory", FACTORY_ADDRESS);
    console.log("Factory address:", FACTORY_ADDRESS);

    // Get current timestamp
    const now = Math.floor(Date.now() / 1000);
    console.log("Current time:", new Date().toISOString());
    console.log("Current timestamp:", now, "\n");

    // Get all market IDs
    const allMarketIds = await factory.getAllMarketIds();
    console.log(`📊 Total markets: ${allMarketIds.length}\n`);

    // Find markets that need resolution
    const marketsToResolve: string[] = [];

    for (const marketId of allMarketIds) {
        const market = await factory.getMarket(marketId);

        // Check if market is unresolved and past end time
        if (!market.resolved && market.endTime <= now) {
            marketsToResolve.push(marketId);
            const endTime = new Date(Number(market.endTime) * 1000);
            console.log(`⏰ Market ${marketId.substring(0, 10)}... expired at ${endTime.toISOString()}`);
        }
    }

    if (marketsToResolve.length === 0) {
        console.log("✅ No markets need resolution at this time");
        return;
    }

    console.log(`\n🔧 Resolving ${marketsToResolve.length} markets...\n`);

    const results = {
        successful: 0,
        failed: 0,
        errors: [] as any[]
    };

    for (const marketId of marketsToResolve) {
        try {
            console.log(`Resolving ${marketId.substring(0, 10)}...`);

            const tx = await factory.resolveBTCMarket(marketId);
            const receipt = await tx.wait();

            // Extract resolution details from event
            const event = receipt?.logs.find((log: any) => {
                try {
                    const parsed = factory.interface.parseLog(log);
                    return parsed?.name === "BTCMarketResolved";
                } catch {
                    return false;
                }
            });

            if (event) {
                const parsed = factory.interface.parseLog(event);
                const endPrice = parsed?.args[2];
                const outcome = parsed?.args[3];

                const outcomeText = outcome === 0n ? "UP ⬆️" : "DOWN ⬇️";
                const priceUSD = Number(endPrice) / 1e8;

                console.log(`   ✅ Resolved: ${outcomeText} (End price: $${priceUSD.toLocaleString()})`);
                results.successful++;
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error: any) {
            console.log(`   ❌ Failed: ${error.message}`);
            results.failed++;
            results.errors.push({
                marketId,
                error: error.message
            });

            // Continue with next market even if one fails
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`✅ Successfully resolved: ${results.successful}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log("=".repeat(60));

    if (results.errors.length > 0) {
        console.log("\n⚠️  Errors:");
        results.errors.forEach(({ marketId, error }) => {
            console.log(`   ${marketId.substring(0, 10)}...: ${error}`);
        });
    }

    // Save results to file
    const fs = require("fs");
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = `resolution_results_${timestamp}.json`;
    fs.writeFileSync(
        outputFile,
        JSON.stringify({
            timestamp: new Date().toISOString(),
            totalProcessed: marketsToResolve.length,
            ...results
        }, null, 2)
    );

    console.log(`\n📝 Results saved to: ${outputFile}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
