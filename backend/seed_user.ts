const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
    const walletAddress = "0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf";
    console.log("Seeding user for wallet:", walletAddress);

    let user = await prisma.user.findUnique({
        where: { wallet_address: walletAddress }
    });

    if (!user) {
        user = await prisma.user.create({
            data: {
                wallet_address: walletAddress
            }
        });
        console.log("Created User:", user);
    } else {
        console.log("User already exists:", user);
    }

    let creator = await prisma.creator.findUnique({
        where: { user_id: user.id }
    });

    if (!creator) {
        creator = await prisma.creator.create({
            data: {
                user_id: user.id,
                twitter_handle: "dev_user_" + crypto.randomInt(1000),
                twitter_id: crypto.randomInt(1000000000).toString(),
                follower_count: 1000,
                engagement_rate: 5.0,
                contract_address: "0x0000000000000000000000000000000000000000" // Mock address
            }
        });
        console.log("Created Creator:", creator);
    } else {
        console.log("Creator already exists:", creator);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
