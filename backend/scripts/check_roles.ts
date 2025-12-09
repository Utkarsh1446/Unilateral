import { ethers } from "ethers";

const FACTORY_ADDRESS = "0x62c6186E67427135ccDe51C5f0F875aE63e5cCCc";
const VIRTUAL_TOKEN_ADDRESS = "0xd88E59AeC0DA890Ea1Aa1EDe99426D47B2c51879";
const RPC_URL = "https://sepolia.base.org";

const VIRTUAL_TOKEN_ABI = [
    "function hasRole(bytes32 role, address account) view returns (bool)",
    "function ADMIN_ROLE() view returns (bytes32)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const virtualToken = new ethers.Contract(VIRTUAL_TOKEN_ADDRESS, VIRTUAL_TOKEN_ABI, provider);

    console.log("Checking Roles...");
    const adminRole = await virtualToken.ADMIN_ROLE();
    console.log("ADMIN_ROLE:", adminRole);

    const hasAdminRole = await virtualToken.hasRole(adminRole, FACTORY_ADDRESS);
    console.log(`Factory (${FACTORY_ADDRESS}) has ADMIN_ROLE: ${hasAdminRole}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
