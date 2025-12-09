import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const userId = "0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf"; // User's wallet

    console.log("Checking for user:", userId);
    const user = await prisma.user.findUnique({ where: { wallet_address: userId } });
    console.log("User:", user);

    if (user) {
        const creator = await prisma.creator.findUnique({ where: { user_id: user.id } });
        console.log("Creator:", creator);
    } else {
        // If user doesn't exist by wallet, check if we are trying to create with a raw wallet address as ID
        // The schema says User.id is UUID, but User.wallet_address is the unique field.
        // The frontend sends `account` (wallet) as `userId`.
        // If the backend expects `userId` to be the UUID, that's a mismatch.
        // Let's check how `createCreatorProfile` is called.
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
