import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying new OrderBook with account:", deployer.address);

    // Existing addresses
    const feeCollectorAddress = "0xe2440cB49b1cB590907485762ee572e00ccAaF50";
    const creatorShareFactoryAddress = "0x641059f086F02Fd3c637Bf826c543653525eb108";

    console.log("Deploying OrderBook...");
    const OrderBook = await ethers.getContractFactory("OrderBook");
    const orderBook = await OrderBook.deploy(feeCollectorAddress, creatorShareFactoryAddress);
    await orderBook.waitForDeployment();

    const orderBookAddress = await orderBook.getAddress();
    console.log("✅ New OrderBook deployed at:", orderBookAddress);

    console.log("\n⚠️  UPDATE THESE FILES:");
    console.log("1. frontend_new/src/lib/contracts.ts - OrderBook address");
    console.log("2. backend/.env - ORDER_BOOK_ADDRESS");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
