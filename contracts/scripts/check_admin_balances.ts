const { ethers } = require("hardhat");

async function main() {
    const userAddress = "0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf";
    const provider = ethers.provider;

    // Check ETH Balance
    const ethBalance = await provider.getBalance(userAddress);
    console.log(`ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);

    // Check USDC Balance
    const usdcAddress = "0x8db26C1A4fB0e9d007b4F86fb39D6AA4262FBD68";
    const usdc = await ethers.getContractAt("IERC20", usdcAddress);
    const usdcBalance = await usdc.balanceOf(userAddress);
    console.log(`USDC Balance: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

    // Check Allowance for OrderBook
    const orderBookAddress = "0xd1C82bcD66dd6724fCE6Ac8D1aB37703Bd08ffa9";
    const allowance = await usdc.allowance(userAddress, orderBookAddress);
    console.log(`Allowance for OrderBook: ${ethers.formatUnits(allowance, 6)} USDC`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
