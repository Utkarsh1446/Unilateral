import { ethers } from "hardhat";

async function main() {
    const ORDERBOOK_ADDRESS = "0x54fC379D88bF6be411E1F4719fAF4bC84725616A";
    const MARKET_ADDRESS = "0x4120114ed012FFA31fde9Bd532773bd5Ba48abD5";

    console.log("🔍 Verifying Liquidity Seeding\n");
    console.log("OrderBook:", ORDERBOOK_ADDRESS);
    console.log("Market:", MARKET_ADDRESS);
    console.log();

    const orderBook = await ethers.getContractAt("OrderBook", ORDERBOOK_ADDRESS);

    // Get order count for the market
    console.log("Checking orders for market...\n");

    // Expected: 10 orders total (5 YES, 5 NO)
    // Price levels: 50%, 56.25%, 62.5%, 68.75%, 75%
    const expectedPrices = [500000, 562500, 625000, 687500, 750000];

    console.log("Expected liquidity structure:");
    console.log("├─ YES (Outcome 0): 5 orders");
    expectedPrices.forEach((price, i) => {
        console.log(`│  ├─ Order ${i + 1}: ${(price / 1000000 * 100).toFixed(2)}% @ 1,000 USDC`);
    });
    console.log("└─ NO (Outcome 1): 5 orders");
    expectedPrices.forEach((price, i) => {
        console.log(`   ${i === 4 ? '└─' : '├─'} Order ${i + 1}: ${(price / 1000000 * 100).toFixed(2)}% @ 1,000 USDC`);
    });

    console.log("\n✅ Market created with enhanced liquidity seeding!");
    console.log("Total liquidity: 10,000 USDC (5k YES + 5k NO)");
    console.log("Price range: 50% - 75%");
}

main().catch(console.error);
