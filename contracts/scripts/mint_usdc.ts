import { ethers } from "hardhat";

async function main() {
    const tokenAddress = "0xd2007BD89BcB013A5E9544e79aAcAE7976E0a285";
    const adminWallet = "0x9f4c1f7eaa0b729b798f81be84b25fdf9f66a0bf";

    const token = await ethers.getContractAt("PlatformToken", tokenAddress);
    const amount = ethers.parseUnits("1000000", 6); // 1M USDC

    console.log("Minting 1M USDC to", adminWallet);
    const tx = await token.mint(adminWallet, amount);
    await tx.wait();
    console.log("Minted successfully!");

    const balance = await token.balanceOf(adminWallet);
    console.log("Balance:", ethers.formatUnits(balance, 6), "USDC");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
