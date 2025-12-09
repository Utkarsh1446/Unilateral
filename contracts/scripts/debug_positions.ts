import { ethers } from "hardhat";

const MARKET_ADDRESS = "0x290c67c87dd3B646E0d339a7F68438329C77f071";
const USER_ADDRESS = "0x9f4c1f7eaa0b729b798f81be84b25fdf9f66a0bf";
const INFURA_RPC = "https://base-sepolia.infura.io/v3/a6e3dd24c8b645dda9235a1c17a42124";

async function main() {
    const provider = new ethers.JsonRpcProvider(INFURA_RPC);

    const Market = new ethers.Contract(MARKET_ADDRESS, [
        "function conditionId() view returns (bytes32)",
        "function collateralToken() view returns (address)",
        "function conditionalTokens() view returns (address)"
    ], provider);

    const conditionId = await Market.conditionId();
    const collateralToken = await Market.collateralToken();
    const ctAddress = await Market.conditionalTokens();

    console.log("Market:", MARKET_ADDRESS);
    console.log("Condition ID:", conditionId);
    console.log("Collateral:", collateralToken);
    console.log("CT Address:", ctAddress);

    const ConditionalTokens = new ethers.Contract(ctAddress, [
        "function balanceOf(address, uint256) view returns (uint256)",
        "function balanceOfBatch(address[], uint256[]) view returns (uint256[])"
    ], provider);

    // Calculate Position IDs using CTHelpers logic (Simplified)
    const getPositionId = (index: number) => {
        const indexSet = 1 << index;

        // CTHelpers.getTokenId logic:
        // keccak256(abi.encodePacked(address(collateralToken), conditionId, 1 << index))

        const positionId = ethers.solidityPackedKeccak256(
            ["address", "bytes32", "uint256"],
            [collateralToken, conditionId, indexSet]
        );
        return { indexSet, collectionId: "N/A", positionId };
    };

    const p0 = getPositionId(0);
    const p1 = getPositionId(1);

    console.log("\n--- Outcome 0 (YES) ---");
    console.log("IndexSet:", p0.indexSet);
    console.log("Collection ID:", p0.collectionId);
    console.log("Position ID (Hex):", p0.positionId);
    console.log("Position ID (Dec):", BigInt(p0.positionId).toString());

    console.log("\n--- Outcome 1 (NO) ---");
    console.log("IndexSet:", p1.indexSet);
    console.log("Collection ID:", p1.collectionId);
    console.log("Position ID (Hex):", p1.positionId);
    console.log("Position ID (Dec):", BigInt(p1.positionId).toString());

    console.log("\n--- Balances ---");
    const bal0 = await ConditionalTokens.balanceOf(USER_ADDRESS, p0.positionId);
    const bal1 = await ConditionalTokens.balanceOf(USER_ADDRESS, p1.positionId);

    console.log("YES Balance:", ethers.formatUnits(bal0, 6));
    console.log("NO Balance:", ethers.formatUnits(bal1, 6));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
