const hre = require("hardhat");

async function main() {
    // const { CONTRACTS } = require("../frontend/src/lib/contracts.ts");

    // Hardcoding addresses based on previous context or I will read them dynamically if possible.
    // Actually, better to just use the addresses I know or fetch them if I can.
    // Let's rely on the hardcoded values I just saw in contracts.ts or the deployment logs.

    const ORDER_BOOK_ADDRESS = "0x6f669059c93E01f080883a628bBeEcDdE4AFfe5B";
    const FEE_COLLECTOR_ADDRESS = "0x22168eC4d92c050087094A427A84EcDBeD10d672";
    const PLATFORM_TOKEN_ADDRESS = "0xe84a6Cd9CcBbCCB4746cEc1B21283dB503A3b502";

    console.log("Tracking fees...");
    console.log("OrderBook:", ORDER_BOOK_ADDRESS);
    console.log("FeeCollector:", FEE_COLLECTOR_ADDRESS);
    console.log("PlatformToken:", PLATFORM_TOKEN_ADDRESS);

    const OrderBook = await hre.ethers.getContractFactory("OrderBook");
    const orderBook = await OrderBook.attach(ORDER_BOOK_ADDRESS);

    const PlatformToken = await hre.ethers.getContractFactory("PlatformToken");
    const platformToken = await PlatformToken.attach(PLATFORM_TOKEN_ADDRESS);

    // 1. Query FeeCollected events from OrderBook
    console.log("\n--- OrderBook FeeCollected Events ---");
    const feeFilter = orderBook.filters.FeeCollected();
    const feeEvents = await orderBook.queryFilter(feeFilter);

    if (feeEvents.length === 0) {
        console.log("No FeeCollected events found.");
    } else {
        for (const event of feeEvents) {
            console.log(`Block: ${event.blockNumber} | Tx: ${event.transactionHash}`);
            console.log(`  Market: ${event.args.market}`);
            console.log(`  Platform Fee: ${hre.ethers.formatUnits(event.args.platformFee, 6)} USDC`);
            console.log(`  Creator Fee: ${hre.ethers.formatUnits(event.args.creatorFee, 6)} USDC`);
            console.log(`  Dividend Fee: ${hre.ethers.formatUnits(event.args.dividendFee, 6)} USDC`);
            console.log("-----------------------------------");
        }
    }

    // 2. Query Transfer events to FeeCollector
    console.log("\n--- Transfers to FeeCollector ---");
    const transferFilter = platformToken.filters.Transfer(null, FEE_COLLECTOR_ADDRESS);
    const transferEvents = await platformToken.queryFilter(transferFilter);

    if (transferEvents.length === 0) {
        console.log("No transfers to FeeCollector found.");
    } else {
        let totalCollected = 0n;
        for (const event of transferEvents) {
            console.log(`Block: ${event.blockNumber} | Tx: ${event.transactionHash}`);
            console.log(`  From: ${event.args.from}`);
            console.log(`  Amount: ${hre.ethers.formatUnits(event.args.value, 6)} USDC`);
            totalCollected += event.args.value;
            console.log("-----------------------------------");
        }
        console.log(`Total Platform Fees Collected: ${hre.ethers.formatUnits(totalCollected, 6)} USDC`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
