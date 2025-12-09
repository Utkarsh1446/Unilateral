import { ethers } from "hardhat";

async function main() {
    const userAddress = "0x9f4c1f7eaa0b729b798f81be84b25fdf9f66a0bf";
    const platformTokenAddress = "0x8db26C1A4fB0e9d007b4F86fb39D6AA4262FBD68";
    const factoryAddress = "0x1Ac8F5ACCeC2C565F3b9791DeB390e821f79BFcB";

    // Decoded from user error log
    const questionId = "0x8b6a445a767efdd2753382515bd8487b04b4072eaf728b9c352ebf828f49f106";
    const feeAmount = 100000000n; // 100 USDC
    const deadline = 1765038974n;
    const signature = "0xcefa984e56f4b14f734d3ca3c68322de1136d16cbdf8bd1f30a14d8ec1ca66a02bf6bec6590a3419b155d9d34f3479baf91c0ec7d3c92c804998498a0b99fde01b";

    console.log("Debugging Request Market for:", userAddress);

    // 1. Check USDC Balance & Allowance
    const PlatformToken = await ethers.getContractFactory("PlatformToken");
    const usdc = PlatformToken.attach(platformTokenAddress);

    const balance = await usdc.balanceOf(userAddress);
    console.log("USDC Balance:", ethers.formatUnits(balance, 6));

    const allowance = await usdc.allowance(userAddress, factoryAddress);
    console.log("Allowance for Factory:", ethers.formatUnits(allowance, 6));

    if (allowance < feeAmount) {
        console.error("ERROR: Insufficient Allowance! Request will revert.");
    } else {
        console.log("Allowance is sufficient.");
    }

    // 2. Simulate requestMarket
    console.log("Simulating requestMarket...");
    const OpinionMarketFactory = await ethers.getContractFactory("OpinionMarketFactory");
    const factory = OpinionMarketFactory.attach(factoryAddress);

    try {
        // We can't impersonate on public testnet, but we can callStatic to see if it reverts
        // Note: callStatic uses the provider's view, so if we don't have the private key we can't sign as the user.
        // However, we DO have the private key for this address in .env (it's the deployer/admin).

        const [signer] = await ethers.getSigners();
        if (signer.address.toLowerCase() === userAddress.toLowerCase()) {
            console.log("Signer matches user, attempting simulation...");
            await factory.requestMarket.staticCall(questionId, feeAmount, deadline, signature);
            console.log("Simulation SUCCESS: requestMarket would succeed.");
        } else {
            console.log("Signer mismatch, cannot simulate exact transaction.");
        }

    } catch (error: any) {
        console.error("Simulation FAILED!");
        if (error.data) {
            console.error("Revert data:", error.data);
            try {
                const reason = ethers.toUtf8String('0x' + error.data.substring(138));
                console.error("Decoded reason:", reason);
            } catch (e) { }
        } else if (error.reason) {
            console.error("Revert reason:", error.reason);
        } else {
            console.error(error);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
