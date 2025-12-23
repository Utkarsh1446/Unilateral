import { ethers } from "hardhat";

async function main() {
    const USDC_ADDRESS = "0xC59FD3678fCCB26284f763832579463AED36304D"; // Correct PlatformToken
    const FACTORY_ADDRESS = "0x75f92fEbA7129fB8e90dBC4047Fb49F35185ea8C";
    const AMOUNT = ethers.parseUnits("100000", 6); // 100k USDC

    console.log("🪙 Minting and Transferring USDC to Factory\n");
    console.log("USDC:", USDC_ADDRESS);
    console.log("Factory:", FACTORY_ADDRESS);
    console.log("Amount:", ethers.formatUnits(AMOUNT, 6), "USDC\n");

    const [signer] = await ethers.getSigners();
    console.log("Signer:", signer.address);

    const usdc = await ethers.getContractAt("PlatformToken", USDC_ADDRESS);

    // Mint USDC directly to factory
    console.log("Minting USDC to factory...");
    const tx = await usdc.mint(FACTORY_ADDRESS, AMOUNT);
    console.log("Transaction:", tx.hash);
    await tx.wait();

    const balance = await usdc.balanceOf(FACTORY_ADDRESS);
    console.log("✅ Factory USDC balance:", ethers.formatUnits(balance, 6), "USDC");
    console.log("Markets that can be created:", Math.floor(Number(balance) / 10_000_000_000));
}

main().catch(console.error);
