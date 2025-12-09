import { ethers } from "hardhat";

async function main() {
    const userAddress = "0x9f4c1f7eaa0b729b798f81be84b25fdf9f66a0bf";
    const platformTokenAddress = "0xd2007BD89BcB013A5E9544e79aAcAE7976E0a285";
    const conditionalTokensAddress = "0xd6C4ADD0fF1b980dc4c300cc1DEf2114334444ea";
    const orderBookAddress = "0x3D22641c54BA5CB4e4b81949aA6E502bCEfcE3B7";

    // New market from latest attempt
    const marketAddress = "0x7cfee3d23626bc4c1dd90700942d9532fc5c4666";

    console.log("Debugging market:", marketAddress);

    const ConditionalTokens = await ethers.getContractAt("ConditionalTokens", conditionalTokensAddress);
    const PlatformToken = await ethers.getContractAt("PlatformToken", platformTokenAddress);
    const OpinionMarket = await ethers.getContractAt("OpinionMarket", marketAddress);
    const OrderBook = await ethers.getContractAt("OrderBook", orderBookAddress);

    // Get market info
    const collateral = await OpinionMarket.collateralToken();
    const conditionId = await OpinionMarket.conditionId();
    const creator = await OpinionMarket.creator();

    console.log("Collateral:", collateral);
    console.log("ConditionId:", conditionId);
    console.log("Creator:", creator);

    // Calculate token IDs
    const indexSet0 = 1n << 0n; // 1
    const indexSet1 = 1n << 1n; // 2

    const tokenId0 = ethers.keccak256(
        ethers.solidityPacked(["address", "bytes32", "uint256"], [collateral, conditionId, indexSet0])
    );
    const tokenId1 = ethers.keccak256(
        ethers.solidityPacked(["address", "bytes32", "uint256"], [collateral, conditionId, indexSet1])
    );

    console.log("\nToken ID 0 (YES):", tokenId0);
    console.log("Token ID 1 (NO):", tokenId1);

    // Check balances
    const userBal0 = await ConditionalTokens.balanceOf(userAddress, tokenId0);
    const userBal1 = await ConditionalTokens.balanceOf(userAddress, tokenId1);
    const marketBal0 = await ConditionalTokens.balanceOf(marketAddress, tokenId0);
    const marketBal1 = await ConditionalTokens.balanceOf(marketAddress, tokenId1);
    const orderBookBal0 = await ConditionalTokens.balanceOf(orderBookAddress, tokenId0);
    const orderBookBal1 = await ConditionalTokens.balanceOf(orderBookAddress, tokenId1);

    console.log("\n=== Conditional Token Balances ===");
    console.log("User YES:", ethers.formatUnits(userBal0, 6));
    console.log("User NO:", ethers.formatUnits(userBal1, 6));
    console.log("Market YES:", ethers.formatUnits(marketBal0, 6));
    console.log("Market NO:", ethers.formatUnits(marketBal1, 6));
    console.log("OrderBook YES:", ethers.formatUnits(orderBookBal0, 6));
    console.log("OrderBook NO:", ethers.formatUnits(orderBookBal1, 6));

    // Check USDC balances
    const userUSDC = await PlatformToken.balanceOf(userAddress);
    const marketUSDC = await PlatformToken.balanceOf(marketAddress);
    console.log("\n=== USDC Balances ===");
    console.log("User USDC:", ethers.formatUnits(userUSDC, 6));
    console.log("Market USDC:", ethers.formatUnits(marketUSDC, 6));

    // Check allowances
    const allowanceToMarket = await PlatformToken.allowance(userAddress, marketAddress);
    console.log("\n=== Allowances ===");
    console.log("User -> Market allowance:", ethers.formatUnits(allowanceToMarket, 6));

    // Check CT approval
    const isApproved = await ConditionalTokens.isApprovedForAll(userAddress, orderBookAddress);
    console.log("User approved OrderBook for CT:", isApproved);

    // Check OrderBook orders
    const nextOrderId = await OrderBook.nextOrderId();
    console.log("\n=== OrderBook ===");
    console.log("Next Order ID:", nextOrderId.toString());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
