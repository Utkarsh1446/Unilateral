const { ethers } = require("ethers");

async function main() {
    const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");

    const ctAddress = "0xe053845098384c546FfB682DE4038b246213aBEE";
    const userAddress = "0x9f4c1f7eaa0b729b798f81be84b25fdf9f66a0bf";
    const marketAddress = "0x3d6dc713C315e709c12Da324c48d526d63fbff8D"; // Latest market
    const collateralAddress = "0xF904c3653282efaeDC56aBC448fd5b53afB4342d";

    const marketAbi = ["function conditionId() view returns (bytes32)"];
    const ctAbi = ["function balanceOf(address,uint256) view returns (uint256)"];

    const market = new ethers.Contract(marketAddress, marketAbi, provider);
    const ct = new ethers.Contract(ctAddress, ctAbi, provider);

    const conditionId = await market.conditionId();
    console.log("ConditionId:", conditionId);

    // tokenId for outcome 0 (YES): indexSet = 1 << 0 = 1
    const tokenId0 = ethers.keccak256(ethers.solidityPacked(
        ["address", "bytes32", "uint256"],
        [collateralAddress, conditionId, 1]
    ));
    console.log("TokenId 0 (YES):", tokenId0);

    // tokenId for outcome 1 (NO): indexSet = 1 << 1 = 2
    const tokenId1 = ethers.keccak256(ethers.solidityPacked(
        ["address", "bytes32", "uint256"],
        [collateralAddress, conditionId, 2]
    ));
    console.log("TokenId 1 (NO):", tokenId1);

    // Error shows tokenId: fb2755e9e4a637a94dbc1cfeffbd1f8c203287f63ed6b789e2b45d4d94364d1d
    console.log("Expected from error: 0xfb2755e9e4a637a94dbc1cfeffbd1f8c203287f63ed6b789e2b45d4d94364d1d");

    // Check balances
    const balance0 = await ct.balanceOf(userAddress, tokenId0);
    console.log("Balance 0 (YES):", balance0.toString());

    const balance1 = await ct.balanceOf(userAddress, tokenId1);
    console.log("Balance 1 (NO):", balance1.toString());
}

main().catch(console.error);
