import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // 1. Create User
    const user = await prisma.user.upsert({
        where: { wallet_address: '0x9f4c1f7eaa0b729b798f81be84b25fdf9f66a0bf' }, // Deployer address
        update: {},
        create: {
            wallet_address: '0x9f4c1f7eaa0b729b798f81be84b25fdf9f66a0bf',
            twitter_handle: 'crypto_whale',
        },
    });

    console.log({ user });

    // 2. Create Creator
    const creator = await prisma.creator.upsert({
        where: { user_id: user.id },
        update: {},
        create: {
            user_id: user.id,
            twitter_handle: 'testcreator',
            follower_count: 5000,
            engagement_rate: 3.5,
            qualified: true,
            qualified_at: new Date(),
        },
    });

    console.log({ creator });

    // 3. Create Market
    const marketId = '223e4567-e89b-12d3-a456-426614174000'; // New UUID
    const market = await prisma.opinionMarket.upsert({
        where: { id: marketId },
        update: {
            contract_address: '0x1C1f9789De6D4024d571ddf3FF3718FE2013D63D',
            question_id: '0xd31c02517de5131ae0df82df491c95db7a73731727b7964ccd1823d5f85485b3' // Using hash from verify_amm.ts as placeholder for questionId
        },
        create: {
            id: marketId,
            creator_id: creator.id,
            question_id: '0xd31c02517de5131ae0df82df491c95db7a73731727b7964ccd1823d5f85485b3',
            question: 'Will Ethereum reach $10,000 by Q4 2025?',
            description: 'Market for Ethereum price prediction',
            category: 'Crypto',
            deadline: new Date('2025-12-31'),
            initial_liquidity: 1000,
            contract_address: '0x1C1f9789De6D4024d571ddf3FF3718FE2013D63D',
            volume: 1200000,
            resolved: false,
        },
    });

    console.log({ market });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
