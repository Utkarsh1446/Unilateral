import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Checking roles with deployer:", deployer.address);

    // Addresses from contracts.ts or .env
    const VIRTUAL_TOKEN_ADDRESS = "0x9a0B7E8c085CD0dF1ad6dEde68Ef016640582eE3";
    const FACTORY_ADDRESS = "0x00afB4Afd37586589701a08361D003C0461EF574";

    const VirtualToken = await ethers.getContractAt("VirtualToken", VIRTUAL_TOKEN_ADDRESS);

    const DEFAULT_ADMIN_ROLE = await VirtualToken.DEFAULT_ADMIN_ROLE();
    const MARKET_ROLE = await VirtualToken.MARKET_ROLE();

    console.log("VirtualToken Address:", VIRTUAL_TOKEN_ADDRESS);
    console.log("OpinionMarketFactory Address:", FACTORY_ADDRESS);

    const hasAdminRole = await VirtualToken.hasRole(DEFAULT_ADMIN_ROLE, FACTORY_ADDRESS);
    console.log(`Factory has DEFAULT_ADMIN_ROLE on VirtualToken: ${hasAdminRole}`);

    const roleAdmin = await VirtualToken.getRoleAdmin(MARKET_ROLE);
    console.log(`Admin Role for MARKET_ROLE: ${roleAdmin}`);
    console.log(`Is DEFAULT_ADMIN_ROLE the admin for MARKET_ROLE? ${roleAdmin === DEFAULT_ADMIN_ROLE}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
