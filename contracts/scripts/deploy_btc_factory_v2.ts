import { ethers } from 'hardhat';

async function main() {
    console.log('🚀 Deploying updated BTCMarketFactory with liquidity seeding...\n');

    const [deployer] = await ethers.getSigners();
    console.log('Deploying with account:', deployer.address);
    console.log('Account balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH\n');

    // Contract addresses from previous deployment
    const CONDITIONAL_TOKENS = '0x54a8868598Fc10051274C09F6a365C09D8A49911'; // FRESH DEPLOYMENT
    const COLLATERAL_TOKEN = '0xC59FD3678fCCB26284f763832579463AED36304D'; // Your custom USDC
    const ORDER_BOOK = '0x1C1f9789De6D4024d571ddf3FF3718FE2013D63D';
    const PRICE_ORACLE = deployer.address; // Backend wallet

    console.log('Using existing contracts:');
    console.log('ConditionalTokens:', CONDITIONAL_TOKENS);
    console.log('CollateralToken (USDC):', COLLATERAL_TOKEN);
    console.log('OrderBook:', ORDER_BOOK);
    console.log('PriceOracle:', PRICE_ORACLE, '\n');

    // Deploy BTCMarketFactory
    console.log('Deploying BTCMarketFactory...');
    const BTCMarketFactory = await ethers.getContractFactory('BTCMarketFactory');
    const factory = await BTCMarketFactory.deploy(
        CONDITIONAL_TOKENS,
        COLLATERAL_TOKEN,
        ORDER_BOOK,
        PRICE_ORACLE
    );

    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();

    console.log('✅ BTCMarketFactory deployed to:', factoryAddress);
    console.log('\n📝 Deployment Summary:');
    console.log('='.repeat(50));
    console.log('BTCMarketFactory:', factoryAddress);
    console.log('Liquidity per market: 10,000 USDC');
    console.log('='.repeat(50));

    console.log('\n⚠️  IMPORTANT NEXT STEPS:');
    console.log('1. Fund factory with USDC:');
    console.log(`   npx hardhat run scripts/fund_factory_usdc.ts --network baseSepolia`);
    console.log('2. Update backend .env with new factory address:');
    console.log(`   BTC_FACTORY_ADDRESS=${factoryAddress}`);
    console.log('3. Redeploy backend to Render');
    console.log('4. Test market creation with liquidity seeding\n');

    // Save deployment info
    const fs = require('fs');
    const deploymentInfo = {
        network: 'baseSepolia',
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {
            BTCMarketFactory: factoryAddress,
            ConditionalTokens: CONDITIONAL_TOKENS,
            CollateralToken: COLLATERAL_TOKEN,
            OrderBook: ORDER_BOOK,
            PriceOracle: PRICE_ORACLE
        },
        config: {
            liquidityPerMarket: '10000 USDC',
            supportedIntervals: [15, 60, 360, 720]
        }
    };

    fs.writeFileSync(
        'deployments/btc_factory_v2.json',
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('📄 Deployment info saved to: deployments/btc_factory_v2.json\n');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
