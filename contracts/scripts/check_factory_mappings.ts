import { ethers } from "hardhat";

// The factory the OrderBook actually uses
const ORDERBOOK_FACTORY = "0x641059f086F02Fd3c637Bf826c543653525eb108";
// The factory we deployed shares from
const OUR_FACTORY = "0x015f90Ad13286b87E771AD7fe969d4a0690418F0";

const CREATOR_WALLET = "0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf";
const CREATOR_SHARE = "0x8bcdc1ecd70d6f467caa92398ad1e03f3453e0a4";

async function main() {
    console.log("=== Checking Factory Mappings ===\n");

    // Check the OrderBook's factory
    console.log("OrderBook's Factory:", ORDERBOOK_FACTORY);
    try {
        const obFactory = await ethers.getContractAt("CreatorShareFactory", ORDERBOOK_FACTORY);
        const share1 = await obFactory.creatorToShare(CREATOR_WALLET);
        console.log("  Creator -> Share:", share1);
        if (share1 === ethers.ZeroAddress) {
            console.log("  ❌ Rugbusters NOT registered in this factory");
        }
    } catch (e: any) {
        console.log("  Error:", e.message);
    }

    // Check our deployed factory
    console.log("\nOur Deployed Factory:", OUR_FACTORY);
    try {
        const ourFactory = await ethers.getContractAt("CreatorShareFactory", OUR_FACTORY);
        const share2 = await ourFactory.creatorToShare(CREATOR_WALLET);
        console.log("  Creator -> Share:", share2);
        if (share2.toLowerCase() === CREATOR_SHARE.toLowerCase()) {
            console.log("  ✅ Rugbusters IS registered in this factory");
        }
    } catch (e: any) {
        console.log("  Error:", e.message);
    }

    // Solution options
    console.log("\n=== SOLUTION OPTIONS ===");
    console.log("Option 1: Redeploy OrderBook with factory", OUR_FACTORY);
    console.log("Option 2: Add setCreatorShare() admin function to factory contract and redeploy factory");
    console.log("Option 3: Deploy new CreatorShare from the OrderBook's factory (will be different address)");
}

main().catch(console.error);
