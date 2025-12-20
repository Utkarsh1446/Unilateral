import { ethers } from 'hardhat';

async function main() {
    const factoryAddress = '0x55949b4e9d5a5f41548E41197EB046b32E8554e2';
    const backendWallet = '0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf';

    console.log('Setting price oracle on BTCMarketFactory...');
    console.log('Factory:', factoryAddress);
    console.log('Backend wallet:', backendWallet);

    const factory = await ethers.getContractAt('BTCMarketFactory', factoryAddress);

    // Check current oracle
    const currentOracle = await factory.priceOracle();
    console.log('Current price oracle:', currentOracle);

    if (currentOracle.toLowerCase() === backendWallet.toLowerCase()) {
        console.log('✅ Price oracle is already set correctly!');
        return;
    }

    // Set new oracle
    console.log('Setting price oracle to backend wallet...');
    const tx = await factory.setPriceOracle(backendWallet);
    console.log('Transaction sent:', tx.hash);

    await tx.wait();
    console.log('✅ Price oracle updated successfully!');

    // Verify
    const newOracle = await factory.priceOracle();
    console.log('New price oracle:', newOracle);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
