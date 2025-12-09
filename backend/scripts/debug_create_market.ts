import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const FACTORY_ADDRESS = "0x34D445c01792EbB432F4e969Cb432A5Ab9043186";
const TOKEN_ADDRESS = "0x84867109481bd49Bb501bfE0Bd57716069c9B964";
const RPC_URL = "https://sepolia.base.org";

const FACTORY_ABI = [
    "function createMarket(bytes32 questionId, uint256 initialVirtualLiquidity, uint256 initialRealLiquidity, uint256 feeAmount, uint256 deadline, bytes memory signature) external returns (address)"
];

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("PRIVATE_KEY not set");
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log("Using Wallet:", wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log("ETH Balance:", ethers.formatEther(balance));

    const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, wallet);
    const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, wallet);

    const questionId = ethers.id("Debug Question " + Date.now());
    const initialVirtualLiquidity = "1000000000"; // 1000 USDC
    const initialRealLiquidity = "50000000"; // 50 USDC
    const feeAmount = "100000000"; // 100 USDC
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const chainId = 84532;

    // Generate Signature
    const hash = ethers.solidityPackedKeccak256(
        ["address", "bytes32", "uint256", "uint256", "uint256", "uint256"],
        [wallet.address, questionId, initialVirtualLiquidity, feeAmount, deadline, chainId]
    );
    const signature = await wallet.signMessage(ethers.getBytes(hash));

    console.log("Approving...");
    const totalAmount = BigInt(feeAmount) + BigInt(initialRealLiquidity);
    const txApprove = await token.approve(FACTORY_ADDRESS, totalAmount.toString());
    await txApprove.wait();
    console.log("Approved");

    console.log("Creating Market...");
    try {
        const tx = await factory.createMarket(
            questionId,
            initialVirtualLiquidity,
            initialRealLiquidity,
            feeAmount,
            deadline,
            signature,
            { gasLimit: 5000000 } // Explicit high gas limit
        );
        console.log("Tx Sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("Market Created!", receipt.hash);
    } catch (error: any) {
        console.error("Creation Failed!");
        if (error.data) {
            console.error("Error Data:", error.data);
            // Try to decode error
            try {
                const decoded = factory.interface.parseError(error.data);
                console.error("Decoded Error:", decoded);
            } catch (e) {
                console.error("Could not decode error");
            }
        } else if (error.reason) {
            console.error("Revert Reason:", error.reason);
        } else {
            console.error(error);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
