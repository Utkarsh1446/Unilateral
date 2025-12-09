const hre = require("hardhat");

async function main() {
    const marketAddress = "0xfe22B1Bf2B4fe02b392A1882A25C2b45E8B5c2Ac";
    const MarketABI = [
        "function resolved() external view returns (bool)",
        "function outcome() external view returns (uint256)",
        "function getQuestionId() external view returns (bytes32)"
    ];

    const provider = hre.ethers.provider;
    const market = new hre.ethers.Contract(marketAddress, MarketABI, provider);

    console.log("Checking market:", marketAddress);

    try {
        const isResolved = await market.resolved();
        console.log("Is Resolved (On-Chain):", isResolved);

        if (isResolved) {
            const outcome = await market.outcome();
            console.log("Outcome:", outcome.toString());
        }
    } catch (e) {
        console.error("Error fetching market state:", e);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
