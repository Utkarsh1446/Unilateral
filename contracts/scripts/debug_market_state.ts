import { ethers } from "hardhat";

const MARKET_ADDRESS = "0x290c67c87dd3B646E0d339a7F68438329C77f071";
const USER_ADDRESS = "0x9f4c1f7eaa0b729b798f81be84b25fdf9f66a0bf"; // From logs
const ORDERBOOK_ADDRESS = "0xfC0607a06096f9fC49647F24CD54a8145022B91D";

async function main() {
    console.log("Debugging Market State...");
    console.log("Market:", MARKET_ADDRESS);
    console.log("User:", USER_ADDRESS);

    const INFURA_RPC = "https://base-sepolia.infura.io/v3/a6e3dd24c8b645dda9235a1c17a42124";
    const provider = new ethers.JsonRpcProvider(INFURA_RPC);

    const OrderBook = new ethers.Contract(ORDERBOOK_ADDRESS, [
        "function getMarketOutcomeOrderIds(address market, uint256 outcomeIndex, bool isBid) view returns (uint256[])",
        "function orders(uint256) view returns (uint256 id, address maker, address market, uint256 outcomeIndex, uint256 price, uint256 amount, uint256 filled, bool isBid, bool active)",
        "event OrderFilled(uint256 indexed orderId, address indexed taker, uint256 amount, uint256 cost)"
    ], provider);

    const PlatformToken = new ethers.Contract("0xd2007BD89BcB013A5E9544e79aAcAE7976E0a285", [
        "function balanceOf(address) view returns (uint256)"
    ], provider);

    // 1. Check User Balances
    console.log("\n=== User Balances ===");
    const usdcBalance = await PlatformToken.balanceOf(USER_ADDRESS);
    console.log("USDC:", ethers.formatUnits(usdcBalance, 6));

    // 2. Check OrderBook Orders
    console.log("\n=== OrderBook Orders ===");
    // We don't have a way to iterate all orders easily unless we know IDs.
    // But we can check the `marketOutcomeOrderIds` if we had a getter.
    // The contract has `getMarketOutcomeOrderIds(market, outcomeIndex)`.

    try {
        const yesBuyOrders = await OrderBook.getMarketOutcomeOrderIds(MARKET_ADDRESS, 0, true); // YES Buy
        console.log("YES Buy Orders:", yesBuyOrders.map(id => id.toString()));

        const yesSellOrders = await OrderBook.getMarketOutcomeOrderIds(MARKET_ADDRESS, 0, false); // YES Sell
        console.log("YES Sell Orders:", yesSellOrders.map(id => id.toString()));

        const noBuyOrders = await OrderBook.getMarketOutcomeOrderIds(MARKET_ADDRESS, 1, true); // NO Buy
        console.log("NO Buy Orders:", noBuyOrders.map(id => id.toString()));

        const noSellOrders = await OrderBook.getMarketOutcomeOrderIds(MARKET_ADDRESS, 1, false); // NO Sell
        console.log("NO Sell Orders:", noSellOrders.map(id => id.toString()));

        // Inspect specific orders
        const allOrderIds = [...yesBuyOrders, ...yesSellOrders, ...noBuyOrders, ...noSellOrders];
        for (const id of allOrderIds) {
            const order = await OrderBook.orders(id);
            console.log(`Order ${id}:`);
            console.log(`  Maker: ${order.maker}`);
            console.log(`  Price: ${ethers.formatUnits(order.price, 6)}`);
            console.log(`  Amount: ${ethers.formatUnits(order.amount, 6)}`);
            console.log(`  Filled: ${ethers.formatUnits(order.filled, 6)}`);
            console.log(`  Active: ${order.active}`);
        }
    } catch (e) {
        console.error("Failed to fetch orders:", e);
    }

    // 3. Check Events
    console.log("\n=== Recent Events ===");
    const filter = OrderBook.filters.OrderFilled();
    const events = await OrderBook.queryFilter(filter, -5000); // Last 5000 blocks
    console.log(`Found ${events.length} OrderFilled events`);
    for (const event of events) {
        if ('args' in event) {
            const { orderId, taker, amount, cost } = event.args;
            const order = await OrderBook.orders(orderId);
            if (order.market.toLowerCase() === MARKET_ADDRESS.toLowerCase()) {
                console.log(`Matched Trade: Order ${orderId}, Taker ${taker}, Amount ${ethers.formatUnits(amount, 6)}, Cost ${ethers.formatUnits(cost, 6)}`);
            }
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
