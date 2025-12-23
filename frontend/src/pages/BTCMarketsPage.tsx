import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';

interface BTCMarket {
    id: string;
    market_id: string;
    contract_address: string | null;
    interval: number;
    start_time: string;
    end_time: string;
    start_price: string;
    end_price: string | null;
    resolved: boolean;
    outcome: number | null;
}

type IntervalType = 15 | 60 | 360 | 720;

export function BTCMarketsPage() {
    const [activeInterval, setActiveInterval] = useState<IntervalType>(15);
    const [markets, setMarkets] = useState<BTCMarket[]>([]);
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch current BTC price
    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const response = await fetch(`${API_URL}/btc-markets/price`);
                const data = await response.json();
                setCurrentPrice(data.price);
            } catch (error) {
                console.error('Failed to fetch BTC price:', error);
            }
        };

        fetchPrice();
        const interval = setInterval(fetchPrice, 500); // Update every 0.5 seconds
        return () => clearInterval(interval);
    }, []);

    // Fetch markets for active interval
    useEffect(() => {
        const fetchMarkets = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${API_URL}/btc-markets/interval/${activeInterval}`);
                const data = await response.json();
                // Filter out markets with null contract addresses
                const validMarkets = data.filter((m: any) => 
                    m.contract_address && m.contract_address !== '0x0000000000000000000000000000000000000000'
                );
                console.log(`Filtered ${data.length - validMarkets.length} invalid markets`);
                setMarkets(validMarkets);
            } catch (error) {
                console.error('Failed to fetch markets:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMarkets();
        const interval = setInterval(fetchMarkets, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, [activeInterval]);

    const getIntervalLabel = (interval: number) => {
        if (interval < 60) return `${interval}m`;
        if (interval < 1440) return `${interval / 60}h`;
        return `${interval / 1440}d`;
    };

    const getPriceChange = (startPrice: string, currentPrice: number) => {
        const start = parseFloat(startPrice);
        const change = ((currentPrice - start) / start) * 100;
        return change;
    };

    const intervals: IntervalType[] = [15, 60, 360, 720];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">

            <div className="container mx-auto px-4 py-8">
                {/* Header with Current BTC Price */}
                <div className="mb-8">
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-2">
                                    Bitcoin Price Markets
                                </h1>
                                <p className="text-white/70">
                                    Trade on BTC price movements across different timeframes
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-white/70 mb-1">Current BTC Price</div>
                                <div className="text-4xl font-bold text-white flex items-center gap-2">
                                    <DollarSign className="w-8 h-8" />
                                    {currentPrice ? currentPrice.toLocaleString('en-US', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    }) : '---'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Interval Tabs */}
                <div className="mb-6">
                    <div className="flex gap-2 bg-white/5 backdrop-blur-sm rounded-xl p-2 border border-white/10">
                        {intervals.map((interval) => (
                            <button
                                key={interval}
                                onClick={() => setActiveInterval(interval)}
                                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${activeInterval === interval
                                    ? 'bg-purple-600 text-white shadow-lg'
                                    : 'text-white/70 hover:bg-white/10'
                                    }`}
                            >
                                {getIntervalLabel(interval)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Markets Grid */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
                        <p className="text-white/70 mt-4">Loading markets...</p>
                    </div>
                ) : markets.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
                        <Clock className="w-16 h-16 text-white/30 mx-auto mb-4" />
                        <p className="text-white/70 text-lg">No active markets for this interval</p>
                        <p className="text-white/50 text-sm mt-2">
                            Markets are created automatically on schedule
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {markets.map((market) => (
                            <MarketCard
                                key={market.id}
                                market={market}
                                currentPrice={currentPrice}
                            />
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}

interface MarketCardProps {
    market: BTCMarket;
    currentPrice: number | null;
}

function MarketCard({ market, currentPrice }: MarketCardProps) {
    const [timeRemaining, setTimeRemaining] = useState('');

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date().getTime();
            const end = new Date(market.end_time).getTime();
            const diff = end - now;

            if (diff <= 0) {
                setTimeRemaining('Expired');
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [market.end_time]);

    const startPrice = parseFloat(market.start_price);
    const priceChange = currentPrice ? ((currentPrice - startPrice) / startPrice) * 100 : 0;
    const isUp = priceChange > 0;

    return (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:border-purple-500/50 transition-all">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${market.resolved ? 'bg-gray-500' : 'bg-green-500 animate-pulse'}`}></div>
                    <span className="text-white/70 text-sm">
                        {market.resolved ? 'Resolved' : 'Active'}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-white/70">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-mono">{timeRemaining}</span>
                </div>
            </div>

            {/* Price Info */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-white/70 text-sm">Start Price</span>
                    <span className="text-white font-mono">
                        ${startPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-white/70 text-sm">Current Price</span>
                    <span className="text-white font-mono">
                        ${currentPrice?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '---'}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">Change</span>
                    <div className={`flex items-center gap-1 font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                        {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span>{Math.abs(priceChange).toFixed(2)}%</span>
                    </div>
                </div>
            </div>

            {/* Trading Buttons */}
            {!market.resolved && market.contract_address && (
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => window.location.href = `/btc-market/${market.contract_address}`}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <TrendingUp className="w-5 h-5" />
                        <span>UP</span>
                    </button>
                    <button
                        onClick={() => window.location.href = `/btc-market/${market.contract_address}`}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <TrendingDown className="w-5 h-5" />
                        <span>DOWN</span>
                    </button>
                </div>
            )}

            {/* Resolved Outcome */}
            {market.resolved && (
                <div className={`text-center py-3 px-4 rounded-xl font-bold ${market.outcome === 0 ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                    }`}>
                    {market.outcome === 0 ? '📈 UP' : '📉 DOWN'}
                </div>
            )}
        </div>
    );
}
