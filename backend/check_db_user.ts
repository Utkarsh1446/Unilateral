import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const walletAddress = "0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf";
    console.log("Checking for user with wallet:", walletAddress);

    const user = await prisma.user.findUnique({
        where: { wallet_address: walletAddress }
    });
    console.log("User:", user);

    if (user) {
        const creator = await prisma.creator.findUnique({
            where: { user_id: user.id }
        });
        console.log("Creator:", creator);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
