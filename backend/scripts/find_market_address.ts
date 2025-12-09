import { ethers } from "ethers";

const FACTORY_ADDRESS = "0x62c6186E67427135ccDe51C5f0F875aE63e5cCCc";
const RPC_URL = "http://127.0.0.1:8545";

const ABI = [
    "event MarketCreated(address indexed market, bytes32 indexed questionId, address creator)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(FACTORY_ADDRESS, ABI, provider);

    console.log("Querying MarketCreated events...");

    // Query last 5000 blocks
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 5000);
    const filter = contract.filters.MarketCreated();
    const events = await contract.queryFilter(filter, fromBlock);

    console.log(`Found ${events.length} events.`);

    for (const event of events) {
        if ('args' in event) {
            console.log("Market:", event.args.market);
            console.log("QuestionId:", event.args.questionId);
            console.log("Creator:", event.args.creator);
            console.log("---");
        }
    }
}

main().catch(console.error);
