import { ethers } from "hardhat";
import { CONTRACTS } from "../frontend/src/lib/contracts"; // We can't import from frontend easily in hardhat scripts usually, so hardcode or fetch.

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Debugging with account:", deployer.address);

    // Addresses from previous deployment output
    const factoryAddress = "0xa548beCd27aaD0a8A17D0BBE2E61cb0372dD7297";
    const platformTokenAddress = "0x83800D6124f3b1A468D8d161583b1629003A4535";
    const conditionalTokensAddress = "0x36A127AB99bc123b60cAfaB0948037343B9A66e4";

    const Factory = await ethers.getContractAt("OpinionMarketFactory", factoryAddress);
    const Token = await ethers.getContractAt("PlatformToken", platformTokenAddress);
    const CT = await ethers.getContractAt("ConditionalTokens", conditionalTokensAddress);

    // Parameters
    const questionId = ethers.id("Test Question " + Date.now());
    const initialLiquidity = "1000000000"; // 1000 USDC (Virtual)
    const initialRealLiquidity = "1000000000"; // 1000 USDC (Real)
    const feeAmount = "0";
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    // Signature
    const chainId = (await ethers.provider.getNetwork()).chainId;
    // We need the signer wallet. In dev, deployer is signer?
    // Check AdminController to see who is signer.
    // In deploy.ts: await adminController.grantRole(SIGNER_ROLE, adminWallet);
    // adminWallet was "0x9f4c1f7eaa0b729b798f81be84b25fdf9f66a0bf".
    // We don't have the private key for that wallet in this script unless it's one of the hardhat accounts.
    // If we are on Base Sepolia, we can't sign as that wallet unless we have the key.
    // BUT, we can grant SIGNER_ROLE to 'deployer' for this test if we are admin.

    // Let's assume we are running this on localhost or we have the key.
    // If on Base Sepolia, we need the key.
    // The user's backend uses `process.env.PRIVATE_KEY`.
    // We can try to sign with `deployer` and see if it works (if deployer has role).
    // If not, we fail.

    // For now, let's just check the MARKET STATE of the market the USER created (if we knew the address).
    // Since we don't know the address, let's try to CREATE one.

    // Signature generation
    const hash = ethers.solidityPackedKeccak256(
        ["address", "bytes32", "uint256", "uint256", "uint256", "uint256"],
        [deployer.address, questionId, initialLiquidity, feeAmount, deadline, chainId]
    );
    const signature = await deployer.signMessage(ethers.getBytes(hash));

    console.log("Creating market...");
    try {
        const tx = await Factory.createMarket(
            questionId,
            initialLiquidity,
            initialRealLiquidity,
            feeAmount,
            deadline,
            signature
        );
        console.log("Tx sent:", tx.hash);
        const receipt = await tx.wait();

        // Find MarketCreated event
        const log = receipt?.logs.find(l => {
            try { return Factory.interface.parseLog(l)?.name === "MarketCreated"; } catch { return false; }
        });
        const parsed = log ? Factory.interface.parseLog(log) : null;
        const marketAddress = parsed?.args.market;
        console.log("Market Created at:", marketAddress);

        if (!marketAddress) {
            console.error("Market creation failed to emit event or event not found.");
            return;
        }

        // Check Balances
        const marketBalance = await Token.balanceOf(marketAddress);
        console.log("Market USDC Balance (should be 0, as it's split):", ethers.formatUnits(marketBalance, 6));

        // Wait for propagation
        await new Promise(r => setTimeout(r, 5000));

        // Check CT Balances (Reserves)
        const Market = await ethers.getContractAt("OpinionMarket", marketAddress);
        const conditionId = await Market.conditionId();

        // Calculate Token IDs
        const getToeknId = (idx: number) => ethers.solidityPackedKeccak256(
            ["address", "bytes32", "uint256"],
            [platformTokenAddress, conditionId, idx]
        );
        const id0 = getToeknId(0);
        const id1 = getToeknId(1);

        const bal0 = await CT.balanceOf(marketAddress, id0);
        const bal1 = await CT.balanceOf(marketAddress, id1);

        console.log("Market YES Reserve:", ethers.formatUnits(bal0, 6));
        console.log("Market NO Reserve:", ethers.formatUnits(bal1, 6));

        if (bal0 > 0n && bal1 > 0n) {
            console.log("SUCCESS: Market seeded with Real Liquidity!");
        } else {
            console.log("FAILURE: Market has NO Real Liquidity.");
        }

    } catch (e) {
        console.error("Creation failed:", e);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
