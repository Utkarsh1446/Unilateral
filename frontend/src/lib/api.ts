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
