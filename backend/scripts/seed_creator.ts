import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const walletAddress = "0x9f4c1f7eaa0b729b798f81be84b25fdf9f66a0bf";
    console.log(`Seeding creator ${walletAddress}...`);

    // Create User
    const user = await prisma.user.upsert({
        where: { wallet_address: walletAddress },
        update: {},
        create: {
            wallet_address: walletAddress,
            twitter_handle: "demo_user"
        }
    });
    console.log("User created/found:", user.id);

    // Create Creator
    const creator = await prisma.creator.upsert({
        where: { user_id: user.id },
        update: {},
        create: {
            user_id: user.id,
            twitter_handle: "demo_user",
            status: "approved",
            approval_status: "approved",
            qualified: true
        }
    });
    console.log("Creator created/found:", creator.id);
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
