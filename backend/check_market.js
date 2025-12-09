const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const marketId = 'c03c927c-7b65-4e38-b58b-6099787dccb4';
    const market = await prisma.opinionMarket.findUnique({
        where: { id: marketId },
    });
    console.log(market);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
