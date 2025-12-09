import { ethers } from "hardhat";

const CREATOR_SHARE_ADDRESS = "0x8bcdc1ecd70d6f467caa92398ad1e03f3453e0a4";
const ORDERBOOK_ADDRESS = "0x1e7882245FD38eC478f32FF1DA142A9802312c36";
const CREATOR_SHARE_FACTORY = "0x015f90Ad13286b87E771AD7fe969d4a0690418F0";
const CREATOR_ADDRESS = "0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf"; // Rugbusters creator wallet

async function main() {
    console.log("=== Investigating Dividend Issue ===\n");

    // Check if the creator is registered in the factory
    const factory = await ethers.getContractAt("CreatorShareFactory", CREATOR_SHARE_FACTORY);

    console.log("1. Checking CreatorShareFactory mapping...");
    const registeredShare = await factory.creatorToShare(CREATOR_ADDRESS);
    console.log("   Creator:", CREATOR_ADDRESS);
    console.log("   Registered CreatorShare:", registeredShare);
    console.log("   Expected CreatorShare:", CREATOR_SHARE_ADDRESS);
    console.log("   Match:", registeredShare.toLowerCase() === CREATOR_SHARE_ADDRESS.toLowerCase() ? "✅ YES" : "❌ NO");

    // Check the OrderBook's CreatorShareFactory
    console.log("\n2. Checking OrderBook's factory reference...");
    const orderBook = await ethers.getContractAt("OrderBook", ORDERBOOK_ADDRESS);
    const obFactory = await orderBook.creatorShareFactory();
    console.log("   OrderBook's Factory:", obFactory);
    console.log("   Expected Factory:", CREATOR_SHARE_FACTORY);
    console.log("   Match:", obFactory.toLowerCase() === CREATOR_SHARE_FACTORY.toLowerCase() ? "✅ YES" : "❌ NO");

    // Check the market creator
    const MARKET_ADDRESS = "0x82B84F35aAC546d32C7E94c56CEb769e0eD8A422"; // Jake Paul market
    console.log("\n3. Checking market creator...");
    const market = await ethers.getContractAt("OpinionMarket", MARKET_ADDRESS);
    const marketCreator = await market.creator();
    console.log("   Market Address:", MARKET_ADDRESS);
    console.log("   Market Creator:", marketCreator);
    console.log("   Is Rugbusters?:", marketCreator.toLowerCase() === CREATOR_ADDRESS.toLowerCase() ? "✅ YES" : "❌ NO");

    // Check recent DividendsDeposited events
    console.log("\n4. Checking DividendsDeposited events on CreatorShare...");
    const creatorShare = await ethers.getContractAt("CreatorShare", CREATOR_SHARE_ADDRESS);
    const filter = creatorShare.filters.DividendsDeposited();
    const events = await creatorShare.queryFilter(filter, -100000); // Last 100k blocks
    console.log("   DividendsDeposited events found:", events.length);
    if (events.length > 0) {
        events.slice(-5).forEach((e, i) => {
            console.log(`   Event ${i + 1}: amount=${e.args?.amount}, dividendsPerShare=${e.args?.dividendsPerShare}`);
        });
    }

    // Check the 81 USDC - where did it come from?
    console.log("\n5. Checking USDC transfer events to CreatorShare...");
    const usdc = await ethers.getContractAt("IERC20", "0xC59FD3678fCCB26284f763832579463AED36304D");
    const transferFilter = usdc.filters.Transfer(null, CREATOR_SHARE_ADDRESS);
    const transfers = await usdc.queryFilter(transferFilter, -100000);
    console.log("   USDC Transfer events to CreatorShare:", transfers.length);
    transfers.slice(-5).forEach((e, i) => {
        console.log(`   Transfer ${i + 1}: from=${e.args?.from}, amount=${ethers.formatUnits(e.args?.value || 0, 6)} USDC`);
    });
}

main().catch(console.error);
