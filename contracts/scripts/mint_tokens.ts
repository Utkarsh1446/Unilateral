import { ethers } from "hardhat";

async function main() {
    const userWallet = "0xcdd92E6a7355Df125A581a2aa413de9ddb654A54";
    const platformTokenAddress = "0xC59FD3678fCCB26284f763832579463AED36304D";
    const amount = ethers.parseUnits("1000000", 6); // 1M USDC (6 decimals)

    const [deployer] = await ethers.getSigners();
    console.log("Minting tokens with:", deployer.address);

    const PlatformToken = await ethers.getContractAt("PlatformToken", platformTokenAddress);

    console.log(`Minting ${ethers.formatUnits(amount, 6)} USDC to ${userWallet}...`);
    const tx = await PlatformToken.mint(userWallet, amount);
    await tx.wait();

    const balance = await PlatformToken.balanceOf(userWallet);
    console.log(`New balance: ${ethers.formatUnits(balance, 6)} USDC`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
