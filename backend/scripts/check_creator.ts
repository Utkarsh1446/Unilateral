import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const walletAddress = "0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf"; // Checksummed
    console.log(`Checking user ${walletAddress}...`);

    const user = await prisma.user.findUnique({
        where: { wallet_address: walletAddress },
        include: { creator: true }
    });

    if (!user) {
        console.log("User NOT found in DB.");
    } else {
        console.log("User found:", user.id);
        if (user.creator) {
            console.log("User IS a creator:", user.creator);
        } else {
            console.log("User is NOT a creator.");
        }
    }
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
