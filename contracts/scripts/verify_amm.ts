import { ethers } from "hardhat";

async function main() {
    const [admin] = await ethers.getSigners();
    console.log("Verifying AMM with account:", admin.address);

    // Addresses from deployment
    const CONTRACTS = {
        PlatformToken: "0x15160C6815ce00940712a2C1ba975Edf3c1Ac9Cf",
        OpinionMarketFactory: "0x00afB4Afd37586589701a08361D003C0461EF574",
        VirtualToken: "0x9a0B7E8c085CD0dF1ad6dEde68Ef016640582eE3"
    };
    const factoryAddress = CONTRACTS.OpinionMarketFactory;
    const conditionalTokensAddress = "0x89a39B0Aa5c4a9212cB302aE30cCeCfb3E84d1a5";
    const adminControllerAddress = "0x9ba28F78E0EF2C37D6d63A8dD79a956186CB9Fd9";

    const factory = await ethers.getContractAt("OpinionMarketFactory", factoryAddress);
    const platformToken = await ethers.getContractAt("PlatformToken", CONTRACTS.PlatformToken);
    const conditionalTokens = await ethers.getContractAt("ConditionalTokens", conditionalTokensAddress);
    const adminController = await ethers.getContractAt("AdminController", adminControllerAddress);

    const SIGNER_ROLE = await adminController.SIGNER_ROLE();
    const hasRole = await adminController.hasRole(SIGNER_ROLE, admin.address);
    console.log(`Admin Address: ${admin.address}`);
    console.log(`Has SIGNER_ROLE: ${hasRole}`);

    const chainId = (await ethers.provider.getNetwork()).chainId;
    console.log(`Chain ID: ${chainId}`);

    // 1. Create Market with Seed Liquidity
    const questionId = ethers.keccak256(ethers.toUtf8Bytes("Will AMM Work? " + Date.now()));
    const initialVirtualLiquidity = ethers.parseUnits("100", 6); // 100 Virtual Liquidity
    const initialRealLiquidity = ethers.parseUnits("100", 6); // 100 Real Liquidity (USDC)
    const feeAmount = 0;
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    const hash = ethers.solidityPackedKeccak256(
        ["address", "bytes32", "uint256", "uint256", "uint256", "uint256"],
        [admin.address, questionId, initialVirtualLiquidity, feeAmount, deadline, chainId]
    );
    console.log("Hash:", hash);
    const signature = await admin.signMessage(ethers.getBytes(hash));

    // Approve Factory to spend USDC for seeding
    await platformToken.approve(factoryAddress, initialRealLiquidity);
    console.log("Approved Factory to spend USDC.");

    // Test 1: Create Market WITHOUT Seeding (to verify basic creation)
    console.log("Creating market WITHOUT seeding...");
    const questionId1 = ethers.keccak256(ethers.toUtf8Bytes("No Seed " + Date.now()));
    const hash1 = ethers.solidityPackedKeccak256(
        ["address", "bytes32", "uint256", "uint256", "uint256", "uint256"],
        [admin.address, questionId1, initialVirtualLiquidity, feeAmount, deadline, chainId]
    );
    const signature1 = await admin.signMessage(ethers.getBytes(hash1));

    try {
        const tx1 = await factory.createMarket(questionId1, initialVirtualLiquidity, 0, feeAmount, deadline, signature1, { gasLimit: 5000000 });
        await tx1.wait();
        console.log("Market created WITHOUT seeding successfully.");
    } catch (e) {
        console.error("Failed to create market WITHOUT seeding:", e);
    }

    // Test 2: Create Market WITH Seeding
    console.log("Creating market WITH seeding...");
    const tx = await factory.createMarket(questionId, initialVirtualLiquidity, initialRealLiquidity, feeAmount, deadline, signature, { gasLimit: 5000000 });
    const receipt = await tx.wait();

    // Find MarketCreated event
    const event = receipt?.logs.find((log: any) => {
        try {
            return factory.interface.parseLog(log)?.name === "MarketCreated";
        } catch (e) { return false; }
    });
    const marketAddress = factory.interface.parseLog(event!)?.args[0];
    console.log("Market created at:", marketAddress);

    const market = await ethers.getContractAt("OpinionMarket", marketAddress);

    // Check Market Role
    // Check Market Role
    // const virtualTokenAddress = "0x84A903257e6c2b27001b97e0036cBf0a8B703B9a";
    const virtualToken = await ethers.getContractAt("VirtualToken", CONTRACTS.VirtualToken);
    const MARKET_ROLE = await virtualToken.MARKET_ROLE();
    const hasMarketRole = await virtualToken.hasRole(MARKET_ROLE, marketAddress);
    console.log(`Market has MARKET_ROLE on VirtualToken: ${hasMarketRole}`);

    // Check Balance and Allowance
    const balance = await platformToken.balanceOf(admin.address);
    console.log(`User USDC Balance: ${ethers.formatUnits(balance, 6)}`);

    // 2. Approve USDC for Trade
    console.log("Approving USDC for Trade...");
    const approveAmount = ethers.parseUnits("1000", 6);
    const approveTx = await platformToken.approve(marketAddress, approveAmount, { gasLimit: 500000 });
    console.log("Approve Tx Hash:", approveTx.hash);
    await approveTx.wait();

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    const allowance = await platformToken.allowance(admin.address, marketAddress);
    console.log(`Allowance: ${ethers.formatUnits(allowance, 6)}`);

    // 3. Buy YES (Trade 1)
    const amountIn = ethers.parseUnits("10", 6); // 10 USDC
    console.log("Buying YES (Trade 1) - 10 USDC");

    try {
        await market.buyOutcome.staticCall(0, amountIn);
        console.log("Static Call Buy 1 Successful!");
    } catch (e) {
        console.error("Static Call Buy 1 Failed:", e);
    }

    const tx1 = await market.buyOutcome(0, amountIn, { gasLimit: 1000000 });
    const receipt1 = await tx1.wait();

    // Get Trade event
    const tradeEvent1 = receipt1?.logs.find((log: any) => {
        try {
            return market.interface.parseLog(log)?.name === "Trade";
        } catch (e) { return false; }
    });
    const args1 = market.interface.parseLog(tradeEvent1!)?.args;
    const shares1 = parseFloat(ethers.formatUnits(args1![3], 6)); // amountOut
    console.log(`Trade 1: Received ${shares1} YES Shares`);

    // 4. Buy YES (Trade 2)
    console.log("Buying YES (Trade 2) - 10 USDC");

    try {
        await market.buyOutcome.staticCall(0, amountIn);
        console.log("Static Call Buy 2 Successful!");
    } catch (e) {
        console.error("Static Call Buy 2 Failed:", e);
    }

    const tx2 = await market.buyOutcome(0, amountIn, { gasLimit: 1000000 });
    const receipt2 = await tx2.wait();

    const tradeEvent2 = receipt2?.logs.find((log: any) => {
        try {
            return market.interface.parseLog(log)?.name === "Trade";
        } catch (e) { return false; }
    });
    const args2 = market.interface.parseLog(tradeEvent2!)?.args;
    const shares2 = parseFloat(ethers.formatUnits(args2![3], 6)); // amountOut
    console.log(`Trade 2: Received ${shares2} YES Shares`);

    // 5. Verify
    console.log("---------------------------------------------------");
    if (shares2 < shares1) {
        console.log("SUCCESS: Shares received decreased (Price Increased). AMM logic is correct.");
    } else {
        console.log("FAILURE: Shares received increased or stayed same (Price Decreased/Flat). AMM logic is inverted.");
    }
    console.log("---------------------------------------------------");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
