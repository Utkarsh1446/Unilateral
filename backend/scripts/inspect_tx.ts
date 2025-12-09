import { ethers } from "ethers";

const RPC_URL = "http://127.0.0.1:8545";
const TX_HASH = "0xb595f6a1b2ec49fbf667b462351f9e12c94011f10eaf82025170d1d2798f029"; // From metadata

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const currentBlock = await provider.getBlockNumber();
    console.log("Current block:", currentBlock);

    for (let i = currentBlock; i > Math.max(0, currentBlock - 100); i--) {
        const block = await provider.getBlock(i, true); // true to include transactions
        if (block && block.prefetchedTransactions.length > 0) {
            // console.log(`Block ${i} has ${block.prefetchedTransactions.length} txs`);
            for (const tx of block.prefetchedTransactions) {
                if (
                    tx.to && (
                        tx.to.toLowerCase() === "0x03D500234b6D7086Bb2f86eA81882D43AC9EA1ac".toLowerCase() ||
                        tx.to.toLowerCase() === "0x62c6186E67427135ccDe51C5f0F875aE63e5cCCc".toLowerCase()
                    )
                ) {
                    console.log("Found Factory Interaction!");
                    console.log("Tx Hash:", tx.hash);
                    console.log("To:", tx.to);

                    const receipt = await provider.getTransactionReceipt(tx.hash);
                    if (receipt) {
                        for (const log of receipt.logs) {
                            // Check if it matches MarketCreated event signature
                            // Event MarketCreated(address indexed market, bytes32 indexed questionId, address creator)
                            // Topic 0: keccak256("MarketCreated(address,bytes32,address)")
                            // 0x108906fda116820aea305a6653ee01031831e497c9c93d9ab489fd83e1d82870
                            if (log.topics[0] === "0x108906fda116820aea305a6653ee01031831e497c9c93d9ab489fd83e1d82870") {
                                console.log("FOUND MarketCreated Event!");
                                console.log("Market Address:", ethers.stripZerosLeft(log.topics[1])); // Indexed address is in topic 1? No, address is indexed.
                                // address indexed market -> topic 1
                                // bytes32 indexed questionId -> topic 2
                                // address creator -> data (wait, creator is NOT indexed in my ABI above? Let's check solidity)

                                // Solidity: event MarketCreated(address indexed market, bytes32 indexed questionId, address creator);
                                // So:
                                // Topic 0: Signature
                                // Topic 1: market (address)
                                // Topic 2: questionId (bytes32)
                                // Data: creator (address)

                                const marketAddress = ethers.dataSlice(log.topics[1], 12); // Remove padding
                                console.log("Market Address (decoded):", marketAddress);
                            }
                        }
                    }
                }
            }
        }
    }
}

main().catch(console.error);
