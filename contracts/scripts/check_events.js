const hre = require("hardhat");

async function main() {
    const orderBookAddress = "0xd1C82bcD66dd6724fCE6Ac8D1aB37703Bd08ffa9";
    const marketAddress = "0xfe22B1Bf2B4fe02b392A1882A25C2b45E8B5c2Ac";

    const OrderBookABI = [
        "event OrderPlaced(uint256 indexed orderId, address indexed market, address indexed maker, uint256 outcomeIndex, uint256 price, uint256 amount, bool isBid)",
        "event OrderFilled(uint256 indexed orderId, address indexed taker, uint256 amount, uint256 cost)"
    ];

    const provider = hre.ethers.provider;
    const orderBook = new hre.ethers.Contract(orderBookAddress, OrderBookABI, provider);

    console.log("Checking events for market:", marketAddress);
    console.log("OrderBook address:", orderBookAddress);

    const currentBlock = await provider.getBlockNumber();
    console.log("Current block:", currentBlock);

    // Check OrderPlaced events
    const placeFilter = orderBook.filters.OrderPlaced(null, marketAddress);
    const placeEvents = await orderBook.queryFilter(placeFilter, 0); // Query from block 0
    console.log("OrderPlaced events found:", placeEvents.length);

    if (placeEvents.length > 0) {
        console.log("First OrderPlaced event block:", placeEvents[0].blockNumber);
        console.log("Last OrderPlaced event block:", placeEvents[placeEvents.length - 1].blockNumber);
    }

    // Check OrderFilled events
    const fillFilter = orderBook.filters.OrderFilled();
    const fillEvents = await orderBook.queryFilter(fillFilter, 0);
    console.log("Total OrderFilled events found (all markets):", fillEvents.length);

    if (fillEvents.length > 0) {
        console.log("First OrderFilled event block:", fillEvents[0].blockNumber);
        console.log("Last OrderFilled event block:", fillEvents[fillEvents.length - 1].blockNumber);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
