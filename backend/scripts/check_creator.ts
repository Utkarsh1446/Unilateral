import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCreator() {
    const walletAddress = process.argv[2] || '0x8800E65e6f386B4Ea3b7e5F4589275C745523477';

    console.log(`Checking creator for wallet: ${walletAddress}`);

    // Find user
    const user = await prisma.user.findFirst({
        where: { wallet_address: walletAddress.toLowerCase() }
    });

    console.log('\nUser:', user);

    if (user) {
        // Find creator
        const creator = await prisma.creator.findFirst({
            where: { user_id: user.id }
        });
        console.log('\nCreator:', creator);
    }

    // Also check by any pattern
    const allCreators = await prisma.creator.findMany({
        take: 5,
        orderBy: { created_at: 'desc' }
    });

    console.log('\nRecent creators:');
    allCreators.forEach(c => {
        console.log(`- ${c.twitter_handle} (user: ${c.user_id})`);
    });
}

checkCreator()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
