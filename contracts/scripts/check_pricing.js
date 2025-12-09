const { ethers } = require("hardhat");

async function main() {
    const BondingCurve = await ethers.getContractFactory("BondingCurve");
    // BondingCurve is a library, so we might need to deploy a test contract or just use CreatorShare if we can't link easily.
    // Easier to just test CreatorShare since it exposes getBuyPrice.

    // Deploy a fresh CreatorShare to test
    const [deployer] = await ethers.getSigners();

    // We need the factory to deploy a share, or we can just deploy the logic if possible.
    // Actually, CreatorShare is a contract, we can deploy it directly if we have the args.
    // Args: name, symbol, creator, feeCollector, dividendToken

    // Mock addresses
    const creator = deployer.address;
    const feeCollector = deployer.address;
    const dividendToken = deployer.address; // Doesn't matter for pricing check

    const CreatorShare = await ethers.getContractFactory("CreatorShare");
    const share = await CreatorShare.deploy("Test", "TEST", creator, feeCollector, dividendToken);
    await share.waitForDeployment();

    console.log("Checking prices for various supplies...");

    for (let i = 0; i <= 50; i += 10) {
        // We can't easily set supply, but we can check getBuyPrice(1) which uses totalSupply.
        // But totalSupply starts at 0.
        // We can simulate supply by checking the pure function if we exposed it, 
        // but CreatorShare.getBuyPrice uses totalSupply().

        // Actually, CreatorShare has:
        // function getBuyPrice(uint256 amount) external view returns (uint256)
        // It calls BondingCurve.getBuyPrice(totalSupply(), amount)

        // We want to see what the price IS for a given supply.
        // Since we can't change supply without buying, let's just buy some shares and check price.
        // But buying requires paying, and if price is 0 it's free.

        // Let's just try to buy 1 share repeatedly and print the price.

        const price = await share.getBuyPrice(1);
        console.log(`Supply: ${await share.totalSupply()}, Price for next 1 share: ${price.toString()} wei`);

        if (price == 0) {
            // If price is 0, we can buy for free?
            // buyShares requires msg.value >= price. If price is 0, value 0 is fine?
            try {
                await share.buyShares(1, { value: 0 });
            } catch (e) {
                console.log("Failed to buy with 0 value:", e.message);
                // Maybe we need to send some dust even if price is 0?
                // Contract: require(msg.value >= price, "Insufficient payment");
                // If price is 0, 0 >= 0 is true.

                // Wait, there's a refund logic.
            }
        } else {
            await share.buyShares(1, { value: price });
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
