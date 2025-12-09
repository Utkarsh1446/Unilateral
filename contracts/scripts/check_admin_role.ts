import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Checking roles for:", deployer.address);

    const adminControllerAddress = "0x1cCe371908eBEb0ce1A78e9af69D7Bb14D97ec8a";
    const AdminController = await ethers.getContractAt("AdminController", adminControllerAddress);

    const DEFAULT_ADMIN_ROLE = await AdminController.DEFAULT_ADMIN_ROLE();
    const hasAdminRole = await AdminController.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);

    console.log("Has DEFAULT_ADMIN_ROLE:", hasAdminRole);
    console.log("Current OrderBook:", await AdminController.orderBook());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
