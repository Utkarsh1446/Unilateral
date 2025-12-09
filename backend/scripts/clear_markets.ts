import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Clearing markets...');

    // Delete in order of dependency
    await prisma.marketPosition.deleteMany({});
    await prisma.marketOutcome.deleteMany({});
    await prisma.opinionMarket.deleteMany({});

    console.log('All markets cleared.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
