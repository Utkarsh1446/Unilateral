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
  const [recentTxns, setRecentTxns] = useState<{ type: string, amount: string, price: string, time: string, address: string }[]>([]);
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

      const marketsData = await getCreatorMarkets(id!);
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

      const supply = await contract.totalSupply();
      setShareSupply(ethers.formatEther(supply));

      // Get Buy Price for 1 share
      try {
        const price = await contract.getBuyPrice(ethers.parseEther("1"));
        setSharePrice(ethers.formatUnits(price, 6)); // Assuming USDC pricing
      } catch (e) {
        console.warn("Could not fetch price", e);
      }

      if (account) {
        const balance = await contract.balanceOf(account);
        setUserShareBalance(ethers.formatEther(balance));
      }

      // Count unique holders by checking Transfer events
      try {
        const filter = contract.filters.Transfer();
        const currentBlock = await provider.getBlockNumber();
        // Only query last 10000 blocks to avoid RPC limits
        const fromBlock = Math.max(0, currentBlock - 10000);
        const logs = await contract.queryFilter(filter, fromBlock);
        const balances = new Map<string, bigint>();

        for (const log of logs) {
          const args = (log as any).args;
          const from = String(args[0]).toLowerCase();
          const to = String(args[1]).toLowerCase();
          const value = BigInt(args[2]);

          const zeroAddr = ethers.ZeroAddress.toLowerCase();

          if (from !== zeroAddr) {
            balances.set(from, (balances.get(from) || 0n) - value);
          }
          if (to !== zeroAddr) {
            balances.set(to, (balances.get(to) || 0n) + value);
          }
        }

        let count = 0;
        balances.forEach((bal) => { if (bal > 0n) count++; });
        console.log(`Holders: ${count} from ${logs.length} events`);
        setHoldersCount(count > 0 ? count : (parseFloat(ethers.formatEther(supply)) > 0 ? 1 : 0));

        // Extract recent transactions from logs
        const txns = logs.slice(-10).reverse().map((log) => {
          const args = (log as any).args;
          const from = String(args[0]).toLowerCase();
          const to = String(args[1]).toLowerCase();
          const value = BigInt(args[2]);
          const zeroAddr = ethers.ZeroAddress.toLowerCase();
          const isBuy = from === zeroAddr;
          const isSell = to === zeroAddr;
          const addr = isBuy ? to : from;

          return {
            type: isBuy ? 'Buy' : (isSell ? 'Sell' : 'Transfer'),
            amount: ethers.formatEther(value),
            price: '-',
            time: 'Recent',
            address: addr.slice(0, 6) + '...' + addr.slice(-4)
          };
        });
        setRecentTxns(txns);
      } catch (e) {
        console.warn("Could not count holders:", e);
        // Fallback: if supply > 0, at least 1 holder
        if (parseFloat(ethers.formatEther(supply)) > 0) setHoldersCount(1);
      }

    } catch (e) {
      console.error("Error loading share data:", e);
    }
  };

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

  // Update estimated cost when amount changes
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
        // Add 5% fee
        const totalWithFee = (BigInt(price) * 105n) / 100n;
        setEstimatedCost(ethers.formatUnits(totalWithFee, 6));
      } catch (e) {
        console.warn("Could not calculate cost:", e);
        setEstimatedCost((parseFloat(amount) * parseFloat(sharePrice) * 1.05).toFixed(2));
      }
    };
    updateCost();
  }, [amount, creator?.contract_address, sharePrice]);

  const calculateCost = () => estimatedCost;

  // Generate bonding curve with multiple data points
  const currentPrice = parseFloat(sharePrice) || 1.0;
  const supplyNum = parseFloat(shareSupply) || 0;
  const priceHistory = [];

  // Generate 10 points along the bonding curve up to current supply
  const maxSupply = Math.max(supplyNum, 10); // At least show 10 tokens on curve
  for (let i = 0; i <= 10; i++) {
    const s = (maxSupply / 10) * i;
    // Bonding curve formula: price = 1 + (supply^2 / 1400)
    const price = 1 + (s * s) / 1400;
    priceHistory.push({
      date: i === 0 ? '0' : `${Math.round(s)}`,
      price: parseFloat(price.toFixed(2))
    });
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
  if (!creator) return <div className="text-center py-20">Creator not found</div>;

  const isPositive = (parseFloat(creator.priceChange) || 0) > 0;
  const needsApproval = tradeType === 'buy' && allowance < ethers.parseUnits(calculateCost(), 6);

  return (
    <>
      <div className="bg-muted/20 min-h-screen">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          {/* Go Back */}
          <button
            onClick={() => navigate('/creators')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Creator Profile Header */}
              <div className="bg-background rounded-xl border border-foreground/10 p-6">
                <div className="flex items-start gap-6 mb-6">
                  {/* Avatar */}
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-foreground/20 flex-shrink-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    {creator.profile_image ? (
                      <img
                        src={creator.profile_image.replace('_normal', '')}
                        alt={creator.twitter_handle}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <span className={`text-4xl font-bold text-foreground/50 ${creator.profile_image ? 'hidden' : ''}`}>
                      {creator.twitter_handle?.[0]?.toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <h1 className="heading-page mb-2">{creator.twitter_handle}</h1>
                    <div className="text-lg text-muted-foreground mb-4">@{creator.twitter_handle}</div>

                    {/* Social Links */}
                    <div className="flex items-center gap-3 mb-4">
                      <a href={`https://twitter.com/${creator.twitter_handle}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg hover:bg-foreground hover:text-background transition-all text-sm">
                        <Twitter className="w-4 h-4" />
                        <span style={{ fontWeight: 500 }}>Twitter</span>
                      </a>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {creator.bio || "No bio available."}
                    </p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-muted/30 rounded-xl">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider" style={{ letterSpacing: '0.05em' }}>Markets</div>
                    <div className="text-value-md">{creator.active_markets_count || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider" style={{ letterSpacing: '0.05em' }}>Holders</div>
                    <div className="text-value-md">{holdersCount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider" style={{ letterSpacing: '0.05em' }}>Total Volume</div>
                    <div className="text-value-md">${parseFloat(creator.total_market_volume || "0").toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider" style={{ letterSpacing: '0.05em' }}>Supply</div>
                    <div className="text-value-md">{parseFloat(shareSupply).toFixed(0)}</div>
                  </div>
                </div>
              </div>

              {/* Share Price & Performance */}
              <div className="bg-background rounded-xl border border-foreground/10 p-6">
                <h3 className="heading-section mb-6">Share Performance</h3>

                {/* Current Price */}
                <div className="flex items-end gap-4 mb-6">
                  <div className="text-value-lg">${sharePrice}</div>
                  <div className={`flex items-center gap-2 pb-2 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    <span className="text-value-sm">{Math.abs(parseFloat(creator.priceChange) || 0)}%</span>
                  </div>
                </div>

                {/* Line Chart */}
                <div className="h-64 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={priceHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--foreground) / 0.05)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: '11px' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: '11px' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--foreground) / 0.1)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        formatter={(value: number) => `$${value}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#8b5cf6"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4, fill: '#8b5cf6' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Recent Transactions */}
                <div className="mt-6">
                  <h4 className="text-base font-semibold mb-3">Recent Transactions</h4>
                  {recentTxns.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {recentTxns.map((tx, i) => (
                        <div key={i} className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${tx.type === 'Buy' ? 'bg-green-500/20 text-green-600' :
                              tx.type === 'Sell' ? 'bg-red-500/20 text-red-600' :
                                'bg-blue-500/20 text-blue-600'
                              }`}>{tx.type}</span>
                            <span className="text-muted-foreground">{tx.address}</span>
                          </div>
                          <span className="font-medium">{parseFloat(tx.amount).toFixed(2)} shares</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent transactions</p>
                  )}
                </div>
              </div>

              {/* Creator's Markets */}
              <div className="bg-background rounded-xl border border-foreground/10 p-6">
                <h3 className="heading-section mb-6">Active Markets</h3>

                {markets.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {markets.map((market, idx) => (
                      <MarketCard key={idx} {...market} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">No active markets found.</div>
                )}
              </div>
            </div>

            {/* Sidebar - Trading */}
            <div className="lg:col-span-1">
              {/* Trade Shares */}
              <div className="bg-background rounded-xl border border-foreground/10 p-5 sticky top-6">
                {/* Buy/Sell Tabs */}
                <div className="flex border-b border-foreground/10 mb-5">
                  <button
                    onClick={() => setTradeType('buy')}
                    className={`flex-1 pb-3 text-sm transition-colors relative ${tradeType === 'buy'
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                    style={{ fontWeight: 500 }}
                  >
                    Buy
                    {tradeType === 'buy' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setTradeType('sell')}
                    className={`flex-1 pb-3 text-sm transition-colors relative ${tradeType === 'sell'
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                    style={{ fontWeight: 500 }}
                  >
                    Sell
                    {tradeType === 'sell' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground"></div>
                    )}
                  </button>
                </div>

                {/* Current Price Display */}
                <div className="mb-4">
                  <div className="text-xs text-muted-foreground mb-2">Current Price</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl" style={{ fontWeight: 600 }}>${sharePrice}</span>
                    <span className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`} style={{ fontWeight: 600 }}>
                      {isPositive ? '+' : ''}{Math.abs(parseFloat(creator.priceChange) || 0)}%
                    </span>
                  </div>
                </div>

                {/* Enter Amount */}
                <div className="mb-4">
                  <label className="block text-xs text-muted-foreground mb-2">Enter Amount (Shares)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="10"
                      className="w-full px-4 py-3 bg-background border border-foreground/10 rounded-xl focus:border-foreground/30 outline-none transition-colors text-lg"
                      style={{ fontWeight: 500 }}
                    />
                  </div>
                </div>

                {/* Balance */}
                <div className="flex items-center justify-between mb-5 text-xs">
                  <span className="text-muted-foreground">Balance</span>
                  <div className="flex items-center gap-2">
                    <span className="text-foreground" style={{ fontWeight: 500 }}>
                      {tradeType === 'buy' ? `$${balance}` : `${parseFloat(userShareBalance).toFixed(2)} Shares`}
                    </span>
                  </div>
                </div>

                {/* Trade Button */}
                {!account ? (
                  <button className="w-full py-3.5 bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity text-sm mb-4" style={{ fontWeight: 600 }} disabled>
                    Connect Wallet
                  </button>
                ) : needsApproval ? (
                  <button
                    onClick={handleApprove}
                    disabled={approving}
                    className="w-full py-3.5 bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity text-sm mb-4" style={{ fontWeight: 600 }}
                  >
                    {approving ? "Approving..." : "Approve USDC"}
                  </button>
                ) : (
                  <button
                    onClick={handleTrade}
                    disabled={loadingTrade || !amount || parseFloat(amount) <= 0}
                    className="w-full py-3.5 bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity text-sm mb-4" style={{ fontWeight: 600 }}
                  >
                    {loadingTrade ? "Processing..." : (tradeType === 'buy' ? "Buy Shares" : "Sell Shares")}
                  </button>
                )}

                {/* Fee and Cost */}
                <div className="space-y-2 mb-5 pb-5 border-b border-foreground/10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Fee</span>
                    <span className="text-foreground" style={{ fontWeight: 500 }}>5%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Est. Cost</span>
                    <span className="text-foreground" style={{ fontWeight: 600 }}>${calculateCost()}</span>
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