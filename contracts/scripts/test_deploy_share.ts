import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const FACTORY = "0x5Af074b9D239cAE61971B117B5FAFF81C270b3D4";
    const CREATOR = "0xcdd92E6a7355Df125A581a2aa413de9ddb654A54";

    const [signer] = await ethers.getSigners();
    console.log("Deployer:", signer.address);

    // Get factory contract
    const factory = await ethers.getContractAt([
        "function createCreatorShare(string memory name, string memory symbol, uint256 deadline, bytes memory signature) external returns (address)",
        "function creatorToShare(address) view returns (address)",
        "function feeCollector() view returns (address)",
        "function dividendToken() view returns (address)",
        "function adminController() view returns (address)"
    ], FACTORY);

    // Check factory config
    console.log("Fee Collector:", await factory.feeCollector());
    console.log("Dividend Token:", await factory.dividendToken());
    console.log("Admin Controller:", await factory.adminController());
    console.log("Creator existing share:", await factory.creatorToShare(CREATOR));

    // Generate signature
    const name = "rugbustersbnb Shares";
    const symbol = "$RUGB";
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const chainId = 84532;

    console.log("\nSignature params:", { name, symbol, deadline, chainId, CREATOR });

    const hash = ethers.solidityPackedKeccak256(
        ["address", "string", "string", "uint256", "uint256"],
        [CREATOR, name, symbol, deadline, chainId]
    );
    console.log("Hash:", hash);

    const signature = await signer.signMessage(ethers.getBytes(hash));
    console.log("Signature:", signature);
    console.log("Signer address:", signer.address);

    // Try static call first
    console.log("\n--- Attempting static call ---");
    try {
        // Need to impersonate the creator as msg.sender
        const creatorSigner = await ethers.getImpersonatedSigner(CREATOR);
        const factoryAsCreator = factory.connect(creatorSigner);

        const result = await factoryAsCreator.createCreatorShare.staticCall(name, symbol, deadline, signature);
        console.log("Static call result:", result);
    } catch (e: any) {
        console.log("Static call error:", e.message);
        if (e.data) console.log("Error data:", e.data);
    }
}

main().catch(console.error);
