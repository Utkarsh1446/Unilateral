import { ethers } from 'hardhat';

async function main() {
    // Simulate what the factory does with encodePacked
    const interval = 15;
    const startTime = 1766322929;
    const nonce = 0;

    // Using solidityPackedKeccak256 which is equivalent to keccak256(abi.encodePacked(...))
    const questionId = ethers.solidityPackedKeccak256(
        ['string', 'uint256', 'string', 'uint256', 'string', 'uint256'],
        ['BTC_', interval, '_', startTime, '_', nonce]
    );

    console.log('Generated questionId (packed):', questionId);
    console.log('Expected from trace:          ', '0x91e04a37b1faab970e1aa217b903fa6b8d76207fbb3eb2665ec1850d2e174274');
    console.log('Match:', questionId === '0x91e04a37b1faab970e1aa217b903fa6b8d76207fbb3eb2665ec1850d2e174274');

    // Test with different nonces
    for (let i = 0; i < 5; i++) {
        const qid = ethers.solidityPackedKeccak256(
            ['string', 'uint256', 'string', 'uint256', 'string', 'uint256'],
            ['BTC_', interval, '_', startTime, '_', i]
        );
        console.log(`\nNonce ${i}: ${qid}`);
    }
}

main();
