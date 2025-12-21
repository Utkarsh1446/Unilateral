import { ethers } from 'hardhat';

async function main() {
    const factoryAddress = process.env.BTC_FACTORY_ADDRESS || '0x55949b4e9d5a5f41548E41197EB046b32E8554e2';
    const usdcAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC
    const fundingAmount = ethers.parseUnits('100000', 6); // 100k USDC (enough for ~10 markets)

    console.log('💰 Funding BTCMarketFactory with USDC...\n');
    console.log('Factory address:', factoryAddress);
    console.log('USDC address:', usdcAddress);
    console.log('Funding amount:', ethers.formatUnits(fundingAmount, 6), 'USDC\n');

    const [deployer] = await ethers.getSigners();
    console.log('Funding from:', deployer.address);

    // Get USDC contract
    const usdc = await ethers.getContractAt('IERC20', usdcAddress);

    // Check deployer's USDC balance
    const balance = await usdc.balanceOf(deployer.address);
    console.log('Your USDC balance:', ethers.formatUnits(balance, 6), 'USDC');

    if (balance < fundingAmount) {
        console.log('\n❌ Insufficient USDC balance!');
        console.log('You need:', ethers.formatUnits(fundingAmount, 6), 'USDC');
        console.log('You have:', ethers.formatUnits(balance, 6), 'USDC');
        console.log('\n📝 To get Base Sepolia USDC:');
        console.log('1. Get USDC on Ethereum Sepolia from faucet');
        console.log('2. Bridge to Base Sepolia using https://bridge.base.org/');
        console.log('   OR');
        console.log('3. Use Base Sepolia faucet if available\n');
        return;
    }

    // Transfer USDC to factory
    console.log('\nTransferring USDC to factory...');
    const tx = await usdc.transfer(factoryAddress, fundingAmount);
    console.log('Transaction sent:', tx.hash);

    await tx.wait();
    console.log('✅ Transaction confirmed!');

    // Verify factory balance
    const factoryBalance = await usdc.balanceOf(factoryAddress);
    console.log('\n📊 Factory USDC balance:', ethers.formatUnits(factoryBalance, 6), 'USDC');
    console.log('Markets that can be created:', (Number(factoryBalance) / 10_000_000_000).toFixed(0));

    console.log('\n✅ Factory funded successfully!');
    console.log('You can now create markets with automatic liquidity seeding.\n');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
