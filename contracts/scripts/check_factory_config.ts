import { ethers } from "hardhat";

async function main() {
    const factoryAddress = "0x62c6186E67427135ccDe51C5f0F875aE63e5cCCc";
    console.log(`Checking OpinionMarketFactory at ${factoryAddress}...`);

    const Factory = await ethers.getContractFactory("OpinionMarketFactory");
    const factory = Factory.attach(factoryAddress);

    const collateralToken = await factory.collateralToken();
    console.log(`Collateral Token: ${collateralToken}`);

    const expectedToken = "0x199013a8eA21f024ab22A6d70FcFe920608aAC30";
    if (collateralToken.toLowerCase() === expectedToken.toLowerCase()) {
        console.log("MATCHES expected PlatformToken.");
    } else {
        console.log("MISMATCH! Expected:", expectedToken);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
