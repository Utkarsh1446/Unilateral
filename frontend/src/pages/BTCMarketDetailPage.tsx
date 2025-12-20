import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { TrendingUp, TrendingDown, Clock, DollarSign, ArrowLeft } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

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

export function BTCMarketDetailPage() {
    const { address } = useParams();
    const navigate = useNavigate();
    const [market, setMarket] = useState<BTCMarket | null>(null);
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [priceHistory, setPriceHistory] = useState<{ time: string; price: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'up' | 'down'>('up');
    const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
    const [limitPrice, setLimitPrice] = useState('0');
    const [shares, setShares] = useState('0');

    // Fetch market details
    useEffect(() => {
        const fetchMarket = async () => {
            try {
                const response = await fetch(`${API_URL}/btc-markets/market/${address}`);
                const data = await response.json();
                setMarket(data);
            } catch (error) {
                console.error('Failed to fetch market:', error);
            } finally {
                setLoading(false);
            }
        };

        if (address) {
            fetchMarket();
        }
    }, [address]);

    // Fetch current BTC price
    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const response = await fetch(`${API_URL}/btc-markets/price`);
                const data = await response.json();
                setCurrentPrice(data.price);

                // Add to price history
                setPriceHistory(prev => [
                    ...prev.slice(-50), // Keep last 50 points
                    { time: new Date().toLocaleTimeString(), price: data.price }
                ]);
            } catch (error) {
                console.error('Failed to fetch BTC price:', error);
            }
        };

        fetchPrice();
        const interval = setInterval(fetchPrice, 10000);
        return () => clearInterval(interval);
    }, []);

    const getTimeRemaining = () => {
        if (!market) return '';
        const now = new Date().getTime();
        const end = new Date(market.end_time).getTime();
        const diff = end - now;

        if (diff <= 0) return 'Expired';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return `${hours}h ${minutes}m ${seconds}s`;
    };

    const getPriceChange = () => {
        if (!market || !currentPrice) return { value: 0, isUp: true };
        const start = parseFloat(market.start_price);
        const change = ((currentPrice - start) / start) * 100;
        return { value: Math.abs(change), isUp: change > 0 };
    };

    const chartData = {
        labels: priceHistory.map(p => p.time),
        datasets: [
            {
                label: 'BTC Price',
                data: priceHistory.map(p => p.price),
                borderColor: 'rgb(249, 115, 22)',
                backgroundColor: 'rgba(249, 115, 22, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
            },
        },
        scales: {
            x: {
                display: false,
            },
            y: {
                position: 'right' as const,
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.5)',
                    callback: (value: any) => `$${value.toLocaleString()}`,
                },
            },
        },
        interaction: {
            mode: 'nearest' as const,
            axis: 'x' as const,
            intersect: false,
        },
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            </div>
        );
    }

    if (!market) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-white text-center">
                    <h2 className="text-2xl font-bold mb-4">Market Not Found</h2>
                    <button
                        onClick={() => navigate('/btc-markets')}
                        className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-xl font-semibold"
                    >
                        Back to Markets
                    </button>
                </div>
            </div>
        );
    }

    const priceChange = getPriceChange();
    const timeRemaining = getTimeRemaining();

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            <div className="container mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/btc-markets')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Back to Markets</span>
                    </button>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                                <DollarSign className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Bitcoin Up or Down</h1>
                                <p className="text-gray-500">
                                    {new Date(market.end_time).toLocaleString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                    })} ET
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div>
                                <div className="text-sm text-gray-500">PRICE TO BEAT</div>
                                <div className="text-2xl font-bold text-gray-900">
                                    ${parseFloat(market.start_price).toLocaleString()}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-orange-600 font-semibold">CURRENT PRICE</div>
                                <div className="flex items-center gap-2">
                                    <div className="text-2xl font-bold text-orange-600">
                                        ${currentPrice?.toLocaleString() || '---'}
                                    </div>
                                    <div className={`flex items-center gap-1 text-sm font-semibold ${priceChange.isUp ? 'text-green-600' : 'text-red-600'}`}>
                                        {priceChange.isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                        {priceChange.value.toFixed(2)}%
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-gray-500">TIME REMAINING</div>
                                <div className="text-xl font-mono font-bold text-red-600">
                                    {timeRemaining}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-3 gap-6">
                    {/* Left: Chart + Order Book */}
                    <div className="col-span-2 space-y-6">
                        {/* Price Chart */}
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                            <div className="h-64">
                                <Line data={chartData} options={chartOptions} />
                            </div>
                        </div>

                        {/* Order Book */}
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">Order Book</h3>
                                <div className="text-sm text-gray-500">$3.9k Vol</div>
                            </div>

                            <div className="flex gap-4 mb-4">
                                <button
                                    onClick={() => setActiveTab('up')}
                                    className={`flex-1 py-2 px-4 rounded-lg font-semibold ${activeTab === 'up' ? 'bg-green-50 text-green-700' : 'text-gray-600'}`}
                                >
                                    Trade Up
                                </button>
                                <button
                                    onClick={() => setActiveTab('down')}
                                    className={`flex-1 py-2 px-4 rounded-lg font-semibold ${activeTab === 'down' ? 'bg-red-50 text-red-700' : 'text-gray-600'}`}
                                >
                                    Trade Down
                                </button>
                            </div>

                            {/* Order Book Table */}
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 text-xs text-gray-500 font-semibold pb-2 border-b">
                                    <div>PRICE</div>
                                    <div className="text-right">SHARES</div>
                                    <div className="text-right">TOTAL</div>
                                </div>

                                {/* Sample orders */}
                                <div className="space-y-1">
                                    <div className="grid grid-cols-3 text-sm py-2 hover:bg-gray-50 rounded">
                                        <div className="text-red-600 font-semibold">61¢</div>
                                        <div className="text-right text-gray-900">379.91</div>
                                        <div className="text-right text-gray-900">$390.33</div>
                                    </div>
                                    <div className="grid grid-cols-3 text-sm py-2 hover:bg-gray-50 rounded">
                                        <div className="text-red-600 font-semibold">60¢</div>
                                        <div className="text-right text-gray-900">55.00</div>
                                        <div className="text-right text-gray-900">$158.58</div>
                                    </div>
                                    <div className="grid grid-cols-3 text-sm py-2 hover:bg-gray-50 rounded">
                                        <div className="text-red-600 font-semibold">59¢</div>
                                        <div className="text-right text-gray-900">126.92</div>
                                        <div className="text-right text-gray-900">$125.58</div>
                                    </div>

                                    <div className="py-2 text-center text-sm text-gray-500">
                                        Spread 1¢
                                    </div>

                                    <div className="grid grid-cols-3 text-sm py-2 hover:bg-gray-50 rounded">
                                        <div className="text-green-600 font-semibold">57¢</div>
                                        <div className="text-right text-gray-900">5.00</div>
                                        <div className="text-right text-gray-900">$2.85</div>
                                    </div>
                                    <div className="grid grid-cols-3 text-sm py-2 hover:bg-gray-50 rounded">
                                        <div className="text-green-600 font-semibold">56¢</div>
                                        <div className="text-right text-gray-900">211.09</div>
                                        <div className="text-right text-gray-900">$121.06</div>
                                    </div>
                                    <div className="grid grid-cols-3 text-sm py-2 hover:bg-gray-50 rounded">
                                        <div className="text-green-600 font-semibold">55¢</div>
                                        <div className="text-right text-gray-900">553.29</div>
                                        <div className="text-right text-gray-900">$425.37</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Trading Panel */}
                    <div className="space-y-6">
                        {/* Buy/Sell Toggle */}
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                            <div className="flex gap-2 mb-6">
                                <button
                                    onClick={() => setOrderType('buy')}
                                    className={`flex-1 py-2 px-4 rounded-lg font-semibold ${orderType === 'buy' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                                >
                                    Buy
                                </button>
                                <button
                                    onClick={() => setOrderType('sell')}
                                    className={`flex-1 py-2 px-4 rounded-lg font-semibold ${orderType === 'sell' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                                >
                                    Sell
                                </button>
                            </div>

                            {/* Quick Trade Buttons */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <button className="bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-4 rounded-xl">
                                    Up 67¢
                                </button>
                                <button className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-4 px-4 rounded-xl">
                                    Down 35¢
                                </button>
                            </div>

                            {/* Limit Price */}
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Limit Price
                                </label>
                                <div className="flex items-center gap-2">
                                    <button className="w-8 h-8 rounded-lg border border-gray-300 hover:bg-gray-50">
                                        −
                                    </button>
                                    <input
                                        type="text"
                                        value={limitPrice}
                                        onChange={(e) => setLimitPrice(e.target.value)}
                                        className="flex-1 text-center text-xl font-semibold border border-gray-300 rounded-lg py-2"
                                        placeholder="0¢"
                                    />
                                    <button className="w-8 h-8 rounded-lg border border-gray-300 hover:bg-gray-50">
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Shares */}
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Shares
                                </label>
                                <input
                                    type="number"
                                    value={shares}
                                    onChange={(e) => setShares(e.target.value)}
                                    className="w-full text-center text-xl font-semibold border border-gray-300 rounded-lg py-2"
                                    placeholder="0"
                                />
                                <div className="flex gap-2 mt-2">
                                    <button className="flex-1 py-1 px-2 text-sm border border-gray-300 rounded hover:bg-gray-50">-100</button>
                                    <button className="flex-1 py-1 px-2 text-sm border border-gray-300 rounded hover:bg-gray-50">-10</button>
                                    <button className="flex-1 py-1 px-2 text-sm border border-gray-300 rounded hover:bg-gray-50">+10</button>
                                    <button className="flex-1 py-1 px-2 text-sm border border-gray-300 rounded hover:bg-gray-50">+100</button>
                                </div>
                            </div>

                            {/* Total */}
                            <div className="mb-6 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Total</span>
                                    <span className="font-semibold text-blue-600">$0</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">To Win</span>
                                    <span className="font-semibold text-green-600">$0</span>
                                </div>
                            </div>

                            {/* Trade Button */}
                            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl">
                                Trade
                            </button>
                        </div>

                        {/* Market Context */}
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">Market Context</h3>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-purple-100 rounded-lg"></div>
                                        <span className="text-sm text-gray-700">Ethereum Up or Down</span>
                                    </div>
                                    <div className="text-sm font-semibold text-gray-900">77%</div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-blue-100 rounded-lg"></div>
                                        <span className="text-sm text-gray-700">Solana Up or Down</span>
                                    </div>
                                    <div className="text-sm font-semibold text-gray-900">75%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
