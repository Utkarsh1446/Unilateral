import { ethers } from "hardhat";

async function main() {
    const marketAddress = "0xa345597bF987c49BA934Cb7cbB1518ce9902e262"; // Latest approved market
    const orderBookAddress = "0x1e7882245FD38eC478f32FF1DA142A9802312c36";

    const OrderBook = await ethers.getContractAt("OrderBook", orderBookAddress);

    console.log("Checking orders for market:", marketAddress);

    // Check YES orders (outcomeIndex 0)
    const yesOrderIds = await OrderBook.getMarketOutcomeOrderIds(marketAddress, 0);
    console.log("\nYES Order IDs:", yesOrderIds.map(id => id.toString()));

    // Check NO orders (outcomeIndex 1)
    const noOrderIds = await OrderBook.getMarketOutcomeOrderIds(marketAddress, 1);
    console.log("NO Order IDs:", noOrderIds.map(id => id.toString()));

    // Get details of each order
    for (const orderId of yesOrderIds) {
        const order = await OrderBook.orders(orderId);
        console.log(`\nYES Order ${orderId}:`, {
            maker: order.maker,
            price: ethers.formatUnits(order.price, 6),
            amount: ethers.formatUnits(order.amount, 6),
            isBid: order.isBid,
            active: order.active
        });
    }

    for (const orderId of noOrderIds) {
        const order = await OrderBook.orders(orderId);
        console.log(`\nNO Order ${orderId}:`, {
            maker: order.maker,
            price: ethers.formatUnits(order.price, 6),
            amount: ethers.formatUnits(order.amount, 6),
            isBid: order.isBid,
            active: order.active
        });
    }
}

main().catch(console.error);
