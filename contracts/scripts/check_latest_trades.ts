import { ethers } from "hardhat";

const ORDERBOOK_ADDRESS = "0xfC0607a06096f9fC49647F24CD54a8145022B91D";
const READ_RPC = "https://sepolia.base.org";

async function main() {
    const provider = new ethers.JsonRpcProvider(READ_RPC);

    const OrderBook = new ethers.Contract(ORDERBOOK_ADDRESS, [
        "event OrderFilled(uint256 indexed orderId, address indexed taker, uint256 amount, uint256 cost)",
        "function orders(uint256) view returns (uint256 id, address maker, address market, uint256 outcomeIndex, uint256 price, uint256 amount, uint256 filled, bool isBid, bool active)"
    ], provider);

    const currentBlock = await provider.getBlockNumber();
    console.log("Current Block:", currentBlock);

    // Check last 5000 blocks
    const fromBlock = Math.max(0, currentBlock - 5000);
    console.log("Querying from block:", fromBlock);

    const filter = OrderBook.filters.OrderFilled();
    const events = await OrderBook.queryFilter(filter, fromBlock);

    console.log(`Found ${events.length} fill events in last 5000 blocks`);

    // Sort descending by block number
    events.sort((a, b) => b.blockNumber - a.blockNumber);

    const top10 = events.slice(0, 10);

    for (const event of top10) {
        if ('args' in event) {
            const { orderId, taker, amount, cost } = event.args;
            const block = await event.getBlock();
            const order = await OrderBook.orders(orderId);

            const price = parseFloat(ethers.formatUnits(cost, 6)) / parseFloat(ethers.formatUnits(amount, 6));
            const time = new Date(block.timestamp * 1000).toLocaleTimeString();

            console.log(`\nTime: ${time} (Block ${event.blockNumber})`);
            console.log(`  Order ID: ${orderId}`);
            console.log(`  Price: ${price.toFixed(4)}`);
            console.log(`  Outcome: ${order.outcomeIndex}`);
            console.log(`  Type: ${order.isBid ? 'Sell' : 'Buy'}`); // Taker action
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
