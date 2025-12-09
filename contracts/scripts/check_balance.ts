import { ethers } from "hardhat";

async function main() {
    const address = "0x9f4c1f7eaa0b729b798f81be84b25fdf9f66a0bf";
    console.log(`Checking balance for ${address} on Base Sepolia...`);
    const balance = await ethers.provider.getBalance(address);
    console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
