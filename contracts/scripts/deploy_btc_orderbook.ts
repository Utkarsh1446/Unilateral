import { ethers } from 'hardhat';

async function main() {
    console.log('🚀 Deploying new OrderBook for BTC Markets...\n');

    const [deployer] = await ethers.getSigners();
    console.log('Deploying with account:', deployer.address);
    console.log('Account balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH\n');

    // Contract addresses
    const FEE_COLLECTOR = '0x8D99A4C5C13885350A9Be5Fa810Deb9f75e7056d';
    const CREATOR_SHARE_FACTORY = '0x5b8037A726f99B9aB2b5a63928BAA22Fb1036b54';

    // Deploy OrderBook
    console.log('Deploying OrderBook...');
    const OrderBook = await ethers.getContractFactory('OrderBook');
    const orderBook = await OrderBook.deploy(FEE_COLLECTOR, CREATOR_SHARE_FACTORY);
    await orderBook.waitForDeployment();
    const orderBookAddress = await orderBook.getAddress();

    console.log('✅ OrderBook deployed to:', orderBookAddress);
    console.log('\n📋 Summary:');
    console.log('OrderBook:', orderBookAddress);
    console.log('FeeCollector:', FEE_COLLECTOR);
    console.log('CreatorShareFactory:', CREATOR_SHARE_FACTORY);
    console.log('\n🔧 Next steps:');
    console.log('1. Update BTCMarketFactory to use this OrderBook');
    console.log('2. Update frontend CONTRACTS.OrderBook address');
    console.log('3. Redeploy BTCMarketFactory');
    console.log('4. Create test market and verify trading');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
