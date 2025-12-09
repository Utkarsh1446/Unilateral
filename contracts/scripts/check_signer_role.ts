import { ethers } from "hardhat";

async function main() {
    const [signer] = await ethers.getSigners();
    console.log("Checking role for account:", signer.address);

    const adminControllerAddress = "0x9ba28F78E0EF2C37D6d63A8dD79a956186CB9Fd9";
    const adminController = await ethers.getContractAt("AdminController", adminControllerAddress);

    const SIGNER_ROLE = await adminController.SIGNER_ROLE();
    console.log("SIGNER_ROLE Hash:", SIGNER_ROLE);

    const hasRole = await adminController.hasRole(SIGNER_ROLE, signer.address);
    console.log(`Has SIGNER_ROLE: ${hasRole}`);

    if (!hasRole) {
        console.log("Granting SIGNER_ROLE...");
        try {
            const tx = await adminController.grantRole(SIGNER_ROLE, signer.address);
            await tx.wait();
            console.log("Role granted successfully!");
        } catch (error) {
            console.error("Failed to grant role:", error);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
