import { ethers } from "hardhat";

async function main() {
    const USDC_ADDRESS = "0xd2007BD89BcB013A5E9544e79aAcAE7976E0a285"; // PlatformToken
    const FACTORY_ADDRESS = "0x75f92fEbA7129fB8e90dBC4047Fb49F35185ea8C";
    const AMOUNT = ethers.parseUnits("100000", 6); // 100k USDC

    console.log("Transferring USDC to factory...");
    console.log("USDC:", USDC_ADDRESS);
    console.log("Factory:", FACTORY_ADDRESS);
    console.log("Amount:", ethers.formatUnits(AMOUNT, 6), "USDC\n");

    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);

    const tx = await usdc.transfer(FACTORY_ADDRESS, AMOUNT);
    console.log("Transaction:", tx.hash);
    await tx.wait();

    const balance = await usdc.balanceOf(FACTORY_ADDRESS);
    console.log("✅ Factory balance:", ethers.formatUnits(balance, 6), "USDC");
}

main().catch(console.error);
