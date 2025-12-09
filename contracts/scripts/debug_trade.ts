import { ethers } from "hardhat";

async function main() {
    const [signer] = await ethers.getSigners();
    console.log("Debugging with account:", signer.address);

    // Market ID from the URL/Previous context
    // We need the market contract address. 
    // I'll fetch it from the API or just use the known address if I have it.
    // Since I don't have the address handy, I'll fetch it from the backend API.

    const marketId = "223e4567-e89b-12d3-a456-426614174000";
    console.log("Fetching market details for ID:", marketId);

    const marketAddress = "0x4979c39b8596a3641f272e673E217D543CE0b16C";
    const marketContract = await ethers.getContractAt("OpinionMarket", marketAddress);
    console.log("Querying events for market:", marketAddress);

    const tradeFilter = marketContract.filters.Trade();
    const currentBlockNum = await ethers.provider.getBlockNumber();
    const fromBlockNum = Math.max(0, currentBlockNum - 50000);
    const tradeEvents = await marketContract.queryFilter(tradeFilter, fromBlockNum);
    console.log(`Found ${tradeEvents.length} events from block ${fromBlockNum} to ${currentBlockNum}`);

    for (const event of tradeEvents) {
        if ('args' in event) {
            const { user, outcomeIndex, amountIn, amountOut, fee } = event.args;
            console.log(`
            Trade:
            User: ${user}
            Outcome: ${outcomeIndex}
            AmountIn: ${ethers.formatUnits(amountIn, 6)}
            AmountOut: ${ethers.formatUnits(amountOut, 6)}
            Fee: ${ethers.formatUnits(fee, 6)}
            Tx: ${event.transactionHash}
            `);
        }
    }

    // Fetch dependencies
    const collateralTokenAddress = await market.collateralToken();
    const conditionalTokensAddress = await market.conditionalTokens();
    const conditionId = await market.conditionId();

    console.log("Collateral Token:", collateralTokenAddress);
    console.log("Conditional Tokens:", conditionalTokensAddress);
    console.log("Condition ID:", conditionId);

    const ConditionalTokens = await ethers.getContractFactory("ConditionalTokens");
    const conditionalTokens = ConditionalTokens.attach(conditionalTokensAddress);

    const erc20Abi = [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function balanceOf(address account) external view returns (uint256)"
    ];
    const collateral = new ethers.Contract(collateralTokenAddress, erc20Abi, signer);

    // Check Market State
    console.log("Checking Market State...");

    const probs = await market.getProbabilities();
    console.log("Probabilities:", probs.map((p: any) => ethers.formatUnits(p, 18)));

    const getTokenId = (index: number) => {
        return ethers.solidityPackedKeccak256(
            ["address", "bytes32", "uint256"],
            [collateralTokenAddress, conditionId, index]
        );
    };

    const id0 = getTokenId(0);
    const id1 = getTokenId(1);

    console.log("Token ID 0 (YES):", id0);
    console.log("Token ID 1 (NO):", id1);

    const reserve0 = await conditionalTokens.balanceOf(marketAddress, id0);
    const reserve1 = await conditionalTokens.balanceOf(marketAddress, id1);

    console.log("Market Reserve YES:", ethers.formatUnits(reserve0, 6));
    console.log("Market Reserve NO:", ethers.formatUnits(reserve1, 6));

    // Check Signer Balance (just in case)
    const signerBal0 = await conditionalTokens.balanceOf(signer.address, id0);
    const signerBal1 = await conditionalTokens.balanceOf(signer.address, id1);
    console.log("Signer Balance YES:", ethers.formatUnits(signerBal0, 6));
    console.log("Signer Balance NO:", ethers.formatUnits(signerBal1, 6));

    // Check Signer Collateral Balance
    const collateralBal = await collateral.balanceOf(signer.address);
    console.log("Signer Collateral Balance:", ethers.formatUnits(collateralBal, 6));

    if (collateralBal < ethers.parseUnits("10", 6)) {
        console.error("Insufficient Collateral Balance!");
        return;
    }

    const resolved = await market.resolved();
    console.log("Market Resolved:", resolved);

    // Query Events
    console.log("Querying Trade events...");
    const filter = market.filters.Trade();
    const currentBlock = await ethers.provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 50000);
    console.log(`Querying from ${fromBlock} to ${currentBlock}`);
    const events = await market.queryFilter(filter, fromBlock);
    console.log("Found events:", events.length);
    events.forEach((e: any) => {
        console.log("Event:", e.args);
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
