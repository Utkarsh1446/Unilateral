import { ethers } from "hardhat";

async function main() {
    const [admin] = await ethers.getSigners();
    console.log("Checking roles with account:", admin.address);

    const virtualTokenAddress = "0xcDdfd53578473f62Fc99Fb3093C2673b36E38507";
    const factoryAddress = "0x1a47C2719aA63C142dC5Bc95c8cc2C07aCBAC281";
    const adminControllerAddress = "0x26347482127250fb7b8fa58dfF78ee600e405784";

    const virtualToken = await ethers.getContractAt("VirtualToken", virtualTokenAddress);
    const adminController = await ethers.getContractAt("AdminController", adminControllerAddress);

    const ADMIN_ROLE = await virtualToken.ADMIN_ROLE();
    const hasAdminRole = await virtualToken.hasRole(ADMIN_ROLE, factoryAddress);
    console.log(`Factory has ADMIN_ROLE on VirtualToken: ${hasAdminRole}`);

    const SIGNER_ROLE = await adminController.SIGNER_ROLE();
    const hasSignerRole = await adminController.hasRole(SIGNER_ROLE, admin.address);
    console.log(`Admin has SIGNER_ROLE on AdminController: ${hasSignerRole}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
