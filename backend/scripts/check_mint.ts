import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const TOKEN_ADDRESS = "0x199013a8eA21f024ab22A6d70FcFe920608aAC30";
const RPC_URL = "https://sepolia.base.org";

const TOKEN_ABI = [
    "function mint(address to, uint256 amount) external",
    "function balanceOf(address account) view returns (uint256)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("PRIVATE_KEY not set");
    const wallet = new ethers.Wallet(privateKey, provider);

    const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, wallet);

    console.log("Checking Mint...");
    const balanceBefore = await token.balanceOf(wallet.address);
    console.log("Balance Before:", balanceBefore.toString());

    try {
        console.log("Minting 10 USDC...");
        const tx = await token.mint(wallet.address, 10000000);
        await tx.wait();
        console.log("Minted!");
    } catch (e) {
        console.error("Mint Failed:", e);
    }

    const balanceAfter = await token.balanceOf(wallet.address);
    console.log("Balance After:", balanceAfter.toString());
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
