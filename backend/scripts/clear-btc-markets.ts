import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️  Clearing old BTC markets from database...\n');

    // Get all markets
    const allMarkets = await prisma.bTCMarket.findMany();
    console.log(`Found ${allMarkets.length} total markets in database`);

    // Delete all markets
    const result = await prisma.bTCMarket.deleteMany({});

    console.log(`✅ Deleted ${result.count} markets`);
    console.log('\n📝 Database is now clean. New markets will be created automatically by cron jobs.');
    console.log('Next market creation times:');
    console.log('- 15m markets: Every :00, :15, :30, :45');
    console.log('- 60m markets: Every :00');
    console.log('- 6h markets: 00:00, 06:00, 12:00, 18:00');
    console.log('- 12h markets: 00:00, 12:00\n');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
