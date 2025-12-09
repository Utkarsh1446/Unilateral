
const { ethers } = require("hardhat");

async function main() {
    const marketAddress = "0x988969891471f1f7CA8d8328f554a96f18F034b9";
    const OpinionMarket = await ethers.getContractFactory("OpinionMarket");
    const market = OpinionMarket.attach(marketAddress);

    console.log("Fetching probabilities for:", marketAddress);
    try {
        const probs = await market.getProbabilities();
        console.log("Probabilities:", probs.map(p => ethers.formatUnits(p, 18)));
    } catch (e) {
        console.error("Error fetching probabilities:", e);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
