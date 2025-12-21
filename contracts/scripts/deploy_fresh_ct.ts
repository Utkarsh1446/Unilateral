import { ethers } from 'hardhat';

async function main() {
    console.log('🚀 Deploying fresh ConditionalTokens...\n');

    const [deployer] = await ethers.getSigners();
    console.log('Deploying with account:', deployer.address);

    const ConditionalTokens = await ethers.getContractFactory('ConditionalTokens');
    const ct = await ConditionalTokens.deploy();
    await ct.waitForDeployment();
    const ctAddress = await ct.getAddress();

    console.log('✅ ConditionalTokens deployed to:', ctAddress);

    // Test prepareCondition
    console.log('\nTesting prepareCondition...');
    const tx = await ct.prepareCondition(deployer.address, ethers.id('test123'), 2);
    await tx.wait();
    console.log('✅ Condition prepared successfully!');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
