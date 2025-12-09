const { ethers } = require("hardhat");

async function main() {
    const marketAddress = "0xfe22B1Bf2B4fe02b392A1882A25C2b45E8B5c2Ac";
    const market = await ethers.getContractAt("IOpinionMarket", marketAddress);

    const collateral = await market.collateralToken();
    console.log("Market Collateral:", collateral);

    const expectedCollateral = "0x8db26C1A4fB0e9d007b4F86fb39D6AA4262FBD68";
    console.log("Expected Collateral:", expectedCollateral);

    if (collateral.toLowerCase() === expectedCollateral.toLowerCase()) {
        console.log("MATCH");
    } else {
        console.log("MISMATCH!");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
