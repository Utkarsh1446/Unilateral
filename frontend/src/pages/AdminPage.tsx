import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingMarkets, approveMarket, rejectMarket, getMarkets, getAdminMarkets } from '../lib/api';
import { getContract, ABIS, CONTRACTS } from '../lib/contracts';
import { CheckCircle, XCircle, AlertCircle, Loader2, Gavel, CheckSquare, ShieldX, TrendingUp, Users, BarChart3, Clock, Activity, ExternalLink } from 'lucide-react';
import { ethers } from 'ethers';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3001";

// Admin wallet whitelist - only these wallets can access the admin panel
const ADMIN_WALLETS = [
    "0x9f4c1f7eaa0b729b798f81be84b25fdf9f66a0bf"
].map(w => w.toLowerCase());

// Market state enum matching contract (simplified)
enum MarketState {
    Open = 0,
    Resolved = 1
}

interface PlatformStats {
    totalMarkets: number;
    totalCreators: number;
    totalVolume: string;
    activeMarkets: number;
}



export function AdminPage() {
    const navigate = useNavigate();
    const [account, setAccount] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [markets, setMarkets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'resolution' | 'resolved'>('pending');
    const [resolutionOutcome, setResolutionOutcome] = useState<string>('');
    const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);

    useEffect(() => {
        checkConnection();
    }, []);

    useEffect(() => {
        if (account && isAdmin) {
            fetchMarkets();
            fetchPlatformStats();
        } else if (isAdmin === false) {
            setLoading(false);
        } else {
            const timer = setTimeout(() => setLoading(false), 1000);
            return () => clearTimeout(timer);
        }
    }, [account, isAdmin, activeTab]);

    const checkConnection = async () => {
        if (typeof (window as any).ethereum !== "undefined") {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const accounts = await provider.listAccounts();
            if (accounts.length > 0) {
                const walletAddress = accounts[0].address;
                setAccount(walletAddress);
                setIsAdmin(ADMIN_WALLETS.includes(walletAddress.toLowerCase()));
            } else {
                setIsAdmin(false);
            }
        } else {
            setIsAdmin(false);
        }
    };

    const fetchPlatformStats = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/stats`);
            const data = await res.json();
            setPlatformStats(data);
        } catch (e) {
            console.error("Failed to fetch platform stats:", e);
        }
    };



    const fetchMarkets = async () => {
        if (!account) return;
        setLoading(true);
        try {
            const allMarkets = await getAdminMarkets(account);
            let filteredData = [];
            const now = new Date();

            if (activeTab === 'pending') {
                filteredData = allMarkets.filter((m: any) => m.approval_status === 'pending');
            } else if (activeTab === 'active') {
                filteredData = allMarkets.filter((m: any) =>
                    m.approval_status === 'approved' &&
                    !m.resolved &&
                    new Date(m.deadline) > now
                );
            } else if (activeTab === 'resolution') {
                filteredData = allMarkets.filter((m: any) =>
                    m.approval_status === 'approved' &&
                    !m.resolved &&
                    new Date(m.deadline) <= now
                );
            } else if (activeTab === 'resolved') {
                filteredData = allMarkets.filter((m: any) => m.resolved);
            }

            setMarkets(filteredData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const getTimeRemaining = (deadline: string) => {
        const total = Date.parse(deadline) - Date.now();
        if (total <= 0) return "Ended";
        const days = Math.floor(total / (1000 * 60 * 60 * 24));
        const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((total / 1000 / 60) % 60);
        if (days > 0) return `${days}d ${hours}h remaining`;
        return `${hours}h ${minutes}m remaining`;
    };

    const handleApprove = async (id: string, questionId: string) => {
        if (!account) return;
        setActionLoading(id);
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            const factory = getContract(CONTRACTS.OpinionMarketFactory, ABIS.OpinionMarketFactory, provider);
            const factoryWithSigner = factory.connect(signer) as any;

            const tx = await factoryWithSigner.approveMarket(questionId);
            const receipt = await tx.wait();

            const iface = new ethers.Interface(ABIS.OpinionMarketFactory);
            let marketAddress = null;

            for (const log of receipt.logs) {
                try {
                    const parsed = iface.parseLog(log);
                    if (parsed && parsed.name === 'MarketCreated') {
                        marketAddress = parsed.args[0];
                        break;
                    }
                } catch (e) { }
            }

            if (marketAddress) {
                await fetch(`${API_URL}/markets/${id}/address`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contractAddress: marketAddress })
                });
            }

            await approveMarket(id, account);
            alert("Market Approved Successfully!");
            fetchMarkets();
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Failed to approve");
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id: string) => {
        if (!account || !rejectReason) return;
        setActionLoading(id);
        try {
            const market = markets.find(m => m.id === id);
            if (market && market.question_id) {
                try {
                    const provider = new ethers.BrowserProvider((window as any).ethereum);
                    const signer = await provider.getSigner();
                    const factory = getContract(CONTRACTS.OpinionMarketFactory, ABIS.OpinionMarketFactory, provider);
                    const factoryWithSigner = factory.connect(signer) as any;
                    const tx = await factoryWithSigner.rejectMarket(market.question_id);
                    await tx.wait();
                } catch (err: any) {
                    if (!confirm("On-chain rejection failed. Force-reject in database?")) {
                        throw new Error("Cancelled by user");
                    }
                }
            }
            await rejectMarket(id, rejectReason, account);
            alert("Market Rejected");
            setRejectReason('');
            setSelectedMarket(null);
            fetchMarkets();
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Failed to reject");
        } finally {
            setActionLoading(null);
        }
    };

    const handleResolveMarket = async (marketId: string, contractAddress: string) => {
        if (!account || !resolutionOutcome) return;
        setActionLoading(marketId);
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            const market = getContract(contractAddress, ABIS.OpinionMarket, signer);

            // Resolve market immediately
            const tx = await market.resolveMarket(parseInt(resolutionOutcome));
            await tx.wait();

            // Update backend
            await fetch(`${API_URL}/admin/markets/${marketId}/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ outcome: parseInt(resolutionOutcome), adminWallet: account })
            });

            alert("Market Resolved! Users can now claim winnings immediately.");
            setResolutionOutcome('');
            setSelectedMarket(null);
            fetchMarkets();
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Failed to resolve market");
        } finally {
            setActionLoading(null);
        }
    };



    const renderActionButtons = (market: any) => {
        if (activeTab === 'pending') {
            return (
                <>
                    <button
                        onClick={() => handleApprove(market.id, market.question_id)}
                        disabled={actionLoading === market.id}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-bold"
                    >
                        {actionLoading === market.id ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        Approve
                    </button>
                    <button
                        onClick={() => setSelectedMarket(selectedMarket === market.id ? null : market.id)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm font-bold"
                    >
                        <XCircle className="w-4 h-4" />
                        Reject
                    </button>
                </>
            );
        }

        if (activeTab === 'active' || activeTab === 'resolution') {
            // Simple check: if market is not resolved, show resolve button
            if (!market.resolved) {
                return (
                    <button
                        onClick={() => setSelectedMarket(selectedMarket === market.id ? null : market.id)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold"
                    >
                        <Gavel className="w-4 h-4" />
                        Resolve Market
                    </button>
                );
            }
        }

        return null;
    };

    return (
        <>
            <div className="bg-muted/20 min-h-screen">
                <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">

                    {/* Access Denied */}
                    {isAdmin === false && (
                        <div className="flex flex-col items-center justify-center py-24">
                            <div className="bg-background rounded-xl border border-red-200 p-8 max-w-md text-center">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ShieldX className="w-8 h-8 text-red-600" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                                <p className="text-muted-foreground mb-4">
                                    This page is restricted to admin wallets only.
                                </p>
                                {account ? (
                                    <p className="text-xs text-muted-foreground font-mono bg-muted/30 p-2 rounded">
                                        Connected: {account.slice(0, 6)}...{account.slice(-4)}
                                    </p>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Please connect an admin wallet to continue.
                                    </p>
                                )}
                                <button
                                    onClick={() => navigate('/')}
                                    className="mt-6 px-6 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium"
                                >
                                    Go Home
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Admin Dashboard */}
                    {isAdmin && (
                        <>
                            <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Admin Dashboard</h1>

                            {/* Platform Stats */}
                            {platformStats && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                    <div className="bg-background rounded-xl border border-foreground/10 p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                                <BarChart3 className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Total Markets</p>
                                                <p className="text-xl font-bold">{platformStats.totalMarkets}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-background rounded-xl border border-foreground/10 p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                                <TrendingUp className="w-5 h-5 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Total Volume</p>
                                                <p className="text-xl font-bold">${Number(platformStats.totalVolume || 0).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-background rounded-xl border border-foreground/10 p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                                <Users className="w-5 h-5 text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Total Creators</p>
                                                <p className="text-xl font-bold">{platformStats.totalCreators}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-background rounded-xl border border-foreground/10 p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                                                <Activity className="w-5 h-5 text-orange-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Active Markets</p>
                                                <p className="text-xl font-bold">{platformStats.activeMarkets}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tabs */}
                            <div className="flex gap-4 mb-6 border-b border-foreground/10 pb-1 overflow-x-auto">
                                {(['pending', 'active', 'resolution', 'resolved'] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`pb-3 px-2 font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === tab
                                            ? 'border-foreground text-foreground'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        {tab === 'pending' && 'Pending Approvals'}
                                        {tab === 'active' && 'Active Markets'}
                                        {tab === 'resolution' && 'Needs Resolution'}
                                        {tab === 'resolved' && 'Resolved'}
                                    </button>
                                ))}
                            </div>

                            <div className="bg-background rounded-xl border border-foreground/10 p-6">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    {activeTab === 'pending' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
                                    {activeTab === 'active' && <CheckSquare className="w-5 h-5 text-blue-600" />}
                                    {activeTab === 'resolution' && <Gavel className="w-5 h-5 text-orange-600" />}
                                    {activeTab === 'resolved' && <CheckCircle className="w-5 h-5 text-purple-600" />}
                                    {activeTab === 'pending' ? 'Pending Approvals' :
                                        activeTab === 'active' ? 'Active Markets' :
                                            activeTab === 'resolution' ? 'Needs Resolution' : 'Resolved Markets'}
                                    <span className="text-sm font-normal text-muted-foreground">({markets.length})</span>
                                </h2>

                                {loading ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
                                    </div>
                                ) : markets.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        No markets found in this category.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {markets.map((market) => (
                                            <div key={market.id} className="border border-foreground/10 rounded-xl p-6 hover:bg-muted/10 transition-colors">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">{market.category}</span>
                                                            {market.contract_address && (
                                                                <a
                                                                    href={`https://sepolia.basescan.org/address/${market.contract_address}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                                                                >
                                                                    <ExternalLink className="w-3 h-3" />
                                                                    Contract
                                                                </a>
                                                            )}
                                                        </div>
                                                        <h3 className="text-lg font-bold mb-2 truncate">{market.question}</h3>
                                                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{market.description}</p>

                                                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                                            <span>Creator: {market.creator?.user?.wallet_address?.slice(0, 6)}...{market.creator?.user?.wallet_address?.slice(-4)}</span>
                                                            <span>Deadline: {new Date(market.deadline).toLocaleDateString()}</span>
                                                            <span className={`font-mono font-bold ${new Date(market.deadline) < new Date() ? 'text-red-500' : 'text-green-600'}`}>
                                                                {getTimeRemaining(market.deadline)}
                                                            </span>
                                                            {market.volume > 0 && (
                                                                <span className="text-blue-600 font-medium">Vol: ${Number(market.volume).toFixed(2)}</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-2 min-w-[160px]">
                                                        {renderActionButtons(market)}
                                                    </div>
                                                </div>

                                                {/* Rejection Panel */}
                                                {selectedMarket === market.id && activeTab === 'pending' && (
                                                    <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-100 animate-in fade-in slide-in-from-top-2">
                                                        <label className="block text-sm font-bold text-red-800 mb-2">Reason for Rejection</label>
                                                        <textarea
                                                            value={rejectReason}
                                                            onChange={(e) => setRejectReason(e.target.value)}
                                                            placeholder="e.g. Duplicate market, Unclear resolution criteria..."
                                                            className="w-full p-3 rounded-lg border border-red-200 bg-white text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                                            rows={3}
                                                        />
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => setSelectedMarket(null)} className="px-3 py-2 text-sm text-red-600 hover:bg-red-100 rounded-lg transition-colors">
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(market.id)}
                                                                disabled={!rejectReason || actionLoading === market.id}
                                                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-bold disabled:opacity-50"
                                                            >
                                                                Confirm Rejection
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Resolution Panel */}
                                                {selectedMarket === market.id && (activeTab === 'active' || activeTab === 'resolution') && (
                                                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-2">
                                                        <label className="block text-sm font-bold text-blue-800 mb-2">Select Outcome</label>
                                                        <p className="text-xs text-blue-600 mb-3">
                                                            Market will be resolved immediately. Users can claim winnings right away.
                                                        </p>
                                                        <select
                                                            value={resolutionOutcome}
                                                            onChange={(e) => setResolutionOutcome(e.target.value)}
                                                            className="w-full p-3 rounded-lg border border-blue-200 bg-white text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                        >
                                                            <option value="">Select Outcome</option>
                                                            <option value="0">YES wins</option>
                                                            <option value="1">NO wins</option>
                                                        </select>
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => setSelectedMarket(null)} className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={() => handleResolveMarket(market.id, market.contract_address)}
                                                                disabled={!resolutionOutcome || actionLoading === market.id}
                                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold disabled:opacity-50"
                                                            >
                                                                {actionLoading === market.id ? <Loader2 className="animate-spin w-4 h-4" /> : 'Resolve Market'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
