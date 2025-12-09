import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const ADMIN_CONTROLLER_ADDRESS = "0x694Bbf81090528b5F828ec65b73F5c0607c99285";
const RPC_URL = "https://sepolia.base.org";

const ADMIN_CONTROLLER_ABI = [
    "function hasRole(bytes32 role, address account) view returns (bool)",
    "function SIGNER_ROLE() view returns (bytes32)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const adminController = new ethers.Contract(ADMIN_CONTROLLER_ADDRESS, ADMIN_CONTROLLER_ABI, provider);

    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("PRIVATE_KEY not set");
    const wallet = new ethers.Wallet(privateKey);
    const signerAddress = wallet.address;

    console.log("Checking Signer Role...");
    console.log("Signer Address:", signerAddress);

    const signerRole = await adminController.SIGNER_ROLE();
    console.log("SIGNER_ROLE:", signerRole);

    const hasSignerRole = await adminController.hasRole(signerRole, signerAddress);
    console.log(`Signer has SIGNER_ROLE: ${hasSignerRole}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
