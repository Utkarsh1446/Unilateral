import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Clock, DollarSign, ArrowLeft, Copy, ExternalLink, Settings } from 'lucide-react';
import { ethers } from 'ethers';
import { CONTRACTS, ABIS } from '../lib/contracts';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar, Area } from 'recharts';

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
    const [priceHistory, setPriceHistory] = useState<{ time: string; price: number; timestamp: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'up' | 'down'>('up');
    const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
    const [limitPrice, setLimitPrice] = useState('50');
    const [shares, setShares] = useState('10');
    const [account, setAccount] = useState<string | null>(null);
    const [bids, setBids] = useState<any[]>([]);
    const [asks, setAsks] = useState<any[]>([]);
    const [isTrading, setIsTrading] = useState(false);
    const [timeRange, setTimeRange] = useState<'5m' | '15m' | '1h' | '5h' | '1d' | '1w' | 'all'>('all');
    const [chartType, setChartType] = useState<'line' | 'area'>('line');

    const READ_RPC = "https://sepolia.base.org";

    // Fetch market details
    useEffect(() => {
        const fetchMarket = async () => {
            try {
                const response = await fetch(`${API_URL}/btc-markets/market/${address}`);
                const data = await response.json();

                if (!data.contract_address || data.contract_address === '0x0000000000000000000000000000000000000000') {
                    console.error('Invalid market: null contract address');
                    setMarket(null);
                    setLoading(false);
                    return;
                }

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

                setPriceHistory(prev => [
                    ...prev.slice(-50),
                    { time: new Date().toLocaleTimeString(), price: data.price, timestamp: Date.now() }
                ]);
            } catch (error) {
                console.error('Failed to fetch BTC price:', error);
            }
        };

        fetchPrice();
        const interval = setInterval(fetchPrice, 500);
        return () => clearInterval(interval);
    }, []);

    // Check wallet connection
    useEffect(() => {
        const checkWallet = async () => {
            if (typeof window.ethereum !== 'undefined') {
                try {
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const accounts = await provider.listAccounts();
                    if (accounts.length > 0) {
                        setAccount(accounts[0].address);
                    }
                } catch (error) {
                    console.error('Error checking wallet:', error);
                }
            }
        };
        checkWallet();
    }, []);

    // Fetch order book
    useEffect(() => {
        if (market?.contract_address) {
            fetchOrders();
            const interval = setInterval(fetchOrders, 5000); // Refresh every 5 seconds
            return () => clearInterval(interval);
        }
    }, [market?.contract_address]);

    const fetchOrders = async () => {
        if (!market?.contract_address) return;
        try {
            const provider = new ethers.JsonRpcProvider(READ_RPC);
            const orderBook = new ethers.Contract(CONTRACTS.OrderBook, ABIS.OrderBook, provider);

            const currentBlock = await provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 10000);

            const filter = orderBook.filters.OrderPlaced(null, market.contract_address);
            const events = await orderBook.queryFilter(filter, fromBlock);

            const activeOrders: any[] = [];

            for (const event of events) {
                if ('args' in event) {
                    const { orderId, maker, outcomeIndex, price, amount, isBid } = (event as any).args;
                    const orderData = await orderBook.orders(orderId);
                    if (orderData.active) {
                        const remaining = parseFloat(ethers.formatUnits(orderData.amount - orderData.filled, 6));
                        if (remaining > 0) {
                            activeOrders.push({
                                id: Number(orderId),
                                maker,
                                price: parseFloat(ethers.formatUnits(price, 6)),
                                amount: remaining,
                                isBid,
                                outcomeIndex: Number(outcomeIndex)
                            });
                        }
                    }
                }
            }

            const newBids = activeOrders.filter(o => o.isBid).sort((a, b) => b.price - a.price);
            const newAsks = activeOrders.filter(o => !o.isBid).sort((a, b) => a.price - b.price);

            setBids(newBids);
            setAsks(newAsks);
        } catch (err) {
            console.error("Error fetching orders:", err);
        }
    };

    // Place order function
    const handlePlaceOrder = async () => {
        if (!account || !market?.contract_address) {
            alert('Please connect your wallet first');
            return;
        }

        if (!limitPrice || !shares || parseFloat(shares) <= 0) {
            alert('Please enter valid price and shares');
            return;
        }

        setIsTrading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            const priceIn6Decimals = Math.floor(parseFloat(limitPrice) * 10000);
            const amountInUsdc = ethers.parseUnits(shares, 6);
            const outcomeIndex = activeTab === 'up' ? 0 : 1;
            const isBid = orderType === 'buy';

            if (isBid) {
                const usdcContract = new ethers.Contract(
                    CONTRACTS.PlatformToken,
                    ABIS.PlatformToken,
                    signer
                );

                const approveTx = await usdcContract.approve(
                    CONTRACTS.OrderBook,
                    amountInUsdc
                );
                await approveTx.wait();
            }

            const orderBookContract = new ethers.Contract(
                CONTRACTS.OrderBook,
                ABIS.OrderBook,
                signer
            );

            const tx = await orderBookContract.placeOrder(
                market.contract_address,
                outcomeIndex,
                priceIn6Decimals,
                amountInUsdc,
                isBid
            );

            await tx.wait();
            alert('Order placed successfully!');

            setLimitPrice('50');
            setShares('10');
        } catch (error: any) {
            console.error('Error:', error);
            let msg = error.reason || error.message || error.toString();
            alert(`Failed: ${msg}`);
        } finally {
            setIsTrading(false);
        }
    };

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

    const getMarketTitle = () => {
        if (!market) return 'Bitcoin Up or Down';

        const startDate = new Date(market.start_time);
        const endDate = new Date(market.end_time);

        const monthDay = startDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            timeZone: 'America/New_York'
        });

        const startTime = startDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'America/New_York'
        });

        const endTime = endDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'America/New_York'
        });

        return `Bitcoin ${market.interval}m Up or Down: ${monthDay}, ${startTime}-${endTime} ET`;
    };

    const getFilteredData = () => {
        if (priceHistory.length === 0) return [];

        const now = Date.now();
        const ranges = {
            '5m': 5 * 60 * 1000,
            '15m': 15 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '5h': 5 * 60 * 60 * 1000,
            '1d': 24 * 60 * 60 * 1000,
            '1w': 7 * 24 * 60 * 60 * 1000,
            'all': Infinity
        };

        const cutoff = now - ranges[timeRange];
        return timeRange === 'all' ? priceHistory : priceHistory.filter(p => p.timestamp >= cutoff);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-black">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#A4E977] border-t-transparent"></div>
            </div>
        );
    }

    if (!market) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-white text-center">
                    <h2 className="text-2xl font-bold mb-4">Market Not Found</h2>
                    <button
                        onClick={() => navigate('/btc-markets')}
                        className="bg-[#A4E977] hover:bg-[#93d966] text-black px-6 py-3 rounded-xl font-semibold"
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
        <div className="bg-black min-h-screen text-white">
            {/* Top Header */}
            <div className="max-w-[1920px] mx-auto px-3 pt-3">
                <div className="border rounded-lg bg-[#0a0a0a] shadow-lg" style={{ borderColor: 'rgba(140, 180, 130, 0.35)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)' }}>
                    <div className="px-5 py-3">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            {/* Left: Market Title */}
                            <div className="flex items-start gap-2 md:gap-4">
                                <button
                                    onClick={() => navigate('/btc-markets')}
                                    className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-[#0f0f0f] text-white flex items-center justify-center transition-colors focus:outline-none flex-shrink-0"
                                    style={{ borderWidth: '1px', borderColor: 'rgba(164, 233, 119, 0.35)' }}
                                    title="Back to Markets"
                                >
                                    <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
                                </button>
                                <div className="w-12 h-12 md:w-14 md:h-14 bg-[#A4E977]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-[#A4E977]" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-base md:text-xl font-bold text-white mb-1 md:mb-1.5 line-clamp-2">
                                        {getMarketTitle()}
                                    </h1>
                                    <div className="text-xs md:text-sm text-gray-400">
                                        {new Date(market.end_time).toLocaleString('en-US', {
                                            month: 'long',
                                            day: 'numeric',
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            hour12: true
                                        })} ET
                                    </div>
                                </div>
                            </div>

                            {/* Right: Stats and Actions */}
                            <div className="flex items-center gap-4 md:gap-8">
                                <div className="text-right">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Price to Beat</div>
                                    <div className="text-sm text-white font-medium">${parseFloat(market.start_price).toLocaleString()}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-[#A4E977] uppercase tracking-wider mb-1">Current Price</div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm text-[#A4E977] font-medium">
                                            ${currentPrice?.toLocaleString() || '---'}
                                        </div>
                                        <div className={`flex items-center gap-1 text-xs font-semibold ${priceChange.isUp ? 'text-[#A4E977]' : 'text-red-500'}`}>
                                            {priceChange.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                            {priceChange.value.toFixed(2)}%
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Time Remaining</div>
                                    <div className="text-sm text-white font-medium font-mono">{timeRemaining}</div>
                                </div>

                                {/* Action Icons */}
                                <div className="hidden md:flex items-center gap-2">
                                    <button className="p-2 hover:bg-gray-800 rounded transition-colors">
                                        <Copy className="w-4 h-4 text-gray-400" />
                                    </button>
                                    <button className="p-2 hover:bg-gray-800 rounded transition-colors">
                                        <ExternalLink className="w-4 h-4 text-gray-400" />
                                    </button>
                                    <button className="p-2 hover:bg-gray-800 rounded transition-colors">
                                        <Settings className="w-4 h-4 text-gray-400" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-[1920px] mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-[84%_16%] gap-0">
                    {/* LEFT: Chart Section with Order Book Inside */}
                    <div className="lg:border-r border-gray-800/50 h-full">
                        <div className="grid grid-cols-1 xl:grid-cols-[85.35%_14.65%] gap-3 p-3">
                            {/* Chart Area */}
                            <div className="border rounded-lg overflow-hidden bg-[#0a0a0a] shadow-xl" style={{ borderColor: 'rgba(140, 180, 130, 0.35)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' }}>
                                <div className="p-3 bg-[#0a0a0a]">
                                    <div className="flex items-center justify-between gap-4 mb-4">
                                        {/* Time Range Buttons */}
                                        <div className="flex items-center gap-2">
                                            {(['5m', '15m', '1h', '5h', '1d', '1w', 'all'] as const).map((range) => (
                                                <button
                                                    key={range}
                                                    onClick={() => setTimeRange(range)}
                                                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${timeRange === range ? 'bg-[#A4E977]/20 text-[#A4E977]' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                                                >
                                                    {range.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Chart Type Switcher */}
                                        <div className="flex items-center gap-1 border border-gray-700 rounded-lg p-1">
                                            <button
                                                onClick={() => setChartType('line')}
                                                className={`p-1.5 rounded transition-colors ${chartType === 'line' ? 'bg-[#A4E977]/20 text-[#A4E977]' : 'text-gray-400 hover:text-white'}`}
                                                title="Line Chart"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => setChartType('area')}
                                                className={`p-1.5 rounded transition-colors ${chartType === 'area' ? 'bg-[#A4E977]/20 text-[#A4E977]' : 'text-gray-400 hover:text-white'}`}
                                                title="Area Chart"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                                                    <path d="M3 18h18" strokeLinecap="round" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="h-[500px] bg-[#0a0a0a] relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart
                                                data={getFilteredData().length > 0 ? getFilteredData().map(d => ({
                                                    time: d.time,
                                                    price: d.price,
                                                    volume: Math.random() * 1000 + 500
                                                })) : [
                                                    { time: 'Start', price: parseFloat(market.start_price), volume: 500 },
                                                    { time: 'Now', price: currentPrice || parseFloat(market.start_price), volume: 800 }
                                                ]}
                                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                            >
                                                <defs>
                                                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#A4E977" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#A4E977" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>

                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    stroke="#1a1a1a"
                                                    vertical={false}
                                                    opacity={0.5}
                                                />

                                                <XAxis
                                                    dataKey="time"
                                                    stroke="#666666"
                                                    style={{ fontSize: '11px' }}
                                                    axisLine={{ stroke: '#2a2a2a' }}
                                                    tickLine={false}
                                                    tick={{ fill: '#888888' }}
                                                />

                                                <YAxis
                                                    yAxisId="left"
                                                    stroke="#6B7280"
                                                    style={{ fontSize: '11px' }}
                                                    axisLine={{ stroke: '#374151' }}
                                                    tickLine={false}
                                                    tick={{ fill: '#9CA3AF' }}
                                                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                                                />

                                                <YAxis
                                                    yAxisId="right"
                                                    orientation="right"
                                                    stroke="#666666"
                                                    style={{ fontSize: '11px' }}
                                                    axisLine={{ stroke: '#2a2a2a' }}
                                                    tickLine={false}
                                                    tick={{ fill: '#888888' }}
                                                    tickFormatter={(value) => `${(value / 1000).toFixed(1)}K`}
                                                />

                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#0a0a0a',
                                                        border: '1px solid #2a2a2a',
                                                        borderRadius: '4px'
                                                    }}
                                                    labelStyle={{ color: '#9CA3AF', marginBottom: '8px' }}
                                                    itemStyle={{ color: '#A4E977', padding: '4px 0' }}
                                                    formatter={(value: any, name: string) => {
                                                        if (name === 'price') return [`$${Number(value).toLocaleString()}`, 'BTC Price'];
                                                        if (name === 'volume') return [`${Number(value).toFixed(0)}`, 'Volume'];
                                                        return [value, name];
                                                    }}
                                                    cursor={{ stroke: '#A4E977', strokeWidth: 1, strokeDasharray: '5 5' }}
                                                />

                                                <Bar
                                                    yAxisId="right"
                                                    dataKey="volume"
                                                    fill="#A4E977"
                                                    opacity={0.3}
                                                    radius={[2, 2, 0, 0]}
                                                />

                                                {chartType === 'area' && (
                                                    <Area
                                                        yAxisId="left"
                                                        type="monotone"
                                                        dataKey="price"
                                                        stroke="#A4E977"
                                                        strokeWidth={2}
                                                        fill="url(#colorPrice)"
                                                        dot={false}
                                                    />
                                                )}

                                                {chartType === 'line' && (
                                                    <Line
                                                        yAxisId="left"
                                                        type="monotone"
                                                        dataKey="price"
                                                        stroke="#A4E977"
                                                        strokeWidth={2}
                                                        dot={false}
                                                        activeDot={{ r: 4, fill: '#A4E977', stroke: '#000', strokeWidth: 2 }}
                                                    />
                                                )}
                                            </ComposedChart>
                                        </ResponsiveContainer>

                                        {/* Price indicator overlay */}
                                        <div className="absolute top-4 left-4 bg-[#0a0a0a]/90 border border-gray-800 rounded px-2.5 py-1.5">
                                            <div className="text-[10px] text-gray-500">Current Price</div>
                                            <div className="text-base font-bold text-[#A4E977]">${currentPrice?.toLocaleString() || '---'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Order Book - INSIDE Chart Section */}
                            <div className="border rounded-lg overflow-hidden bg-[#0a0a0a] shadow-xl" style={{ borderColor: 'rgba(140, 180, 130, 0.35)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' }}>
                                <div className="px-3 py-3 border-b border-[#A4E977]">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-semibold text-white">Order Book</h3>
                                        <div className="text-xs text-gray-500">$3.9k Vol</div>
                                    </div>

                                    <div className="flex gap-2 mb-3">
                                        <button
                                            onClick={() => setActiveTab('up')}
                                            className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold transition-colors ${activeTab === 'up' ? 'bg-[#A4E977]/20 text-[#A4E977]' : 'text-gray-400 hover:bg-gray-800'}`}
                                        >
                                            UP
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('down')}
                                            className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold transition-colors ${activeTab === 'down' ? 'bg-red-500/20 text-red-500' : 'text-gray-400 hover:bg-gray-800'}`}
                                        >
                                            DOWN
                                        </button>
                                    </div>
                                </div>

                                <div className="px-3 py-2">
                                    <div className="grid grid-cols-3 text-[10px] text-gray-500 font-semibold pb-2 border-b border-gray-800">
                                        <div>PRICE</div>
                                        <div className="text-right">SHARES</div>
                                        <div className="text-right">TOTAL</div>
                                    </div>

                                    <div className="space-y-1 mt-2">
                                        {/* Filter orders by selected outcome */}
                                        {asks.filter((o: any) => o.outcomeIndex === (activeTab === 'up' ? 0 : 1)).slice(0, 5).map((order: any, i: number) => (
                                            <div key={i} className="grid grid-cols-3 text-xs py-1.5 hover:bg-gray-800/50 rounded">
                                                <div className="text-red-500 font-semibold">{(order.price * 100).toFixed(0)}¢</div>
                                                <div className="text-right text-gray-300">{order.amount.toFixed(2)}</div>
                                                <div className="text-right text-gray-300">${(order.price * order.amount).toFixed(2)}</div>
                                            </div>
                                        ))}

                                        {asks.filter((o: any) => o.outcomeIndex === (activeTab === 'up' ? 0 : 1)).length === 0 && bids.filter((o: any) => o.outcomeIndex === (activeTab === 'up' ? 0 : 1)).length === 0 && (
                                            <div className="py-4 text-center text-xs text-gray-500">
                                                No orders available
                                            </div>
                                        )}

                                        {asks.filter((o: any) => o.outcomeIndex === (activeTab === 'up' ? 0 : 1)).length > 0 && bids.filter((o: any) => o.outcomeIndex === (activeTab === 'up' ? 0 : 1)).length > 0 && (
                                            <div className="py-2 text-center text-xs text-gray-500">
                                                Spread
                                            </div>
                                        )}

                                        {bids.filter((o: any) => o.outcomeIndex === (activeTab === 'up' ? 0 : 1)).slice(0, 5).map((order: any, i: number) => (
                                            <div key={i} className="grid grid-cols-3 text-xs py-1.5 hover:bg-gray-800/50 rounded">
                                                <div className="text-[#A4E977] font-semibold">{(order.price * 100).toFixed(0)}¢</div>
                                                <div className="text-right text-gray-300">{order.amount.toFixed(2)}</div>
                                                <div className="text-right text-gray-300">${(order.price * order.amount).toFixed(2)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Trading Panel */}
                    <div className="p-3">
                        <div className="border rounded-lg bg-[#0a0a0a] shadow-xl" style={{ borderColor: 'rgba(140, 180, 130, 0.35)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' }}>
                            <div className="px-4 py-4">
                                {/* Buy/Sell Toggle */}
                                <div className="flex gap-2 mb-4">
                                    <button
                                        onClick={() => setOrderType('buy')}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${orderType === 'buy' ? 'bg-[#A4E977] text-black' : 'bg-gray-800 text-gray-400'}`}
                                    >
                                        Buy
                                    </button>
                                    <button
                                        onClick={() => setOrderType('sell')}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${orderType === 'sell' ? 'bg-[#A4E977] text-black' : 'bg-gray-800 text-gray-400'}`}
                                    >
                                        Sell
                                    </button>
                                </div>

                                {/* Quick Trade Buttons */}
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <button className="bg-[#A4E977]/20 hover:bg-[#A4E977]/30 text-[#A4E977] font-semibold py-3 px-3 rounded-lg text-sm">
                                        Up 67¢
                                    </button>
                                    <button className="bg-red-500/20 hover:bg-red-500/30 text-red-500 font-semibold py-3 px-3 rounded-lg text-sm">
                                        Down 35¢
                                    </button>
                                </div>

                                {/* Limit Price */}
                                <div className="mb-4">
                                    <label className="block text-xs font-semibold text-gray-400 mb-2">
                                        Limit Price
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button className="w-7 h-7 rounded-lg border border-gray-700 hover:bg-gray-800 text-white">
                                            −
                                        </button>
                                        <input
                                            type="text"
                                            value={limitPrice}
                                            onChange={(e) => setLimitPrice(e.target.value)}
                                            className="flex-1 text-center text-lg font-semibold border border-gray-700 rounded-lg py-2 bg-[#0a0a0a] text-white"
                                            placeholder="0¢"
                                        />
                                        <button className="w-7 h-7 rounded-lg border border-gray-700 hover:bg-gray-800 text-white">
                                            +
                                        </button>
                                    </div>
                                </div>

                                {/* Shares */}
                                <div className="mb-4">
                                    <label className="block text-xs font-semibold text-gray-400 mb-2">
                                        Shares
                                    </label>
                                    <input
                                        type="number"
                                        value={shares}
                                        onChange={(e) => setShares(e.target.value)}
                                        className="w-full text-center text-lg font-semibold border border-gray-700 rounded-lg py-2 bg-[#0a0a0a] text-white"
                                        placeholder="0"
                                    />
                                    <div className="flex gap-2 mt-2">
                                        <button className="flex-1 py-1 px-2 text-xs border border-gray-700 rounded hover:bg-gray-800 text-gray-400">-100</button>
                                        <button className="flex-1 py-1 px-2 text-xs border border-gray-700 rounded hover:bg-gray-800 text-gray-400">-10</button>
                                        <button className="flex-1 py-1 px-2 text-xs border border-gray-700 rounded hover:bg-gray-800 text-gray-400">+10</button>
                                        <button className="flex-1 py-1 px-2 text-xs border border-gray-700 rounded hover:bg-gray-800 text-gray-400">+100</button>
                                    </div>
                                </div>

                                {/* Total */}
                                <div className="mb-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Total</span>
                                        <span className="font-semibold text-[#A4E977]">$0</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">To Win</span>
                                        <span className="font-semibold text-[#A4E977]">$0</span>
                                    </div>
                                </div>

                                {/* Trade Button */}
                                <button
                                    onClick={handlePlaceOrder}
                                    disabled={isTrading || !account}
                                    className={`w-full font-bold py-3 rounded-lg ${isTrading || !account
                                        ? 'bg-gray-700 cursor-not-allowed'
                                        : 'bg-[#A4E977] hover:bg-[#93d966]'
                                        } text-black`}
                                >
                                    {isTrading ? 'Placing Order...' : !account ? 'Connect Wallet' : 'Trade'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
