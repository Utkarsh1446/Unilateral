import { ethers } from "hardhat";

async function main() {
    const adminControllerAddress = "0xf26c706421d6fCC4E113b4904C45CCcabE581D60";
    console.log("Checking AdminController at:", adminControllerAddress);

    const AdminController = await ethers.getContractFactory("AdminController");
    const adminController = AdminController.attach(adminControllerAddress);

    const orderBook = await adminController.orderBook();
    console.log("Current OrderBook Address:", orderBook);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
