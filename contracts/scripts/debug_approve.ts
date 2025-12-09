import { ethers } from "hardhat";

async function main() {
    const platformTokenAddress = "0x199013a8eA21f024ab22A6d70FcFe920608aAC30";
    const spender = "0xb91942340a750d002C872913a6c0142B1b2aF2ec"; // CreatorShareFactory? No, user approves the SHARE contract, not factory.
    // Wait, the user approves the SHARE contract.
    // I need to know WHICH share contract they are trying to buy.
    // The logs showed "Deploying share... 0x3f76..."
    // So the share contract is likely 0x3f7621709404ddb854fda935d7b4211e0a19b7cfa8db59215bbd6010c1a486f7

    const shareAddress = "0x1976888692dda8215eb318882c894636d69c2a1b"; // From error payload
    const userAddress = "0x9f4c1f7eaa0b729b798f81be84b25fdf9f66a0bf";

    console.log(`Debugging approve for user ${userAddress} to spender ${shareAddress}...`);

    const PlatformToken = await ethers.getContractFactory("PlatformToken");
    const usdc = PlatformToken.attach(platformTokenAddress);

    // Check balance
    const balance = await usdc.balanceOf(userAddress);
    console.log(`USDC Balance: ${ethers.formatUnits(balance, 6)}`);

    // Check allowance
    const allowance = await usdc.allowance(userAddress, shareAddress);
    console.log(`Current Allowance: ${ethers.formatUnits(allowance, 6)}`);

    // Try to approve (impersonating user if on localhost, but this is Base Sepolia so I can't impersonate)
    // I can only simulate call or check if the contract exists.

    // Check if share contract exists
    const code = await ethers.provider.getCode(shareAddress);
    if (code === "0x") {
        console.log("ERROR: Share contract does not exist!");
    } else {
        console.log("Share contract exists.");
    }

    // Since I have the private key for 0x9f4c... (it's the deployer), I can try to run the tx.
    const [signer] = await ethers.getSigners();
    if (signer.address.toLowerCase() === userAddress.toLowerCase()) {
        console.log("Running approve tx...");
        try {
            const tx = await usdc.connect(signer).approve(shareAddress, ethers.MaxUint256);
            console.log("Approve tx hash:", tx.hash);
            await tx.wait();
            console.log("Approve successful!");
        } catch (e) {
            console.log("Approve failed:", e);
        }
    } else {
        console.log(`Signer ${signer.address} is not the user ${userAddress}. Cannot run tx.`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
