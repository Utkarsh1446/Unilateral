import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { ArrowLeft, Loader2, Copy, ExternalLink, Settings, ChevronDown } from 'lucide-react';
import React, { useEffect, useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

  // Order Book State
  const [bids, setBids] = useState<any[]>([]);
  const [asks, setAsks] = useState<any[]>([]);

  // UI State
  const [activeTab, setActiveTab] = useState('positions');
  const [timeRange, setTimeRange] = useState<'5m' | '15m' | '1h' | '5h' | '1d' | '1w' | 'all'>('all');
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
    if (timeRange === 'all') return chartData;
    if (chartData.length === 0) return [];

    const now = Date.now();
    const ranges = {
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '5h': 5 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000
    };

    const cutoff = now - ranges[timeRange];
    return chartData.filter(p => p.timestamp >= cutoff);
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
      <div className="bg-black min-h-screen text-white">
        {/* Top Navbar */}


        {/* Top Header */}
        <div className="max-w-[1920px] mx-auto px-3 pt-3">
          <div className="border-2 rounded-lg bg-black" style={{ borderColor: '#A4E977' }}>
            <div className="px-6 py-4">
              <div className="flex items-start justify-between">
                {/* Left: Market Title and Volume */}
                <div className="flex items-start gap-4">
                  {displayMarket.image_url && (
                    <img
                      src={displayMarket.image_url}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-2">
                      {displayMarket.description}
                    </h1>
                    <div className="text-sm text-gray-400">
                      ${parseFloat(displayMarket.volume || "0").toLocaleString()} Vol.
                    </div>
                  </div>
                </div>

                {/* Right: Outcome and Chance */}
                <div className="flex items-center gap-8">
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
                  <div className="flex items-center gap-2">
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

        {/* Main Content - Chart+OrderBook LEFT, Trading Panel RIGHT */}
        <div className="max-w-[1920px] mx-auto">
          <div className="grid grid-cols-[84%_16%] gap-0">
            {/* LEFT: Chart Section with Order Book Inside */}
            <div className="border-r border-gray-800/50 h-full">
              <div className="grid grid-cols-[85.35%_14.65%] gap-3 p-3">
                {/* Chart Area */}
                <div className="border-2 rounded-lg overflow-hidden bg-black" style={{ borderColor: '#A4E977' }}>
                  <div className="p-4 bg-black">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      {/* Time Range Buttons - LEFT */}
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

                      {/* Chart Type Switcher - RIGHT */}
                      <div className="flex items-center gap-1 border border-gray-700 rounded-lg p-1">
                        <button
                          onClick={() => setChartType('line')}
                          className={`p-1.5 rounded transition-colors ${chartType === 'line' ? 'bg-gray-700 text-[#A4E977]' : 'text-gray-400 hover:text-white'}`}
                          title="Line Chart"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setChartType('candle')}
                          className={`p-1.5 rounded transition-colors ${chartType === 'candle' ? 'bg-gray-700 text-[#A4E977]' : 'text-gray-400 hover:text-white'}`}
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
                          className={`p-1.5 rounded transition-colors ${chartType === 'area' ? 'bg-gray-700 text-[#A4E977]' : 'text-gray-400 hover:text-white'}`}
                          title="Area Chart"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                            <path d="M3 18h18" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="h-[500px] bg-black">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getFilteredData().length > 0 ? getFilteredData() : [{ date: 'Start', YES: 50 }, { date: 'Now', YES: yesPrice }]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                          <XAxis dataKey="date" stroke="#6B7280" style={{ fontSize: '11px' }} axisLine={false} tickLine={false} />
                          <YAxis stroke="#6B7280" style={{ fontSize: '11px' }} domain={[0, 100]} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} />
                          <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px' }} />
                          <Line type="monotone" dataKey="YES" stroke="#A4E977" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Order Book - INSIDE Chart Section */}
                <div className="border-2 rounded-lg overflow-hidden bg-black" style={{ borderColor: '#A4E977' }}>
                  <div className="px-3 py-3 border-b border-[#A4E977]">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white">Order Book</h3>
                      <button className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                        Others <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setSelectedOutcome(0)} className={`flex-1 px-2 py-1 text-xs font-medium rounded-full transition-colors ${selectedOutcome === 0 ? 'bg-[#A4E977]/20 text-[#A4E977]' : 'bg-black text-gray-400 hover:text-white'}`}>Yes</button>
                      <button onClick={() => setSelectedOutcome(1)} className={`flex-1 px-2 py-1 text-xs font-medium rounded-full transition-colors ${selectedOutcome === 1 ? 'bg-red-500/20 text-red-400' : 'bg-black text-gray-400 hover:text-white'}`}>No</button>
                    </div>
                  </div>

                  <div className="px-3 py-2">
                    <div className="grid grid-cols-[1fr_0.8fr_1fr] gap-2 text-[10px] text-gray-500 font-medium mb-3">
                      <div>Price</div>
                      <div className="text-right">Size</div>
                      <div className="text-right">Total(USD)</div>
                    </div>

                    <div className="max-h-[500px] overflow-y-auto">
                      <div className="space-y-0.5 mb-2">
                        {filteredAsks.slice(0, 10).map((ask, i) => (
                          <div key={i} className="grid grid-cols-[1fr_0.8fr_1fr] gap-2 text-xs py-1 hover:bg-red-500/10 rounded px-1 cursor-pointer">
                            <div className="text-red-400 font-mono font-semibold">{(ask.price * 100).toFixed(1)}¢</div>
                            <div className="text-right text-gray-300">{ask.amount.toFixed(0)}</div>
                            <div className="text-right text-gray-400">${(ask.price * ask.amount).toFixed(2)}</div>
                          </div>
                        ))}
                        {filteredAsks.length === 0 && <div className="text-center py-6 text-gray-600 text-[10px]">No sell orders</div>}
                      </div>

                      <div className="py-2 text-center border-y border-gray-800/50 mb-2">
                        <div className="text-[10px] text-gray-400">
                          Spread: <span className="text-[#A4E977] font-mono">{filteredAsks.length > 0 && filteredBids.length > 0 ? ((filteredAsks[0].price - filteredBids[0].price) * 100).toFixed(2) : '0.00'}¢</span>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        {filteredBids.slice(0, 10).map((bid, i) => (
                          <div key={i} className="grid grid-cols-[1fr_0.8fr_1fr] gap-2 text-xs py-1 hover:bg-[#A4E977]/10 rounded px-1 cursor-pointer">
                            <div className="text-[#A4E977] font-mono font-semibold">{(bid.price * 100).toFixed(1)}¢</div>
                            <div className="text-right text-gray-300">{bid.amount.toFixed(0)}</div>
                            <div className="text-right text-gray-400">${(bid.price * bid.amount).toFixed(2)}</div>
                          </div>
                        ))}
                        {filteredBids.length === 0 && <div className="text-center py-6 text-gray-600 text-[10px]">No buy orders</div>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Tabs */}
              <div className="p-3 pt-0">
                <div className="border-2 rounded-lg overflow-hidden bg-black" style={{ borderColor: '#A4E977' }}>
                  <div className="flex border-b border-[#A4E977]">
                    {['Positions', 'Open Orders', 'TWAP', 'Trade History', 'Funding History', 'Order History'].map((tab) => (
                      <button key={tab} onClick={() => setActiveTab(tab.toLowerCase().replace(' ', '-'))} className={`px-4 py-2.5 text-xs font-medium transition-colors ${activeTab === tab.toLowerCase().replace(' ', '-') ? 'text-white border-b-2 border-[#A4E977]' : 'text-gray-400 hover:text-white'}`}>
                        {tab}
                      </button>
                    ))}
                  </div>
                  <div className="p-4 min-h-[200px]">
                    {activeTab === 'positions' && (
                      <div>
                        {parseFloat(positions[0]) > 0 || parseFloat(positions[1]) > 0 ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-black rounded">
                              <div>
                                <div className="text-xs text-gray-400">YES Position</div>
                                <div className="text-sm font-semibold text-[#A4E977]">{parseFloat(positions[0]).toFixed(2)} shares</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-400">Value</div>
                                <div className="text-sm font-semibold">${(parseFloat(positions[0]) * (yesPrice / 100)).toFixed(2)}</div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-black rounded">
                              <div>
                                <div className="text-xs text-gray-400">NO Position</div>
                                <div className="text-sm font-semibold text-red-400">{parseFloat(positions[1]).toFixed(2)} shares</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-400">Value</div>
                                <div className="text-sm font-semibold">${(parseFloat(positions[1]) * (noPrice / 100)).toFixed(2)}</div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12 text-gray-500 text-sm">No positions found</div>
                        )}
                      </div>
                    )}
                    {activeTab === 'trade-history' && (
                      <div className="space-y-1">
                        {recentTrades.length > 0 ? (
                          recentTrades.slice(0, 10).map((trade, i) => (
                            <div key={i} className="flex items-center justify-between py-2 text-xs hover:bg-gray-800/30 px-2 rounded">
                              <span className={trade.type === 'Buy' ? 'text-[#A4E977]' : 'text-red-400'}>{trade.type}</span>
                              <span className="text-gray-400">{trade.outcomeIndex === 0 ? 'YES' : 'NO'}</span>
                              <span className="text-gray-400">${trade.amountIn}</span>
                              <span className="text-gray-500">{new Date(trade.timestamp).toLocaleTimeString()}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-12 text-gray-500 text-sm">No trades yet</div>
                        )}
                      </div>
                    )}
                    {activeTab === 'open-orders' && (
                      <div className="text-center py-12 text-gray-500 text-sm">No open orders</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Trading Panel ONLY */}
            <div className="bg-black flex flex-col p-3 h-full">
              <div className="border-2 rounded-lg overflow-y-auto bg-black h-full flex flex-col" style={{ borderColor: '#A4E977' }}>
                <div className="flex border-b border-[#A4E977] py-2 px-2">
                  <button onClick={() => setTradeType('buy')} className={`flex-1 py-3 text-sm font-semibold transition-colors rounded-full ${tradeType === 'buy' ? 'text-black bg-[#A4E977] mx-1 my-1' : 'text-gray-500 hover:text-white'}`}>Buy</button>
                  <button onClick={() => setTradeType('sell')} className={`flex-1 py-3 text-sm font-semibold transition-colors rounded-full ${tradeType === 'sell' ? 'text-black bg-[#A4E977] mx-1 my-1' : 'text-gray-500 hover:text-white'}`}>Sell</button>
                </div>

                <div className="p-3 border-b border-[#A4E977]">
                  <div className="flex gap-2">
                    {(['market', 'limit', 'pro'] as const).map((type) => (
                      <button key={type} onClick={() => setOrderType(type)} className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${orderType === type ? 'bg-[#A4E977] text-black' : 'text-gray-400 hover:text-white bg-gray-800 border border-gray-700'}`}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}{type === 'pro' && ' ▼'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setSelectedOutcome(0)} className={`p-2.5 rounded-full border-2 transition-all flex items-center justify-between ${selectedOutcome === 0 ? 'bg-[#A4E977]/10 border-[#A4E977]' : 'bg-black border-gray-700 hover:border-[#A4E977]/50'}`}>
                      <span className="text-[10px] font-medium text-gray-400">Yes</span>
                      <span className={`text-base font-bold ${selectedOutcome === 0 ? 'text-[#A4E977]' : 'text-gray-300'}`}>{yesPrice}.00¢</span>
                    </button>
                    <button onClick={() => setSelectedOutcome(1)} className={`p-2.5 rounded-full border-2 transition-all flex items-center justify-between ${selectedOutcome === 1 ? 'bg-red-500/10 border-red-500' : 'bg-black border-gray-700 hover:border-red-500/50'}`}>
                      <span className="text-[10px] font-medium text-gray-400">No</span>
                      <span className={`text-base font-bold ${selectedOutcome === 1 ? 'text-red-400' : 'text-gray-300'}`}>{noPrice}.00¢</span>
                    </button>
                  </div>
                </div>

                <div className="px-3 pb-3">
                  <label className="text-xs text-gray-400 mb-2 block">Order Size</label>
                  <div className="relative">
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-black border border-gray-700 rounded px-3 py-2.5 text-sm text-white focus:border-[#A4E977] focus:outline-none pr-16" placeholder="$0.00" />
                    <button onClick={() => setAmount(balance)} className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-semibold text-gray-400 hover:text-white transition-colors">MAX</button>
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
                      className="w-full bg-black border border-gray-700 rounded px-3 py-2.5 text-sm text-white focus:border-[#A4E977] focus:outline-none"
                      placeholder="0.50"
                      step="0.01"
                    />
                  </div>
                )}

                <div className="px-3 pb-3">
                  <label className="text-xs text-gray-400 mb-2 block">Amount ({sliderValue}%)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderValue}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setSliderValue(val);
                      const maxAmount = parseFloat(balance) || 0;
                      setAmount(((maxAmount * val) / 100).toFixed(2));
                    }}
                    className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider-thumb"
                    style={{
                      background: `linear-gradient(to right, #A4E977 0%, #A4E977 ${sliderValue}%, #1f2937 ${sliderValue}%, #1f2937 100%)`
                    }}
                  />
                  <div className="flex justify-between mt-2">
                    {[0, 25, 50, 75, 100].map((val) => (
                      <button
                        key={val}
                        onClick={() => {
                          setSliderValue(val);
                          const maxAmount = parseFloat(balance) || 0;
                          setAmount(((maxAmount * val) / 100).toFixed(2));
                        }}
                        className={`text-[10px] font-medium transition-colors ${sliderValue === val ? 'text-[#A4E977]' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-3 pb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Available to Trade</span>
                    <span className="text-white font-medium">${parseFloat(balance).toFixed(2)}</span>
                  </div>
                </div>

                <div className="px-3 pb-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300 font-medium">Potential Payout</span>
                    <span className="text-white font-bold">${calculatePotentialPayout()}</span>
                  </div>
                </div>

                <div className="px-3 pb-3">
                  <button className="w-full py-3 rounded-full font-semibold text-sm transition-colors bg-[#A4E977] hover:bg-[#8FD65E] text-black">Connect to Trade</button>
                </div>

                <div className="px-3 pb-4 border-b border-[#A4E977]">
                  <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={takeProfitStopLoss}
                      onChange={(e) => setTakeProfitStopLoss(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-700 bg-black"
                    />
                    <span>Take Profit / Stop Loss</span>
                    <span className="text-gray-600">ⓘ</span>
                  </label>

                  {takeProfitStopLoss && (
                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-500 mb-1 block">TP Price</label>
                          <div className="relative">
                            <input
                              type="number"
                              className="w-full bg-black border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-[#A4E977] focus:outline-none pr-6"
                              placeholder="0"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">¢</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 mb-1 block">Gain</label>
                          <div className="relative">
                            <input
                              type="number"
                              className="w-full bg-black border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-[#A4E977] focus:outline-none pr-6"
                              placeholder="0"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">%</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-500 mb-1 block">SL Price</label>
                          <div className="relative">
                            <input
                              type="number"
                              className="w-full bg-black border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-[#A4E977] focus:outline-none pr-6"
                              placeholder="0"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">¢</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 mb-1 block">Loss</label>
                          <div className="relative">
                            <input
                              type="number"
                              className="w-full bg-black border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-[#A4E977] focus:outline-none pr-6"
                              placeholder="0"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 mt-auto">
                  <button
                    onClick={() => setRelatedMarketsExpanded(!relatedMarketsExpanded)}
                    className="flex items-center justify-between w-full mb-3"
                  >
                    <h3 className="text-sm font-semibold text-white">Related Markets</h3>
                    <ChevronDown className={`w-4 h-4 text-gray-400 hover:text-white transition-transform ${relatedMarketsExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {relatedMarketsExpanded && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 p-2 rounded hover:bg-black cursor-pointer transition-colors">
                          <img src="https://i.pravatar.cc/40?img=1" alt="" className="w-8 h-8 rounded-full" />
                          <div className="flex-1 min-w-0"><div className="text-xs text-white truncate">Will Elon Musk win the 2028 US Presidential...</div></div>
                          <div className="text-sm font-bold text-[#A4E977]">1%</div>
                        </div>
                        <div className="flex items-center gap-3 p-2 rounded hover:bg-black cursor-pointer transition-colors">
                          <img src="https://i.pravatar.cc/40?img=2" alt="" className="w-8 h-8 rounded-full" />
                          <div className="flex-1 min-w-0"><div className="text-xs text-white truncate">Will Gavin Newsom win the 2028 US Presidential...</div></div>
                          <div className="text-sm font-bold text-[#A4E977]">18%</div>
                        </div>
                        <div className="flex items-center gap-3 p-2 rounded hover:bg-black cursor-pointer transition-colors">
                          <img src="https://i.pravatar.cc/40?img=3" alt="" className="w-8 h-8 rounded-full" />
                          <div className="flex-1 min-w-0"><div className="text-xs text-white truncate">Will Pete Buttigieg win the 2028 US Presidential...</div></div>
                          <div className="text-sm font-bold text-[#A4E977]">2%</div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4 overflow-x-auto">
                        {['All', 'Trump', 'Politics', 'Culture'].map((cat) => (
                          <button key={cat} className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${cat === 'All' ? 'bg-[#A4E977]/20 text-[#A4E977]' : 'bg-black text-gray-400 hover:text-white'}`}>{cat}</button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
