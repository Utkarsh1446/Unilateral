import { ethers } from "hardhat";

const ORDERBOOK_ADDRESS = "0xfC0607a06096f9fC49647F24CD54a8145022B91D";
const CT_ADDRESS = "0xd6C4ADD0fF1b980dc4c300cc1DEf2114334444ea";
const USER_ADDRESS = "0x9f4c1f7eaa0b729b798f81be84b25fdf9f66a0bf";
const INFURA_RPC = "https://base-sepolia.infura.io/v3/a6e3dd24c8b645dda9235a1c17a42124";

async function main() {
    const provider = new ethers.JsonRpcProvider(INFURA_RPC);

    const OrderBook = new ethers.Contract(ORDERBOOK_ADDRESS, [
        "function orders(uint256) view returns (uint256 id, address maker, address market, uint256 outcomeIndex, uint256 price, uint256 amount, uint256 filled, bool isBid, bool active)"
    ], provider);

    const ConditionalTokens = new ethers.Contract(CT_ADDRESS, [
        "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)"
    ], provider);

    console.log("Checking Order 0...");
    const order = await OrderBook.orders(0);
    console.log("Order 0:");
    console.log("  Maker:", order.maker);
    console.log("  Market:", order.market);
    console.log("  OutcomeIndex:", order.outcomeIndex);
    console.log("  IsBid:", order.isBid);
    console.log("  Price:", ethers.formatUnits(order.price, 6));
    console.log("  Amount:", ethers.formatUnits(order.amount, 6));
    console.log("  Filled:", ethers.formatUnits(order.filled, 6));

    console.log("\nChecking Transfer Events for User...");
    const filterTo = ConditionalTokens.filters.TransferSingle(null, null, USER_ADDRESS);
    const eventsTo = await ConditionalTokens.queryFilter(filterTo, -5000);
    console.log(`Found ${eventsTo.length} transfers TO user`);
    for (const e of eventsTo) {
        if ('args' in e) {
            console.log(`  From: ${e.args.from}, ID: ${e.args.id}, Value: ${ethers.formatUnits(e.args.value, 6)}`);
        }
    }

    const filterFrom = ConditionalTokens.filters.TransferSingle(null, USER_ADDRESS, null);
    const eventsFrom = await ConditionalTokens.queryFilter(filterFrom, -5000);
    console.log(`Found ${eventsFrom.length} transfers FROM user`);
    for (const e of eventsFrom) {
        if ('args' in e) {
            console.log(`  To: ${e.args.to}, ID: ${e.args.id}, Value: ${ethers.formatUnits(e.args.value, 6)}`);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
