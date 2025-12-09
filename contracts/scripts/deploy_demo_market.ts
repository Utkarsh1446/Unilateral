import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying Demo Market with account:", deployer.address);

    const FACTORY_ADDRESS = "0xcb93B6BAc8804cd9A194EFf91d39D463A7996cAc";
    const USDC_ADDRESS = "0x1d36d5D06cd0614F9FFd6aFff94009F38cE4A9D4";
    const CT_ADDRESS = "0xc21625e41399CAFA8b781aC82737f56F4686D4E0";

    const Factory = await ethers.getContractAt("OpinionMarketFactory", FACTORY_ADDRESS);
    const USDC = await ethers.getContractAt("PlatformToken", USDC_ADDRESS);
    const ConditionalTokens = await ethers.getContractAt("ConditionalTokens", CT_ADDRESS);

    // 1. Create Market
    const questionId = ethers.hexlify(ethers.randomBytes(32));
    console.log("Creating market with Question ID:", questionId);

    const initialVirtualLiquidity = ethers.parseUnits("100", 18);
    const feeAmount = 0;
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    const chainId = (await deployer.provider.getNetwork()).chainId;

    console.log("Chain ID:", chainId);
    console.log("Deployer:", deployer.address);

    // Check AdminController
    const adminControllerAddress = await Factory.adminController();
    const AdminController = await ethers.getContractAt("AdminController", adminControllerAddress);
    const SIGNER_ROLE = await AdminController.SIGNER_ROLE();
    const hasRole = await AdminController.hasRole(SIGNER_ROLE, deployer.address);
    console.log("Has SIGNER_ROLE:", hasRole);

    if (!hasRole) {
        console.log("Granting SIGNER_ROLE...");
        // We need DEFAULT_ADMIN_ROLE to grant.
        // If deployer doesn't have it, we are stuck.
        // But deployer SHOULD have it from deployment.
        const DEFAULT_ADMIN_ROLE = await AdminController.DEFAULT_ADMIN_ROLE();
        const isAdmin = await AdminController.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
        console.log("Has ADMIN_ROLE:", isAdmin);

        if (isAdmin) {
            await (await AdminController.grantRole(SIGNER_ROLE, deployer.address)).wait();
            console.log("Granted SIGNER_ROLE");
        } else {
            console.error("Cannot grant SIGNER_ROLE. Deployer is not Admin.");
            return;
        }
    }

    // Check VirtualToken Roles
    const VirtualToken = await ethers.getContractAt("VirtualToken", "0x1D50361ABDa75bEa4f86FCd8aE9Df9f354F1E1B9");
    const ADMIN_ROLE = await VirtualToken.ADMIN_ROLE();
    const hasAdminRole = await VirtualToken.hasRole(ADMIN_ROLE, FACTORY_ADDRESS);
    console.log("Factory has ADMIN_ROLE on VirtualToken:", hasAdminRole);

    if (!hasAdminRole) {
        console.log("Granting ADMIN_ROLE to Factory...");
        await (await VirtualToken.grantRole(ADMIN_ROLE, FACTORY_ADDRESS)).wait();
        console.log("Granted ADMIN_ROLE");
    }

    // Generate Signature
    // keccak256(abi.encodePacked(msg.sender, questionId, initialVirtualLiquidity, feeAmount, deadline, block.chainid));

    // Ensure types are correct
    const types = ["address", "bytes32", "uint256", "uint256", "uint256", "uint256"];
    const values = [deployer.address, questionId, initialVirtualLiquidity, feeAmount, deadline, chainId];

    const hash = ethers.solidityPackedKeccak256(types, values);
    const signature = await deployer.signMessage(ethers.getBytes(hash));

    console.log("Hash:", hash);
    console.log("Signature:", signature);

    // Verify locally
    const recovered = ethers.verifyMessage(ethers.getBytes(hash), signature);
    console.log("Recovered Signer:", recovered);
    console.log("Matches Deployer?", recovered === deployer.address);

    const tx = await Factory.createMarket(questionId, initialVirtualLiquidity, feeAmount, deadline, signature);
    const receipt = await tx.wait();

    // Find MarketCreated event
    // Event signature: MarketCreated(address indexed market, bytes32 indexed questionId, address indexed creator)
    // But we can just query the factory or look at logs.
    // Let's look at logs.

    let marketAddress = "";
    for (const log of receipt!.logs) {
        try {
            const parsed = Factory.interface.parseLog(log as any);
            if (parsed?.name === "MarketCreated") {
                marketAddress = parsed.args[0];
                console.log("Market Deployed to:", marketAddress);
                break;
            }
        } catch (e) { }
    }

    if (!marketAddress) {
        console.error("Could not find MarketCreated event");
        return;
    }

    // Grant MARKET_ROLE to the new Market
    const MARKET_ROLE = await VirtualToken.MARKET_ROLE();
    console.log("Granting MARKET_ROLE to Market...");
    await (await VirtualToken.grantRole(MARKET_ROLE, marketAddress)).wait();
    console.log("Granted MARKET_ROLE");

    // 2. Seed Real Liquidity
    console.log("Seeding Real Liquidity...");
    const amount = ethers.parseUnits("1000", 6); // 1000 USDC

    // Mint USDC
    await (await USDC.mint(deployer.address, amount)).wait();

    // Approve CT
    console.log("Resetting Allowance...");
    await (await USDC.approve(CT_ADDRESS, 0)).wait();
    console.log("Approving CT...");
    await (await USDC.approve(CT_ADDRESS, amount)).wait();

    // Split Position
    const Market = await ethers.getContractAt("OpinionMarket", marketAddress);
    const conditionId = await Market.conditionId();

    await (await ConditionalTokens.splitPosition(USDC_ADDRESS, conditionId, amount, { gasLimit: 1000000 })).wait();

    // Transfer YES/NO to Market
    const getId = (index: number) => {
        return ethers.solidityPackedKeccak256(
            ["address", "bytes32", "uint256"],
            [USDC_ADDRESS, conditionId, index]
        );
    };

    const id0 = getId(0);
    const id1 = getId(1);

    const safeTransferFrom = ConditionalTokens.getFunction("safeTransferFrom");
    await (await safeTransferFrom(deployer.address, marketAddress, id0, amount, "0x")).wait();
    await (await safeTransferFrom(deployer.address, marketAddress, id1, amount, "0x")).wait();

    console.log("Liquidity Seeded!");
    console.log("MARKET_ADDRESS:", marketAddress);
    console.log("QUESTION_ID:", questionId);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
