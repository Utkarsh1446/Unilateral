import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Running verification with:", deployer.address);

    const factoryAddress = "0x0796E141e8137b712DbA72eA1aC13d0Db39e9656";
    const adminControllerAddress = "0x10ee32a08bCEb8804cBAcd6ff531f50aA0f4f422";

    const CreatorShareFactory = await ethers.getContractFactory("CreatorShareFactory");
    const factory = CreatorShareFactory.attach(factoryAddress);

    const AdminController = await ethers.getContractFactory("AdminController");
    const adminController = AdminController.attach(adminControllerAddress);

    // Grant SIGNER_ROLE to deployer if not already
    const SIGNER_ROLE = await adminController.SIGNER_ROLE();
    if (!await adminController.hasRole(SIGNER_ROLE, deployer.address)) {
        console.log("Granting SIGNER_ROLE to deployer...");
        await adminController.grantRole(SIGNER_ROLE, deployer.address);
    }

    // Create Share
    const name = "Test Share";
    const symbol = "TEST";
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const chainId = (await deployer.provider.getNetwork()).chainId;

    const hash = ethers.solidityPackedKeccak256(
        ["address", "string", "string", "uint256", "uint256"],
        [deployer.address, name, symbol, deadline, chainId]
    );
    const signature = await deployer.signMessage(ethers.getBytes(hash));

    console.log("Creating Creator Share...");
    const tx = await factory.createCreatorShare(name, symbol, deadline, signature);
    const receipt = await tx.wait();

    // Parse event to get share address
    const event = receipt.logs.find(log => {
        try {
            return factory.interface.parseLog(log)?.name === "ShareCreated";
        } catch { return false; }
    });
    const shareAddress = factory.interface.parseLog(event!).args.shareAddress;
    console.log("Share created at:", shareAddress);

    // Buy Share
    const CreatorShare = await ethers.getContractFactory("CreatorShare");
    const share = CreatorShare.attach(shareAddress);

    const price = await share.getBuyPrice(1);
    console.log("Buy Price:", ethers.formatEther(price));

    console.log("Buying 1 share...");
    const buyTx = await share.buyShares(1, { value: price + ethers.parseEther("0.001") }); // Add buffer
    await buyTx.wait();
    console.log("Buy successful!");

    const balance = await share.balanceOf(deployer.address);
    console.log("Balance:", balance.toString());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
