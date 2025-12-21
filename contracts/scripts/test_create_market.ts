import { ethers } from 'hardhat';

async function main() {
    const FACTORY_ADDRESS = '0xFfE7462aac84C7f047C1465c5f4b029c2E9D5f93';

    const [signer] = await ethers.getSigners();
    console.log('Testing with account:', signer.address);

    const factory = await ethers.getContractAt('BTCMarketFactory', FACTORY_ADDRESS);

    // Try to create TWO markets
    for (let i = 0; i < 2; i++) {
        console.log(`\n=== Attempt ${i + 1} ===`);
        const interval = 15;
        const startTime = Math.floor(Date.now() / 1000) + 300 + (i * 60); // Different start times
        const startPrice = 8861011436238 + (i * 1000); // Different prices

        console.log('Attempting to create market:');
        console.log('  Interval:', interval);
        console.log('  StartTime:', startTime, '(' + new Date(startTime * 1000).toISOString() + ')');
        console.log('  StartPrice:', startPrice);

        try {
            const tx = await factory.createBTCMarket(interval, startTime, startPrice, {
                gasLimit: 5000000 // 5M gas
            });
            console.log('✅ Transaction sent:', tx.hash);
            const receipt = await tx.wait();
            console.log('✅ Transaction confirmed in block:', receipt.blockNumber);
            console.log('✅ SUCCESS! Market created!');

            // Wait a bit between transactions
            await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error: any) {
            console.error('❌ Error:', error.message.substring(0, 200));
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
