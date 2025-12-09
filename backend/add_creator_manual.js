const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const walletAddress = '0xcdd92e6a7355df125a581a2aa413de9ddb654a54'.toLowerCase();

    console.log(`Adding creator for wallet: ${walletAddress}`);

    // 1. Create User
    const user = await prisma.user.upsert({
        where: { wallet_address: walletAddress },
        update: {},
        create: {
            wallet_address: walletAddress,
            twitter_handle: 'manual_user'
        }
    });
    console.log('User:', user);

    // 2. Create Creator
    const creator = await prisma.creator.upsert({
        where: { user_id: user.id },
        update: {
            approval_status: 'approved',
            status: 'approved'
        },
        create: {
            user_id: user.id,
            twitter_handle: 'manual_user',
            approval_status: 'approved',
            status: 'approved',
            qualified: true,
            contract_address: "0x0000000000000000000000000000000000000000" // Dummy address to satisfy potential checks
        }
    });
    console.log('Creator:', creator);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
