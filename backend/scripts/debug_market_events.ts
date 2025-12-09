import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const RPC_URL = "https://sepolia.base.org";
const OPINION_MARKET_ABI = [
    "event Trade(address indexed user, uint256 outcomeIndex, uint256 amountIn, uint256 amountOut, uint256 fee, bool isBuy)",
    "function question() view returns (string)"
];
const FACTORY_ABI = [
    "event MarketCreated(address indexed market, bytes32 indexed questionId, address creator)"
];

const FACTORY_ADDRESS = process.env.OPINION_MARKET_FACTORY_ADDRESS;

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const factory = new ethers.Contract(FACTORY_ADDRESS!, FACTORY_ABI, provider);

    const filter = factory.filters.MarketCreated();
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 90000); // Stay within 100k limit
    const marketEvents = await factory.queryFilter(filter, fromBlock);
    console.log(`Total markets created: ${marketEvents.length}`);

    if (marketEvents.length === 0) {
        console.log("No markets found.");
        return;
    }

    // Get latest market
    const latestEvent = marketEvents[marketEvents.length - 1];
    const marketAddress = (latestEvent as any).args[0];
    console.log(`Latest Market: ${marketAddress}`);

    const market = new ethers.Contract(marketAddress, OPINION_MARKET_ABI, provider);
    // console.log(`Question: ${await market.question()}`);

    const tradeFilter = market.filters.Trade();
    const events = await market.queryFilter(tradeFilter, fromBlock);

    console.log(`Found ${events.length} trade events.`);

    for (const event of events) {
        if ('args' in event) {
            const { user, outcomeIndex, amountIn, amountOut, fee, isBuy } = event.args;
            console.log("--- Trade Event ---");
            console.log(`User: ${user}`);
            console.log(`Type: ${isBuy ? 'Buy' : 'Sell'}`);
            console.log(`Outcome: ${outcomeIndex}`);
            console.log(`AmountIn: ${ethers.formatUnits(amountIn, 6)} USDC`);
            console.log(`AmountOut: ${ethers.formatUnits(amountOut, 6)} Shares`);
            console.log(`Fee: ${ethers.formatUnits(fee, 6)} USDC`);

            if (isBuy) {
                const netAmount = parseFloat(ethers.formatUnits(amountIn, 6)) - parseFloat(ethers.formatUnits(fee, 6));
                const totalShares = netAmount + parseFloat(ethers.formatUnits(amountOut, 6));
                console.log(`Calculated Total Shares: ${totalShares}`);
                const price = totalShares > 0 ? parseFloat(ethers.formatUnits(amountIn, 6)) / totalShares : 0;
                console.log(`Calculated Price: ${price * 100}%`);
            }
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
