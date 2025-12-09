import { ethers } from "hardhat";

async function main() {
    const orderBookAddress = "0x3D22641c54BA5CB4e4b81949aA6E502bCEfcE3B7";
    const marketAddress = "0x00A411aaCa490F41a71f54E3b71855464f0ed8a4";

    const OrderBook = await ethers.getContractAt("OrderBook", orderBookAddress);

    console.log("Checking OrderBook orders...");

    // Check next order ID
    const nextOrderId = await OrderBook.nextOrderId();
    console.log("Next Order ID:", nextOrderId.toString());

    // Check orders 0, 1, 2, etc.
    for (let i = 0; i < Number(nextOrderId); i++) {
        const order = await OrderBook.orders(i);
        console.log(`\nOrder ${i}:`);
        console.log("  Maker:", order.maker);
        console.log("  Market:", order.market);
        console.log("  OutcomeIndex:", order.outcomeIndex.toString());
        console.log("  Price:", ethers.formatUnits(order.price, 6));
        console.log("  Amount:", ethers.formatUnits(order.amount, 6));
        console.log("  Filled:", ethers.formatUnits(order.filled, 6));
        console.log("  IsBid:", order.isBid);
        console.log("  Active:", order.active);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
