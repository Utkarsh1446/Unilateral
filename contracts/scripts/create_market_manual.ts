import { ethers } from "hardhat";

async function main() {
    const [signer] = await ethers.getSigners();
    console.log("Signer:", signer.address);

    const PlatformTokenAddress = "0xCa06A6efe6a061aC9229E18B2a3bBaf3a76fedd3";
    const FactoryAddress = "0xeC2de00482152E81Ca1d98D9E0aF1c7317136fB8";
    const OrderBookAddress = "0xeBab1F9d3CcbE8880C41EED3139c954fF2319D8D";
    const ConditionalTokensAddress = "0x7b2778b6d2624BF4CccF8bA7d4c7CF43Db517c1F";

    const PlatformToken = await ethers.getContractAt("PlatformToken", PlatformTokenAddress);
    const Factory = await ethers.getContractAt("OpinionMarketFactory", FactoryAddress);
    const OrderBook = await ethers.getContractAt("OrderBook", OrderBookAddress);
    const ConditionalTokens = await ethers.getContractAt("ConditionalTokens", ConditionalTokensAddress);

    // 1. Get Signature (Mocking or using the one I got)
    // I'll use the one I got from curl:
    const signature = "0x928cf3d00b5f6d942787f159e34aa8c47b876c073582ca62b8c304e66f6a486e595b46481a3c7811c50422c7ceb272006e9781d61f9664b93af2552288dc77621b";
    const feeAmount = 100000000n;
    const deadline = 1764948758;
    const questionId = "0x8326c9c9834cfc369b28a9bd843c5f91701ef6bb1db80140bece17959ceaf1c9";

    // 2. Approve Fee
    console.log("Approving Fee...");
    await (await PlatformToken.approve(FactoryAddress, feeAmount)).wait();

    // 3. Create Market
    console.log("Creating Market...");
    const tx = await Factory.createMarket(questionId, feeAmount, deadline, signature);
    const receipt = await tx.wait();

    let marketAddress = null;
    for (const log of receipt.logs) {
        try {
            const parsed = Factory.interface.parseLog(log);
            if (parsed && parsed.name === "MarketCreated") {
                marketAddress = parsed.args.market;
                break;
            }
        } catch (e) { }
    }
    console.log("Market Created at:", marketAddress);

    if (!marketAddress) throw new Error("Market creation failed");

    // 4. Seed Market
    const initialLiquidity = ethers.parseUnits("100", 6); // 100 USDC
    console.log("Approving Liquidity...");
    await (await PlatformToken.approve(marketAddress, initialLiquidity)).wait();

    const Market = await ethers.getContractAt("OpinionMarket", marketAddress);
    console.log("Minting Sets...");
    await (await Market.mintSets(initialLiquidity)).wait();

    console.log("Approving CT for OrderBook...");
    await (await ConditionalTokens.setApprovalForAll(OrderBookAddress, true)).wait();

    const priceWei = ethers.parseUnits("0.50", 6);
    console.log("Placing Sell YES...");
    await (await OrderBook.placeOrder(marketAddress, 0, priceWei, initialLiquidity, false)).wait();

    console.log("Placing Sell NO...");
    await (await OrderBook.placeOrder(marketAddress, 1, priceWei, initialLiquidity, false)).wait();

    console.log("Seeding Complete!");

    // 5. Verify Orders
    console.log("Verifying Orders...");

    // 6. Execute Market Order (Buy YES)
    console.log("Executing Market Order (Buy YES)...");
    // We need a different user to trade, or same user is fine for testing logic (self-trade allowed in CLOB usually, but let's see)
    // Actually, let's use a different signer if possible, or just same.
    // Hardhat default has 20 accounts.
    const [_, trader] = await ethers.getSigners();
    console.log("Trader:", trader.address);

    const PlatformTokenTrader = PlatformToken.connect(trader);
    const OrderBookTrader = OrderBook.connect(trader);

    const tradeAmount = ethers.parseUnits("10", 6); // Buy 10 USDC worth

    // Mint some USDC for trader
    // PlatformToken is a mock, has mint function?
    // In deploy.ts it says "Deploying PlatformToken (Mock USDC)".
    // Let's check ABIS or contract. It usually has mint.
    // If not, transfer from deployer.
    await (await PlatformToken.transfer(trader.address, ethers.parseUnits("1000", 6))).wait();

    console.log("Approving Trader USDC...");
    await (await PlatformTokenTrader.approve(OrderBookAddress, tradeAmount)).wait();

    // We want to Buy YES.
    // Seeding placed Sell YES orders (Asks).
    // Market Order Buy YES matches against Asks on Outcome 0.
    // We need to find the order ID.
    // Since we just deployed, order IDs should be 1 and 2.
    // Order 1: Sell YES
    // Order 2: Sell NO

    // We can use fillOrders with specific ID.
    // Or if we implemented matchOrders, but we implemented fillOrders.
    // Frontend logic finds the best orders and calls fillOrders.
    // Here we manually pick Order 1.

    console.log("Filling Order 1 (Sell YES)...");
    await (await OrderBookTrader.fillOrders([1], [tradeAmount])).wait();

    console.log("Market Order Complete!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
