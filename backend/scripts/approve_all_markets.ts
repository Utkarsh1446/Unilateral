
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const result = await prisma.opinionMarket.updateMany({
        where: { approval_status: 'pending' },
        data: { approval_status: 'approved' },
    });
    console.log(`Approved ${result.count} markets.`);
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
