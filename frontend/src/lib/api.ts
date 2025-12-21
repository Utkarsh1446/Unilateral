const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function checkEligibility(handle: string) {
    const res = await fetch(`${API_URL}/creators/check-eligibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twitterHandle: handle }),
    });
    if (!res.ok) throw new Error("Failed to check eligibility");
    return res.json();
}

export async function verifyTwitter(handle: string) {
    const res = await fetch(`${API_URL}/creators/verify-twitter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
    });
    if (!res.ok) throw new Error("Failed to verify Twitter eligibility");
    return res.json();
}

export async function checkVolumeEligibility(userId: string) {
    const res = await fetch(`${API_URL}/creators/check-volume/${userId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Failed to check volume eligibility");
    return res.json();
}

export async function getCreatorOnboardingSignature(userAddress: string, name: string, symbol: string, userId: string) {
    const res = await fetch(`${API_URL}/creators/onboarding-signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress, name, symbol, userId }),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to get signature");
    }
    return res.json();
}

export async function getMarketCreationSignature(userAddress: string, userId: string, questionId: string) {
    const res = await fetch(`${API_URL}/markets/creation-signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress, userId, questionId }),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to get signature");
    }
    return res.json();
}

export async function createMarketRequest(
    question: string,
    description: string,
    category: string,
    deadline: string,
    creatorId: string,
    imageUrl?: string
) {
    const res = await fetch(`${API_URL}/markets/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            question,
            description,
            category,
            deadline,
            creatorId,
            imageUrl
        }),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create market request");
    }
    return res.json();
}

export async function createCreatorProfile(walletAddress: string, handle: string, data: any) {
    const res = await fetch(`${API_URL}/creators/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, twitterHandle: handle, ...data }),
    });
    if (!res.ok) throw new Error("Failed to create profile");
    return res.json();
}

export async function getCreatorProfile(userId: string) {
    // This endpoint might need to be added/adjusted in backend
    // For now assuming we can find by user_id or similar
    // If not, we might need to rely on local state or add an endpoint
    return null;
}

// Get creator status by wallet address
export async function getCreatorByWallet(walletAddress: string) {
    try {
        const res = await fetch(`${API_URL}/creators/dashboard/${walletAddress.toLowerCase()}`, {
            cache: 'no-cache'
        });
        if (!res.ok) return null;
        return res.json();
    } catch (e) {
        return null;
    }
}

export async function getCreators() {
    const res = await fetch(`${API_URL}/creators`, {
        cache: 'no-cache'
    });
    if (!res.ok) throw new Error("Failed to fetch creators");
    return res.json();
}

export async function getCreator(id: string) {
    const res = await fetch(`${API_URL}/creators/${id}`, {
        cache: 'no-cache'
    });
    if (!res.ok) throw new Error("Failed to fetch creator");
    return res.json();
}

export async function getCreatorMarkets(creatorId: string) {
    // This endpoint might need to be implemented in backend
    // For now, we can filter all markets or assume an endpoint exists
    // Let's assume GET /creators/:id/markets exists or we use a query param on markets
    // For this demo, let's just return empty array if endpoint fails
    try {
        const res = await fetch(`${API_URL}/creators/${creatorId}/markets`, {
            cache: 'no-cache'
        });
        if (!res.ok) return [];
        return res.json();
    } catch (e) {
        return [];
    }
}

export async function getPendingMarkets() {
    const res = await fetch(`${API_URL}/markets?status=pending`, {
        cache: 'no-cache'
    });
    if (!res.ok) return [];
    return res.json();
}

export async function getMarkets() {
    const res = await fetch(`${API_URL}/markets`, {
        cache: 'no-cache'
    });
    if (!res.ok) throw new Error("Failed to fetch markets");
    return res.json();
}

export async function getMarket(id: string) {
    const res = await fetch(`${API_URL}/markets/${id}`, {
        cache: 'no-cache'
    });
    if (!res.ok) throw new Error("Failed to fetch market");
    return res.json();
}

export async function getAdminMarkets(adminWallet: string) {
    const res = await fetch(`${API_URL}/admin/markets`, {
        headers: {
            'x-wallet-address': adminWallet
        }
    });
    if (!res.ok) throw new Error("Failed to fetch admin markets");
    return res.json();
}

export async function approveMarket(id: string, adminId: string) {
    const res = await fetch(`${API_URL}/admin/markets/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminWallet: adminId }), // Backend expects adminWallet
    });
    if (!res.ok) throw new Error("Failed to approve market");
    return res.json();
}

export async function rejectMarket(id: string, reason: string, adminId: string) {
    const res = await fetch(`${API_URL}/admin/markets/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, adminWallet: adminId }), // Backend expects adminWallet
    });
    if (!res.ok) throw new Error("Failed to reject market");
    return res.json();
}


export async function updateMarketStats(contractAddress: string, tradeVolume: number, outcomeIndex?: number, price?: number) {
    const res = await fetch(`${API_URL}/markets/volume/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractAddress, tradeVolume, outcomeIndex, price }),
    });
    if (!res.ok) throw new Error("Failed to update market stats");
    return res.json();
}

// ============================================
// New API Functions for Trading Platform
// ============================================

// Mock data generators
const generateMockTrades = (count: number) => {
    const markets = ['Will BTC hit $100k?', 'Will ETH reach $5k?', 'Trump wins 2024?'];
    return Array.from({ length: count }, (_, i) => ({
        id: `trade-${i}`,
        marketId: `market-${i % 3}`,
        marketQuestion: markets[i % 3],
        traderAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
        outcome: Math.random() > 0.5 ? 'Yes' : 'No',
        shares: Math.floor(Math.random() * 10000) + 100,
        price: Math.floor(Math.random() * 100),
        totalCost: Math.floor(Math.random() * 5000) + 100,
        timestamp: new Date(Date.now() - Math.random() * 86400000),
        isSuspicious: Math.random() > 0.9
    }));
};

const generateMockPriceHistory = (days: number) => {
    const now = Date.now();
    const interval = (days * 24 * 60 * 60 * 1000) / 50;
    let yesPrice = 50;

    return Array.from({ length: 50 }, (_, i) => {
        yesPrice += (Math.random() - 0.5) * 10;
        yesPrice = Math.max(10, Math.min(90, yesPrice));

        return {
            timestamp: now - (49 - i) * interval,
            yesPrice: Math.round(yesPrice),
            noPrice: 100 - Math.round(yesPrice),
            volume: Math.floor(Math.random() * 10000)
        };
    });
};

export async function getTrendingMarkets() {
    // Mock implementation - returns markets sorted by volume
    try {
        const markets = await getMarkets();
        return markets.sort((a: any, b: any) => (b.volume || 0) - (a.volume || 0)).slice(0, 20);
    } catch {
        return [];
    }
}

export async function getExpiringMarkets() {
    // Mock implementation - returns markets expiring soon
    try {
        const markets = await getMarkets();
        const now = new Date();
        return markets
            .filter((m: any) => new Date(m.deadline) > now)
            .sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
            .slice(0, 20);
    } catch {
        return [];
    }
}

export async function getNewMarkets() {
    // Mock implementation - returns recently created markets
    try {
        const markets = await getMarkets();
        return markets.slice(0, 20);
    } catch {
        return [];
    }
}

export async function getWhaleTrades(threshold: number = 1000, timeRange: string = '24h') {
    // Mock implementation
    return generateMockTrades(20).filter(t => t.totalCost >= threshold);
}

export async function getTraderStats(address: string) {
    // Mock implementation
    return {
        address,
        totalPnL: Math.floor(Math.random() * 20000) - 5000,
        winRate: Math.floor(Math.random() * 40) + 40,
        totalVolume: Math.floor(Math.random() * 100000) + 10000,
        activePositions: Math.floor(Math.random() * 10) + 1,
        avgHoldTime: `${Math.floor(Math.random() * 48) + 1}h`,
        positions: []
    };
}

export async function getUserPositions(address: string) {
    // Mock implementation
    try {
        const markets = await getMarkets();
        return markets.slice(0, 5).map((market: any, i: number) => {
            const outcome = i % 2 === 0 ? 'Yes' : 'No';
            const shares = Math.floor(Math.random() * 1000) + 100;
            const avgBuyPrice = Math.floor(Math.random() * 50) + 25;
            const currentPrice = Math.floor(Math.random() * 50) + 25;
            const positionValue = (shares * currentPrice) / 100;
            const unrealizedPnL = (shares * (currentPrice - avgBuyPrice)) / 100;

            return {
                marketId: market.id,
                marketQuestion: market.question,
                outcome,
                shares,
                avgBuyPrice,
                currentPrice,
                positionValue,
                unrealizedPnL,
                unrealizedPnLPercent: (unrealizedPnL / (shares * avgBuyPrice / 100)) * 100,
                imageUrl: market.image_url
            };
        });
    } catch {
        return [];
    }
}

export async function getUserTrades(address: string) {
    // Mock implementation
    return generateMockTrades(50);
}

export async function getMarketHolders(marketId: string) {
    // Mock implementation
    return {
        yesHolders: Array.from({ length: 10 }, (_, i) => ({
            address: `0x${Math.random().toString(16).slice(2, 42)}`,
            shares: Math.floor(Math.random() * 5000) + 100,
            avgPrice: Math.floor(Math.random() * 50) + 25,
            currentValue: Math.floor(Math.random() * 10000) + 500
        })),
        noHolders: Array.from({ length: 10 }, (_, i) => ({
            address: `0x${Math.random().toString(16).slice(2, 42)}`,
            shares: Math.floor(Math.random() * 5000) + 100,
            avgPrice: Math.floor(Math.random() * 50) + 25,
            currentValue: Math.floor(Math.random() * 10000) + 500
        }))
    };
}

export async function getMarketTopTraders(marketId: string) {
    // Mock implementation
    return Array.from({ length: 10 }, (_, i) => ({
        address: `0x${Math.random().toString(16).slice(2, 42)}`,
        position: Math.random() > 0.5 ? 'Yes' : 'No',
        pnl: Math.floor(Math.random() * 10000) - 2000,
        avgPrice: Math.floor(Math.random() * 50) + 25,
        volume: Math.floor(Math.random() * 50000) + 1000
    }));
}

export async function getMarketPriceHistory(marketId: string, timeRange: '1D' | '1W' | '1M' | 'ALL') {
    // Mock implementation
    const days = timeRange === '1D' ? 1 : timeRange === '1W' ? 7 : timeRange === '1M' ? 30 : 90;
    return generateMockPriceHistory(days);
}
