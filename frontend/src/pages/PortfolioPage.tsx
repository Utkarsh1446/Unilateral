import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { PositionCard } from '../components/PositionCard';
import { StatCard } from '../components/StatCard';
import { TrendingUp, TrendingDown, DollarSign, Activity, Target, BarChart3, Loader2, Star, StarOff } from 'lucide-react';
import { getUserPositions, getUserTrades, getMarkets } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';

type PositionFilter = 'all' | 'yes' | 'no';
type PositionSort = 'pnl' | 'size' | 'market';

export function PortfolioPage() {
    const { address, isConnected } = useAccount();
    const [activeTab, setActiveTab] = useState<'positions' | 'closed' | 'trades' | 'watchlist'>('positions');
    const [positions, setPositions] = useState<any[]>([]);
    const [trades, setTrades] = useState<any[]>([]);
    const [watchlist, setWatchlist] = useState<string[]>([]);
    const [watchedMarkets, setWatchedMarkets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Position filters
    const [positionFilter, setPositionFilter] = useState<PositionFilter>('all');
    const [positionSort, setPositionSort] = useState<PositionSort>('pnl');

    useEffect(() => {
        if (isConnected && address) {
            fetchPortfolioData();
        } else {
            setLoading(false);
        }
    }, [isConnected, address]);

    useEffect(() => {
        if (watchlist.length > 0) {
            fetchWatchedMarkets();
        }
    }, [watchlist]);

    const fetchPortfolioData = async () => {
        setLoading(true);
        try {
            const [positionsData, tradesData] = await Promise.all([
                getUserPositions(address!),
                getUserTrades(address!)
            ]);
            setPositions(positionsData);
            setTrades(tradesData);

            // Load watchlist from localStorage
            const savedWatchlist = localStorage.getItem(`watchlist_${address}`);
            if (savedWatchlist) {
                setWatchlist(JSON.parse(savedWatchlist));
            }
        } catch (error) {
            console.error('Failed to fetch portfolio data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWatchedMarkets = async () => {
        try {
            const allMarkets = await getMarkets();
            const watched = allMarkets.filter((m: any) => watchlist.includes(m.id));
            setWatchedMarkets(watched);
        } catch (error) {
            console.error('Failed to fetch watched markets:', error);
        }
    };

    const toggleWatchlist = (marketId: string) => {
        const newWatchlist = watchlist.includes(marketId)
            ? watchlist.filter(id => id !== marketId)
            : [...watchlist, marketId];

        setWatchlist(newWatchlist);
        localStorage.setItem(`watchlist_${address}`, JSON.stringify(newWatchlist));
    };

    // Calculate portfolio stats
    const totalValue = positions.reduce((sum, p) => sum + p.positionValue, 0);
    const totalPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
    const totalPnLPercent = totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0;
    const winningTrades = trades.filter((t: any) => t.totalCost > 0).length; // Mock calculation
    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0;
    const totalVolume = trades.reduce((sum: number, t: any) => sum + t.totalCost, 0);

    // Filter and sort positions
    const filteredPositions = positions.filter(p => {
        if (positionFilter === 'all') return true;
        return p.outcome.toLowerCase() === positionFilter;
    });

    const sortedPositions = [...filteredPositions].sort((a, b) => {
        switch (positionSort) {
            case 'pnl':
                return b.unrealizedPnL - a.unrealizedPnL;
            case 'size':
                return b.positionValue - a.positionValue;
            case 'market':
                return a.marketQuestion.localeCompare(b.marketQuestion);
            default:
                return 0;
        }
    });

    const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    if (!isConnected) {
        return (
            <>
                <div className="bg-muted/20 min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-xl text-muted-foreground mb-4">Connect your wallet to view your portfolio</p>
                        <p className="text-sm text-muted-foreground">Track positions, analyze performance, and manage your watchlist</p>
                    </div>
                </div>
            </>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-muted/20 flex items-center justify-center">
                <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
            </div>
        );
    }

    return (
        <>
            <div className="bg-muted/20 min-h-screen">
                <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 md:py-6">
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                            Portfolio
                        </h1>
                        <p className="text-muted-foreground">
                            {address && truncateAddress(address)}
                        </p>
                    </div>

                    {/* Portfolio Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        <StatCard
                            label="Portfolio Value"
                            value={`$${totalValue.toLocaleString()}`}
                            icon={<DollarSign className="w-4 h-4" />}
                        />
                        <StatCard
                            label="Total PnL"
                            value={`$${Math.abs(totalPnL).toLocaleString()}`}
                            change={totalPnLPercent}
                            trend={totalPnL >= 0 ? 'up' : 'down'}
                            icon={<TrendingUp className="w-4 h-4" />}
                        />
                        <StatCard
                            label="Win Rate"
                            value={`${winRate}%`}
                            trend={winRate >= 50 ? 'up' : 'down'}
                            icon={<Target className="w-4 h-4" />}
                        />
                        <StatCard
                            label="Total Trades"
                            value={totalTrades}
                            icon={<Activity className="w-4 h-4" />}
                        />
                        <StatCard
                            label="Total Volume"
                            value={`$${(totalVolume / 1000).toFixed(1)}K`}
                            icon={<BarChart3 className="w-4 h-4" />}
                        />
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                        {(['positions', 'closed', 'trades', 'watchlist'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${activeTab === tab
                                        ? 'bg-foreground text-background'
                                        : 'bg-background border border-foreground/10 text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {tab === 'positions' ? 'Active Positions' :
                                    tab === 'closed' ? 'Closed Positions' :
                                        tab === 'trades' ? 'Trade History' : 'Watchlist'}
                            </button>
                        ))}
                    </div>

                    {/* Active Positions Tab */}
                    {activeTab === 'positions' && (
                        <>
                            {/* Filters */}
                            <div className="flex flex-wrap gap-3 mb-6">
                                <div className="flex gap-2 bg-background border border-foreground/10 rounded-xl p-1">
                                    <button
                                        onClick={() => setPositionFilter('all')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${positionFilter === 'all' ? 'bg-foreground text-background' : 'text-muted-foreground'
                                            }`}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setPositionFilter('yes')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${positionFilter === 'yes' ? 'bg-green-600 text-white' : 'text-muted-foreground'
                                            }`}
                                    >
                                        Yes
                                    </button>
                                    <button
                                        onClick={() => setPositionFilter('no')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${positionFilter === 'no' ? 'bg-red-600 text-white' : 'text-muted-foreground'
                                            }`}
                                    >
                                        No
                                    </button>
                                </div>

                                <select
                                    value={positionSort}
                                    onChange={(e) => setPositionSort(e.target.value as PositionSort)}
                                    className="px-4 py-2 bg-background border border-foreground/10 rounded-xl text-sm font-medium focus:border-foreground/30 outline-none"
                                >
                                    <option value="pnl">Sort by PnL</option>
                                    <option value="size">Sort by Size</option>
                                    <option value="market">Sort by Market</option>
                                </select>
                            </div>

                            {/* Positions Grid */}
                            {sortedPositions.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {sortedPositions.map((position) => (
                                        <PositionCard key={position.marketId} {...position} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 bg-background rounded-xl border border-foreground/10">
                                    <p className="text-muted-foreground mb-2">No active positions</p>
                                    <p className="text-sm text-muted-foreground">Start trading to build your portfolio</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Closed Positions Tab */}
                    {activeTab === 'closed' && (
                        <div className="text-center py-16 bg-background rounded-xl border border-foreground/10">
                            <p className="text-muted-foreground">No closed positions yet</p>
                        </div>
                    )}

                    {/* Trade History Tab */}
                    {activeTab === 'trades' && (
                        <div className="bg-background border border-foreground/10 rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-muted/20 border-b border-foreground/10">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Market</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outcome</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shares</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-foreground/10">
                                        {trades.slice(0, 20).map((trade) => (
                                            <tr key={trade.id} className="hover:bg-muted/10 transition-colors">
                                                <td className="px-4 py-3 text-sm text-muted-foreground">
                                                    {formatDistanceToNow(trade.timestamp, { addSuffix: true })}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-foreground font-medium max-w-xs truncate">
                                                    {trade.marketQuestion}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${trade.outcome === 'Yes' ? 'bg-green-600/20 text-green-600' : 'bg-red-600/20 text-red-600'
                                                        }`}>
                                                        {trade.outcome}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-foreground text-right font-medium">
                                                    {trade.shares.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-foreground text-right">
                                                    {trade.price}¢
                                                </td>
                                                <td className="px-4 py-3 text-sm text-foreground text-right font-semibold">
                                                    ${trade.totalCost.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Watchlist Tab */}
                    {activeTab === 'watchlist' && (
                        <>
                            {watchedMarkets.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {watchedMarkets.map((market) => {
                                        const yesOutcome = market.outcomes?.find((o: any) => o.name === 'Yes');
                                        const yesPrice = yesOutcome ? Math.round(Number(yesOutcome.current_price) * 100) : 50;

                                        return (
                                            <div key={market.id} className="bg-background border border-foreground/10 rounded-xl p-4 relative">
                                                <button
                                                    onClick={() => toggleWatchlist(market.id)}
                                                    className="absolute top-3 right-3 p-2 hover:bg-foreground/5 rounded-lg transition-colors"
                                                >
                                                    <StarOff className="w-4 h-4 text-muted-foreground" />
                                                </button>
                                                <h3 className="text-sm font-semibold text-foreground mb-3 pr-8">
                                                    {market.question}
                                                </h3>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground mb-1">Yes Price</p>
                                                        <p className="text-lg font-bold text-green-600">{yesPrice}¢</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground mb-1">No Price</p>
                                                        <p className="text-lg font-bold text-red-600">{100 - yesPrice}¢</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-16 bg-background rounded-xl border border-foreground/10">
                                    <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-muted-foreground mb-2">No markets in watchlist</p>
                                    <p className="text-sm text-muted-foreground">Add markets to track them here</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
