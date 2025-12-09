import { ethers } from "hardhat";

async function main() {
    const [deployer, user] = await ethers.getSigners();

    // Addresses from deployment
    const platformTokenAddress = "0xE4753784F6550894e4A9d6a67b73eeee0aB5f06f";
    const creatorShareFactoryAddress = "0xeBab1F9d3CcbE8880C41EED3139c954fF2319D8D";

    // Get contracts
    const PlatformToken = await ethers.getContractFactory("PlatformToken");
    const usdc = PlatformToken.attach(platformTokenAddress);

    const CreatorShareFactory = await ethers.getContractFactory("CreatorShareFactory");
    const factory = CreatorShareFactory.attach(creatorShareFactoryAddress);

    // 1. Create a new share
    console.log("Creating new share...");
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    // Mock signature (factory doesn't verify in this version or we use a valid one if needed)
    // Actually, the factory requires a signature from the signer.
    // Let's see if we can just deploy a CreatorShare directly for testing or use the factory if we have the signer.
    // The deploy script granted SIGNER role to 0x9f4c... but we are using hardhat signers.
    // Let's just deploy a CreatorShare directly to test logic.

    const CreatorShare = await ethers.getContractFactory("CreatorShare");
    const share = await CreatorShare.deploy("Test Share", "TEST", user.address, deployer.address, platformTokenAddress);
    await share.waitForDeployment();
    const shareAddress = await share.getAddress();
    console.log("Share deployed at:", shareAddress);

    // 2. Mint USDC to user
    console.log("Minting USDC to user...");
    await usdc.mint(user.address, ethers.parseUnits("1000", 6)); // 1000 USDC
    console.log("User USDC balance:", ethers.formatUnits(await usdc.balanceOf(user.address), 6));

    // 3. Approve share contract
    console.log("Approving share contract...");
    await usdc.connect(user).approve(shareAddress, ethers.MaxUint256);

    // 4. Check Price for 1 share
    // Formula: 1e6 + (0^2 * 1e6) / 1400 = 1e6 = 1 USDC
    const price1 = await share.getBuyPrice(1);
    console.log("Price for 1st share:", ethers.formatUnits(price1, 6), "USDC");

    if (price1.toString() !== "1000000") {
        console.error("Price mismatch! Expected 1000000, got", price1.toString());
    }

    // 5. Buy 1 share
    console.log("Buying 1 share...");
    await share.connect(user).buyShares(1);
    console.log("Bought 1 share");

    // 6. Check Price for 2nd share
    // Formula: 1e6 + (1^2 * 1e6) / 1400 = 1000000 + 714 = 1000714
    const price2 = await share.getBuyPrice(1);
    console.log("Price for 2nd share:", ethers.formatUnits(price2, 6), "USDC");

    // 7. Sell 1 share
    console.log("Selling 1 share...");
    const balanceBefore = await usdc.balanceOf(user.address);
    await share.connect(user).sellShares(1);
    const balanceAfter = await usdc.balanceOf(user.address);
    console.log("Sold 1 share. Received:", ethers.formatUnits(balanceAfter - balanceBefore, 6), "USDC");

    console.log("Verification complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
