import { ethers } from "hardhat";

const MARKET_ADDRESS = "0x290c67c87dd3B646E0d339a7F68438329C77f071";
const ORDERBOOK_ADDRESS = "0xfC0607a06096f9fC49647F24CD54a8145022B91D";
const USER_ADDRESS = "0x9f4c1f7eaa0b729b798f81be84b25fdf9f66a0bf";
const OUTCOME_INDEX = 0; // YES
const PRICE = 400000n; // 0.4
const AMOUNT = 1000000n; // 1.0

async function main() {
    const [signer] = await ethers.getSigners();
    console.log("Signer:", signer.address);

    // Contracts
    const Market = await ethers.getContractAt("OpinionMarket", MARKET_ADDRESS);
    const OrderBook = await ethers.getContractAt("OrderBook", ORDERBOOK_ADDRESS);

    // 1. Get Market Info
    const conditionId = await Market.conditionId();
    const collateralToken = await Market.collateralToken();
    const conditionalTokensAddr = await Market.conditionalTokens();

    console.log("Market Info:");
    console.log("  Condition ID:", conditionId);
    console.log("  Collateral:", collateralToken);
    console.log("  ConditionalTokens:", conditionalTokensAddr);

    // 2. Calculate Token ID
    const CTHelpers = await ethers.getContractFactory("CTHelpers");
    const indexSet = 1 << OUTCOME_INDEX;
    const packed = ethers.solidityPacked(
        ["address", "bytes32", "uint256"],
        [collateralToken, conditionId, indexSet]
    );
    const tokenId = ethers.keccak256(packed);
    const tokenIdBigInt = BigInt(tokenId);

    console.log("Calculated Token ID:", tokenId);

    // 3. Check Balance
    const ConditionalTokens = await ethers.getContractAt("ConditionalTokens", conditionalTokensAddr);
    const balance = await ConditionalTokens.balanceOf(USER_ADDRESS, tokenIdBigInt);
    console.log("User Balance:", ethers.formatUnits(balance, 6));

    if (balance < AMOUNT) {
        console.error("ERROR: Insufficient Balance!");
        return;
    }

    // 3. Check Existing Orders
    const orderIds = await OrderBook.getMarketOutcomeOrderIds(MARKET_ADDRESS, OUTCOME_INDEX);
    console.log(`Found ${orderIds.length} orders for Outcome ${OUTCOME_INDEX}`);

    // Check events
    const filter = OrderBook.filters.OrderPlaced(null, MARKET_ADDRESS, USER_ADDRESS);
    const events = await OrderBook.queryFilter(filter, -1000); // Last 1000 blocks
    console.log(`Found ${events.length} OrderPlaced events for user in last 1000 blocks`);

    for (const event of events) {
        if ('args' in event) {
            console.log(`  Order ${event.args[0]} placed at block ${event.blockNumber}`);
        }
    }

    for (const id of orderIds) {
        const order = await OrderBook.orders(id);
        const price = BigInt(order.price);
        const amount = BigInt(order.amount);
        const filled = BigInt(order.filled);

        console.log(`Order ${id}: Active=${order.active}, Bid=${order.isBid}, Price=${price}, Amount=${amount}, Filled=${filled}`);
    }

    // 4. Check Approval
    const isApproved = await ConditionalTokens.isApprovedForAll(USER_ADDRESS, ORDERBOOK_ADDRESS);
    console.log("Is Approved For All:", isApproved);

    if (!isApproved) {
        console.error("ERROR: Not Approved!");
        // Impersonate to approve
        await ethers.provider.send("hardhat_impersonateAccount", [USER_ADDRESS]);
        const impersonatedSigner = await ethers.getSigner(USER_ADDRESS);
        await ethers.provider.send("hardhat_setBalance", [USER_ADDRESS, "0x1000000000000000000"]);
        await (await ConditionalTokens.connect(impersonatedSigner).setApprovalForAll(ORDERBOOK_ADDRESS, true)).wait();
        console.log("Approved via impersonation.");
    }

    // 5. Simulate placeOrder
    console.log("Simulating placeOrder...");
    try {
        // Impersonate user
        await ethers.provider.send("hardhat_impersonateAccount", [USER_ADDRESS]);
        const impersonatedSigner = await ethers.getSigner(USER_ADDRESS);

        // Fund impersonated account
        await ethers.provider.send("hardhat_setBalance", [
            USER_ADDRESS,
            "0x1000000000000000000", // 1 ETH
        ]);

        const orderBookAsUser = OrderBook.connect(impersonatedSigner);

        await orderBookAsUser.placeOrder.staticCall(
            MARKET_ADDRESS,
            OUTCOME_INDEX,
            PRICE,
            AMOUNT,
            false // isBid = false (Sell)
        );
        console.log("Simulation Successful!");
    } catch (error: any) {
        console.error("Simulation Failed!");
        console.error("Error Data:", error.data);
        if (error.data === "0xc3bccc22") {
            console.log("Reproduced 0xc3bccc22!");
        } else {
            console.log("Got different error:", error);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
