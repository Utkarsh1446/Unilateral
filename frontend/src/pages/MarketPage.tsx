import { Footer } from '../components/Footer';
import { Share2, ArrowLeft, ChevronDown, Loader2, CheckCircle, XCircle } from 'lucide-react';
import React, { useEffect, useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate, useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import { toast, Toaster } from 'sonner';
import { CONTRACTS, ABIS, getContract } from '../lib/contracts';
import { OrderBook } from '../components/OrderBook';

interface MarketData {
  id: string;
  question: string;
  volume: string;
  contract_address: string;
  description?: string;
  category?: string;
  deadline?: string;
  creator: {
    twitter_handle: string;
  };
  created_at: string;
  resolved: boolean;
}

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
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no'>('yes');
  const [amount, setAmount] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [loadingTrade, setLoadingTrade] = useState(false);

  // Order Book State
  const [bids, setBids] = useState<any[]>([]);
  const [asks, setAsks] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // UI State
  const [timeFilter, setTimeFilter] = useState('7D');
  const [showResolution, setShowResolution] = useState(false);
  const [activeTab, setActiveTab] = useState('position');
  const [txFilter, setTxFilter] = useState<'all' | 'yes' | 'no' | 'buy' | 'sell'>('all');

  // Wallet & Contract State
  const [account, setAccount] = useState<string | null>(null);
  const [prices, setPrices] = useState<[string, string]>(["-", "-"]);
  const [positions, setPositions] = useState<[string, string]>(["0", "0"]);
  const [balance, setBalance] = useState("0");
  const [allowance, setAllowance] = useState(0n);
  const [isApprovedForAll, setIsApprovedForAll] = useState(false);

  const [approving, setApproving] = useState(false);
  const [approvingForAll, setApprovingForAll] = useState(false);

  const [chartData, setChartData] = useState<any[]>([]);
  const [recentTrades, setRecentTrades] = useState<TradeEvent[]>([]);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  useEffect(() => {
    checkConnection();
    fetchMarket();
    const interval = setInterval(fetchMarket, 5000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    fetchPrices();
    if (market?.contract_address) {
      fetchOrders(); // Fetch orderbook when market is loaded
    }
    if (account) {
      checkAllowance();
      checkApprovalForAll();
      checkBalance();
      fetchPositions();
    }
  }, [account, market]);

  // Separate effect for trade history with longer polling interval to avoid 429s
  useEffect(() => {
    fetchTradeHistory();
    const interval = setInterval(fetchTradeHistory, 15000); // Poll every 15s instead of 5s
    return () => clearInterval(interval);
  }, [market?.contract_address]);

  const checkConnection = async () => {
    if (typeof window.ethereum !== "undefined") {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) setAccount(accounts[0].address);
    }
  };

  const fetchMarket = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const res = await fetch(`http://127.0.0.1:3001/markets/${id}`, {
        cache: 'no-cache',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error("Failed to fetch market");
      const data = await res.json();
      setMarket(data);
    } catch (err) {
      console.error("Fetch market error:", err);
      // If error, maybe show error state or retry?
      // For now, just stop loading so user sees "Market not found" or empty state instead of spinner
    } finally {
      setLoadingMarket(false);
    }
  };

  const fetchPrices = async () => {
    // Prices are now determined by OrderBook. 
    // We can update this via callback from OrderBook or separate fetch.
    // For now, we'll let OrderBook handle price display or update state if needed.
  };

  // Use public RPC for all read operations to ensure reliability
  const READ_RPC = "https://sepolia.base.org";
  // Backup: "https://base-sepolia.infura.io/v3/a6e3dd24c8b645dda9235a1c17a42124"

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

      // Correct Position ID Calculation (Simplified for this deployment):
      // positionId = keccak256(collateralToken, conditionId, indexSet)
      // This matches CTHelpers.getTokenId logic used in the contracts.

      const getPositionId = (index: number) => {
        const indexSet = 1 << index;

        const positionId = ethers.solidityPackedKeccak256(
          ["address", "bytes32", "uint256"],
          [collateralToken, conditionId, indexSet]
        );

        return positionId;
      };

      const id0 = getPositionId(0); // indexSet = 1
      const id1 = getPositionId(1); // indexSet = 2

      console.log("Fetching positions for:", account);
      console.log("Condition ID:", conditionId);
      console.log("Position IDs:", id0, id1);

      const bal0 = await ctContract.balanceOf(account, BigInt(id0));
      const bal1 = await ctContract.balanceOf(account, BigInt(id1));

      console.log("Balances:", ethers.formatUnits(bal0, 6), ethers.formatUnits(bal1, 6));

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
    } catch (e) { console.error("Error checking balance:", e); }
  };

  const checkAllowance = async () => {
    if (!account || !market?.contract_address) return;
    try {
      const provider = new ethers.JsonRpcProvider(READ_RPC);
      const token = getContract(CONTRACTS.PlatformToken, ABIS.PlatformToken, provider);
      const allow = await token.allowance(account, CONTRACTS.OrderBook); // Check allowance for OrderBook!
      setAllowance(allow);
    } catch (e) { console.error("Error checking allowance:", e); }
  };

  const checkApprovalForAll = async () => {
    if (!account || !market?.contract_address) return;
    try {
      const provider = new ethers.JsonRpcProvider(READ_RPC);
      const marketContract = getContract(market.contract_address, ABIS.OpinionMarket, provider);
      const ctAddress = await marketContract.conditionalTokens();
      const ctContract = getContract(ctAddress, ABIS.ConditionalTokens, provider);
      const isApproved = await ctContract.isApprovedForAll(account, CONTRACTS.OrderBook); // Check approval for OrderBook!
      setIsApprovedForAll(isApproved);
    } catch (e) { console.error("Error checking approval:", e); }
  };

  const handleApprove = async () => {
    if (!account || !market?.contract_address) return;
    setApproving(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const token = getContract(CONTRACTS.PlatformToken, ABIS.PlatformToken, signer);
      const tx = await token.approve(CONTRACTS.OrderBook, ethers.MaxUint256); // Approve OrderBook
      await tx.wait();
      await checkAllowance();
    } catch (err) {
      console.error(err);
    } finally {
      setApproving(false);
    }
  };

  const handleApproveForAll = async () => {
    if (!account || !market?.contract_address) return;
    setApprovingForAll(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketContract = getContract(market.contract_address, ABIS.OpinionMarket, provider);
      const ctAddress = await marketContract.conditionalTokens();
      const ctContract = getContract(ctAddress, ABIS.ConditionalTokens, signer);
      const tx = await ctContract.setApprovalForAll(CONTRACTS.OrderBook, true); // Approve OrderBook
      await tx.wait();
      await checkApprovalForAll();
    } catch (err) {
      console.error(err);
    } finally {
      setApprovingForAll(false);
    }
  };

  const fetchOrders = async () => {
    if (!market?.contract_address) return;
    try {
      // Safety timeout to ensure loading state is cleared
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000));

      const fetchPromise = (async () => {
        const provider = new ethers.JsonRpcProvider(READ_RPC);
        const orderBook = new ethers.Contract(CONTRACTS.OrderBook, ABIS.OrderBook, provider);

        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 10000); // Reduced to 10k to stay within Base Sepolia limits

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
      })();

      await Promise.race([fetchPromise, timeoutPromise]);

    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchBalances = async () => {
    await checkBalance();
    await fetchPositions();
  };

  // Inside handleTrade:
  const handleTrade = async () => {
    if (!account || !market?.contract_address) return;
    setLoadingTrade(true);
    const toastId = toast.loading("Processing trade...");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const orderBook = getContract(CONTRACTS.OrderBook, ABIS.OrderBook, signer);
      const collateral = getContract(CONTRACTS.PlatformToken, ABIS.PlatformToken, signer);
      const conditionalTokens = getContract(CONTRACTS.ConditionalTokens, ABIS.ConditionalTokens, signer);

      const amountVal = parseFloat(amount);
      const amountWei = ethers.parseUnits(amount, 6);
      const outcomeIndex = selectedOutcome === 'yes' ? 0 : 1;

      if (orderType === 'limit') {
        // LIMIT ORDER
        const priceWei = ethers.parseUnits(limitPrice, 6);
        if (tradeType === 'buy') {
          // BID
          const cost = (amountWei * priceWei) / 1000000n;
          const allowance = await collateral.allowance(account, CONTRACTS.OrderBook);
          if (allowance < cost) {
            toast.loading("Approving USDC...", { id: toastId });
            await (await collateral.approve(CONTRACTS.OrderBook, cost)).wait();
          }
          toast.loading("Placing Buy Order...", { id: toastId });
          await (await orderBook.placeOrder(market.contract_address, outcomeIndex, priceWei, amountWei, true)).wait();
        } else {
          // ASK
          const isApproved = await conditionalTokens.isApprovedForAll(account, CONTRACTS.OrderBook);
          if (!isApproved) {
            toast.loading("Approving Shares...", { id: toastId });
            await (await conditionalTokens.setApprovalForAll(CONTRACTS.OrderBook, true)).wait();
          }
          toast.loading("Placing Sell Order...", { id: toastId });
          await (await orderBook.placeOrder(market.contract_address, outcomeIndex, priceWei, amountWei, false)).wait();
        }
        toast.success("Limit Order Placed!", { id: toastId });
      } else {
        // MARKET ORDER
        const ordersToFill: any[] = [];
        let remainingAmount = amountVal;
        const targetOrders = tradeType === 'buy' ? asks : bids;

        // Filter for correct outcome
        const relevantOrders = targetOrders.filter(o => o.outcomeIndex === outcomeIndex);

        for (const order of relevantOrders) {
          if (remainingAmount <= 0) break;
          const fillAmount = Math.min(remainingAmount, order.amount);
          ordersToFill.push({ id: order.id, amount: fillAmount });
          remainingAmount -= fillAmount;
        }

        if (ordersToFill.length === 0) {
          toast.error("No liquidity available", { id: toastId });
          setLoadingTrade(false);
          return;
        }

        if (remainingAmount > 0) {
          // We can't use window.confirm nicely with toast loading, so we'll just fail or proceed.
          // For better UX, we should probably check this before starting the toast/transaction.
          // But for now, let's just proceed with what we can fill or error.
          // Let's error to be safe.
          toast.error(`Not enough liquidity. Available: ${amountVal - remainingAmount}`, { id: toastId });
          setLoadingTrade(false);
          return;
        }

        const orderIds = ordersToFill.map(o => o.id);
        const amounts = ordersToFill.map(o => ethers.parseUnits(o.amount.toFixed(6), 6));

        // Approvals
        if (tradeType === 'buy') {
          // Buying Shares (Filling Asks) -> Need USDC
          let totalCost = 0n;
          for (let i = 0; i < ordersToFill.length; i++) {
            const order = relevantOrders.find(o => o.id === ordersToFill[i].id);
            const cost = (amounts[i] * ethers.parseUnits(order.price.toString(), 6)) / 1000000n;
            totalCost += cost;
          }

          const allowance = await collateral.allowance(account, CONTRACTS.OrderBook);
          if (allowance < totalCost) {
            toast.loading("Approving USDC...", { id: toastId });
            await (await collateral.approve(CONTRACTS.OrderBook, totalCost)).wait();
          }
        } else {
          // Selling Shares (Filling Bids) -> Need Shares
          const isApproved = await conditionalTokens.isApprovedForAll(account, CONTRACTS.OrderBook);
          if (!isApproved) {
            toast.loading("Approving Shares...", { id: toastId });
            await (await conditionalTokens.setApprovalForAll(CONTRACTS.OrderBook, true)).wait();
          }
        }

        console.log("Filling orders:", orderIds, amounts);
        toast.loading("Executing Trade...", { id: toastId });
        const tx = await orderBook.fillOrders(orderIds, amounts);
        await tx.wait();
        console.log("Market order executed");
        toast.success("Trade Successful!", { id: toastId });
      }

      setAmount('');
      // setShowSuccessPopup(true); // Removed popup
      fetchOrders();
      fetchBalances();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Trade failed", { id: toastId });
    } finally {
      setLoadingTrade(false);
    }
  };

  // Simple in-memory cache for order details to reduce RPC calls
  const orderCache = useRef<Map<bigint, { market: string; outcomeIndex: bigint; isBid: boolean }>>(new Map());

  const fetchTradeHistory = async () => {
    if (!market?.contract_address) return;
    try {
      // Use Public RPC for reliable event fetching
      const provider = new ethers.JsonRpcProvider(READ_RPC);
      const orderBook = new ethers.Contract(CONTRACTS.OrderBook, ABIS.OrderBook, provider);

      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // Reduced to 10k to stay within Base Sepolia limits
      const filter = orderBook.filters.OrderFilled();
      const events = await orderBook.queryFilter(filter, fromBlock);

      console.log("Found fill events:", events.length);

      const tradePromises = events.map(async (event, index) => {
        if ('args' in event) {
          try {
            // Removed artificial delay to improve performance
            // await new Promise(r => setTimeout(r, index * 250));

            const { orderId, taker, amount, cost } = event.args;

            // Check cache first
            let orderDetails = orderCache.current.get(orderId);

            if (!orderDetails) {
              // Fetch order details if not in cache
              try {
                const order = await orderBook.orders(orderId);
                orderDetails = {
                  market: order.market,
                  outcomeIndex: order.outcomeIndex,
                  isBid: order.isBid
                };
                orderCache.current.set(orderId, orderDetails);
              } catch (e) {
                console.warn(`Failed to fetch order ${orderId}:`, e);
                return null;
              }
            }

            if (orderDetails.market.toLowerCase() !== market.contract_address.toLowerCase()) {
              return null;
            }

            const block = await event.getBlock();
            const formattedAmount = parseFloat(ethers.formatUnits(amount, 6)); // Shares
            const formattedCost = parseFloat(ethers.formatUnits(cost, 6)); // USDC
            const price = formattedAmount > 0 ? formattedCost / formattedAmount : 0;

            console.log(`Trade: Amount=${formattedAmount}, Cost=${formattedCost}, Price=${price}`);

            const type = orderDetails.isBid ? 'Sell' : 'Buy';

            let yesPrice = Number(orderDetails.outcomeIndex) === 0 ? price : 1 - price;
            if (yesPrice < 0) yesPrice = 0;
            if (yesPrice > 1) yesPrice = 1;

            if (isNaN(yesPrice)) {
              console.error("NaN Price detected!", { formattedAmount, formattedCost, price, orderDetails });
              yesPrice = 0.5; // Fallback
            }

            return {
              trade: {
                user: taker,
                outcomeIndex: Number(orderDetails.outcomeIndex),
                amountIn: formattedCost.toFixed(2), // USDC volume
                amountOut: formattedAmount.toFixed(2), // Shares volume
                timestamp: block.timestamp * 1000,
                type,
                price,
                txHash: event.transactionHash
              },
              chartPoint: {
                date: new Date(block.timestamp * 1000).toLocaleTimeString(), // Changed time to date to match XAxis dataKey
                timestamp: block.timestamp * 1000,
                YES: yesPrice * 100,
                NO: (1 - yesPrice) * 100
              }
            };
          } catch (e) {
            console.error("Error parsing trade event:", e);
            return null;
          }
        }
        return null;
      });

      const results = (await Promise.all(tradePromises)).filter(r => r !== null);

      // Sort by timestamp descending
      results.sort((a, b) => b!.trade.timestamp - a!.trade.timestamp);

      setRecentTrades(results.map(r => r!.trade));

      // Chart data: sort ascending
      const chartPoints = results.map(r => r!.chartPoint).sort((a, b) => a.timestamp - b.timestamp);

      // Add initial point if market creation time is available
      if (market?.created_at && chartPoints.length > 0) {
        const startTime = new Date(market.created_at).getTime();
        // Only add if the first trade is significantly after creation
        if (chartPoints[0].timestamp > startTime + 60000) {
          chartPoints.unshift({
            date: new Date(market.created_at).toLocaleTimeString(),
            timestamp: startTime,
            YES: 50,
            NO: 50
          });
        }
      } else if (market?.created_at && chartPoints.length === 0) {
        // If no trades, show flat line at 0.5
        const startTime = new Date(market.created_at).getTime();
        chartPoints.push({
          date: new Date(market.created_at).toLocaleTimeString(),
          timestamp: startTime,
          YES: 50,
          NO: 50
        });
        chartPoints.push({
          date: new Date().toLocaleTimeString(),
          timestamp: Date.now(),
          YES: 50,
          NO: 50
        });
      }

      setChartData(chartPoints);

      // Update Prices based on Last Traded Price if available
      if (results.length > 0) {
        const lastTrade = results[0]!.trade; // Results are sorted desc by timestamp
        const latestYesPrice = results[0]!.chartPoint.YES / 100; // Get back 0-1 from 0-100

        if (!isNaN(latestYesPrice)) {
          setPrices([(latestYesPrice * 100).toFixed(0), ((1 - latestYesPrice) * 100).toFixed(0)]);
        }
      } else {
      }

      // Calculate volume from events to ensure consistency
      const totalVolume = results.reduce((acc, r) => acc + parseFloat(r!.trade.amountIn), 0);
      if (totalVolume > 0) {
        setMarket(prev => prev ? { ...prev, volume: totalVolume.toFixed(2) } : null);
      }
    } catch (err) { console.error(err); }
  };

  if (loadingMarket) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
  if (!market) return <div className="text-center py-20">Market not found</div>;

  const yesPrice = prices[0] === "-" ? 50 : Math.min(100, Math.round(parseFloat(prices[0])));
  const noPrice = prices[1] === "-" ? 50 : Math.min(100, Math.round(parseFloat(prices[1])));
  const currentPrice = selectedOutcome === 'yes' ? yesPrice : noPrice;

  const calculateWinAmount = () => {
    if (!amount) return '$0';
    const numAmount = parseFloat(amount);
    const price = currentPrice / 100;
    if (price === 0) return '$0';
    const shares = numAmount / price;
    return `$${shares.toFixed(2)}`;
  };

  const needsApproval = tradeType === 'buy' && allowance < ethers.parseUnits(amount || "0", 6);
  const needsApprovalForAll = tradeType === 'sell' && !isApprovedForAll;

  const handleResolve = async () => {
    if (!account || !market?.contract_address) return;
    const toastId = toast.loading("Resolving market...");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketContract = getContract(market.contract_address, ABIS.OpinionMarket, signer);

      const tx = await marketContract.resolveMarket();
      await tx.wait();

      toast.success("Market Resolved!", { id: toastId });
      fetchMarket();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Resolution failed", { id: toastId });
    }
  };

  const handleClaim = async () => {
    if (!account || !market?.contract_address) return;
    const toastId = toast.loading("Claiming winnings...");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketContract = getContract(market.contract_address, ABIS.OpinionMarket, signer);

      // Get market state info
      const [collateralToken, ctAddress, conditionId] = await Promise.all([
        marketContract.collateralToken(),
        marketContract.conditionalTokens(),
        marketContract.conditionId()
      ]);

      const ctContract = getContract(ctAddress, ABIS.ConditionalTokens, signer);

      // For resolved markets, we need to call redeemPositions on ConditionalTokens
      // indexSets: [1] for YES (outcome 0), [2] for NO (outcome 1)
      // We try to redeem both positions - the contract will handle if one has zero balance
      const indexSets = [1, 2]; // Try both YES and NO

      toast.loading("Redeeming positions...", { id: toastId });
      const tx = await ctContract.redeemPositions(
        collateralToken,
        ethers.ZeroHash, // parentCollectionId = 0 (root)
        conditionId,
        indexSets
      );
      await tx.wait();

      toast.success("Winnings Claimed!", { id: toastId });
      fetchBalances();
      fetchPositions();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Claim failed", { id: toastId });
    }
  };

  const isMarketExpired = market?.deadline && new Date(market.deadline).getTime() < Date.now();
  const canResolve = !market?.resolved && isMarketExpired;
  const canClaim = market?.resolved && (parseFloat(positions[0]) > 0 || parseFloat(positions[1]) > 0);

  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="bg-muted/20 min-h-screen">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
          {/* Go Back */}
          <button
            onClick={() => navigate('/markets')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 md:mb-6 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Main Content - Left Side */}
            <div className="lg:col-span-2">
              <div className="bg-background rounded-xl border border-foreground/10 p-4 md:p-6">
                {/* Title and Meta */}
                <div className="mb-4 md:mb-6">
                  <div className="flex justify-between items-start mb-3">
                    <h1 className="text-xl md:text-2xl leading-tight" style={{ fontWeight: 500 }}>
                      {market.question}
                    </h1>
                    <div className="flex gap-2">
                      {/* Resolve button moved to Admin Panel */}
                      {canClaim && (
                        <button
                          onClick={handleClaim}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Claim Winnings
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {!market.resolved && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-700 text-xs border border-green-600/20">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                        Active
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 text-foreground text-xs border border-foreground/10">
                      {market.category || "General"}
                    </span>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6 pb-4 md:pb-6 border-b border-foreground/10">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Total Volume</div>
                    <div style={{ fontWeight: 600 }}>${market.volume}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Ends In</div>
                    <div style={{ fontWeight: 600 }}>{market.deadline ? new Date(market.deadline).toLocaleDateString() : "N/A"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Winning Odds</div>
                    <div className="text-green-600" style={{ fontWeight: 600 }}>YES: {yesPrice}%</div>
                    {yesPrice >= 99 && <div className="text-[10px] text-red-500">Low Liquidity</div>}
                  </div>
                </div>

                {/* Chart */}
                <div className="h-64 md:h-80 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData.length > 0 ? chartData : [
                      { date: 'Created', YES: 50, NO: 50 },
                      { date: 'Now', YES: yesPrice, NO: noPrice }
                    ]}>
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
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--foreground) / 0.1)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        formatter={(value: number) => `${value}%`}
                      />
                      <Line
                        type="linear"
                        dataKey="YES"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        dot={false}
                        connectNulls
                        activeDot={{ r: 4, fill: '#3b82f6' }}
                      />
                      <Line
                        type="linear"
                        dataKey="NO"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={false}
                        connectNulls
                        activeDot={{ r: 4, fill: '#10b981' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-600/20">
                    <span className="text-xs text-blue-700" style={{ fontWeight: 600 }}>YES: {yesPrice}%</span>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-600/20">
                    <span className="text-xs text-green-700" style={{ fontWeight: 600 }}>NO: {noPrice}%</span>
                  </div>
                </div>

                {/* Resolution Rules - Collapsible */}
                <div className="border-t border-foreground/10 pt-6">
                  <button
                    onClick={() => setShowResolution(!showResolution)}
                    className="flex items-center justify-between w-full text-left mb-3"
                  >
                    <span style={{ fontWeight: 600 }}>Resolution Rules</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showResolution ? 'rotate-180' : ''}`} />
                  </button>
                  {showResolution && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {market.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Sidebar - Trading Panel */}
            <div className="lg:col-span-1">
              <div className="bg-background rounded-xl border border-foreground/10 p-4 md:p-5 lg:sticky lg:top-6 space-y-6 relative">

                {(isMarketExpired || market.resolved) && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl border border-foreground/10">
                    <div className="text-center p-6">
                      <h3 className="text-xl font-bold mb-2">Market Ended</h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        {market.resolved ? "This market has been resolved." : "Trading is closed. Waiting for resolution."}
                      </p>
                      {canClaim && (
                        <button
                          onClick={handleClaim}
                          className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Claim Winnings
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Order Book */}
                {market?.contract_address && (
                  <OrderBook
                    marketAddress={market.contract_address}
                    marketId={market.id}
                    account={account}
                    bids={bids}
                    asks={asks}
                    loading={loadingOrders}
                    onRefresh={() => {
                      fetchOrders();
                      fetchBalances();
                    }}
                  />
                )}

              </div>
            </div>
          </div>

          {/* User Activity Section */}
          <div className="mt-4 md:mt-6 bg-background rounded-xl border border-foreground/10 overflow-hidden lg:w-[calc(66.666%-0.75rem)]">
            {/* Tabs - Scrollable on mobile */}
            <div className="flex items-center gap-0 border-b border-foreground/10 bg-muted/30 overflow-x-auto scrollbar-hide">
              {['Position', 'Transactions'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase())}
                  className={`flex-shrink-0 px-4 md:px-6 py-3 md:py-3.5 text-xs md:text-sm transition-all relative ${activeTab === tab.toLowerCase()
                    ? 'bg-background text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    }`}
                  style={{ fontWeight: activeTab === tab.toLowerCase() ? 600 : 500 }}
                >
                  {tab}
                  {activeTab === tab.toLowerCase() && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground"></div>
                  )}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto -mx-px">
              {/* Position Tab */}
              {activeTab === 'position' && (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-foreground/10 bg-muted/20">
                      <th className="px-3 md:px-6 py-2 md:py-3 text-left text-[10px] md:text-xs text-muted-foreground whitespace-nowrap" style={{ fontWeight: 500 }}>
                        Outcome
                      </th>
                      <th className="px-3 md:px-6 py-2 md:py-3 text-left text-[10px] md:text-xs text-muted-foreground whitespace-nowrap" style={{ fontWeight: 500 }}>
                        Shares
                      </th>
                      <th className="px-3 md:px-6 py-2 md:py-3 text-left text-[10px] md:text-xs text-muted-foreground whitespace-nowrap" style={{ fontWeight: 500 }}>
                        Current Price
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-foreground/10 hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-700 text-xs border border-green-600/20" style={{ fontWeight: 600 }}>
                          YES
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ fontWeight: 500 }}>{positions[0]}</td>
                      <td className="px-6 py-4 text-sm" style={{ fontWeight: 500 }}>{yesPrice}¢</td>
                    </tr>
                    <tr className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-700 text-xs border border-red-600/20" style={{ fontWeight: 600 }}>
                          NO
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ fontWeight: 500 }}>{positions[1]}</td>
                      <td className="px-6 py-4 text-sm" style={{ fontWeight: 500 }}>{noPrice}¢</td>
                    </tr>
                  </tbody>
                </table>
              )}

              {/* Transactions Tab */}
              {activeTab === 'transactions' && (
                <>
                  {/* Filter Tabs */}
                  <div className="flex gap-1 p-2 border-b border-foreground/10 bg-muted/10">
                    {(['all', 'yes', 'no', 'buy', 'sell'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setTxFilter(filter)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${txFilter === filter
                          ? filter === 'yes' ? 'bg-green-600 text-white'
                            : filter === 'no' ? 'bg-red-600 text-white'
                              : filter === 'buy' ? 'bg-green-500/20 text-green-700 border border-green-600/30'
                                : filter === 'sell' ? 'bg-red-500/20 text-red-700 border border-red-600/30'
                                  : 'bg-foreground text-background'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                          }`}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </button>
                    ))}
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-foreground/10 bg-muted/20">
                        <th className="px-6 py-3 text-left text-xs text-muted-foreground" style={{ fontWeight: 500 }}>
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs text-muted-foreground" style={{ fontWeight: 500 }}>
                          Outcome
                        </th>
                        <th className="px-6 py-3 text-left text-xs text-muted-foreground" style={{ fontWeight: 500 }}>
                          Amount In
                        </th>
                        <th className="px-6 py-3 text-left text-xs text-muted-foreground" style={{ fontWeight: 500 }}>
                          Amount Out
                        </th>
                        <th className="px-6 py-3 text-left text-xs text-muted-foreground" style={{ fontWeight: 500 }}>
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTrades
                        .filter((trade: TradeEvent) => {
                          if (txFilter === 'all') return true;
                          if (txFilter === 'yes') return trade.outcomeIndex === 0;
                          if (txFilter === 'no') return trade.outcomeIndex === 1;
                          if (txFilter === 'buy') return trade.type === 'Buy';
                          if (txFilter === 'sell') return trade.type === 'Sell';
                          return true;
                        })
                        .map((trade: TradeEvent, i: number) => (
                          <tr key={i} className="border-b border-foreground/10 hover:bg-muted/10 transition-colors">
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${trade.type === 'Buy' ? 'bg-green-500/10 text-green-700' : 'bg-red-500/10 text-red-700'}`}>
                                {trade.type.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${trade.outcomeIndex === 0 ? 'bg-green-500/10 text-green-700 border-green-600/20' : 'bg-red-500/10 text-red-700 border-red-600/20'}`} style={{ fontWeight: 600 }}>
                                {trade.outcomeIndex === 0 ? 'YES' : 'NO'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm" style={{ fontWeight: 500 }}>${trade.amountIn}</td>
                            <td className="px-6 py-4 text-sm" style={{ fontWeight: 500 }}>{trade.amountOut}</td>
                            <td className="px-6 py-4 text-xs text-muted-foreground">{new Date(trade.timestamp).toLocaleString()}</td>
                          </tr>
                        ))}
                      {recentTrades.filter((trade: TradeEvent) => {
                        if (txFilter === 'all') return true;
                        if (txFilter === 'yes') return trade.outcomeIndex === 0;
                        if (txFilter === 'no') return trade.outcomeIndex === 1;
                        if (txFilter === 'buy') return trade.type === 'Buy';
                        if (txFilter === 'sell') return trade.type === 'Sell';
                        return true;
                      }).length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground text-sm">No transactions found</td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>
      </div >


      {/* Success Popup */}
      {
        showSuccessPopup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-xl border border-foreground/10 p-8 max-w-md w-full shadow-xl">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl mb-2" style={{ fontWeight: 700 }}>{tradeType === 'buy' ? 'Purchase Successful!' : 'Sale Successful!'}</h2>
                <p className="text-muted-foreground mb-6">
                  Your transaction has been confirmed. Your position has been updated.
                </p>
                <button
                  onClick={() => setShowSuccessPopup(false)}
                  className="w-full py-3 bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity"
                  style={{ fontWeight: 600 }}
                >
                  Continue Trading
                </button>
              </div>
            </div>
          </div>
        )
      }

      <Footer />
    </>
  );
}
