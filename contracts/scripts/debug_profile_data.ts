import { ethers } from "hardhat";

const USER_ADDRESS = "0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf";

// Contract addresses from frontend
const CONTRACTS = {
    ConditionalTokens: "0x493A0D94B445bD7a69a8C7f4a4630C62b5505B58",
    PlatformToken: "0xC59FD3678fCCB26284f763832579463AED36304D"
};

// Market to check (get the first active one)
const MARKET_ADDRESS = ""; // Will be filled from backend

async function main() {
    console.log("=== Debugging Profile Data ===");
    console.log("User:", USER_ADDRESS);

    // Fetch markets from backend
    const res = await fetch("http://127.0.0.1:3001/markets");
    const markets = await res.json();

    console.log("\n=== Active Markets ===");
    const activeMarkets = markets.filter((m: any) => m.status === 'active' && m.contract_address);
    console.log("Found", activeMarkets.length, "active markets with contract addresses");

    for (const market of activeMarkets) {
        console.log("\n--- Market:", market.question, "---");
        console.log("Contract:", market.contract_address);

        try {
            const marketContract = await ethers.getContractAt("OpinionMarket", market.contract_address);
            const conditionId = await marketContract.conditionId();
            const collateral = await marketContract.collateral();

            console.log("ConditionId:", conditionId);
            console.log("Collateral:", collateral);

            // Get ConditionalTokens contract
            const ct = await ethers.getContractAt("ConditionalTokens", CONTRACTS.ConditionalTokens);

            // Check balance for YES (outcome 0) and NO (outcome 1)
            for (let outcomeIndex = 0; outcomeIndex < 2; outcomeIndex++) {
                const indexSet = 1 << outcomeIndex;

                // Calculate positionId
                const positionId = ethers.solidityPackedKeccak256(
                    ['address', 'bytes32', 'uint256'],
                    [collateral, conditionId, indexSet]
                );

                const balance = await ct.balanceOf(USER_ADDRESS, positionId);
                const balanceFormatted = ethers.formatUnits(balance, 6);

                if (parseFloat(balanceFormatted) > 0) {
                    console.log(`  ${outcomeIndex === 0 ? 'YES' : 'NO'} Balance: ${balanceFormatted} shares`);
                }
            }
        } catch (err: any) {
            console.log("Error checking market:", err.message);
        }
    }

    // Check CreatorShare holdings
    console.log("\n=== Creator Share Holdings ===");
    const holdingsRes = await fetch(`http://127.0.0.1:3001/creators/holdings/${USER_ADDRESS}`);
    const holdings = await holdingsRes.json();

    console.log("Holdings from backend:", holdings.length, "shares");

    for (const h of holdings) {
        console.log("\n--- Share:", h.creatorName || h.creatorHandle, "---");
        console.log("Share Address:", h.shareAddress);

        try {
            const shareContract = await ethers.getContractAt("CreatorShare", h.shareAddress);
            const balance = await shareContract.balanceOf(USER_ADDRESS);
            const totalSupply = await shareContract.totalSupply();

            console.log("Balance:", ethers.formatEther(balance), "shares");
            console.log("Total Supply:", ethers.formatEther(totalSupply), "shares");

            // Try to get buy price (next share cost)
            try {
                const buyPrice = await shareContract.getBuyPrice(1);
                console.log("Current Buy Price for 1 share:", ethers.formatUnits(buyPrice, 6), "USDC");
            } catch (e) {
                console.log("Could not get buy price");
            }

            // Try to get pending dividends
            try {
                const pending = await shareContract.pendingDividends(USER_ADDRESS);
                console.log("Pending Dividends:", ethers.formatUnits(pending, 6), "USDC");
            } catch (e) {
                console.log("Could not get dividends");
            }
        } catch (err: any) {
            console.log("Error:", err.message);
        }
    }
}

main().catch(console.error);
