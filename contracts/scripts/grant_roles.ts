import { ethers } from "hardhat";

async function main() {
    const [admin] = await ethers.getSigners();
    console.log("Granting roles with account:", admin.address);

    const virtualTokenAddress = "0xDA7888E364cc3bD274Cc3F73397Fae9A913F37bF";
    const factoryAddress = "0x81AeF160A504b2442F16f4FbEE1836EC66C81D86";
    const adminControllerAddress = "0xD3d2e8f01BDf1467b91cC9101594c9E6258BC628";
    const virtualToken = await ethers.getContractAt("VirtualToken", virtualTokenAddress);

    const ADMIN_ROLE = await virtualToken.ADMIN_ROLE();
    const DEFAULT_ADMIN_ROLE = await virtualToken.DEFAULT_ADMIN_ROLE();

    console.log("Granting ADMIN_ROLE to Factory...");
    let tx = await virtualToken.grantRole(ADMIN_ROLE, factoryAddress);
    await tx.wait();

    console.log("Granting DEFAULT_ADMIN_ROLE to Factory...");
    tx = await virtualToken.grantRole(DEFAULT_ADMIN_ROLE, factoryAddress);
    await tx.wait();

    console.log("Roles granted successfully.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
