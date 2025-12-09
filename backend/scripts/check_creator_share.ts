import { ethers } from "ethers";

const CREATOR_SHARE_FACTORY_ADDRESS = "0xb91942340a750d002C872913a6c0142B1b2aF2ec";
const USER_ADDRESS = "0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf";
const RPC_URL = "https://sepolia.base.org";

const CREATOR_SHARE_FACTORY_ABI = [
    "function creatorToShare(address creator) view returns (address)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const factory = new ethers.Contract(CREATOR_SHARE_FACTORY_ADDRESS, CREATOR_SHARE_FACTORY_ABI, provider);

    console.log("Checking Creator Share Factory...");
    try {
        const shareAddress = await factory.creatorToShare(USER_ADDRESS);
        console.log(`Share Address for ${USER_ADDRESS}: ${shareAddress}`);
    } catch (error) {
        console.error("Error calling creatorToShare:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
