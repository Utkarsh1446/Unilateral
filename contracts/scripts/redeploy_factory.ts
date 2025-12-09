import { ethers } from "hardhat";

async function main() {
    const adminControllerAddress = "0xf26c706421d6fCC4E113b4904C45CCcabE581D60";
    const conditionalTokensAddress = "0x9b604f78020C04061637d927541f02344a1BD6A9";
    const platformTokenAddress = "0x8db26C1A4fB0e9d007b4F86fb39D6AA4262FBD68";
    const feeCollectorAddress = "0xc06b8375013c6F781848c574F01F21a7D05a1e40"; // Oracle & FeeCollector

    console.log("Redeploying OpinionMarketFactory...");
    console.log("AdminController:", adminControllerAddress);

    const OpinionMarketFactory = await ethers.getContractFactory("OpinionMarketFactory");
    const opinionMarketFactory = await OpinionMarketFactory.deploy(
        conditionalTokensAddress,
        platformTokenAddress,
        feeCollectorAddress, // Oracle
        feeCollectorAddress, // FeeCollector
        adminControllerAddress
    );
    await opinionMarketFactory.waitForDeployment();
    const factoryAddress = await opinionMarketFactory.getAddress();
    console.log("OpinionMarketFactory redeployed to:", factoryAddress);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
