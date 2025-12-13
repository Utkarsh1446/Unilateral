import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Adding outcomes to existing markets...');

    // Get all markets
    const markets = await prisma.opinionMarket.findMany({
        include: { outcomes: true }
    });

    for (const market of markets) {
        if (market.outcomes.length === 0) {
            console.log(`Adding outcomes to market: ${market.question}`);

            await prisma.marketOutcome.createMany({
                data: [
                    {
                        market_id: market.id,
                        index: 0,
                        name: 'Yes',
                        probability: 0.5,
                        current_price: 0.5
                    },
                    {
                        market_id: market.id,
                        index: 1,
                        name: 'No',
                        probability: 0.5,
                        current_price: 0.5
                    }
                ]
            });

            console.log(`✓ Added outcomes to: ${market.question}`);
        } else {
            console.log(`✓ Market already has outcomes: ${market.question}`);
        }
    }

    console.log('\nDone! All markets now have outcomes.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
