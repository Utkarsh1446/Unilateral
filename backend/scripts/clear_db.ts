import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('Clearing database...');

    // Delete in order of dependencies (child tables first)
    await prisma.marketPosition.deleteMany({});
    await prisma.marketOutcome.deleteMany({});
    await prisma.shareTransaction.deleteMany({});
    await prisma.creatorVolumeTracking.deleteMany({});

    // Delete CreatorShare before Creator
    await prisma.creatorShare.deleteMany({});

    // Delete Markets
    await prisma.opinionMarket.deleteMany({});

    // Delete Creators
    await prisma.creator.deleteMany({});

    // Delete Users
    await prisma.user.deleteMany({});

    console.log('Database cleared successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
