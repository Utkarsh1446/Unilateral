import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const TOKEN_ADDRESS = "0x2581E27F55bD4CBdBf14d6D39c4C823dA7d2A4d4"; // New PlatformToken on Base Sepolia
const RPC_URL = "https://sepolia.base.org";

const TOKEN_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("PRIVATE_KEY not set");
    const wallet = new ethers.Wallet(privateKey, provider);

    const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, wallet);

    console.log("Checking New Token Balance...");
    const balance = await token.balanceOf(wallet.address);
    console.log(`Balance: ${balance.toString()} (${ethers.formatUnits(balance, 6)} USDC)`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
