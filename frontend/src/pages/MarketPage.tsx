import { Navbar } from '../components/Navbar';
import { ArrowLeft, Loader2, Copy, ExternalLink, Settings } from 'lucide-react';
import React, { useEffect, useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar, Area, Scatter, Cell, ReferenceLine } from 'recharts';
import { useNavigate, useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import { toast, Toaster } from 'sonner';
import { CONTRACTS, ABIS, getContract } from '../lib/contracts';
import { getMarket, updateMarketStats } from '../lib/api';

interface TradeEvent {
  user: string;
  outcomeIndex: number;
  amountIn: string;
  amountOut: string;
  timestamp: number;
  type: 'Buy' | 'Sell';
  price: number;
  txHash: string;
}

// Custom Candlestick Component
const Candlestick = (props: any) => {
  const { x, y, width, height, low, high, open, close } = props;
  const isGrowing = close > open;
  const color = isGrowing ? '#A4E977' : '#EF4444';
  const ratio = Math.abs(height / (open - close));

  return (
    <g>
      {/* Wick (High-Low line) */}
      <line
        x1={x + width / 2}
        y1={y}
        x2={x + width / 2}
        y2={y + height}
        stroke={color}
        strokeWidth={1}
      />
      {/* Candle Body */}
      <rect
        x={x}
        y={isGrowing ? y + height - (close - open) * ratio : y + height - (open - close) * ratio}
        width={width}
        height={Math.abs((close - open) * ratio)}
        fill={color}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  );
};


export function MarketPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [market, setMarket] = useState<any>(null);
  const [loadingMarket, setLoadingMarket] = useState(true);

  // Trading State
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'pro'>('market');
  const [selectedOutcome, setSelectedOutcome] = useState<0 | 1>(0);
  const [amount, setAmount] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  const [takeProfitStopLoss, setTakeProfitStopLoss] = useState(false);
  const [relatedMarketsExpanded, setRelatedMarketsExpanded] = useState(true);
  const [activeMobilePanel, setActiveMobilePanel] = useState<'chart' | 'orderbook' | 'positions' | 'related' | 'trading'>('chart');

  // Advanced Trading State
  const [oneClickTrading, setOneClickTrading] = useState(false);
  const [leverage, setLeverage] = useState(1);
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [takeProfitPrice, setTakeProfitPrice] = useState('');
  const [advancedOrderType, setAdvancedOrderType] = useState<'stop-limit' | 'trailing-stop' | 'none'>('none');
  const [trailingStopPercent, setTrailingStopPercent] = useState('5');

  // Bottom Section State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'buy' | 'sell'>('all');
  const [filterOutcome, setFilterOutcome] = useState<'all' | 'yes' | 'no'>('all');

  // Additional Features State
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [priceAlerts, setPriceAlerts] = useState<Array<{ price: number, type: 'above' | 'below' }>>([]);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertPrice, setAlertPrice] = useState('');
  const [alertType, setAlertType] = useState<'above' | 'below'>('above');
  const [showDepthChart, setShowDepthChart] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [relatedMarkets] = useState([
    { id: 1, description: "BTC >$100k by EOY 2024?", image_url: "/Superpumped_SVG.svg", volume: "125000", liquidity: "50000", category: "Crypto", endDate: "2024-12-31", outcomePrices: ["65"] },
    { id: 2, description: "ETH to flip BTC in 2025?", image_url: "/Superpumped_SVG.svg", volume: "89000", liquidity: "35000", category: "Crypto", endDate: "2025-12-31", outcomePrices: ["25"] },
    { id: 3, description: "SOL >$200 in Q1 2025?", image_url: "/Superpumped_SVG.svg", volume: "67000", liquidity: "28000", category: "Crypto", endDate: "2025-03-31", outcomePrices: ["45"] },
    { id: 4, description: "Trump wins 2024 election?", image_url: "/Superpumped_SVG.svg", volume: "250000", liquidity: "120000", category: "Politics", endDate: "2024-11-05", outcomePrices: ["52"] },
    { id: 5, description: "Lakers win NBA Championship?", image_url: "/Superpumped_SVG.svg", volume: "45000", liquidity: "18000", category: "Sports", endDate: "2025-06-30", outcomePrices: ["30"] },
  ]);






  // Order Book State
  const [bids, setBids] = useState<any[]>([]);
  const [asks, setAsks] = useState<any[]>([]);

  // UI State
  const [activeTab, setActiveTab] = useState('positions');
  const [timeRange, setTimeRange] = useState<'1s' | '1m' | '1h' | '1d'>('1h');
  const [chartType, setChartType] = useState<'line' | 'candle' | 'area'>('line');

  // Wallet & Contract State
  const [account, setAccount] = useState<string | null>(null);
  const [prices, setPrices] = useState<[string, string]>(["-", "-"]);
  const [positions, setPositions] = useState<[string, string]>(["0", "0"]);
  const [balance, setBalance] = useState("0");

  const [chartData, setChartData] = useState<any[]>([]);
  const [recentTrades, setRecentTrades] = useState<TradeEvent[]>([]);
  const [priceChange, setPriceChange] = useState(0);

  const READ_RPC = "https://sepolia.base.org";

  useEffect(() => {
    if (chartData.length > 0) {
      const startPrice = chartData[0].YES;
      const endPrice = chartData[chartData.length - 1].YES;
      setPriceChange(parseFloat((endPrice - startPrice).toFixed(1)));
    }
  }, [chartData]);

  useEffect(() => {
    checkConnection();
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 5000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (market?.contract_address) {
      fetchOrders();
    }
    if (account) {
      checkBalance();
      fetchPositions();
    }
  }, [account, market]);

  useEffect(() => {
    fetchTradeHistory();
    const interval = setInterval(fetchTradeHistory, 15000);
    return () => clearInterval(interval);
  }, [market?.contract_address]);

  const checkConnection = async () => {
    if (typeof window.ethereum !== "undefined") {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) setAccount(accounts[0].address);
    }
  };

  const fetchMarketData = async () => {
    try {
      if (!id) return;
      const data = await getMarket(id);
      setMarket(data);
    } catch (err) {
      console.error("Fetch market error:", err);
    } finally {
      setLoadingMarket(false);
    }
  };

  const fetchPositions = async () => {
    if (!account || !market?.contract_address) return;
    try {
      const provider = new ethers.JsonRpcProvider(READ_RPC);
      const marketContract = getContract(market.contract_address, ABIS.OpinionMarket, provider);
      const [collateralToken, ctAddress, conditionId] = await Promise.all([
        marketContract.collateralToken(),
        marketContract.conditionalTokens(),
        marketContract.conditionId()
      ]);
      const ctContract = getContract(ctAddress, ABIS.ConditionalTokens, provider);

      const getPositionId = (index: number) => {
        const indexSet = 1 << index;
        return ethers.solidityPackedKeccak256(
          ["address", "bytes32", "uint256"],
          [collateralToken, conditionId, indexSet]
        );
      };

      const id0 = getPositionId(0);
      const id1 = getPositionId(1);

      const bal0 = await ctContract.balanceOf(account, BigInt(id0));
      const bal1 = await ctContract.balanceOf(account, BigInt(id1));

      setPositions([ethers.formatUnits(bal0, 6), ethers.formatUnits(bal1, 6)]);
    } catch (err) {
      console.error("Error fetching positions:", err);
    }
  };

  const checkBalance = async () => {
    if (!account) return;
    try {
      const provider = new ethers.JsonRpcProvider(READ_RPC);
      const token = getContract(CONTRACTS.PlatformToken, ABIS.PlatformToken, provider);
      const bal = await token.balanceOf(account);
      setBalance(ethers.formatUnits(bal, 6));
    } catch (e) {
      console.error("Error checking balance:", e);
    }
  };

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

  const orderCache = useRef<Map<bigint, { market: string; outcomeIndex: bigint; isBid: boolean }>>(new Map());

  const fetchTradeHistory = async () => {
    if (!market?.contract_address) return;
    try {
      const provider = new ethers.JsonRpcProvider(READ_RPC);
      const orderBook = new ethers.Contract(CONTRACTS.OrderBook, ABIS.OrderBook, provider);

      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000);
      const filter = orderBook.filters.OrderFilled();
      const events = await orderBook.queryFilter(filter, fromBlock);

      const tradePromises = events.map(async (event) => {
        if ('args' in event) {
          try {
            const { orderId, taker, amount, cost } = event.args;
            let orderDetails = orderCache.current.get(orderId);

            if (!orderDetails) {
              try {
                const order = await orderBook.orders(orderId);
                orderDetails = {
                  market: order.market,
                  outcomeIndex: order.outcomeIndex,
                  isBid: order.isBid
                };
                orderCache.current.set(orderId, orderDetails);
              } catch (e) {
                return null;
              }
            }

            if (orderDetails.market.toLowerCase() !== market.contract_address.toLowerCase()) {
              return null;
            }

            const block = await event.getBlock();
            const formattedAmount = parseFloat(ethers.formatUnits(amount, 6));
            const formattedCost = parseFloat(ethers.formatUnits(cost, 6));
            const price = formattedAmount > 0 ? formattedCost / formattedAmount : 0;
            const type = orderDetails.isBid ? 'Sell' : 'Buy';

            let yesPrice = Number(orderDetails.outcomeIndex) === 0 ? price : 1 - price;
            if (yesPrice < 0) yesPrice = 0;
            if (yesPrice > 1) yesPrice = 1;
            if (isNaN(yesPrice)) yesPrice = 0.5;

            return {
              trade: {
                user: taker,
                outcomeIndex: Number(orderDetails.outcomeIndex),
                amountIn: formattedCost.toFixed(2),
                amountOut: formattedAmount.toFixed(2),
                timestamp: block.timestamp * 1000,
                type,
                price,
                txHash: event.transactionHash
              },
              chartPoint: {
                date: new Date(block.timestamp * 1000).toLocaleTimeString(),
                timestamp: block.timestamp * 1000,
                YES: yesPrice * 100,
                NO: (1 - yesPrice) * 100
              }
            };
          } catch (e) {
            return null;
          }
        }
        return null;
      });

      const results = (await Promise.all(tradePromises)).filter((r): r is NonNullable<typeof r> => r !== null);
      results.sort((a, b) => b!.trade.timestamp - a!.trade.timestamp);

      setRecentTrades(results.map(r => r!.trade as TradeEvent));

      const chartPoints = results.map(r => r!.chartPoint).sort((a, b) => a.timestamp - b.timestamp);

      if (market?.created_at && chartPoints.length > 0) {
        const startTime = new Date(market.created_at).getTime();
        if (chartPoints[0].timestamp > startTime + 60000) {
          chartPoints.unshift({
            date: new Date(market.created_at).toLocaleTimeString(),
            timestamp: startTime,
            YES: 50,
            NO: 50
          });
        }
      } else if (market?.created_at && chartPoints.length === 0) {
        const startTime = new Date(market.created_at).getTime();
        chartPoints.push(
          { date: new Date(market.created_at).toLocaleTimeString(), timestamp: startTime, YES: 50, NO: 50 },
          { date: new Date().toLocaleTimeString(), timestamp: Date.now(), YES: 50, NO: 50 }
        );
      }

      setChartData(chartPoints);

      if (results.length > 0) {
        const latestYesPrice = results[0]!.chartPoint.YES / 100;
        if (!isNaN(latestYesPrice)) {
          setPrices([(latestYesPrice * 100).toFixed(0), ((1 - latestYesPrice) * 100).toFixed(0)]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getFilteredData = () => {
    // Generate realistic historical data for professional trading chart
    const now = Date.now();
    const ranges = {
      '1s': 60 * 1000,      // Last 60 seconds
      '1m': 60 * 60 * 1000, // Last hour
      '1h': 24 * 60 * 60 * 1000, // Last 24 hours
      '1d': 7 * 24 * 60 * 1000   // Last week
    };

    const range = ranges[timeRange] || ranges['1h'];
    const startTime = now - range;

    // Determine number of data points based on timeframe
    const dataPoints = {
      '1s': 60,   // 60 points (1 per second)
      '1m': 60,   // 60 points (1 per minute)
      '1h': 48,   // 48 points (30 min intervals)
      '1d': 56    // 56 points (3 hour intervals)
    };

    const numPoints = dataPoints[timeRange] || 48;
    const interval = range / numPoints;

    // Generate realistic price movement
    const data = [];
    let currentYesPrice = yesPrice / 100; // Convert to odds (0-1)

    for (let i = 0; i < numPoints; i++) {
      const timestamp = startTime + (i * interval);
      const date = new Date(timestamp);

      // Add realistic price volatility
      const volatility = 0.02; // 2% volatility
      const randomChange = (Math.random() - 0.5) * volatility;
      currentYesPrice = Math.max(0.1, Math.min(0.9, currentYesPrice + randomChange));

      // Generate volume with realistic patterns (higher volume during price changes)
      const baseVolume = 500 + Math.random() * 1000;
      const volumeMultiplier = 1 + Math.abs(randomChange) * 50;
      const volume = baseVolume * volumeMultiplier;

      // Format time based on timeframe
      let timeLabel;
      if (timeRange === '1s') {
        timeLabel = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      } else if (timeRange === '1m') {
        timeLabel = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      } else if (timeRange === '1h') {
        timeLabel = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      } else {
        timeLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' });
      }

      data.push({
        date: timeLabel,
        time: timeLabel,
        timestamp: timestamp,
        YES: currentYesPrice,
        NO: 1 - currentYesPrice,
        volume: volume,
        // Candlestick data for candle chart
        open: currentYesPrice - (Math.random() - 0.5) * 0.01,
        high: currentYesPrice + Math.random() * 0.02,
        low: currentYesPrice - Math.random() * 0.02,
        close: currentYesPrice
      });
    }

    return data;
  };


  // Use placeholder data if market not found to show layout
  const displayMarket = market || {
    id: '1',
    description: 'Will JD Vance win the 2028 US Presidential Election?',
    image_url: 'https://i.pravatar.cc/40?img=12',
    volume: '3389525.22',
    contract_address: '0x0000000000000000000000000000000000000000'
  };

  if (loadingMarket) {
    return <div className="flex justify-center items-center min-h-screen bg-black"><Loader2 className="animate-spin text-[#A4E977]" size={32} /></div>;
  }

  const yesPrice = prices[0] === "-" ? 50 : Math.min(100, Math.round(parseFloat(prices[0])));
  const noPrice = prices[1] === "-" ? 50 : Math.min(100, Math.round(parseFloat(prices[1])));
  const currentPrice = selectedOutcome === 0 ? yesPrice : noPrice;

  // Filter orders by selected outcome
  const filteredBids = bids.filter(o => o.outcomeIndex === selectedOutcome);
  const filteredAsks = asks.filter(o => o.outcomeIndex === selectedOutcome);

  const calculatePotentialPayout = () => {
    if (!amount || parseFloat(amount) <= 0) return '0.00';
    const numAmount = parseFloat(amount);
    const price = currentPrice / 100;
    if (price === 0) return '0.00';
    const shares = numAmount / price;
    return shares.toFixed(2);
  };

  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="bg-black min-h-screen text-white pt-[58px] overflow-x-hidden">
        {/* Top Navbar */}


        {/* Top Header */}
        <div className="max-w-[1920px] mx-auto px-3 pt-3 pb-3">
          <div className="border rounded-lg bg-[#0a0a0a] shadow-lg" style={{ borderColor: 'rgba(140, 180, 130, 0.35)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)' }}>
            <div className="px-5 py-3">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                {/* Left: Market Title and Volume */}
                <div className="flex items-start gap-2 md:gap-4">
                  {displayMarket.image_url && (
                    <img
                      src={displayMarket.image_url}
                      alt=""
                      className="w-12 h-12 md:w-14 md:h-14 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <h1 className="text-base md:text-xl font-bold text-white mb-1 md:mb-1.5 line-clamp-2">
                      {displayMarket.description}
                    </h1>
                    <div className="text-xs md:text-sm text-gray-400">
                      ${parseFloat(displayMarket.volume || "0").toLocaleString()} Vol.
                    </div>
                  </div>
                </div>

                {/* Right: Outcome and Chance */}
                <div className="flex items-center gap-4 md:gap-8">
                  <div className="text-right">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Outcome</div>
                    <div className="text-sm text-white font-medium">-</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                      % Chance
                      <button className="text-gray-500 hover:text-white">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-sm text-white font-medium">{yesPrice}%</div>
                  </div>

                  {/* Action Icons */}
                  <div className="hidden md:flex items-center gap-2">
                    {/* Watchlist/Favorites */}
                    <button
                      onClick={() => setIsWatchlisted(!isWatchlisted)}
                      className={`p-2 hover:bg-gray-800 rounded transition-colors ${isWatchlisted ? 'text-[#A4E977]' : 'text-gray-400'}`}
                      title={isWatchlisted ? "Remove from Watchlist" : "Add to Watchlist"}
                    >
                      <svg className="w-4 h-4" fill={isWatchlisted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>

                    {/* Price Alert */}
                    <button
                      onClick={() => setShowAlertModal(true)}
                      className={`p-2 hover:bg-gray-800 rounded transition-colors ${priceAlerts.length > 0 ? 'text-[#A4E977]' : 'text-gray-400'}`}
                      title="Set Price Alert"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      {priceAlerts.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-[#A4E977] text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                          {priceAlerts.length}
                        </span>
                      )}
                    </button>

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

        {/* Mobile Tab Navigation - Only visible on mobile */}
        <div className="lg:hidden pb-3">
          <div className="flex gap-1 bg-[#0a0a0a] border border-[rgba(140,180,130,0.35)] rounded-lg p-2 mx-3">
            <button
              onClick={() => setActiveMobilePanel('chart')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors flex items-center justify-center ${activeMobilePanel === 'chart' ? 'bg-[#A4E977] text-black' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                }`}
            >
              Chart
            </button>
            <button
              onClick={() => setActiveMobilePanel('orderbook')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors flex items-center justify-center ${activeMobilePanel === 'orderbook' ? 'bg-[#A4E977] text-black' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                }`}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveMobilePanel('positions')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors flex items-center justify-center ${activeMobilePanel === 'positions' ? 'bg-[#A4E977] text-black' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                }`}
            >
              Positions
            </button>
            <button
              onClick={() => setActiveMobilePanel('related')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors flex items-center justify-center ${activeMobilePanel === 'related' ? 'bg-[#A4E977] text-black' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                }`}
            >
              Related
            </button>
            <button
              onClick={() => setActiveMobilePanel('trading')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors flex items-center justify-center ${activeMobilePanel === 'trading' ? 'bg-[#A4E977] text-black' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                }`}
            >
              Trade
            </button>
          </div>
        </div>

        {/* Main Content - THREE COLUMN LAYOUT (Desktop/Tablet) */}
        <div className="max-w-[1920px] mx-auto">
          <div className="hidden lg:block">
            <div className="grid gap-3 px-3 pb-4" style={{ gridTemplateColumns: '1.3fr 0.3fr 0.4fr', minHeight: 'calc(100vh - 150px)' }}>
              {/* LEFT COLUMN: Chart, Positions, Related Markets */}
              <div className="flex flex-col gap-3 h-full">
                {/* Chart Area */}
                <div>
                  <div className="border rounded-lg overflow-hidden bg-[#0a0a0a] shadow-xl" style={{ borderColor: 'rgba(140, 180, 130, 0.35)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' }}>
                    <div className="p-3 bg-[#0a0a0a]">
                      <div className="flex items-center justify-between gap-4 mb-4">
                        {/* Time Range Buttons - LEFT */}
                        <div className="flex items-center gap-2">
                          {(['1s', '1m', '1h', '1d'] as const).map((range) => (
                            <button
                              key={range}
                              onClick={() => setTimeRange(range)}
                              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${timeRange === range ? 'bg-[#A4E977]/20 text-[#A4E977]' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                            >
                              {range.toUpperCase()}
                            </button>
                          ))}
                        </div>

                        {/* Chart Type Switcher - RIGHT */}
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
                            onClick={() => setChartType('candle')}
                            className={`p-1.5 rounded transition-colors ${chartType === 'candle' ? 'bg-[#A4E977]/20 text-[#A4E977]' : 'text-gray-400 hover:text-white'}`}
                            title="Candlestick Chart"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="9" y1="2" x2="9" y2="22" />
                              <rect x="7" y="6" width="4" height="10" fill="currentColor" />
                              <line x1="15" y1="2" x2="15" y2="22" />
                              <rect x="13" y="8" width="4" height="8" fill="currentColor" />
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

                      <div className="h-[395px] bg-[#0a0a0a] relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart
                            data={getFilteredData().length > 0 ? getFilteredData() : [
                              { date: new Date(Date.now() - 3600000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), YES: 0.50, volume: 500 },
                              { date: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), YES: yesPrice / 100, volume: 800 }
                            ]}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="colorYES" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#A4E977" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#A4E977" stopOpacity={0} />
                              </linearGradient>
                            </defs>

                            <CartesianGrid
                              strokeDasharray="0"
                              stroke="#1a1a1a"
                              vertical={false}
                              opacity={0.3}
                              horizontalPoints={[20, 40, 60, 80]}
                            />

                            <XAxis
                              dataKey="date"
                              stroke="transparent"
                              style={{ fontSize: '10px' }}
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#666666' }}
                              dy={10}
                            />

                            {/* Left Y-Axis for Odds */}
                            <YAxis
                              yAxisId="left"
                              stroke="transparent"
                              style={{ fontSize: '10px' }}
                              domain={[0, 1]}
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#666666' }}
                              tickFormatter={(value) => value.toFixed(2)}
                              dx={-5}
                            />

                            {/* Right Y-Axis for Volume */}
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              stroke="transparent"
                              style={{ fontSize: '10px' }}
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#666666' }}
                              tickFormatter={(value) => `${(value / 1000).toFixed(1)}K`}
                              hide={true}
                            />

                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#0a0a0a',
                                border: '1px solid #2a2a2a',
                                borderRadius: '8px',
                                padding: '8px 12px'
                              }}
                              labelStyle={{ color: '#888888', fontSize: '11px', marginBottom: '4px' }}
                              itemStyle={{ color: '#A4E977', fontSize: '12px', fontWeight: '600' }}
                              formatter={(value: any, name: string) => {
                                if (name === 'YES') return [`$${Number(value).toFixed(2)}`, 'Price'];
                                if (name === 'volume') return [`${Number(value).toFixed(0)}`, 'Volume'];
                                return [value, name];
                              }}
                              cursor={{ stroke: '#A4E977', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.3 }}
                            />

                            {/* Area Chart */}
                            {chartType === 'area' && (
                              <Area
                                yAxisId="left"
                                type="monotone"
                                dataKey="YES"
                                stroke="#A4E977"
                                strokeWidth={3}
                                fill="url(#colorYES)"
                                dot={false}
                              />
                            )}

                            {/* Line Chart */}
                            {chartType === 'line' && (
                              <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="YES"
                                stroke="#A4E977"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 5, fill: '#A4E977', stroke: '#0a0a0a', strokeWidth: 2 }}
                              />
                            )}


                            {/* Reference Line - Dotted horizontal line at current price */}
                            <ReferenceLine
                              yAxisId="left"
                              y={yesPrice / 100}
                              stroke="#3a4a2a"
                              strokeDasharray="3 3"
                              strokeWidth={1}
                            />

                            {/* Candlestick Chart */}
                            {chartType === 'candle' && (
                              <Scatter
                                yAxisId="left"
                                data={getFilteredData().length > 0 ? getFilteredData().map(d => ({
                                  ...d,
                                  volume: Math.random() * 1000 + 500
                                })) : [
                                  { date: 'Start', YES: 50, open: 50, high: 52, low: 48, close: 50, volume: 500 },
                                  { date: 'Now', YES: yesPrice, open: 50, high: yesPrice + 2, low: yesPrice - 2, close: yesPrice, volume: 800 }
                                ]}
                                shape={(props: any) => {
                                  const { cx, cy, payload } = props;
                                  if (!payload || !payload.open || !payload.close) return <></>;

                                  const isGrowing = payload.close > payload.open;
                                  const color = isGrowing ? '#A4E977' : '#EF4444';
                                  const candleWidth = 8;

                                  // Calculate Y positions based on the chart's scale
                                  const yScale = (value: number) => {
                                    const chartHeight = 400; // Approximate chart height
                                    const priceRange = 100; // 0-100%
                                    return cy - ((value - payload.close) / priceRange) * chartHeight;
                                  };

                                  const highY = yScale(payload.high);
                                  const lowY = yScale(payload.low);
                                  const openY = yScale(payload.open);
                                  const closeY = yScale(payload.close);
                                  const bodyTop = Math.min(openY, closeY);
                                  const bodyHeight = Math.abs(openY - closeY) || 1;

                                  return (
                                    <g>
                                      {/* Wick (High-Low line) */}
                                      <line
                                        x1={cx}
                                        y1={highY}
                                        x2={cx}
                                        y2={lowY}
                                        stroke={color}
                                        strokeWidth={1.5}
                                      />
                                      {/* Candle Body */}
                                      <rect
                                        x={cx - candleWidth / 2}
                                        y={bodyTop}
                                        width={candleWidth}
                                        height={bodyHeight}
                                        fill={color}
                                        stroke={color}
                                        strokeWidth={1}
                                      />
                                    </g>
                                  );
                                }}
                              />
                            )}
                          </ComposedChart>
                        </ResponsiveContainer>

                        {/* Price indicator overlay */}
                        <div className="absolute top-4 left-4 bg-[#0a0a0a]/90 border border-gray-800 rounded px-2.5 py-1.5">
                          <div className="text-[10px] text-gray-500">Current Price</div>
                          <div className="text-base font-bold text-[#A4E977]">{yesPrice}%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>


                {/* Positions and Trade History Tabs */}
                <div>
                  <div className="border rounded-lg overflow-hidden bg-[#0a0a0a] shadow-xl h-[319px] flex flex-col" style={{ borderColor: 'rgba(140, 180, 130, 0.35)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' }}>
                    <div className="flex border-b border-[rgba(140,180,130,0.35)] bg-[#0f0f0f]">
                      {['Positions', 'Open Orders', 'Trade History', 'Order History'].map((tab) => (
                        <button key={tab} onClick={() => setActiveTab(tab.toLowerCase().replace(' ', '-'))} className={`px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === tab.toLowerCase().replace(' ', '-') ? 'text-white border-b-2 border-[#A4E977]' : 'text-gray-500 hover:text-gray-300'}`}>
                          {tab}
                        </button>
                      ))}
                    </div>
                    <div className="p-4 min-h-[200px]">
                      {/* Filters and Search */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="px-4 py-2.5 text-sm bg-[#0f0f0f] border border-[#2a2a2a] rounded focus:border-[#A4E977] focus:outline-none text-white"
                          />
                          <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as any)}
                            className="px-4 py-2.5 text-sm bg-[#1a1a1a] border border-[#2a2a2a] rounded focus:border-[#A4E977] focus:outline-none text-white"
                          >
                            <option value="all">All Types</option>
                            <option value="buy">Buy Only</option>
                            <option value="sell">Sell Only</option>
                          </select>
                          <select
                            value={filterOutcome}
                            onChange={(e) => setFilterOutcome(e.target.value as any)}
                            className="px-4 py-2.5 text-sm bg-[#1a1a1a] border border-[#2a2a2a] rounded focus:border-[#A4E977] focus:outline-none text-white"
                          >
                            <option value="all">All Outcomes</option>
                            <option value="yes">YES Only</option>
                            <option value="no">NO Only</option>
                          </select>
                        </div>
                      </div>

                      {activeTab === 'positions' && (
                        <div>
                          {parseFloat(positions[0]) > 0 || parseFloat(positions[1]) > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-gray-800">
                                    <th className="text-left text-sm font-medium text-gray-400 pb-3">Outcome</th>
                                    <th className="text-right text-sm font-medium text-gray-400 pb-3">Size</th>
                                    <th className="text-right text-sm font-medium text-gray-400 pb-3">Entry Price</th>
                                    <th className="text-right text-sm font-medium text-gray-400 pb-3">Current Price</th>
                                    <th className="text-right text-sm font-medium text-gray-400 pb-3">P&L</th>
                                    <th className="text-right text-sm font-medium text-gray-400 pb-3">P&L %</th>
                                    <th className="text-right text-sm font-medium text-gray-400 pb-3">Liq. Price</th>
                                    <th className="text-right text-sm font-medium text-gray-400 pb-3">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {parseFloat(positions[0]) > 0 && (
                                    <tr className="border-b border-gray-800/50 hover:bg-gray-900/30">
                                      <td className="py-3">
                                        <span className="text-sm font-semibold text-[#A4E977]">YES</span>
                                      </td>
                                      <td className="text-right text-sm text-white">
                                        {parseFloat(positions[0]).toFixed(2)}
                                      </td>
                                      <td className="text-right text-sm text-gray-300">
                                        {(yesPrice * 0.95).toFixed(2)}¢
                                      </td>
                                      <td className="text-right text-sm text-white font-medium">
                                        {yesPrice}.00¢
                                      </td>
                                      <td className="text-right text-sm text-[#A4E977] font-medium">
                                        +${((parseFloat(positions[0]) * (yesPrice / 100)) * 0.05).toFixed(2)}
                                      </td>
                                      <td className="text-right text-sm text-[#A4E977] font-medium">
                                        +5.26%
                                      </td>
                                      <td className="text-right text-sm text-red-400">
                                        {(yesPrice * 0.80).toFixed(2)}¢
                                      </td>
                                      <td className="text-right">
                                        <div className="flex gap-1 justify-end">
                                          <button className="px-3 py-1.5 text-xs font-medium bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors">
                                            Close
                                          </button>
                                          <button className="px-3 py-1.5 text-xs font-medium bg-gray-800 text-gray-400 rounded hover:bg-gray-700 transition-colors">
                                            Edit
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                  {parseFloat(positions[1]) > 0 && (
                                    <tr className="border-b border-gray-800/50 hover:bg-gray-900/30">
                                      <td className="py-3">
                                        <span className="text-sm font-semibold text-red-400">NO</span>
                                      </td>
                                      <td className="text-right text-sm text-white">
                                        {parseFloat(positions[1]).toFixed(2)}
                                      </td>
                                      <td className="text-right text-sm text-gray-300">
                                        {(noPrice * 0.95).toFixed(2)}¢
                                      </td>
                                      <td className="text-right text-sm text-white font-medium">
                                        {noPrice}.00¢
                                      </td>
                                      <td className="text-right text-sm text-[#A4E977] font-medium">
                                        +${((parseFloat(positions[1]) * (noPrice / 100)) * 0.05).toFixed(2)}
                                      </td>
                                      <td className="text-right text-sm text-[#A4E977] font-medium">
                                        +5.26%
                                      </td>
                                      <td className="text-right text-sm text-red-400">
                                        {(noPrice * 0.80).toFixed(2)}¢
                                      </td>
                                      <td className="text-right">
                                        <div className="flex gap-1 justify-end">
                                          <button className="px-3 py-1.5 text-xs font-medium bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors">
                                            Close
                                          </button>
                                          <button className="px-3 py-1.5 text-xs font-medium bg-gray-800 text-gray-400 rounded hover:bg-gray-700 transition-colors">
                                            Edit
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-12 text-gray-500 text-base">No positions found</div>
                          )}
                        </div>
                      )}
                      {activeTab === 'trade-history' && (
                        <div>
                          {recentTrades.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-gray-800">
                                    <th className="text-left text-sm font-medium text-gray-400 pb-3">Type</th>
                                    <th className="text-left text-sm font-medium text-gray-400 pb-3">Outcome</th>
                                    <th className="text-right text-sm font-medium text-gray-400 pb-3">Amount</th>
                                    <th className="text-right text-sm font-medium text-gray-400 pb-3">Price</th>
                                    <th className="text-right text-sm font-medium text-gray-400 pb-3">Total</th>
                                    <th className="text-right text-sm font-medium text-gray-400 pb-3">Time</th>
                                    <th className="text-right text-sm font-medium text-gray-400 pb-3">Tx Hash</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {recentTrades.slice(0, 10).map((trade, i) => (
                                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-900/30">
                                      <td className="py-3">
                                        <span className={`text-sm font-semibold ${trade.type === 'Buy' ? 'text-[#A4E977]' : 'text-red-400'}`}>
                                          {trade.type}
                                        </span>
                                      </td>
                                      <td className="text-sm text-gray-300">
                                        {trade.outcomeIndex === 0 ? 'YES' : 'NO'}
                                      </td>
                                      <td className="text-right text-sm text-white">
                                        {trade.amountOut}
                                      </td>
                                      <td className="text-right text-sm text-gray-300">
                                        {(trade.price * 100).toFixed(2)}¢
                                      </td>
                                      <td className="text-right text-sm text-white font-medium">
                                        ${trade.amountIn}
                                      </td>
                                      <td className="text-right text-sm text-gray-400">
                                        {new Date(trade.timestamp).toLocaleTimeString()}
                                      </td>
                                      <td className="text-right text-sm text-gray-500 font-mono">
                                        {trade.txHash.slice(0, 6)}...{trade.txHash.slice(-4)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-12 text-gray-500 text-base">No trades yet</div>
                          )}
                        </div>
                      )}
                      {activeTab === 'open-orders' && (
                        <div className="text-center py-12 text-gray-500 text-base">No open orders</div>
                      )}
                      {activeTab === 'order-history' && (
                        <div className="text-center py-12 text-gray-500 text-base">No order history</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* MIDDLE COLUMN: Order Book + Related Markets */}
              <div className="flex flex-col gap-3 h-full">
                <div className="border rounded-lg overflow-hidden bg-[#0a0a0a] shadow-xl flex flex-col" style={{ height: '465px', borderColor: 'rgba(140, 180, 130, 0.35)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' }}>
                  <div className="px-3 py-3 border-b border-[#A4E977] flex-shrink-0">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold text-white">Order Book</h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowDepthChart(!showDepthChart)}
                          className={`text-sm px-3 py-1.5 rounded transition-colors ${showDepthChart ? 'bg-[#A4E977] text-black' : 'text-gray-500 hover:text-gray-300 bg-[#1a1a1a]'}`}
                        >
                          {showDepthChart ? 'Table' : 'Depth'}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setSelectedOutcome(0)} className={`flex-1 px-3 py-2 text-sm font-medium rounded-full transition-colors ${selectedOutcome === 0 ? 'bg-[#A4E977]/20 text-[#A4E977]' : 'bg-black text-gray-400 hover:text-white'}`}>Yes</button>
                      <button onClick={() => setSelectedOutcome(1)} className={`flex-1 px-3 py-2 text-sm font-medium rounded-full transition-colors ${selectedOutcome === 1 ? 'bg-red-500/20 text-red-400' : 'bg-black text-gray-400 hover:text-white'}`}>No</button>
                    </div>
                  </div>

                  {/* Market Depth Chart or Order Book Table */}
                  {showDepthChart ? (
                    <div className="px-3 py-4 flex-1 overflow-hidden">
                      <div className="text-xs text-gray-400 mb-3 text-center">Market Depth Visualization</div>
                      <div className="relative h-[240px] bg-[#1a1a1a] rounded">
                        <svg className="w-full h-full" viewBox="0 0 400 300">
                          <path d="M 0,300 L 0,200 L 50,180 L 100,160 L 150,140 L 200,150 L 200,300 Z" fill="rgba(164, 233, 119, 0.2)" stroke="#A4E977" strokeWidth="2" />
                          <path d="M 200,150 L 250,140 L 300,160 L 350,180 L 400,200 L 400,300 L 200,300 Z" fill="rgba(239, 68, 68, 0.2)" stroke="#EF4444" strokeWidth="2" />
                          <line x1="200" y1="0" x2="200" y2="300" stroke="#666" strokeWidth="1" strokeDasharray="5,5" />
                          <text x="100" y="290" fill="#A4E977" fontSize="12" textAnchor="middle">Bids</text>
                          <text x="300" y="290" fill="#EF4444" fontSize="12" textAnchor="middle">Asks</text>
                          <text x="200" y="20" fill="#666" fontSize="10" textAnchor="middle">{yesPrice}¢</text>
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div className="px-3 py-2 flex-1 flex flex-col overflow-hidden">
                      <div className="grid grid-cols-[1fr_0.7fr_0.8fr_0.9fr] gap-2 text-[10px] text-gray-500 font-medium mb-3 flex-shrink-0">
                        <div>Price</div>
                        <div className="text-right">Size</div>
                        <div className="text-right">Cumulative</div>
                        <div className="text-right">Total(USD)</div>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        <div className="space-y-0.5 mb-2">
                          {(() => {
                            let cumulativeAsk = 0;
                            const maxAskVolume = filteredAsks.reduce((max, ask) => Math.max(max, ask.amount), 0);
                            return filteredAsks.slice(0, 10).map((ask, i) => {
                              cumulativeAsk += ask.amount;
                              const depthPercentage = (ask.amount / maxAskVolume) * 100;
                              return (
                                <div key={i} className="relative group">
                                  <div className="absolute right-0 top-0 h-full bg-red-500/10 transition-all group-hover:bg-red-500/20" style={{ width: `${depthPercentage}%` }} />
                                  <div className="relative grid grid-cols-[1fr_0.7fr_0.8fr_0.9fr] gap-2 text-xs py-1.5 px-1 cursor-pointer">
                                    <div className="text-red-400 font-mono font-semibold">{(ask.price * 100).toFixed(4)}¢</div>
                                    <div className="text-right text-gray-300">{ask.amount.toFixed(2)}</div>
                                    <div className="text-right text-gray-400 text-[10px]">{cumulativeAsk.toFixed(2)}</div>
                                    <div className="text-right text-gray-400">${(ask.price * ask.amount).toFixed(2)}</div>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                          {filteredAsks.length === 0 && <div className="text-center py-6 text-gray-600 text-[10px]">No sell orders</div>}
                        </div>
                        <div className="py-2.5 text-center border-y border-gray-800/50 mb-2 bg-[#1a1a1a]">
                          <div className="text-[11px] text-gray-400 space-y-0.5">
                            <div>Spread: <span className="text-[#A4E977] font-mono font-semibold">{filteredAsks.length > 0 && filteredBids.length > 0 ? ((filteredAsks[0].price - filteredBids[0].price) * 100).toFixed(4) : '0.0000'}¢</span></div>
                            <div className="text-[10px]">({filteredAsks.length > 0 && filteredBids.length > 0 ? (((filteredAsks[0].price - filteredBids[0].price) / filteredBids[0].price) * 100).toFixed(2) : '0.00'}%)</div>
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          {(() => {
                            let cumulativeBid = 0;
                            const maxBidVolume = filteredBids.reduce((max, bid) => Math.max(max, bid.amount), 0);
                            return filteredBids.slice(0, 10).map((bid, i) => {
                              cumulativeBid += bid.amount;
                              const depthPercentage = (bid.amount / maxBidVolume) * 100;
                              return (
                                <div key={i} className="relative group">
                                  <div className="absolute right-0 top-0 h-full bg-[#A4E977]/10 transition-all group-hover:bg-[#A4E977]/20" style={{ width: `${depthPercentage}%` }} />
                                  <div className="relative grid grid-cols-[1fr_0.7fr_0.8fr_0.9fr] gap-2 text-xs py-1.5 px-1 cursor-pointer">
                                    <div className="text-[#A4E977] font-mono font-semibold">{(bid.price * 100).toFixed(4)}¢</div>
                                    <div className="text-right text-gray-300">{bid.amount.toFixed(2)}</div>
                                    <div className="text-right text-gray-400 text-[10px]">{cumulativeBid.toFixed(2)}</div>
                                    <div className="text-right text-gray-400">${(bid.price * bid.amount).toFixed(2)}</div>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                          {filteredBids.length === 0 && <div className="text-center py-6 text-gray-600 text-[10px]">No buy orders</div>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Related Markets Panel */}
                <div className="border rounded-lg overflow-hidden bg-[#0a0a0a] shadow-xl flex flex-col" style={{ height: '319px', borderColor: 'rgba(140, 180, 130, 0.35)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' }}>
                  <div className="p-4 flex-shrink-0 border-b border-[rgba(140,180,130,0.2)]">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-white">Related Markets</h3>
                      <button
                        onClick={() => setRelatedMarketsExpanded(!relatedMarketsExpanded)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <svg className={`w-4 h-4 transition-transform ${relatedMarketsExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto">
                      {['All', 'Crypto', 'Politics', 'Sports'].map((cat) => (
                        <button key={cat} className={`px-2 py-1 text-[10px] font-medium rounded transition-colors whitespace-nowrap ${cat === 'All' ? 'bg-[#A4E977]/20 text-[#A4E977]' : 'bg-black text-gray-400 hover:text-white'}`}>{cat}</button>
                      ))}
                    </div>
                  </div>

                  {relatedMarketsExpanded && (
                    <div className="overflow-y-auto flex-1 p-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                      <div className="space-y-2">
                        {relatedMarkets.map((market: any, index: number) => (
                          <div
                            key={index}
                            onClick={() => navigate(`/market/${market.id}`)}
                            className="flex items-center gap-3 p-2 rounded hover:bg-black cursor-pointer transition-colors"
                          >
                            {market.image_url && (
                              <img src={market.image_url} alt="" className="w-8 h-8 rounded object-cover" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-white truncate">{market.description}</div>
                            </div>
                            <div className="text-sm font-bold text-[#A4E977]">{market.outcomePrices?.[0] || '50'}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Trading Panel */}
              <div className="flex flex-col h-full">
                <div className="border rounded-lg bg-[#0a0a0a] flex flex-col shadow-xl h-[796px] overflow-y-auto" style={{ borderColor: 'rgba(140, 180, 130, 0.35)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' }}>
                  <div className="flex border-b border-gray-800 py-2.5 px-2 bg-[#0f0f0f]">
                    <button onClick={() => setTradeType('buy')} className={`flex-1 py-3 text-sm font-semibold transition-colors rounded-full ${tradeType === 'buy' ? 'text-black bg-[#A4E977] mx-1 my-0.5' : 'text-gray-500 hover:text-gray-300'}`}>Buy</button>
                    <button onClick={() => setTradeType('sell')} className={`flex-1 py-3 text-sm font-semibold transition-colors rounded-full ${tradeType === 'sell' ? 'text-black bg-[#A4E977] mx-1 my-0.5' : 'text-gray-500 hover:text-gray-300'}`}>Sell</button>
                  </div>


                  <div className="p-3 border-b border-[#A4E977]">
                    {/* Order Type Tabs */}
                    <div className="flex gap-2 mb-3 items-center">
                      {(['market', 'limit'] as const).map((type) => (
                        <button key={type} onClick={() => setOrderType(type)} className={`px-4 lg:px-5 py-1.5 lg:py-2 text-xs lg:text-sm font-medium rounded-full transition-colors ${orderType === type ? 'bg-[#A4E977] text-black' : 'text-gray-500 hover:text-gray-300 bg-[#1a1a1a] border border-[#2a2a2a]'}`}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}{type === 'pro' && ' ▼'}
                        </button>
                      ))}
                    </div>

                    {/* Advanced Order Types (when Pro is selected) */}
                    {orderType === 'pro' && (
                      <div className="space-y-2 mb-3">
                        <label className="text-xs text-gray-400">Advanced Order Type</label>
                        <select
                          value={advancedOrderType}
                          onChange={(e) => setAdvancedOrderType(e.target.value as any)}
                          className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-xs text-white focus:border-[#A4E977] focus:outline-none"
                        >
                          <option value="none">Standard</option>
                          <option value="stop-limit">Stop-Limit</option>
                          <option value="trailing-stop">Trailing Stop</option>
                        </select>

                        {advancedOrderType === 'stop-limit' && (
                          <div className="space-y-2">
                            <input
                              type="number"
                              placeholder="Stop Price"
                              value={stopLossPrice}
                              onChange={(e) => setStopLossPrice(e.target.value)}
                              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-xs text-white focus:border-[#A4E977] focus:outline-none"
                            />
                            <input
                              type="number"
                              placeholder="Limit Price"
                              value={limitPrice}
                              onChange={(e) => setLimitPrice(e.target.value)}
                              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs text-white focus:border-[#A4E977] focus:outline-none"
                            />
                          </div>
                        )}

                        {advancedOrderType === 'trailing-stop' && (
                          <input
                            type="number"
                            placeholder="Trailing %"
                            value={trailingStopPercent}
                            onChange={(e) => setTrailingStopPercent(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs text-white focus:border-[#A4E977] focus:outline-none"
                          />
                        )}
                      </div>
                    )}

                  </div>

                  <div className="p-3">
                    <div className="grid grid-cols-2 gap-2 lg:gap-3 mx-3">
                      <button onClick={() => setSelectedOutcome(0)} className={`p-2.5 lg:p-3.5 rounded-full border-2 transition-all flex items-center justify-between gap-1 lg:gap-2 ${selectedOutcome === 0 ? 'bg-[#A4E977]/10 border-[#A4E977]' : 'bg-black border-[#2a2a2a] hover:border-[#A4E977]/50'}`}>
                        <span className="text-sm lg:text-base font-medium text-gray-400">Yes</span>
                        <span className={`text-sm lg:text-base font-bold ${selectedOutcome === 0 ? 'text-[#A4E977]' : 'text-gray-300'}`}>{yesPrice}.00¢</span>
                      </button>
                      <button onClick={() => setSelectedOutcome(1)} className={`p-2.5 lg:p-3.5 rounded-full border-2 transition-all flex items-center justify-between gap-1 lg:gap-2 ${selectedOutcome === 1 ? 'bg-red-500/10 border-red-500' : 'bg-black border-[#2a2a2a] hover:border-red-500/50'}`}>
                        <span className="text-sm lg:text-base font-medium text-gray-400">No</span>
                        <span className={`text-sm lg:text-base font-bold ${selectedOutcome === 1 ? 'text-red-400' : 'text-gray-300'}`}>{noPrice}.00¢</span>
                      </button>
                    </div>
                  </div>

                  <div className="px-3 pb-3">
                    <label className="text-sm text-gray-400 mb-2 block">Order Size</label>
                    <div className="relative mb-2">
                      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 lg:px-4 py-2.5 lg:py-3.5 text-sm lg:text-base text-white focus:border-[#A4E977] focus:outline-none pr-16 lg:pr-20" placeholder="$0.00" />
                      <button onClick={() => setAmount(balance)} className="absolute right-2 top-1/2 -translate-y-1/2 px-3 lg:px-4 py-1 lg:py-1.5 text-xs lg:text-sm font-semibold text-gray-400 hover:text-white transition-colors">MAX</button>
                    </div>

                    {/* Quick Order Buttons */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                      {[10, 25, 50, 100].map((val) => (
                        <button
                          key={val}
                          onClick={() => setAmount(val.toString())}
                          className="py-2 lg:py-2.5 text-xs lg:text-sm font-medium rounded bg-[#1a1a1a] text-gray-500 hover:text-gray-300 hover:bg-[#222222] border border-[#2a2a2a] transition-colors"
                        >
                          ${val}
                        </button>
                      ))}
                    </div>

                    {/* Position Size Calculator */}
                    <div className="bg-[#0f0f0f] rounded p-3 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Est. Shares:</span>
                        <span className="text-white font-medium">
                          {amount && yesPrice ? (parseFloat(amount) / (yesPrice / 100)).toFixed(2) : '0.00'}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Total Cost:</span>
                        <span className="text-white font-medium">
                          ${amount ? parseFloat(amount).toFixed(2) : '0.00'}
                        </span>
                      </div>

                    </div>
                  </div>

                  {/* Limit Price - Only for Limit orders */}
                  {orderType === 'limit' && (
                    <div className="px-3 pb-3">
                      <label className="text-sm text-gray-400 mb-2 block">Limit Price</label>
                      <input
                        type="number"
                        value={limitPrice}
                        onChange={(e) => setLimitPrice(e.target.value)}
                        className="w-full bg-black border border-gray-700 rounded px-4 py-3.5 text-base text-white focus:border-[#A4E977] focus:outline-none"
                        placeholder="0.50"
                        step="0.01"
                      />
                    </div>
                  )}


                  <div className="px-3 pb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Available to Trade</span>
                      <span className="text-white font-semibold">${parseFloat(balance).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="px-3 pb-3">
                    <div className="flex items-center justify-between text-base mb-3">
                      <span className="text-gray-300 font-semibold">Potential Payout</span>
                      <span className="text-white font-bold text-lg">${calculatePotentialPayout()}</span>
                    </div>

                    {/* Risk/Reward Calculator */}
                    <div className="bg-[#1a1a1a] rounded p-3 space-y-2">
                      <div className="text-xs text-gray-400 font-semibold mb-2">Risk/Reward Analysis</div>

                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">Potential Profit:</span>
                        <span className="text-[#A4E977] font-medium">
                          ${amount && yesPrice
                            ? (parseFloat(amount) * ((100 - yesPrice) / yesPrice)).toFixed(2)
                            : '0.00'}
                        </span>
                      </div>

                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">Risk/Reward Ratio:</span>
                        <span className="text-white font-medium">
                          1:{amount && yesPrice && yesPrice > 0
                            ? ((100 - yesPrice) / yesPrice).toFixed(2)
                            : '0.00'}
                        </span>
                      </div>

                      {/* Visual Risk/Reward Bar */}
                      <div className="mt-2">
                        <div className="flex justify-between text-[9px] text-gray-500 mb-1">
                          <span>Risk</span>
                          <span>Reward</span>
                        </div>
                        <div className="h-2 bg-red-500/20 rounded-full overflow-hidden flex">
                          <div
                            className="bg-red-500"
                            style={{
                              width: `${yesPrice && yesPrice > 0 ? (yesPrice / (yesPrice + (100 - yesPrice))) * 100 : 50}%`
                            }}
                          />
                          <div
                            className="bg-[#A4E977]"
                            style={{
                              width: `${yesPrice && yesPrice > 0 ? ((100 - yesPrice) / (yesPrice + (100 - yesPrice))) * 100 : 50}%`
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between text-[10px] pt-2 border-t border-gray-800">
                        <span className="text-gray-500">Est. ROI:</span>
                        <span className={`font-medium ${amount && yesPrice && yesPrice > 0 && ((100 - yesPrice) / yesPrice) > 1
                          ? 'text-[#A4E977]'
                          : 'text-gray-400'
                          }`}>
                          {amount && yesPrice && yesPrice > 0
                            ? `+${(((100 - yesPrice) / yesPrice) * 100).toFixed(0)}%`
                            : '0%'}
                        </span>
                      </div>
                    </div>
                  </div>


                  <div className="px-3 pb-3">
                    <button className="w-full py-4 rounded-full font-bold text-base transition-colors bg-[#A4E977] hover:bg-[#8FD65E] text-black">Connect to Trade</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Single Panel View - Only visible on mobile */}
        <div className="lg:hidden px-3 pb-4">
          {/* Chart Panel */}
          {activeMobilePanel === 'chart' && (
            <div className="border rounded-lg overflow-hidden bg-[#0a0a0a] shadow-xl" style={{ borderColor: 'rgba(140, 180, 130, 0.35)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' }}>
              <div className="p-3 bg-[#0a0a0a]">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  {/* Time Range Buttons */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {(['5M', '15M', '1H', '5H', '1D', '1W', 'ALL'] as const).map((range) => (
                      <button
                        key={range}
                        onClick={() => setTimeRange(range === '5M' ? '1s' : range === '15M' ? '1m' : range === '1H' ? '1h' : '1d')}
                        className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${timeRange === (range === '5M' ? '1s' : range === '15M' ? '1m' : range === '1H' ? '1h' : '1d') ? 'bg-[#A4E977]/20 text-[#A4E977]' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>

                  {/* Chart Type Switcher */}
                  <div className="flex items-center gap-1 border border-gray-700 rounded p-0.5">
                    <button
                      onClick={() => setChartType('line')}
                      className={`p-1 rounded transition-colors flex items-center justify-center ${chartType === 'line' ? 'bg-[#A4E977]/20 text-[#A4E977]' : 'text-gray-400'}`}
                      title="Line"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setChartType('candle')}
                      className={`p-1 rounded transition-colors flex items-center justify-center ${chartType === 'candle' ? 'bg-[#A4E977]/20 text-[#A4E977]' : 'text-gray-400'}`}
                      title="Candle"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="9" y1="2" x2="9" y2="22" />
                        <rect x="7" y="6" width="4" height="10" fill="currentColor" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setChartType('area')}
                      className={`p-1 rounded transition-colors flex items-center justify-center ${chartType === 'area' ? 'bg-[#A4E977]/20 text-[#A4E977]' : 'text-gray-400'}`}
                      title="Area"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 12 L9 6 L15 12 L21 6 L21 18 L3 18 Z" fill="currentColor" opacity="0.3" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Buy and Sell Action Buttons */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => {
                      setTradeType('buy');
                      setActiveMobilePanel('trading');
                    }}
                    className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-[#A4E977] text-black hover:bg-[#A4E977]/90 transition-colors"
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => {
                      setTradeType('sell');
                      setActiveMobilePanel('trading');
                    }}
                    className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-red-500 text-white hover:bg-red-500/90 transition-colors"
                  >
                    Sell
                  </button>
                </div>

                <div className="h-[400px] bg-[#0a0a0a] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={getFilteredData().length > 0 ? getFilteredData() : [{ time: new Date().toLocaleTimeString(), YES: yesPrice / 100, NO: noPrice / 100, volume: 0 }]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorYesMobile" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#A4E977" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#A4E977" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="0" stroke="#1a1a1a" vertical={false} opacity={0.3} />
                      <XAxis dataKey="time" stroke="transparent" tick={{ fontSize: 10, fill: '#666666' }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" stroke="transparent" tick={{ fontSize: 10, fill: '#666666' }} domain={[0, 1]} axisLine={false} tickLine={false} tickFormatter={(value) => value.toFixed(2)} />
                      <YAxis yAxisId="right" orientation="right" stroke="transparent" tick={{ fontSize: 10, fill: '#666666' }} axisLine={false} tickLine={false} hide={true} />
                      <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '8px', fontSize: '12px', padding: '8px 12px' }} labelStyle={{ color: '#888888', fontSize: '11px' }} itemStyle={{ color: '#A4E977', fontWeight: '600' }} />
                      <ReferenceLine yAxisId="left" y={yesPrice / 100} stroke="#3a4a2a" strokeDasharray="3 3" strokeWidth={1} />
                      {chartType === 'area' && <Area yAxisId="left" type="monotone" dataKey="YES" stroke="#A4E977" strokeWidth={3} fillOpacity={1} fill="url(#colorYesMobile)" dot={false} />}
                      {chartType === 'line' && <Line yAxisId="left" type="monotone" dataKey="YES" stroke="#A4E977" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: '#A4E977', stroke: '#0a0a0a', strokeWidth: 2 }} />}
                    </ComposedChart>
                  </ResponsiveContainer>

                  {/* Price indicator overlay */}
                  <div className="absolute top-2 left-2 bg-[#0a0a0a]/90 border border-gray-800 rounded px-2 py-1">
                    <div className="text-[9px] text-gray-500">Current Price</div>
                    <div className="text-sm font-bold text-[#A4E977]">{yesPrice}%</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Order Book Panel */}
          {activeMobilePanel === 'orderbook' && (
            <div className="border rounded-lg overflow-hidden bg-[#0a0a0a] shadow-xl flex flex-col" style={{ height: '600px', borderColor: 'rgba(140, 180, 130, 0.35)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' }}>
              <div className="px-3 py-3 border-b border-[#A4E977] flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Order Book</h3>
                  <button onClick={() => setShowDepthChart(!showDepthChart)} className={`text-xs px-2 py-1 rounded transition-colors ${showDepthChart ? 'bg-[#A4E977] text-black' : 'text-gray-500 hover:text-gray-300 bg-[#1a1a1a]'}`}>
                    {showDepthChart ? 'Table' : 'Depth'}
                  </button>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setSelectedOutcome(0)} className={`flex-1 px-2 py-1 text-xs font-medium rounded-full transition-colors ${selectedOutcome === 0 ? 'bg-[#A4E977]/20 text-[#A4E977]' : 'bg-black text-gray-400 hover:text-white'}`}>Yes</button>
                  <button onClick={() => setSelectedOutcome(1)} className={`flex-1 px-2 py-1 text-xs font-medium rounded-full transition-colors ${selectedOutcome === 1 ? 'bg-red-500/20 text-red-400' : 'bg-black text-gray-400 hover:text-white'}`}>No</button>
                </div>
              </div>

              {showDepthChart ? (
                <div className="px-3 py-4 flex-1 overflow-auto">
                  <div className="text-xs text-gray-400 mb-3 text-center">Market Depth</div>
                  <div className="relative h-[300px] bg-[#1a1a1a] rounded">
                    <svg className="w-full h-full" viewBox="0 0 400 300">
                      <path d="M 0,300 L 0,200 L 50,180 L 100,160 L 150,140 L 200,150 L 200,300 Z" fill="rgba(164, 233, 119, 0.2)" stroke="#A4E977" strokeWidth="2" />
                      <path d="M 200,150 L 250,140 L 300,160 L 350,180 L 400,200 L 400,300 L 200,300 Z" fill="rgba(239, 68, 68, 0.2)" stroke="#EF4444" strokeWidth="2" />
                      <line x1="200" y1="0" x2="200" y2="300" stroke="#666" strokeWidth="1" strokeDasharray="5,5" />
                      <text x="100" y="290" fill="#A4E977" fontSize="12" textAnchor="middle">Bids</text>
                      <text x="300" y="290" fill="#EF4444" fontSize="12" textAnchor="middle">Asks</text>
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2 flex-1 flex flex-col overflow-hidden">
                  <div className="grid grid-cols-[1fr_0.7fr_0.9fr] gap-2 text-[10px] text-gray-500 font-medium mb-3 flex-shrink-0">
                    <div>Price</div>
                    <div className="text-right">Size</div>
                    <div className="text-right">Total</div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <div className="space-y-0.5 mb-2">
                      {filteredAsks.slice(0, 8).map((ask, i) => (
                        <div key={i} className="grid grid-cols-[1fr_0.7fr_0.9fr] gap-2 text-xs py-1">
                          <div className="text-red-400 font-mono">{(ask.price * 100).toFixed(2)}¢</div>
                          <div className="text-right text-gray-300">{ask.amount.toFixed(2)}</div>
                          <div className="text-right text-gray-400">${(ask.price * ask.amount).toFixed(2)}</div>
                        </div>
                      ))}
                      {filteredAsks.length === 0 && <div className="text-center py-4 text-gray-600 text-xs">No sell orders</div>}
                    </div>
                    <div className="py-2 text-center border-y border-gray-800/50 mb-2">
                      <div className="text-xs text-gray-400">Spread: <span className="text-[#A4E977]">{filteredAsks.length > 0 && filteredBids.length > 0 ? ((filteredAsks[0].price - filteredBids[0].price) * 100).toFixed(2) : '0.00'}¢</span></div>
                    </div>
                    <div className="space-y-0.5">
                      {filteredBids.slice(0, 8).map((bid, i) => (
                        <div key={i} className="grid grid-cols-[1fr_0.7fr_0.9fr] gap-2 text-xs py-1">
                          <div className="text-[#A4E977] font-mono">{(bid.price * 100).toFixed(2)}¢</div>
                          <div className="text-right text-gray-300">{bid.amount.toFixed(2)}</div>
                          <div className="text-right text-gray-400">${(bid.price * bid.amount).toFixed(2)}</div>
                        </div>
                      ))}
                      {filteredBids.length === 0 && <div className="text-center py-4 text-gray-600 text-xs">No buy orders</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Positions Panel */}
          {activeMobilePanel === 'positions' && (
            <div className="border rounded-lg overflow-hidden bg-[#0a0a0a] shadow-xl flex flex-col" style={{ minHeight: '500px', borderColor: 'rgba(140, 180, 130, 0.35)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' }}>
              <div className="flex border-b border-[rgba(140,180,130,0.35)] bg-[#0f0f0f] overflow-x-auto scrollbar-hide">
                {['Positions', 'Open Orders', 'Trade History', 'Order History'].map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab.toLowerCase().replace(' ', '-'))} className={`px-3 py-2 text-[10px] font-medium transition-colors whitespace-nowrap ${activeTab === tab.toLowerCase().replace(' ', '-') ? 'text-white border-b-2 border-[#A4E977]' : 'text-gray-500 hover:text-gray-300'}`}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="p-3 flex-shrink-0">
                {/* Search and Filter */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-2 py-1.5 text-xs bg-[#0f0f0f] border border-[#2a2a2a] rounded focus:border-[#A4E977] focus:outline-none text-white"
                  />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="px-2 py-1.5 text-xs bg-[#1a1a1a] border border-[#2a2a2a] rounded focus:border-[#A4E977] focus:outline-none text-white"
                  >
                    <option value="all">All</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-3">
                {activeTab === 'positions' && (
                  Array.isArray(positions) && positions.length > 0 && typeof positions[0] === 'object' ? (
                    <div className="space-y-2">
                      {positions.filter((pos): pos is any => typeof pos === 'object' && pos !== null).map((pos, i) => (
                        <div key={i} className="bg-[#1a1a1a] rounded-lg p-3 border border-gray-800">
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-xs text-white font-medium">{pos?.outcome === 0 ? 'YES' : 'NO'}</div>
                            <div className={`text-xs font-semibold ${(pos?.pnl ?? 0) >= 0 ? 'text-[#A4E977]' : 'text-red-400'}`}>
                              {(pos?.pnl ?? 0) >= 0 ? '+' : ''}{(pos?.pnl ?? 0).toFixed(2)}%
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div><span className="text-gray-500">Size:</span> <span className="text-white">{pos?.shares ?? 0}</span></div>
                            <div><span className="text-gray-500">Avg Price:</span> <span className="text-white">{pos?.avgPrice ?? 0}¢</span></div>
                            <div><span className="text-gray-500">Value:</span> <span className="text-white">${pos?.value ?? 0}</span></div>
                            <div><span className="text-gray-500">Current:</span> <span className="text-white">{pos?.currentPrice ?? 0}¢</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500 text-sm">No positions found</div>
                  )
                )}
                {activeTab === 'open-orders' && (
                  <div className="text-center py-12 text-gray-500 text-sm">No open orders</div>
                )}
                {activeTab === 'trade-history' && (
                  <div className="text-center py-12 text-gray-500 text-sm">No trade history</div>
                )}
                {activeTab === 'order-history' && (
                  <div className="text-center py-12 text-gray-500 text-sm">No order history</div>
                )}
              </div>
            </div>
          )}

          {/* Related Markets Panel */}
          {activeMobilePanel === 'related' && (
            <div className="border rounded-lg overflow-hidden bg-[#0a0a0a] shadow-xl flex flex-col" style={{ minHeight: '500px', borderColor: 'rgba(140, 180, 130, 0.35)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' }}>
              <div className="p-4 flex-shrink-0 border-b border-[rgba(140,180,130,0.2)]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white">Related Markets</h3>
                </div>
                <div className="flex gap-2 overflow-x-auto">
                  {['All', 'Crypto', 'Politics', 'Sports'].map((cat) => (
                    <button key={cat} className={`px-2 py-1 text-[10px] font-medium rounded transition-colors whitespace-nowrap ${cat === 'All' ? 'bg-[#A4E977]/20 text-[#A4E977]' : 'bg-black text-gray-400 hover:text-white'}`}>{cat}</button>
                  ))}
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-4">
                <div className="space-y-2">
                  {relatedMarkets.map((market: any, index: number) => (
                    <div key={index} onClick={() => navigate(`/market/${market.id}`)} className="flex items-center gap-3 p-2 rounded hover:bg-black cursor-pointer transition-colors">
                      {market.image_url && (
                        <img src={market.image_url} alt="" className="w-8 h-8 rounded object-cover" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white truncate">{market.description}</div>
                      </div>
                      <div className="text-sm font-bold text-[#A4E977]">{market.outcomePrices?.[0] || '50'}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Trading Panel */}
          {activeMobilePanel === 'trading' && (
            <div className="border rounded-lg bg-[#0a0a0a] flex flex-col shadow-xl" style={{ borderColor: 'rgba(140, 180, 130, 0.35)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)' }}>
              <div className="flex border-b border-gray-800 py-1.5 px-2 bg-[#0f0f0f]">
                <button onClick={() => setTradeType('buy')} className={`flex-1 py-2 text-xs font-semibold transition-colors rounded-full ${tradeType === 'buy' ? 'text-black bg-[#A4E977] mx-1 my-0.5' : 'text-gray-500 hover:text-gray-300'}`}>Buy</button>
                <button onClick={() => setTradeType('sell')} className={`flex-1 py-2 text-xs font-semibold transition-colors rounded-full ${tradeType === 'sell' ? 'text-black bg-[#A4E977] mx-1 my-0.5' : 'text-gray-500 hover:text-gray-300'}`}>Sell</button>
              </div>


              <div className="p-3 border-b border-[#A4E977]">
                {/* Order Type Tabs */}
                <div className="flex gap-2 mb-3">
                  {(['market', 'limit'] as const).map((type) => (
                    <button key={type} onClick={() => setOrderType(type)} className={`px-5 py-1 text-xs font-medium rounded-full transition-colors text-center ${orderType === type ? 'bg-[#A4E977] text-black' : 'text-gray-500 hover:text-gray-300 bg-[#1a1a1a] border border-[#2a2a2a]'}`}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}{type === 'pro' && ' ▼'}
                    </button>
                  ))}
                </div>

              </div>

              <div className="p-3">
                <div className="grid grid-cols-2 gap-2 mx-3">
                  <button onClick={() => setSelectedOutcome(0)} className={`px-[30px] py-2 rounded-full border-2 transition-all flex items-center justify-between gap-1 ${selectedOutcome === 0 ? 'bg-[#A4E977]/10 border-[#A4E977]' : 'bg-black border-[#2a2a2a] hover:border-[#A4E977]/50'}`}>
                    <span className="text-xs font-medium text-gray-400">Yes</span>
                    <span className={`text-xs font-bold ${selectedOutcome === 0 ? 'text-[#A4E977]' : 'text-gray-300'}`}>{yesPrice}¢</span>
                  </button>
                  <button onClick={() => setSelectedOutcome(1)} className={`px-[30px] py-2 rounded-full border-2 transition-all flex items-center justify-between gap-1 ${selectedOutcome === 1 ? 'bg-red-500/10 border-red-500' : 'bg-black border-[#2a2a2a] hover:border-red-500/50'}`}>
                    <span className="text-xs font-medium text-gray-400">No</span>
                    <span className={`text-xs font-bold ${selectedOutcome === 1 ? 'text-red-400' : 'text-gray-300'}`}>{noPrice}¢</span>
                  </button>
                </div>
              </div>

              <div className="px-3 pb-3">
                <label className="text-xs text-gray-400 mb-2 block">Order Size</label>
                <div className="relative mb-2">
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white focus:border-[#A4E977] focus:outline-none pr-16" placeholder="$0.00" />
                  <button onClick={() => setAmount(balance)} className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-semibold text-gray-400 hover:text-white transition-colors">MAX</button>
                </div>

                {/* Quick Order Buttons */}
                <div className="grid grid-cols-4 gap-1 mb-3">
                  {[10, 25, 50, 100].map((val) => (
                    <button
                      key={val}
                      onClick={() => setAmount(val.toString())}
                      className="py-1.5 text-xs font-medium rounded bg-[#1a1a1a] text-gray-500 hover:text-gray-300 hover:bg-[#222222] border border-[#2a2a2a] transition-colors"
                    >
                      ${val}
                    </button>
                  ))}
                </div>

                {/* Position Size Calculator */}
                <div className="bg-[#0f0f0f] rounded p-2 space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-500">Est. Shares:</span>
                    <span className="text-white font-medium">
                      {amount && yesPrice ? (parseFloat(amount) / (yesPrice / 100)).toFixed(2) : '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-500">Total Cost:</span>
                    <span className="text-white font-medium">
                      ${amount ? parseFloat(amount).toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Limit Price - Only for Limit orders */}
              {orderType === 'limit' && (
                <div className="px-3 pb-3">
                  <label className="text-xs text-gray-400 mb-2 block">Limit Price</label>
                  <input
                    type="number"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-[#A4E977] focus:outline-none"
                    placeholder="0.50"
                    step="0.01"
                  />
                </div>
              )}


              <div className="px-3 pb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Available to Trade</span>
                  <span className="text-white font-medium">${parseFloat(balance).toFixed(2)}</span>
                </div>
              </div>

              <div className="px-3 pb-3">
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-gray-300 font-medium">Potential Payout</span>
                  <span className="text-white font-bold">${calculatePotentialPayout()}</span>
                </div>

                {/* Trade Button */}
                <button className="w-full bg-[#A4E977] hover:bg-[#8fd65a] text-black font-semibold py-2.5 rounded-lg transition-colors text-sm">
                  {account ? `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${selectedOutcome === 0 ? 'Yes' : 'No'}` : 'Connect to Trade'}
                </button>
              </div>
            </div>
          )}
        </div>






        {/* Price Alert Modal */}
        {showAlertModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowAlertModal(false)}>
            <div className="bg-gray-900 border-2 border-[rgba(164,233,119,0.6)] rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Set Price Alert</h3>
                <button onClick={() => setShowAlertModal(false)} className="text-gray-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Alert Type</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAlertType('above')}
                      className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${alertType === 'above' ? 'bg-[#A4E977] text-black' : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                    >
                      Price Above
                    </button>
                    <button
                      onClick={() => setAlertType('below')}
                      className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${alertType === 'below' ? 'bg-[#A4E977] text-black' : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                    >
                      Price Below
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Target Price (¢)</label>
                  <input
                    type="number"
                    value={alertPrice}
                    onChange={(e) => setAlertPrice(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-[#A4E977] focus:outline-none"
                    placeholder="50.00"
                    step="0.01"
                  />
                </div>

                <button
                  onClick={() => {
                    if (alertPrice) {
                      setPriceAlerts([...priceAlerts, { price: parseFloat(alertPrice), type: alertType }]);
                      setAlertPrice('');
                      setShowAlertModal(false);
                    }
                  }}
                  className="w-full bg-[#A4E977] text-black font-semibold py-2 rounded hover:bg-[#8BC34A] transition-colors"
                >
                  Create Alert
                </button>

                {priceAlerts.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <div className="text-xs text-gray-400 mb-2">Active Alerts</div>
                    <div className="space-y-2">
                      {priceAlerts.map((alert, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-800 rounded px-3 py-2">
                          <div className="text-sm text-white">
                            {alert.type === 'above' ? '↑' : '↓'} {alert.price.toFixed(2)}¢
                          </div>
                          <button
                            onClick={() => setPriceAlerts(priceAlerts.filter((_, i) => i !== index))}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
