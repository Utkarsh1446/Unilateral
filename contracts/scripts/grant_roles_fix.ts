
import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Granting roles with account:", deployer.address);

    const virtualTokenAddress = "0x96c169d6040F1C950E1cf20d2257dBf44eeD2d8B";
    const opinionMarketFactoryAddress = "0x1AD5617dEcdd32620200A416223F1eE009b42555";
    const adminControllerAddress = "0x9c75e64356fcC92489112041F83a6e7764F44Ddb";

    // 1. Grant ADMIN_ROLE on VirtualToken to OpinionMarketFactory
    const virtualToken = await ethers.getContractAt("VirtualToken", virtualTokenAddress);
    const ADMIN_ROLE = await virtualToken.ADMIN_ROLE();

    console.log("Granting ADMIN_ROLE on VirtualToken to OpinionMarketFactory...");
    let tx = await virtualToken.grantRole(ADMIN_ROLE, opinionMarketFactoryAddress);
    await tx.wait();
    console.log("Granted.");

    // 2. Grant SIGNER_ROLE on AdminController to Deployer (if not already)
    const adminController = await ethers.getContractAt("AdminController", adminControllerAddress);
    const SIGNER_ROLE = await adminController.SIGNER_ROLE();

    console.log("Granting SIGNER_ROLE on AdminController to Deployer...");
    tx = await adminController.grantRole(SIGNER_ROLE, deployer.address);
    await tx.wait();
    console.log("Granted.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
