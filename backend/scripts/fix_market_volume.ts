import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMarketVolume() {
    // Get the market ID from command line or fix a specific one
    const marketQuestion = process.argv[2] || 'Netflix';

    console.log(`Looking for market containing: "${marketQuestion}"`);

    // Find markets matching the query
    const markets = await prisma.opinionMarket.findMany({
        where: {
            question: {
                contains: marketQuestion
            }
        },
        select: {
            id: true,
            question: true,
            volume: true,
            contract_address: true
        }
    });

    if (markets.length === 0) {
        console.log('No markets found');
        return;
    }

    console.log('\nFound markets:');
    markets.forEach((m, i) => {
        console.log(`${i + 1}. ${m.question}`);
        console.log(`   ID: ${m.id}`);
        console.log(`   Current Volume: $${Number(m.volume).toFixed(2)}`);
        console.log(`   Contract: ${m.contract_address}`);
    });

    // For the Netflix market specifically, reset to $15 (30 shares * $0.50)
    const correctVolume = 15;

    console.log(`\nResetting volume to $${correctVolume}...`);

    for (const market of markets) {
        await prisma.opinionMarket.update({
            where: { id: market.id },
            data: { volume: correctVolume }
        });
        console.log(`✅ Market "${market.question}" volume reset to $${correctVolume}`);
    }

    console.log('\nDone!');
}

fixMarketVolume()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
