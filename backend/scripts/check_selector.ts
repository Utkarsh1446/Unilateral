import { ethers } from "ethers";

const FACTORY_ABI = [
    "function createMarket(bytes32 questionId, uint256 initialVirtualLiquidity, uint256 initialRealLiquidity, uint256 feeAmount, uint256 deadline, bytes memory signature) external returns (address)"
];

async function main() {
    const iface = new ethers.Interface(FACTORY_ABI);
    const selector = iface.getFunction("createMarket")?.selector;
    console.log("createMarket selector:", selector);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
