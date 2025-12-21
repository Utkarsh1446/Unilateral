import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { OrderBook } from '../components/OrderBook';
import { PriceChart } from '../components/PriceChart';
import { Loader2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { getMarket, getMarketPriceHistory, getMarketTopTraders, getMarketHolders } from '../lib/api';

type OrderType = 'market' | 'limit';
type Outcome = 'Yes' | 'No';
type Tab = 'trade' | 'activity' | 'traders' | 'holders';
type TimeRange = '1D' | '1W' | '1M' | 'ALL';

const QUICK_AMOUNTS = [10, 50, 100, 500];

export function TradingTerminalPage() {
    const { marketId } = useParams<{ marketId: string }>();
    const [market, setMarket] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('trade');
    const [timeRange, setTimeRange] = useState<TimeRange>('1W');
    const [priceHistory, setPriceHistory] = useState<any[]>([]);
    const [topTraders, setTopTraders] = useState<any[]>([]);
    const [holders, setHolders] = useState<any>({ yesHolders: [], noHolders: [] });

    // Trading state
    const [orderType, setOrderType] = useState<OrderType>('market');
    const [outcome, setOutcome] = useState<Outcome>('Yes');
    const [amount, setAmount] = useState('');
    const [limitPrice, setLimitPrice] = useState('');

    useEffect(() => {
        if (marketId) {
            fetchMarketData();
        }
    }, [marketId]);

    useEffect(() => {
        if (marketId) {
            fetchPriceHistory();
        }
    }, [marketId, timeRange]);

    useEffect(() => {
        if (marketId && activeTab === 'traders') {
            fetchTopTraders();
        } else if (marketId && activeTab === 'holders') {
            fetchHolders();
        }
    }, [marketId, activeTab]);

    const fetchMarketData = async () => {
        setLoading(true);
        try {
            const data = await getMarket(marketId!);
            setMarket(data);
        } catch (error) {
            console.error('Failed to fetch market:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPriceHistory = async () => {
        try {
            const data = await getMarketPriceHistory(marketId!, timeRange);
            setPriceHistory(data);
        } catch (error) {
            console.error('Failed to fetch price history:', error);
        }
    };

    const fetchTopTraders = async () => {
        try {
            const data = await getMarketTopTraders(marketId!);
            setTopTraders(data);
        } catch (error) {
            console.error('Failed to fetch top traders:', error);
        }
    };

    const fetchHolders = async () => {
        try {
            const data = await getMarketHolders(marketId!);
            setHolders(data);
        } catch (error) {
            console.error('Failed to fetch holders:', error);
        }
    };

    const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    const currentPrice = outcome === 'Yes'
        ? market?.outcomes?.find((o: any) => o.name === 'Yes')?.current_price * 100 || 50
        : market?.outcomes?.find((o: any) => o.name === 'No')?.current_price * 100 || 50;

    const estimatedShares = amount && orderType === 'market'
        ? Math.floor((parseFloat(amount) * 100) / currentPrice)
        : amount && limitPrice
            ? Math.floor((parseFloat(amount) * 100) / parseFloat(limitPrice))
            : 0;

    if (loading) {
        return (
            <div className="min-h-screen bg-muted/20 flex items-center justify-center">
                <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
            </div>
        );
    }

    if (!market) {
        return (
            <div className="min-h-screen bg-muted/20 flex items-center justify-center">
                <p className="text-muted-foreground">Market not found</p>
            </div>
        );
    }

    const yesPrice = Math.round((market.outcomes?.find((o: any) => o.name === 'Yes')?.current_price || 0.5) * 100);
    const noPrice = 100 - yesPrice;

    return (
        <>
            <div className="bg-muted/20 min-h-screen">
                <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-4 md:py-6">
                    {/* Market Header */}
                    <div className="bg-background border border-foreground/10 rounded-xl p-6 mb-6">
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                            {market.question}
                        </h1>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Yes Price</p>
                                <p className="text-2xl font-bold text-green-600">{yesPrice}¢</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">No Price</p>
                                <p className="text-2xl font-bold text-red-600">{noPrice}¢</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Volume</p>
                                <p className="text-2xl font-bold text-foreground">${(market.volume || 0).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Liquidity</p>
                                <p className="text-2xl font-bold text-foreground">${((market.volume || 0) * 1.5).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Chart & OrderBook */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Price Chart */}
                            <PriceChart
                                data={priceHistory}
                                timeRange={timeRange}
                                onTimeRangeChange={setTimeRange}
                            />

                            {/* OrderBook */}
                            <OrderBook marketAddress={market.contract_address || ''} />
                        </div>

                        {/* Right Column - Trading Panel */}
                        <div className="space-y-6">
                            {/* Tab Navigation */}
                            <div className="bg-background border border-foreground/10 rounded-xl overflow-hidden">
                                <div className="grid grid-cols-4 border-b border-foreground/10">
                                    {(['trade', 'activity', 'traders', 'holders'] as const).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`px-3 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === tab
                                                    ? 'bg-foreground text-background'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                                                }`}
                                            style={{ letterSpacing: '0.05em' }}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>

                                <div className="p-4">
                                    {/* Trade Tab */}
                                    {activeTab === 'trade' && (
                                        <div className="space-y-4">
                                            {/* Order Type */}
                                            <div className="flex gap-2 bg-muted/20 rounded-lg p-1">
                                                <button
                                                    onClick={() => setOrderType('market')}
                                                    className={`flex-1 px-3 py-2 rounded-md text-sm font-semibold transition-all ${orderType === 'market'
                                                            ? 'bg-foreground text-background'
                                                            : 'text-muted-foreground'
                                                        }`}
                                                >
                                                    Market
                                                </button>
                                                <button
                                                    onClick={() => setOrderType('limit')}
                                                    className={`flex-1 px-3 py-2 rounded-md text-sm font-semibold transition-all ${orderType === 'limit'
                                                            ? 'bg-foreground text-background'
                                                            : 'text-muted-foreground'
                                                        }`}
                                                >
                                                    Limit
                                                </button>
                                            </div>

                                            {/* Outcome Selector */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setOutcome('Yes')}
                                                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${outcome === 'Yes'
                                                            ? 'bg-green-600 text-white'
                                                            : 'bg-green-600/10 text-green-600 hover:bg-green-600/20'
                                                        }`}
                                                >
                                                    Yes {yesPrice}¢
                                                </button>
                                                <button
                                                    onClick={() => setOutcome('No')}
                                                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${outcome === 'No'
                                                            ? 'bg-red-600 text-white'
                                                            : 'bg-red-600/10 text-red-600 hover:bg-red-600/20'
                                                        }`}
                                                >
                                                    No {noPrice}¢
                                                </button>
                                            </div>

                                            {/* Quick Amount Buttons */}
                                            <div>
                                                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block" style={{ letterSpacing: '0.05em' }}>
                                                    Quick Amount
                                                </label>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {QUICK_AMOUNTS.map((quickAmount) => (
                                                        <button
                                                            key={quickAmount}
                                                            onClick={() => setAmount(quickAmount.toString())}
                                                            className="px-3 py-2 bg-foreground/5 hover:bg-foreground/10 rounded-lg text-sm font-semibold text-foreground transition-colors"
                                                        >
                                                            ${quickAmount}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Amount Input */}
                                            <div>
                                                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block" style={{ letterSpacing: '0.05em' }}>
                                                    Amount ($)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={amount}
                                                    onChange={(e) => setAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full px-4 py-3 bg-background border border-foreground/10 rounded-lg focus:border-foreground/30 outline-none transition-colors text-sm"
                                                />
                                            </div>

                                            {/* Limit Price (only for limit orders) */}
                                            {orderType === 'limit' && (
                                                <div>
                                                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block" style={{ letterSpacing: '0.05em' }}>
                                                        Limit Price (¢)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={limitPrice}
                                                        onChange={(e) => setLimitPrice(e.target.value)}
                                                        placeholder={currentPrice.toString()}
                                                        className="w-full px-4 py-3 bg-background border border-foreground/10 rounded-lg focus:border-foreground/30 outline-none transition-colors text-sm"
                                                    />
                                                </div>
                                            )}

                                            {/* Estimated Shares */}
                                            {amount && (
                                                <div className="p-3 bg-muted/20 rounded-lg">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-muted-foreground">Estimated Shares</span>
                                                        <span className="font-bold text-foreground">{estimatedShares.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Place Order Button */}
                                            <button
                                                disabled={!amount || (orderType === 'limit' && !limitPrice)}
                                                className="w-full px-4 py-3 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Place {orderType === 'market' ? 'Market' : 'Limit'} Order
                                            </button>
                                        </div>
                                    )}

                                    {/* Activity Tab */}
                                    {activeTab === 'activity' && (
                                        <div className="space-y-4">
                                            <p className="text-sm text-muted-foreground text-center py-8">
                                                Connect wallet to view your activity
                                            </p>
                                        </div>
                                    )}

                                    {/* Top Traders Tab */}
                                    {activeTab === 'traders' && (
                                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                            {topTraders.map((trader, index) => (
                                                <div key={trader.address} className="p-3 bg-muted/20 rounded-lg">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-muted-foreground">#{index + 1}</span>
                                                            <span className="text-sm font-medium text-foreground">{truncateAddress(trader.address)}</span>
                                                        </div>
                                                        <span className={`text-xs font-semibold px-2 py-1 rounded ${trader.position === 'Yes' ? 'bg-green-600/20 text-green-600' : 'bg-red-600/20 text-red-600'
                                                            }`}>
                                                            {trader.position}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                                        <div>
                                                            <p className="text-muted-foreground mb-1">PnL</p>
                                                            <p className={`font-bold ${trader.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {trader.pnl >= 0 ? '+' : ''}${trader.pnl.toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground mb-1">Avg Price</p>
                                                            <p className="font-bold text-foreground">{trader.avgPrice}¢</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground mb-1">Volume</p>
                                                            <p className="font-bold text-foreground">${(trader.volume / 1000).toFixed(1)}K</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Holders Tab */}
                                    {activeTab === 'holders' && (
                                        <div className="space-y-4">
                                            {/* Yes Holders */}
                                            <div>
                                                <h4 className="text-xs text-green-600 uppercase tracking-wider mb-2 font-semibold" style={{ letterSpacing: '0.05em' }}>
                                                    Top Yes Holders
                                                </h4>
                                                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                                                    {holders.yesHolders.slice(0, 5).map((holder: any, index: number) => (
                                                        <div key={holder.address} className="p-2 bg-green-600/5 rounded-lg">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="text-foreground font-medium">{truncateAddress(holder.address)}</span>
                                                                <span className="text-muted-foreground">{holder.shares.toLocaleString()} shares</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* No Holders */}
                                            <div>
                                                <h4 className="text-xs text-red-600 uppercase tracking-wider mb-2 font-semibold" style={{ letterSpacing: '0.05em' }}>
                                                    Top No Holders
                                                </h4>
                                                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                                                    {holders.noHolders.slice(0, 5).map((holder: any, index: number) => (
                                                        <div key={holder.address} className="p-2 bg-red-600/5 rounded-lg">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="text-foreground font-medium">{truncateAddress(holder.address)}</span>
                                                                <span className="text-muted-foreground">{holder.shares.toLocaleString()} shares</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}
