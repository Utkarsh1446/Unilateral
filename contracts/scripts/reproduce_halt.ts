
const { ethers } = require("hardhat");

async function main() {
    const marketAddress = "0x988969891471f1f7CA8d8328f554a96f18F034b9";
    const OpinionMarket = await ethers.getContractFactory("OpinionMarket");
    const market = OpinionMarket.attach(marketAddress);

    const [signer] = await ethers.getSigners();
    console.log("Signer:", signer.address);

    // Approve USDC
    const USDC_ADDRESS = "0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf"; // PlatformToken (same as signer/admin in this test setup?)
    // Wait, in previous scripts PlatformToken was deployed. Let's find its address.
    // It's usually the signer address if we deployed a mock, but wait.
    // In `verify_amm.ts`, we used `CONTRACTS.PlatformToken`.
    // Let's assume the signer has USDC and approved.

    // Actually, let's just use the contract instance if we can find it.
    // Or just try to buy. If approval fails, we know.

    const amount = ethers.parseUnits("100", 6); // 100 USDC per trade

    console.log("Buying YES repeatedly...");

    for (let i = 0; i < 20; i++) {
        try {
            console.log(`Trade ${i + 1}: Buying YES with 100 USDC...`);
            const tx = await market.buyOutcome(0, amount);
            await tx.wait();
            console.log(`Trade ${i + 1} Success`);

            const probs = await market.getProbabilities();
            console.log("Probs:", probs.map(p => ethers.formatUnits(p, 18)));
        } catch (e) {
            console.error(`Trade ${i + 1} Failed!`);
            console.error(e);

            // Try to decode error
            if (e.data) {
                console.log("Error Data:", e.data);
            }
            break;
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
