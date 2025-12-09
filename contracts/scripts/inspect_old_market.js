const hre = require("hardhat");

async function main() {
    const marketAddress = "0xfe22B1Bf2B4fe02b392A1882A25C2b45E8B5c2Ac";
    const [admin] = await hre.ethers.getSigners();
    console.log("Admin Address:", admin.address);

    const OpinionMarket = await hre.ethers.getContractFactory("OpinionMarket");
    const market = await OpinionMarket.attach(marketAddress);

    console.log("Market Address:", market.target);

    try {
        const oracle = await market.oracle();
        console.log("Market Oracle:", oracle);
        console.log("Admin Address:", admin.address);
        console.log("Is Admin the Oracle?", oracle === admin.address);

    } catch (e) {
        console.error("Error reading market state:", e);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
