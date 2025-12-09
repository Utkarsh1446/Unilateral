// Script to check database state
// Run with: npx ts-node scripts/check_db_state.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("=== Database State Check ===\n");

    // 1. Check Markets
    const markets = await prisma.opinionMarket.findMany({
        include: {
            creator: {
                include: { user: true }
            }
        },
        orderBy: { created_at: 'desc' },
        take: 5
    });

    console.log(`Total Markets: ${await prisma.opinionMarket.count()}`);
    console.log(`Pending: ${await prisma.opinionMarket.count({ where: { approval_status: 'pending' } })}`);
    console.log(`Approved: ${await prisma.opinionMarket.count({ where: { approval_status: 'approved' } })}`);
    console.log(`Resolved: ${await prisma.opinionMarket.count({ where: { resolved: true } })}`);
    console.log("\n--- Recent Markets ---");

    for (const m of markets) {
        console.log(`\n[${m.question.slice(0, 50)}...]`);
        console.log(`  ID: ${m.id}`);
        console.log(`  Status: ${m.approval_status}`);
        console.log(`  Resolved: ${m.resolved} | Outcome: ${m.outcome ?? 'N/A'}`);
        console.log(`  Contract: ${m.contract_address || 'None'}`);
        console.log(`  Volume: $${m.volume}`);
        console.log(`  Creator: ${m.creator?.user?.wallet_address || 'Unknown'}`);
    }

    // 2. Check Creators
    console.log("\n\n=== Creators ===");
    const creators = await prisma.creator.findMany({
        include: { user: true, shares: true },
        take: 5
    });
    console.log(`Total Creators: ${await prisma.creator.count()}`);
    console.log(`Approved: ${await prisma.creator.count({ where: { approval_status: 'approved' } })}`);

    for (const c of creators) {
        console.log(`\n[${c.display_name || c.twitter_handle}]`);
        console.log(`  Status: ${c.approval_status}`);
        console.log(`  Wallet: ${c.user?.wallet_address}`);
        console.log(`  Share Contract: ${c.shares?.contract_address || 'None'}`);
    }

    // 3. Check Positions
    console.log("\n\n=== Market Positions ===");
    const positions = await prisma.marketPosition.findMany({
        include: { market: true },
        take: 10
    });
    console.log(`Total Positions: ${await prisma.marketPosition.count()}`);

    for (const p of positions) {
        console.log(`  ${p.user_address.slice(0, 8)}... | ${p.market.question.slice(0, 30)}... | Outcome ${p.outcome_index} | ${p.amount} @ $${p.avg_price}`);
    }

    // 4. Platform Stats
    console.log("\n\n=== Platform Stats ===");
    const totalVolume = await prisma.opinionMarket.aggregate({
        _sum: { volume: true }
    });
    console.log(`Total Volume: $${totalVolume._sum.volume || 0}`);
    console.log(`Active Markets: ${await prisma.opinionMarket.count({ where: { resolved: false, approval_status: 'approved' } })}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
