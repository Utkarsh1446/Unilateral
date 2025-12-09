import { ethers } from "hardhat";

async function main() {
    const factoryAddress = "0x7fB9FF01874F6e5d7a4A72089941A79cf6ee6081";

    const factory = await ethers.getContractAt("OpinionMarketFactory", factoryAddress);

    console.log("Fetching recent MarketRequested events...\n");

    // Get recent events (last 10000 blocks or so)
    const provider = factory.runner?.provider;
    if (!provider) {
        console.log("No provider");
        return;
    }

    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 10000);

    const filter = factory.filters.MarketRequested();
    const events = await factory.queryFilter(filter, fromBlock);

    console.log(`Found ${events.length} MarketRequested events:\n`);

    for (const event of events) {
        const args = (event as any).args;
        console.log({
            blockNumber: event.blockNumber,
            questionId: args.questionId,
            creator: args.creator,
            feeAmount: ethers.formatUnits(args.feeAmount, 6) + " USDC"
        });
        console.log("---");
    }

    // Also check for any approved markets
    const approvedFilter = factory.filters.MarketApproved();
    const approvedEvents = await factory.queryFilter(approvedFilter, fromBlock);

    console.log(`\nFound ${approvedEvents.length} MarketApproved events:\n`);
    for (const event of approvedEvents) {
        const args = (event as any).args;
        console.log({
            blockNumber: event.blockNumber,
            questionId: args.questionId,
            market: args.market
        });
    }
}

main().catch(console.error);
