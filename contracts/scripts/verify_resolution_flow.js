const hre = require("hardhat");

async function main() {
    const [admin, creator, user1, user2] = await hre.ethers.getSigners();
    console.log("Admin:", admin.address);
    console.log("Creator:", creator.address);
    console.log("User1:", user1.address);

    // 1. Setup Contracts
    const PlatformToken = await hre.ethers.getContractFactory("PlatformToken");
    const platformToken = await PlatformToken.attach("0xe84a6Cd9CcBbCCB4746cEc1B21283dB503A3b502");

    const OpinionMarketFactory = await hre.ethers.getContractFactory("OpinionMarketFactory");
    const factory = await OpinionMarketFactory.attach("0x17C6Ec35208f31c4d4E6ea5d937647033DFDeA1b");

    const OrderBook = await hre.ethers.getContractFactory("OrderBook");
    const orderBook = await OrderBook.attach("0x6f669059c93E01f080883a628bBeEcDdE4AFfe5B");

    // 2. Mint Tokens
    await platformToken.mint(creator.address, hre.ethers.parseUnits("1000", 6));
    await platformToken.mint(user1.address, hre.ethers.parseUnits("1000", 6));
    await platformToken.connect(creator).approve(factory.target, hre.ethers.parseUnits("1000", 6));
    await platformToken.connect(user1).approve(orderBook.target, hre.ethers.parseUnits("1000", 6));

    // 3. Create Market
    const currentBlock = await hre.ethers.provider.getBlock("latest");
    const timestamp = currentBlock.timestamp;
    const questionId = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("Will it rain? " + timestamp));
    const deadline = timestamp + 60; // 1 minute from now
    const fee = hre.ethers.parseUnits("10", 6);

    // Sign request
    const chainId = (await hre.ethers.provider.getNetwork()).chainId;
    const domain = {
        name: "Guessly",
        version: "1",
        chainId: chainId,
        verifyingContract: factory.target
    };
    // Note: Factory uses manual hashing, so we replicate that
    const hash = hre.ethers.solidityPackedKeccak256(
        ["address", "bytes32", "uint256", "uint256", "uint256"],
        [creator.address, questionId, fee, deadline, chainId]
    );
    const signature = await admin.signMessage(hre.ethers.getBytes(hash));

    console.log("Requesting market...");
    await factory.connect(creator).requestMarket(questionId, fee, deadline, signature);

    console.log("Approving market...");
    const tx = await factory.connect(admin).approveMarket(questionId);
    const receipt = await tx.wait();

    // Find MarketCreated event
    const marketCreatedEvent = receipt.logs.find(log => {
        try {
            const parsed = factory.interface.parseLog(log);
            return parsed.name === "MarketCreated";
        } catch (e) { return false; }
    });
    const marketAddress = factory.interface.parseLog(marketCreatedEvent).args[0];
    console.log("Market deployed at:", marketAddress);

    // 4. Place Orders
    console.log("Placing orders...");
    // User1 places a BID on YES (Outcome 0) at 0.40 (Should NOT match 0.50 ask)
    await orderBook.connect(user1).placeOrder(
        marketAddress,
        0, // Outcome 0 (YES)
        400000, // Price 0.40
        hre.ethers.parseUnits("10", 6), // Amount 10
        true // isBid
    );

    // Check order exists
    const orders = await orderBook.getMarketOutcomeOrderIds(marketAddress, 0);
    console.log("Orders count:", orders.length);
    const orderId = orders[orders.length - 1];
    const orderBefore = await orderBook.orders(orderId);
    console.log("Order before:", orderBefore);
    console.log("Order active before:", orderBefore.active);

    // 5. Fast Forward
    console.log("Fast forwarding...");
    await hre.ethers.provider.send("evm_increaseTime", [120]); // +2 mins
    await hre.ethers.provider.send("evm_mine");

    // 6. Resolve Market
    const OpinionMarket = await hre.ethers.getContractFactory("OpinionMarket");
    const market = await OpinionMarket.attach(marketAddress);

    console.log("Proposing resolution...");
    // Admin is oracle
    await market.connect(admin).proposeResolution(1); // Outcome 1 (NO)

    console.log("Fast forwarding dispute window...");
    const DISPUTE_WINDOW = await market.DISPUTE_WINDOW();
    await hre.ethers.provider.send("evm_increaseTime", [Number(DISPUTE_WINDOW) + 1]);
    await hre.ethers.provider.send("evm_mine");

    console.log("Finalizing resolution...");
    const user1BalanceBefore = await platformToken.balanceOf(user1.address);
    await market.connect(admin).finalizeResolution();

    // 7. Verify Cancellation
    const orderAfter = await orderBook.orders(orderId);
    console.log("Order active after:", orderAfter.active);

    if (!orderAfter.active) {
        console.log("SUCCESS: Order was cancelled.");
    } else {
        console.error("FAILURE: Order was NOT cancelled.");
    }

    // 8. Verify Refund
    const user1BalanceAfter = await platformToken.balanceOf(user1.address);
    console.log("User1 Balance Before Refund:", hre.ethers.formatUnits(user1BalanceBefore, 6));
    console.log("User1 Balance After Refund:", hre.ethers.formatUnits(user1BalanceAfter, 6));

    if (user1BalanceAfter > user1BalanceBefore) {
        console.log("SUCCESS: User1 was refunded.");
    } else {
        console.error("FAILURE: User1 was NOT refunded.");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
