import { ethers } from "hardhat";

const USER_ADDRESS = "0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf";
const CREATOR_SHARE_ADDRESS = "0x8bcdc1ecd70d6f467caa92398ad1e03f3453e0a4";
const ORDERBOOK_ADDRESS = "0x54fC379D88bF6be411E1F4719fAF4bC84725616A";
const USDC_ADDRESS = "0xC59FD3678fCCB26284f763832579463AED36304D";

async function main() {
    console.log("=== Dividend Distribution Debug ===\n");

    // Get CreatorShare contract
    const creatorShare = await ethers.getContractAt("CreatorShare", CREATOR_SHARE_ADDRESS);
    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);

    // Check total dividends deposited
    const totalDividends = await creatorShare.totalDividends();
    console.log("Total Dividends Deposited:", ethers.formatUnits(totalDividends, 6), "USDC");

    // Check dividends per share
    const dividendsPerShare = await creatorShare.dividendsPerShare();
    console.log("Dividends Per Share (scaled):", dividendsPerShare.toString());

    // Check total supply
    const totalSupply = await creatorShare.totalSupply();
    console.log("Total Share Supply:", ethers.formatEther(totalSupply), "shares");

    // Check user's share balance
    const userBalance = await creatorShare.balanceOf(USER_ADDRESS);
    console.log("User Share Balance:", ethers.formatEther(userBalance), "shares");

    // Check user's unclaimed dividends
    const userUnclaimed = await creatorShare.unclaimedDividends(USER_ADDRESS);
    console.log("User Unclaimed Dividends:", ethers.formatUnits(userUnclaimed, 6), "USDC");

    // Check user's last dividend points
    const userLastPoints = await creatorShare.lastDividendPoints(USER_ADDRESS);
    console.log("User Last Dividend Points:", userLastPoints.toString());

    // Calculate pending dividends manually
    const pendingCalc = (userBalance * (dividendsPerShare - userLastPoints)) / BigInt(1e18);
    console.log("\nCalculated Pending:", ethers.formatUnits(pendingCalc, 6), "USDC");
    console.log("Total Expected:", ethers.formatUnits(userUnclaimed + pendingCalc, 6), "USDC");

    // Check creator share USDC balance
    const shareUsdcBalance = await usdc.balanceOf(CREATOR_SHARE_ADDRESS);
    console.log("\nCreatorShare USDC Balance:", ethers.formatUnits(shareUsdcBalance, 6), "USDC");

    // Check OrderBook state
    console.log("\n=== OrderBook Fee Settings ===");
    const orderBook = await ethers.getContractAt("OrderBook", ORDERBOOK_ADDRESS);

    try {
        const feeCollector = await orderBook.feeCollector();
        console.log("Fee Collector:", feeCollector);
    } catch (e) {
        console.log("Could not get fee collector");
    }

    // Check if CreatorShareFactory is set
    try {
        const creatorShareFactory = await orderBook.creatorShareFactory();
        console.log("CreatorShare Factory:", creatorShareFactory.address || creatorShareFactory);
    } catch (e) {
        console.log("Could not get CreatorShare factory");
    }

    // Summary
    console.log("\n=== Summary ===");
    if (totalDividends == BigInt(0)) {
        console.log("⚠️  No dividends have been deposited to this CreatorShare contract yet.");
        console.log("   This could mean:");
        console.log("   - No trades have occurred on the creator's markets");
        console.log("   - The creator has no markets with this OrderBook");
        console.log("   - Dividends are going to fallback (creator) due to no shares at trade time");
    } else {
        console.log("✅ Dividends are being deposited correctly!");
        console.log(`   Total Amount: ${ethers.formatUnits(totalDividends, 6)} USDC`);
    }
}

main().catch(console.error);
