import { ethers } from "hardhat";

async function main() {
    const userAddress = "0x9f4c1f7eaa0b729b798f81be84b25fdf9f66a0bf";
    const conditionalTokensAddress = "0xd6C4ADD0fF1b980dc4c300cc1DEf2114334444ea";

    // NEW OrderBook address
    const orderBookAddress = "0xfC0607a06096f9fC49647F24CD54a8145022B91D";

    const factoryAddress = "0x729Ca2F072Cd615b6770A212A8ba31a0Abcb069D";
    const Factory = await ethers.getContractAt("OpinionMarketFactory", factoryAddress);
    const OrderBook = await ethers.getContractAt("OrderBook", orderBookAddress);
    const ConditionalTokens = await ethers.getContractAt("ConditionalTokens", conditionalTokensAddress);

    // Get most recent MarketCreated event
    const filter = Factory.filters.MarketCreated();
    const events = await Factory.queryFilter(filter, -5000);

    console.log(`Found ${events.length} markets total`);

    // Check the last 3 markets
    for (let i = Math.max(0, events.length - 3); i < events.length; i++) {
        const event = events[i];
        const marketAddress = (event as any).args[0];
        const questionId = (event as any).args[1];

        console.log(`\n=== Market ${i + 1}: ${marketAddress} ===`);

        try {
            const OpinionMarket = await ethers.getContractAt("OpinionMarket", marketAddress);
            const collateral = await OpinionMarket.collateralToken();
            const conditionId = await OpinionMarket.conditionId();

            // Calculate token IDs
            const indexSet0 = 1n << 0n;
            const indexSet1 = 1n << 1n;
            const tokenId0 = ethers.keccak256(
                ethers.solidityPacked(["address", "bytes32", "uint256"], [collateral, conditionId, indexSet0])
            );
            const tokenId1 = ethers.keccak256(
                ethers.solidityPacked(["address", "bytes32", "uint256"], [collateral, conditionId, indexSet1])
            );

            // Check balances
            const userBal0 = await ConditionalTokens.balanceOf(userAddress, tokenId0);
            const userBal1 = await ConditionalTokens.balanceOf(userAddress, tokenId1);
            const obBal0 = await ConditionalTokens.balanceOf(orderBookAddress, tokenId0);
            const obBal1 = await ConditionalTokens.balanceOf(orderBookAddress, tokenId1);

            console.log("User YES:", ethers.formatUnits(userBal0, 6));
            console.log("User NO:", ethers.formatUnits(userBal1, 6));
            console.log("NEW OrderBook YES:", ethers.formatUnits(obBal0, 6));
            console.log("NEW OrderBook NO:", ethers.formatUnits(obBal1, 6));
        } catch (e: any) {
            console.log("Error:", e.message);
        }
    }

    // Check OrderBook orders
    const nextOrderId = await OrderBook.nextOrderId();
    console.log("\n=== NEW OrderBook ===");
    console.log("Total orders:", nextOrderId.toString());

    for (let i = 0; i < Number(nextOrderId); i++) {
        const order = await OrderBook.orders(i);
        if (order.active) {
            console.log(`\nOrder ${i}:`);
            console.log("  Market:", order.market);
            console.log("  OutcomeIndex:", order.outcomeIndex.toString());
            console.log("  Price:", ethers.formatUnits(order.price, 6));
            console.log("  Amount:", ethers.formatUnits(order.amount, 6));
            console.log("  IsBid:", order.isBid);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
