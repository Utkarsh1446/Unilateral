import { ethers } from "hardhat";

/**
 * This script:
 * 1. Deploys a new CreatorShareFactory with the registerExistingShare function
 * 2. Deploys a new OrderBook pointing to the new factory
 * 3. Registers the existing Rugbusters share
 * 4. Updates the AdminController with the new OrderBook
 */

const ADMIN_CONTROLLER = "0x1cCe371908eBEb0ce1A78e9af69D7Bb14D97ec8a";
const FEE_COLLECTOR = "0xe2440cB49b1cB590907485762ee572e00ccAaF50";
const USDC = "0xC59FD3678fCCB26284f763832579463AED36304D";

// Existing share to register
const RUGBUSTERS_CREATOR = "0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf";
const RUGBUSTERS_SHARE = "0x8bcdc1ecd70d6f467caa92398ad1e03f3453e0a4";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("");

    // Step 1: Deploy new CreatorShareFactory
    console.log("1. Deploying new CreatorShareFactory...");
    const CreatorShareFactory = await ethers.getContractFactory("CreatorShareFactory");
    const newFactory = await CreatorShareFactory.deploy(FEE_COLLECTOR, USDC, ADMIN_CONTROLLER);
    await newFactory.waitForDeployment();
    const newFactoryAddress = await newFactory.getAddress();
    console.log("   New CreatorShareFactory:", newFactoryAddress);

    // Step 2: Register the existing Rugbusters share
    console.log("\n2. Registering Rugbusters share...");
    const tx = await newFactory.registerExistingShare(RUGBUSTERS_CREATOR, RUGBUSTERS_SHARE);
    await tx.wait();
    console.log("   ✅ Registered Rugbusters share");

    // Verify registration
    const registeredShare = await newFactory.creatorToShare(RUGBUSTERS_CREATOR);
    console.log("   Verification - Creator -> Share:", registeredShare);

    // Step 3: Deploy new OrderBook with new factory
    console.log("\n3. Deploying new OrderBook...");
    const OrderBook = await ethers.getContractFactory("OrderBook");
    const newOrderBook = await OrderBook.deploy(FEE_COLLECTOR, newFactoryAddress);
    await newOrderBook.waitForDeployment();
    const newOrderBookAddress = await newOrderBook.getAddress();
    console.log("   New OrderBook:", newOrderBookAddress);

    // Verify OrderBook's factory
    const obFactory = await newOrderBook.creatorShareFactory();
    console.log("   OrderBook's Factory:", obFactory);

    // Step 4: Update AdminController
    console.log("\n4. Updating AdminController with new OrderBook...");
    const adminController = await ethers.getContractAt("AdminController", ADMIN_CONTROLLER);
    const tx2 = await adminController.setOrderBook(newOrderBookAddress);
    await tx2.wait();
    console.log("   ✅ AdminController updated");

    // Summary
    console.log("\n=== DEPLOYMENT COMPLETE ===");
    console.log("New CreatorShareFactory:", newFactoryAddress);
    console.log("New OrderBook:", newOrderBookAddress);
    console.log("\n⚠️  UPDATE REQUIRED:");
    console.log("Update frontend/src/lib/contracts.ts:");
    console.log(`  OrderBook: "${newOrderBookAddress}"`);
    console.log(`  CreatorShareFactory: "${newFactoryAddress}"`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
