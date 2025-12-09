import { ethers } from "hardhat";

async function main() {
    const factoryAddress = "0x6873aAE003c31012122324db80b7D1DE2014dF8d";
    console.log("Checking OpinionMarketFactory at:", factoryAddress);

    const OpinionMarketFactory = await ethers.getContractFactory("OpinionMarketFactory");
    const factory = OpinionMarketFactory.attach(factoryAddress);

    const adminController = await factory.adminController();
    console.log("Factory's AdminController:", adminController);

    const expectedAdminController = "0xf26c706421d6fCC4E113b4904C45CCcabE581D60";
    if (adminController.toLowerCase() === expectedAdminController.toLowerCase()) {
        console.log("SUCCESS: AdminController matches!");
    } else {
        console.log("ERROR: AdminController mismatch!");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
