import { ethers } from 'hardhat';

async function main() {
    const factoryAddress = '0xFfE7462aac84C7f047C1465c5f4b029c2E9D5f93'; // NEW FACTORY
    const usdcAddress = '0xC59FD3678fCCB26284f763832579463AED36304D'; // Your custom USDC
    const transferAmount = ethers.parseUnits('100000', 6); // 100k USDC

    console.log('💰 Transferring USDC to BTCMarketFactory...\n');
    console.log('Factory address:', factoryAddress);
    console.log('USDC address:', usdcAddress);
    console.log('Transfer amount:', ethers.formatUnits(transferAmount, 6), 'USDC\n');

    const [deployer] = await ethers.getSigners();
    console.log('Transferring from:', deployer.address);

    // Get USDC contract
    const usdcAbi = [
        'function transfer(address to, uint256 amount) external returns (bool)',
        'function balanceOf(address account) external view returns (uint256)'
    ];
    const usdc = new ethers.Contract(usdcAddress, usdcAbi, deployer);

    // Check balance
    const balance = await usdc.balanceOf(deployer.address);
    console.log('Your USDC balance:', ethers.formatUnits(balance, 6), 'USDC\n');

    // Transfer USDC to factory
    console.log('Transferring USDC to factory...');
    const tx = await usdc.transfer(factoryAddress, transferAmount);
    console.log('Transaction sent:', tx.hash);
    await tx.wait();
    console.log('✅ Transaction confirmed!\n');

    // Check factory balance
    const factoryBalance = await usdc.balanceOf(factoryAddress);
    console.log('📊 Factory USDC balance:', ethers.formatUnits(factoryBalance, 6), 'USDC');
    console.log('Markets that can be created:', Number(factoryBalance) / 10000000000);

    console.log('\n✅ Factory funded successfully!\n');
    console.log('📝 Next steps:');
    console.log(`1. Update backend .env: BTC_FACTORY_ADDRESS=${factoryAddress}`);
    console.log('2. Redeploy backend on Render');
    console.log('3. Test market creation with: curl -X POST https://unilateral-backend.onrender.com/btc-markets/create/15');
    console.log('4. Markets will now have automatic 10k USDC liquidity!\n');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
