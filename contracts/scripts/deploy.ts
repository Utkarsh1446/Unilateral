import { ethers } from "hardhat";

async function main() {
    console.log("Starting deployment to Base Sepolia...");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // 1. Deploy PlatformToken (Mock USDC)
    console.log("Deploying PlatformToken...");
    const PlatformToken = await ethers.getContractFactory("PlatformToken");
    const platformToken = await PlatformToken.deploy();
    await platformToken.waitForDeployment();
    const platformTokenAddress = await platformToken.getAddress();
    console.log("PlatformToken deployed to:", platformTokenAddress);

    // 2. Deploy ConditionalTokens
    console.log("Deploying ConditionalTokens...");
    const ConditionalTokens = await ethers.getContractFactory("ConditionalTokens");
    const conditionalTokens = await ConditionalTokens.deploy();
    await conditionalTokens.waitForDeployment();
    const conditionalTokensAddress = await conditionalTokens.getAddress();
    console.log("ConditionalTokens deployed to:", conditionalTokensAddress);

    // 3. Deploy FeeCollector
    console.log("Deploying FeeCollector...");
    const FeeCollector = await ethers.getContractFactory("FeeCollector");
    const feeCollector = await FeeCollector.deploy();
    await feeCollector.waitForDeployment();
    const feeCollectorAddress = await feeCollector.getAddress();
    console.log("FeeCollector deployed to:", feeCollectorAddress);

    // 4. Deploy AdminController
    console.log("Deploying AdminController...");
    const AdminController = await ethers.getContractFactory("AdminController");
    const adminController = await AdminController.deploy();
    await adminController.waitForDeployment();
    const adminControllerAddress = await adminController.getAddress();
    console.log("AdminController deployed to:", adminControllerAddress);

    // 5. Deploy CreatorShareFactory (needed for dividend distribution)
    console.log("Deploying CreatorShareFactory...");
    const CreatorShareFactory = await ethers.getContractFactory("CreatorShareFactory");
    const creatorShareFactory = await CreatorShareFactory.deploy(
        feeCollectorAddress,
        platformTokenAddress, // dividend token
        adminControllerAddress
    );
    await creatorShareFactory.waitForDeployment();
    const creatorShareFactoryAddress = await creatorShareFactory.getAddress();
    console.log("CreatorShareFactory deployed to:", creatorShareFactoryAddress);

    // 6. Deploy OrderBook with fee configuration
    console.log("Deploying OrderBook...");
    const OrderBook = await ethers.getContractFactory("OrderBook");
    const orderBook = await OrderBook.deploy(
        feeCollectorAddress,
        creatorShareFactoryAddress
    );
    await orderBook.waitForDeployment();
    const orderBookAddress = await orderBook.getAddress();
    console.log("OrderBook deployed to:", orderBookAddress);

    // Set OrderBook in AdminController
    await adminController.setOrderBook(orderBookAddress);
    console.log("OrderBook set in AdminController");

    // Wait for propagation
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Grant roles to provided Admin Wallet
    const adminWallet = "0x9f4c1f7eaa0b729b798f81be84b25fdf9f66a0bf";
    const DEFAULT_ADMIN_ROLE = await adminController.DEFAULT_ADMIN_ROLE();
    const SIGNER_ROLE = await adminController.SIGNER_ROLE();

    await adminController.grantRole(DEFAULT_ADMIN_ROLE, adminWallet);
    await adminController.grantRole(SIGNER_ROLE, adminWallet);
    console.log(`Granted ADMIN and SIGNER roles to ${adminWallet}`);

    // 7. Deploy OpinionMarketFactory (CLOB version)
    console.log("Deploying OpinionMarketFactory...");
    const OpinionMarketFactory = await ethers.getContractFactory("OpinionMarketFactory");
    const opinionMarketFactory = await OpinionMarketFactory.deploy(
        conditionalTokensAddress,
        platformTokenAddress,
        deployer.address, // Oracle (Admin)
        feeCollectorAddress, // FeeCollector
        adminControllerAddress
    );
    await opinionMarketFactory.waitForDeployment();
    const factoryAddress = await opinionMarketFactory.getAddress();
    console.log("OpinionMarketFactory deployed to:", factoryAddress);

    console.log("\n========== DEPLOYMENT COMPLETE ==========");
    console.log("PlatformToken:", platformTokenAddress);
    console.log("ConditionalTokens:", conditionalTokensAddress);
    console.log("FeeCollector:", feeCollectorAddress);
    console.log("AdminController:", adminControllerAddress);
    console.log("CreatorShareFactory:", creatorShareFactoryAddress);
    console.log("OrderBook:", orderBookAddress);
    console.log("OpinionMarketFactory:", factoryAddress);
    console.log("==========================================\n");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
