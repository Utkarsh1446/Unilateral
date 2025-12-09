import { ethers } from "ethers";

const FACTORY_ADDRESS = "0x62c6186E67427135ccDe51C5f0F875aE63e5cCCc";
const RPC_URL = "https://sepolia.base.org";

const FACTORY_ABI = [
    "function collateralToken() view returns (address)",
    "function virtualToken() view returns (address)",
    "function conditionalTokens() view returns (address)",
    "function feeCollector() view returns (address)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

    console.log("Checking Factory Configuration...");
    console.log("Factory Address:", FACTORY_ADDRESS);

    const collateralToken = await factory.collateralToken();
    console.log("Collateral Token:", collateralToken);

    const virtualToken = await factory.virtualToken();
    console.log("Virtual Token:", virtualToken);

    const conditionalTokens = await factory.conditionalTokens();
    console.log("Conditional Tokens:", conditionalTokens);

    const feeCollector = await factory.feeCollector();
    console.log("Fee Collector:", feeCollector);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
