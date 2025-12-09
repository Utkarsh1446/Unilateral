const ethers = require("ethers");

async function main() {
    const marketAddress = "0xfe22B1Bf2B4fe02b392A1882A25C2b45E8B5c2Ac";
    const MarketABI = [
        "function resolved() external view returns (bool)",
        "function outcome() external view returns (uint256)"
    ];

    // Use Base Sepolia Public RPC
    const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const market = new ethers.Contract(marketAddress, MarketABI, provider);

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
