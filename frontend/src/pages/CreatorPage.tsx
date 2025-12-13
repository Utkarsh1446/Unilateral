import { Footer } from '../components/Footer';
import { MarketCard } from '../components/MarketCard';
import { TrendingUp, Twitter, Globe, Users, DollarSign, TrendingDown, Award, ArrowLeft, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ethers } from 'ethers';
import { getCreator, getCreatorMarkets } from '../lib/api';
import { CONTRACTS, ABIS, getContract } from '../lib/contracts';

export function CreatorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');

  const [creator, setCreator] = useState<any>(null);
  const [markets, setMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<string | null>(null);

  // Share Data
  const [sharePrice, setSharePrice] = useState("0");
  const [shareSupply, setShareSupply] = useState("0");
  const [userShareBalance, setUserShareBalance] = useState("0");
  const [holdersCount, setHoldersCount] = useState(0);
  const [recentTxns, setRecentTxns] = useState<{ type: string, amount: string, price: string, time: string, address: string, timestamp: number }[]>([]);
  const [priceHistory, setPriceHistory] = useState<{ date: string, price: number, timestamp: number }[]>([]);
  const [balance, setBalance] = useState("0"); // USDC Balance
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [approving, setApproving] = useState(false);
  const [loadingTrade, setLoadingTrade] = useState(false);

  useEffect(() => {
    checkConnection();
    loadData();
  }, [id]);

  useEffect(() => {
    if (creator?.contract_address && account) {
      loadShareData(creator.contract_address);
      checkBalance();
      checkAllowance();
    } else if (creator?.contract_address) {
      // Load public data even if not connected
      loadShareData(creator.contract_address);
    }
  }, [creator, account]);

  const checkConnection = async () => {
    if (typeof window.ethereum !== "undefined") {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) setAccount(accounts[0].address);
    }
  };

  const loadData = async () => {
    try {
      const creatorData = await getCreator(id!);
      setCreator(creatorData);

      const marketsData = await getCreatorMarkets(creatorData.id); // Use ID from creator data if 'id' param is a handle
      setMarkets(marketsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadShareData = async (address: string) => {
    if (typeof window.ethereum === "undefined") return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = getContract(address, ABIS.CreatorShare, provider);

      // Current Supply
      const supply = await contract.totalSupply();
      const currentSupplyBigInt = supply;
      setShareSupply(ethers.formatEther(supply));

      // Current Price
      try {
        const price = await contract.getBuyPrice(ethers.parseEther("1"));
        setSharePrice(ethers.formatUnits(price, 6));
      } catch (e) {
        console.warn("Could not fetch price", e);
      }

      // User Balance
      if (account) {
        const balance = await contract.balanceOf(account);
        setUserShareBalance(ethers.formatEther(balance));
      }

      // Fetch Logs
      const filter = contract.filters.Transfer();
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // Last 10k blocks
      const logs = await contract.queryFilter(filter, fromBlock);

      // Process Transactions & Holders
      const balances = new Map<string, bigint>();
      const processedTxns: any[] = [];

      for (const log of logs) {
        const args = (log as any).args;
        const from = String(args[0]).toLowerCase();
        const to = String(args[1]).toLowerCase();
        const value = BigInt(args[2]);
        const zeroAddr = ethers.ZeroAddress.toLowerCase();

        // Holder Balances
        if (from !== zeroAddr) balances.set(from, (balances.get(from) || 0n) - value);
        if (to !== zeroAddr) balances.set(to, (balances.get(to) || 0n) + value);

        // Transaction History
        let timestamp = Date.now();
        try {
          const block = await (log as any).getBlock();
          timestamp = block.timestamp * 1000;
        } catch { }

        processedTxns.push({
          from, to, value, timestamp,
          type: from === zeroAddr ? 'Buy' : (to === zeroAddr ? 'Sell' : 'Transfer'),
          amount: ethers.formatEther(value),
          address: (from === zeroAddr ? to : from).slice(0, 6) + '...' + (from === zeroAddr ? to : from).slice(-4)
        });
      }

      let count = 0;
      balances.forEach(bal => { if (bal > 0n) count++; });
      setHoldersCount(count > 0 ? count : (parseFloat(ethers.formatEther(supply)) > 0 ? 1 : 0));

      const sortedTxns = processedTxns.sort((a, b) => b.timestamp - a.timestamp);
      setRecentTxns(sortedTxns.slice(0, 10).map(tx => ({
        type: tx.type,
        amount: tx.amount,
        price: '-',
        time: new Date(tx.timestamp).toLocaleDateString(),
        address: tx.address,
        timestamp: tx.timestamp
      })));

      // Generate Price History (Working Backwards)
      // Recent txns are DESCENDING (newest first).
      const historyPoints: { date: string, price: number, timestamp: number }[] = [];
      let runningSupply = currentSupplyBigInt;

      // Add current point
      historyPoints.push({
        date: 'Now',
        price: calculatePrice(runningSupply),
        timestamp: Date.now()
      });

      // Iterate backwards through time (Txns are Descending)
      for (const tx of sortedTxns) {
        const amount = tx.value;
        // Reverse operation to get supply BEFORE this tx
        if (tx.type === 'Buy') {
          runningSupply -= amount;
        } else if (tx.type === 'Sell') {
          runningSupply += amount;
        }
        // For Transfer, supply doesn't change

        historyPoints.push({
          date: new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          price: calculatePrice(runningSupply),
          timestamp: tx.timestamp
        });
      }

      // Add start point
      historyPoints.push({
        date: 'Launch',
        price: 1.00,
        timestamp: sortedTxns.length > 0 ? sortedTxns[sortedTxns.length - 1].timestamp - 3600 : Date.now() - 3600
      });

      // Reverse back to ASCENDING for Valid Chart
      setPriceHistory(historyPoints.reverse());

    } catch (e) {
      console.error("Error loading share data:", e);
    }
  };

  const calculatePrice = (supplyBigInt: bigint) => {
    const supplyNum = parseFloat(ethers.formatEther(supplyBigInt));
    // Price = 1 + (supply^2 / 1400)
    return parseFloat((1 + (supplyNum * supplyNum) / 1400).toFixed(2));
  }

  const checkBalance = async () => {
    if (!account) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const token = getContract(CONTRACTS.PlatformToken, ABIS.PlatformToken, provider);
    const bal = await token.balanceOf(account);
    setBalance(ethers.formatUnits(bal, 6));
  };

  const checkAllowance = async () => {
    if (!account || !creator?.contract_address) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const token = getContract(CONTRACTS.PlatformToken, ABIS.PlatformToken, provider);
    const allow = await token.allowance(account, creator.contract_address);
    setAllowance(allow);
  };

  const handleApprove = async () => {
    if (!account || !creator?.contract_address) return;
    setApproving(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const token = getContract(CONTRACTS.PlatformToken, ABIS.PlatformToken, signer);
      const tx = await token.approve(creator.contract_address, ethers.MaxUint256);
      await tx.wait();
      await checkAllowance();
    } catch (err) {
      console.error(err);
    } finally {
      setApproving(false);
    }
  };

  const handleTrade = async () => {
    if (!account || !creator?.contract_address || !amount) return;
    setLoadingTrade(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = getContract(creator.contract_address, ABIS.CreatorShare, signer);
      const amountWei = ethers.parseEther(amount); // Shares usually 18 decimals

      let tx;
      if (tradeType === 'buy') {
        tx = await contract.buyShares(amountWei);
      } else {
        tx = await contract.sellShares(amountWei);
      }

      await tx.wait();
      alert(tradeType === 'buy' ? "Shares Bought!" : "Shares Sold!");
      setAmount("");
      loadShareData(creator.contract_address);
      checkBalance();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Trade failed");
    } finally {
      setLoadingTrade(false);
    }
  };

  const [estimatedCost, setEstimatedCost] = useState("0.00");

  useEffect(() => {
    const updateCost = async () => {
      if (!amount || !creator?.contract_address || parseFloat(amount) <= 0) {
        setEstimatedCost("0.00");
        return;
      }
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = getContract(creator.contract_address, ABIS.CreatorShare, provider);
        const amountWei = ethers.parseEther(amount);
        const price = await contract.getBuyPrice(amountWei);
        const totalWithFee = (BigInt(price) * 105n) / 100n;
        setEstimatedCost(ethers.formatUnits(totalWithFee, 6));
      } catch (e) {
        setEstimatedCost((parseFloat(amount) * parseFloat(sharePrice) * 1.05).toFixed(2));
      }
    };
    updateCost();
  }, [amount, creator?.contract_address, sharePrice]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
  if (!creator) return <div className="text-center py-20">Creator not found</div>;

  const isPositive = (parseFloat(creator.priceChange) || 0) > 0;
  const needsApproval = tradeType === 'buy' && allowance < ethers.parseUnits(estimatedCost, 6);

  return (
    <>
      <div className="bg-muted/20 min-h-screen">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">

          <button
            onClick={() => navigate('/creators')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Creators
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">

              {/* Header */}
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-200 border border-gray-300 flex-shrink-0">
                  {creator.profile_image ? (
                    <img src={creator.profile_image.replace('_normal', '')} alt={creator.twitter_handle} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400">
                      {creator.twitter_handle[0]}
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-1">{creator.display_name || creator.twitter_handle}</h1>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
                    <span>@{creator.twitter_handle}</span>
                    {creator.verified && <Award className="w-4 h-4 text-blue-500" />}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed max-w-lg">
                    {creator.bio || "Crypto enthusiast and market creator living on the edge of probability."}
                  </p>

                  <div className="flex gap-6 mt-4 text-sm">
                    <div>
                      <span className="font-bold text-gray-900">{holdersCount}</span>
                      <span className="text-gray-500 ml-1">Holders</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">{parseFloat(shareSupply).toFixed(0)}</span>
                      <span className="text-gray-500 ml-1">Supply</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">${parseFloat(creator.total_market_volume || "0").toLocaleString()}</span>
                      <span className="text-gray-500 ml-1">Vol</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart Section */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-semibold text-gray-900">Price History</h3>
                  <div className="text-2xl font-bold text-gray-900">${sharePrice}</div>
                </div>

                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={priceHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} minTickGap={30} />
                      <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                        formatter={(val: any) => [`$${val}`, 'Price']}
                      />
                      <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Transactions */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                  <h3 className="font-semibold text-sm text-gray-700">Recent Activity</h3>
                </div>
                <div>
                  {recentTxns.length > 0 ? recentTxns.map((tx, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                                      ${tx.type === 'Buy' ? 'bg-green-100 text-green-700' :
                            tx.type === 'Sell' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {tx.type[0]}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{tx.type}</div>
                          <div className="text-xs text-gray-500">{tx.time}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">{parseFloat(tx.amount).toFixed(2)} Shares</div>
                        <div className="text-xs text-gray-500">{tx.address}</div>
                      </div>
                    </div>
                  )) : (
                    <div className="p-8 text-center text-gray-500 text-sm">No recent transactions found.</div>
                  )}
                </div>
              </div>

              {/* Active Markets */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Active Markets</h3>
                {markets.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {markets.filter(m => !m.resolved && m.approval_status === "approved").map((market) => {
                      const yesOutcome = market.outcomes?.find((o: any) => o.name === 'Yes');
                      const yesPrice = yesOutcome ? Math.round(Number(yesOutcome.current_price) * 100) : 50;

                      return (
                        <MarketCard
                          key={market.id}
                          title={market.question}
                          creator={market.creator?.display_name || market.creator?.twitter_handle || 'Unknown'}
                          yesPrice={yesPrice}
                          noPrice={100 - yesPrice}
                          volume={Number(market.volume).toLocaleString()}
                          priceChange={0}
                          imageUrl={market.image_url}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                    This creator hasn't launched any active markets yet.
                  </div>
                )}
              </div>

            </div>

            {/* Sidebar Trading Panel */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg sticky top-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Trade Shares</h2>

                <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
                  <button
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tradeType === 'buy' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setTradeType('buy')}
                  >
                    Buy
                  </button>
                  <button
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tradeType === 'sell' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setTradeType('sell')}
                  >
                    Sell
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</label>
                    <div className="mt-1 relative">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="block w-full rounded-lg border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-blue-500 p-3 text-lg font-medium"
                        placeholder="0"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-sm">Shares</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Price per share</span>
                    <span className="font-medium text-gray-900">${sharePrice}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Fee (5%)</span>
                    <span className="font-medium text-gray-900">${(parseFloat(estimatedCost) * 0.05).toFixed(2)}</span>
                  </div>
                  <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-gray-900">${estimatedCost}</span>
                  </div>

                  {!account ? (
                    <button className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors">
                      Connect Wallet
                    </button>
                  ) : needsApproval ? (
                    <button onClick={handleApprove} disabled={approving} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                      {approving ? 'Approving...' : 'Approve USDC'}
                    </button>
                  ) : (
                    <button onClick={handleTrade} disabled={loadingTrade || !amount} className={`w-full py-3 rounded-xl font-bold text-white transition-colors disabled:opacity-50
                                ${tradeType === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                      {loadingTrade ? 'Processing...' : (tradeType === 'buy' ? 'Buy Shares' : 'Sell Shares')}
                    </button>
                  )}

                  <div className="text-center text-xs text-gray-400 mt-2">
                    Balance: {tradeType === 'buy' ? `$${balance}` : `${parseFloat(userShareBalance).toFixed(2)} Shares`}
                  </div>
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