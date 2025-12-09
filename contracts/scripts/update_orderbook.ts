import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Updating OrderBook with account:", deployer.address);

    const adminControllerAddress = "0x1cCe371908eBEb0ce1A78e9af69D7Bb14D97ec8a";
    const newOrderBookAddress = "0x1e7882245FD38eC478f32FF1DA142A9802312c36";

    const AdminController = await ethers.getContractAt("AdminController", adminControllerAddress);

    console.log("Current OrderBook:", await AdminController.orderBook());
    console.log("Setting new OrderBook to:", newOrderBookAddress);

    const tx = await AdminController.setOrderBook(newOrderBookAddress);
    await tx.wait();

    console.log("✅ OrderBook updated!");
    console.log("New OrderBook:", await AdminController.orderBook());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
