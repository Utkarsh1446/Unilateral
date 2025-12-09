const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const questionId = '0xd31c02517de5131ae0df82df491c95db7a73731727b7964ccd1823d5f85485b3';
    const market = await prisma.opinionMarket.findFirst({
        where: { question_id: questionId },
        include: { creator: { include: { user: true } } }
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
