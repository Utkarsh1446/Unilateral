import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Checking AdminController with:", deployer.address);

    const adminControllerAddress = "0x652c37caA9d159c89Ad4F3643507076C5eA0025d";
    const adminController = await ethers.getContractAt("AdminController", adminControllerAddress);

    try {
        const code = await ethers.provider.getCode(adminControllerAddress);
        console.log("Code size:", code.length);
        if (code === "0x") {
            console.error("No code at AdminController address!");
            return;
        }

        const SIGNER_ROLE = await adminController.SIGNER_ROLE();
        console.log("SIGNER_ROLE:", SIGNER_ROLE);

        const hasRole = await adminController.hasRole(SIGNER_ROLE, deployer.address);
        console.log("Deployer has SIGNER_ROLE:", hasRole);

    } catch (e) {
        console.error("Error:", e);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
