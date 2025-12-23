import { useState, useEffect } from 'react';
import { TradeCard } from '../components/TradeCard';
import { TraderCard } from '../components/TraderCard';
import { StatCard } from '../components/StatCard';
import { Activity, DollarSign, TrendingUp, Loader2 } from 'lucide-react';
import { getWhaleTrades, getTraderStats } from '../lib/api';

type TimeRange = '24h' | '7d' | '30d' | 'all';

export function WhalesPage() {
    const [timeRange, setTimeRange] = useState<TimeRange>('24h');
    const [threshold, setThreshold] = useState(1000);
    const [trades, setTrades] = useState<any[]>([]);
    const [selectedTrader, setSelectedTrader] = useState<string | null>(null);
    const [traderStats, setTraderStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [loadingStats, setLoadingStats] = useState(false);

    useEffect(() => {
        fetchTrades();
    }, [threshold, timeRange]);

    useEffect(() => {
        if (selectedTrader) {
            fetchTraderStats(selectedTrader);
        }
    }, [selectedTrader]);

    const fetchTrades = async () => {
        setLoading(true);
        try {
            const data = await getWhaleTrades(threshold, timeRange);
            setTrades(data);
        } catch (error) {
            console.error('Failed to fetch whale trades:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTraderStats = async (address: string) => {
        setLoadingStats(true);
        try {
            const stats = await getTraderStats(address);
            setTraderStats(stats);
        } catch (error) {
            console.error('Failed to fetch trader stats:', error);
        } finally {
            setLoadingStats(false);
        }
    };

    // Generate whale leaderboard from trades
    const whaleLeaderboard = trades
        .reduce((acc: any[], trade) => {
            const existing = acc.find(t => t.address === trade.traderAddress);
            if (existing) {
                existing.totalVolume += trade.totalCost;
                existing.tradeCount += 1;
            } else {
                acc.push({
                    address: trade.traderAddress,
                    totalVolume: trade.totalCost,
                    tradeCount: 1,
                    totalPnL: Math.floor(Math.random() * 10000) - 2000,
                    winRate: Math.floor(Math.random() * 40) + 40,
                    activePositions: Math.floor(Math.random() * 5) + 1
                });
            }
            return acc;
        }, [])
        .sort((a, b) => b.totalVolume - a.totalVolume)
        .slice(0, 10);

    return (
        <>
            <div className="bg-muted/20 min-h-screen">
                <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 md:py-6">
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                            Whale Tracker
                        </h1>
                        <p className="text-muted-foreground">
                            Track big buys and identify potential insiders
                        </p>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        {/* Time Range */}
                        <div className="flex gap-2 bg-background border border-foreground/10 rounded-xl p-1">
                            {(['24h', '7d', '30d', 'all'] as const).map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${timeRange === range
                                            ? 'bg-foreground text-background'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
                                </button>
                            ))}
                        </div>

                        {/* Threshold Slider */}
                        <div className="flex-1 bg-background border border-foreground/10 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs text-muted-foreground uppercase tracking-wider" style={{ letterSpacing: '0.05em' }}>
                                    Minimum Trade Size
                                </label>
                                <span className="text-sm font-bold text-foreground">${threshold.toLocaleString()}</span>
                            </div>
                            <input
                                type="range"
                                min="100"
                                max="10000"
                                step="100"
                                value={threshold}
                                onChange={(e) => setThreshold(parseInt(e.target.value))}
                                className="w-full"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Big Buys Feed */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-foreground">Big Buys Feed</h2>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Activity className="w-4 h-4" />
                                    <span>{trades.length} trades</span>
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
                                </div>
                            ) : trades.length > 0 ? (
                                <div className="space-y-3">
                                    {trades.map((trade) => (
                                        <div
                                            key={trade.id}
                                            onClick={() => setSelectedTrader(trade.traderAddress)}
                                            className="cursor-pointer"
                                        >
                                            <TradeCard {...trade} />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 bg-background rounded-xl border border-foreground/10">
                                    <p className="text-muted-foreground">No whale trades found for this threshold</p>
                                </div>
                            )}
                        </div>

                        {/* Right Column - Trader Stats & Leaderboard */}
                        <div className="space-y-6">
                            {/* Selected Trader Stats */}
                            {selectedTrader && (
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground mb-3">Trader Stats</h3>
                                    {loadingStats ? (
                                        <div className="flex justify-center py-10 bg-background rounded-xl border border-foreground/10">
                                            <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
                                        </div>
                                    ) : traderStats ? (
                                        <div className="space-y-3">
                                            <StatCard
                                                label="Total PnL"
                                                value={`$${Math.abs(traderStats.totalPnL).toLocaleString()}`}
                                                trend={traderStats.totalPnL >= 0 ? 'up' : 'down'}
                                                icon={<DollarSign className="w-4 h-4" />}
                                            />
                                            <StatCard
                                                label="Win Rate"
                                                value={`${traderStats.winRate}%`}
                                                trend={traderStats.winRate >= 50 ? 'up' : 'down'}
                                            />
                                            <StatCard
                                                label="Total Volume"
                                                value={`$${(traderStats.totalVolume / 1000).toFixed(1)}K`}
                                                icon={<TrendingUp className="w-4 h-4" />}
                                            />
                                            <StatCard
                                                label="Active Positions"
                                                value={traderStats.activePositions}
                                                icon={<Activity className="w-4 h-4" />}
                                            />
                                            {traderStats.avgHoldTime && (
                                                <StatCard
                                                    label="Avg Hold Time"
                                                    value={traderStats.avgHoldTime}
                                                />
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            )}

                            {/* Whale Leaderboard */}
                            <div>
                                <h3 className="text-sm font-semibold text-foreground mb-3">Whale Leaderboard</h3>
                                <div className="space-y-3">
                                    {whaleLeaderboard.map((whale, index) => (
                                        <div
                                            key={whale.address}
                                            className="relative"
                                        >
                                            {index < 3 && (
                                                <div className="absolute -left-2 -top-2 w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-xs font-bold text-white shadow-lg z-10">
                                                    {index + 1}
                                                </div>
                                            )}
                                            <TraderCard
                                                {...whale}
                                                onClick={() => setSelectedTrader(whale.address)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
