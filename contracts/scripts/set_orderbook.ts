import { ethers } from "hardhat";

async function main() {
    const adminControllerAddress = "0xf26c706421d6fCC4E113b4904C45CCcabE581D60";
    const orderBookAddress = "0xd1C82bcD66dd6724fCE6Ac8D1aB37703Bd08ffa9";

    console.log("Setting OrderBook on AdminController...");
    console.log("AdminController:", adminControllerAddress);
    console.log("OrderBook:", orderBookAddress);

    const AdminController = await ethers.getContractFactory("AdminController");
    const adminController = AdminController.attach(adminControllerAddress);

    const tx = await adminController.setOrderBook(orderBookAddress);
    console.log("Transaction sent:", tx.hash);
    await tx.wait();

    console.log("OrderBook set successfully!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
