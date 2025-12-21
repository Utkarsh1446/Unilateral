import { ethers } from 'hardhat';

async function main() {
    const CT_ADDRESS = '0x9D2519b4c40E4E7A3d814e0E4f61A6a15DbC7AF0';
    const [signer] = await ethers.getSigners();

    const ct = await ethers.getContractAt('ConditionalTokens', CT_ADDRESS);

    // Try to prepare a condition directly
    const oracle = signer.address; // Use our address as oracle
    const questionId = ethers.id('test_question_12345'); // Random question
    const outcomeSlotCount = 2;

    console.log('Attempting to prepare condition:');
    console.log('  Oracle:', oracle);
    console.log('  QuestionId:', questionId);
    console.log('  OutcomeSlotCount:', outcomeSlotCount);

    try {
        const tx = await ct.prepareCondition(oracle, questionId, outcomeSlotCount);
        console.log('✅ Transaction sent:', tx.hash);
        await tx.wait();
        console.log('✅ Condition prepared successfully!');
    } catch (error: any) {
        console.error('❌ Error:', error.message.substring(0, 300));
    }
}

main();
