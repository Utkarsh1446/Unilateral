import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContract, ABIS, CONTRACTS } from '../lib/contracts';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
    id: number;
    maker: string;
    price: number;
    amount: number;
    isBid: boolean;
    outcomeIndex: number;
}

interface OrderBookProps {
    marketAddress: string;
    marketId?: string;
    account: string | null;
    bids: Order[];
    asks: Order[];
    loading: boolean;
    onRefresh: () => void;
}

// Helper to update position in backend
const updatePositionBackend = async (
    marketId: string | undefined,
    marketAddress: string,
    userAddress: string,
    outcomeIndex: number,
    amountChange: number,
    price: number
) => {
    if (!marketId) {
        console.log("No marketId, skipping position update");
        return;
    }
    try {
        await fetch(`http://localhost:3001/markets/${marketId}/position`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userAddress, outcomeIndex, amountChange, price })
        });
        console.log("Position updated:", { outcomeIndex, amountChange, price });
    } catch (e) {
        console.warn("Failed to update position:", e);
    }
};

export function OrderBook({ marketAddress, marketId, account, bids, asks, loading, onRefresh }: OrderBookProps) {
    // Form state
    const [side, setSide] = useState<'buy' | 'sell'>('buy');
    const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
    const [outcome, setOutcome] = useState<0 | 1>(0); // 0 = YES, 1 = NO
    const [limitPrice, setLimitPrice] = useState('0.50');
    const [amount, setAmount] = useState('');
    const [placingOrder, setPlacingOrder] = useState(false);
    const [orderBookTab, setOrderBookTab] = useState<'yes' | 'no'>('yes');

    // Filter orders by outcome
    const yesBids = bids.filter(o => o.outcomeIndex === 0);
    const yesAsks = asks.filter(o => o.outcomeIndex === 0);
    const noBids = bids.filter(o => o.outcomeIndex === 1);
    const noAsks = asks.filter(o => o.outcomeIndex === 1);

    // Calculate prices for UI
    const bestAskYes = yesAsks.length > 0 ? yesAsks[0].price : 0.5;
    const bestAskNo = noAsks.length > 0 ? noAsks[0].price : 0.5;
    const bestBidYes = yesBids.length > 0 ? yesBids[0].price : 0.5;
    const bestBidNo = noBids.length > 0 ? noBids[0].price : 0.5;

    const calculatePotentialReturn = () => {
        const currentAmount = parseFloat(amount || '0');
        if (currentAmount === 0) return '0.00';

        let price = 0;
        if (orderType === 'market') {
            price = outcome === 0 ? bestAskYes : bestAskNo;
        } else {
            price = parseFloat(limitPrice || '0');
        }

        if (price === 0) return '0.00';

        if (side === 'buy') {
            return (currentAmount / price).toFixed(2);
        } else {
            return (currentAmount * price).toFixed(2);
        }
    };

    const handlePlaceOrder = async () => {
        if (!account) {
            toast.error("Please connect wallet");
            return;
        }
        if (placingOrder) {
            console.log("Order already in progress, skipping duplicate call");
            return;
        }
        setPlacingOrder(true);
        const toastId = toast.loading("Processing order...");

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const orderBook = getContract(CONTRACTS.OrderBook, ABIS.OrderBook, signer);
            const collateral = getContract(CONTRACTS.PlatformToken, ABIS.PlatformToken, signer);
            const conditionalTokens = getContract(CONTRACTS.ConditionalTokens, ABIS.ConditionalTokens, signer);

            const amountVal = parseFloat(amount);
            const amountWei = ethers.parseUnits(amount, 6);
            const outcomeIndex = outcome;

            if (orderType === 'limit') {
                const priceWei = ethers.parseUnits(limitPrice, 6);

                if (side === 'buy') {
                    const cost = (amountWei * priceWei) / 1000000n;
                    console.log("Order cost:", ethers.formatUnits(cost, 6), "USDC");

                    const balance = await collateral.balanceOf(account);
                    console.log("User balance:", ethers.formatUnits(balance, 6), "USDC");
                    if (balance < cost) {
                        throw new Error(`Insufficient USDC balance. Have: ${ethers.formatUnits(balance, 6)}, Need: ${ethers.formatUnits(cost, 6)}`);
                    }

                    let allowance = await collateral.allowance(account, CONTRACTS.OrderBook);
                    console.log("Current allowance:", ethers.formatUnits(allowance, 6), "USDC");
                    if (allowance < cost) {
                        toast.loading("Approving USDC...", { id: toastId });
                        const approveTx = await collateral.approve(CONTRACTS.OrderBook, ethers.MaxUint256);
                        console.log("Approval tx hash:", approveTx.hash);
                        await approveTx.wait();
                        console.log("Approval confirmed");

                        allowance = await collateral.allowance(account, CONTRACTS.OrderBook);
                        console.log("New allowance:", ethers.formatUnits(allowance, 6), "USDC");
                        if (allowance < cost) {
                            throw new Error(`Approval failed. Allowance: ${ethers.formatUnits(allowance, 6)}`);
                        }
                    }

                    toast.loading("Placing Buy Order...", { id: toastId });
                    const orderTx = await orderBook.placeOrder(marketAddress, outcomeIndex, priceWei, amountWei, true);
                    console.log("Order tx hash:", orderTx.hash);
                    const receipt = await orderTx.wait();
                    console.log("Order confirmed in block:", receipt.blockNumber);

                    const tradeVolume = Number(ethers.formatUnits(cost, 6));
                    try {
                        await fetch('http://localhost:3001/markets/volume/update', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ contractAddress: marketAddress, tradeVolume })
                        });
                        console.log("Volume updated:", tradeVolume, "USDC");
                    } catch (e) {
                        console.warn("Failed to update volume:", e);
                    }

                    // Update position in backend
                    await updatePositionBackend(marketId, marketAddress, account, outcomeIndex, amountVal, parseFloat(limitPrice));

                    toast.success("Order Placed Successfully!", { id: toastId });
                } else {
                    const isApproved = await conditionalTokens.isApprovedForAll(account, CONTRACTS.OrderBook);
                    if (!isApproved) {
                        toast.loading("Approving Shares...", { id: toastId });
                        await (await conditionalTokens.setApprovalForAll(CONTRACTS.OrderBook, true)).wait();
                    }

                    toast.loading("Placing Sell Order...", { id: toastId });
                    const orderTx = await orderBook.placeOrder(marketAddress, outcomeIndex, priceWei, amountWei, false);
                    console.log("Order tx hash:", orderTx.hash);
                    const receipt = await orderTx.wait();
                    console.log("Order confirmed in block:", receipt.blockNumber);

                    const sellValue = Number(ethers.formatUnits((amountWei * priceWei) / 1000000n, 6));
                    try {
                        await fetch('http://localhost:3001/markets/volume/update', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ contractAddress: marketAddress, tradeVolume: sellValue })
                        });
                        console.log("Volume updated:", sellValue, "USDC");
                    } catch (e) {
                        console.warn("Failed to update volume:", e);
                    }

                    // Update position in backend (negative for sells)
                    await updatePositionBackend(marketId, marketAddress, account, outcomeIndex, -amountVal, parseFloat(limitPrice));

                    toast.success("Order Placed Successfully!", { id: toastId });
                }
            } else {
                // Market order - fill from existing orders
                const targetOrders = side === 'buy'
                    ? asks.filter(o => o.outcomeIndex === outcome)  // Buy from asks
                    : bids.filter(o => o.outcomeIndex === outcome); // Sell to bids

                if (targetOrders.length === 0) {
                    toast.error("No orders available to fill", { id: toastId });
                    setPlacingOrder(false);
                    return;
                }

                // Sort by best price (lowest for buys, highest for sells)
                const sortedOrders = [...targetOrders].sort((a, b) =>
                    side === 'buy' ? a.price - b.price : b.price - a.price
                );

                // Calculate how many orders to fill
                let remainingAmount = amountVal;
                const orderIds: number[] = [];
                const amounts: bigint[] = [];
                let totalCost = 0;

                for (const order of sortedOrders) {
                    if (remainingAmount <= 0) break;
                    const fillAmount = Math.min(remainingAmount, order.amount);
                    orderIds.push(order.id);
                    amounts.push(ethers.parseUnits(fillAmount.toString(), 6));
                    totalCost += fillAmount * order.price;
                    remainingAmount -= fillAmount;
                }

                if (orderIds.length === 0) {
                    toast.error("No orders available", { id: toastId });
                    setPlacingOrder(false);
                    return;
                }

                if (side === 'buy') {
                    // Check balance and approve
                    const costWei = ethers.parseUnits(totalCost.toFixed(6), 6);
                    const balance = await collateral.balanceOf(account);
                    if (balance < costWei) {
                        throw new Error(`Insufficient USDC. Have: ${ethers.formatUnits(balance, 6)}, Need: ${totalCost.toFixed(2)}`);
                    }

                    let allowance = await collateral.allowance(account, CONTRACTS.OrderBook);
                    if (allowance < costWei) {
                        toast.loading("Approving USDC...", { id: toastId });
                        await (await collateral.approve(CONTRACTS.OrderBook, ethers.MaxUint256)).wait();
                    }

                    toast.loading("Executing Market Buy...", { id: toastId });
                    const tx = await orderBook.fillOrders(orderIds, amounts);
                    await tx.wait();

                    // Update volume
                    try {
                        await fetch('http://localhost:3001/markets/volume/update', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ contractAddress: marketAddress, tradeVolume: totalCost })
                        });
                    } catch (e) {
                        console.warn("Failed to update volume:", e);
                    }

                    // Update position for market buy
                    const avgPrice = totalCost / (amountVal - remainingAmount);
                    await updatePositionBackend(marketId, marketAddress, account, outcome, amountVal - remainingAmount, avgPrice);
                } else {
                    // Approve shares for sell
                    const isApproved = await conditionalTokens.isApprovedForAll(account, CONTRACTS.OrderBook);
                    if (!isApproved) {
                        toast.loading("Approving Shares...", { id: toastId });
                        await (await conditionalTokens.setApprovalForAll(CONTRACTS.OrderBook, true)).wait();
                    }

                    toast.loading("Executing Market Sell...", { id: toastId });
                    const tx = await orderBook.fillOrders(orderIds, amounts);
                    await tx.wait();

                    // Update volume
                    try {
                        await fetch('http://localhost:3001/markets/volume/update', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ contractAddress: marketAddress, tradeVolume: totalCost })
                        });
                    } catch (e) {
                        console.warn("Failed to update volume:", e);
                    }

                    // Update position for market sell (negative)
                    const avgPrice = totalCost / (amountVal - remainingAmount);
                    await updatePositionBackend(marketId, marketAddress, account, outcome, -(amountVal - remainingAmount), avgPrice);
                }

                toast.success(`Market Order Filled! ${(amountVal - remainingAmount).toFixed(2)} shares @ avg ${(totalCost / (amountVal - remainingAmount)).toFixed(2)}`, { id: toastId });
            }

            setAmount('');
            onRefresh();
        } catch (err: any) {
            console.error("Order error:", err);
            if (err.message?.includes("user rejected") || err.code === "ACTION_REJECTED") {
                toast.error("Transaction rejected by user", { id: toastId });
            } else {
                toast.error(err.shortMessage || err.message || "Order failed", { id: toastId });
            }
        } finally {
            setPlacingOrder(false);
        }
    };

    const currentBids = orderBookTab === 'yes' ? yesBids : noBids;
    const currentAsks = orderBookTab === 'yes' ? yesAsks : noAsks;

    return (
        <div className="bg-background rounded-xl border border-foreground/10 p-4 w-full">
            {/* Trade Form Header */}
            <h3 className="text-sm font-semibold text-foreground mb-4">Trade</h3>

            {/* Buy/Sell Toggle */}
            <div className="flex mb-4 bg-muted/30 rounded-lg p-1">
                <button
                    onClick={() => setSide('buy')}
                    className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all ${side === 'buy'
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Buy
                </button>
                <button
                    onClick={() => setSide('sell')}
                    className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all ${side === 'sell'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Sell
                </button>
            </div>

            {/* Outcome Selection */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setOutcome(0)}
                    className={`flex-1 py-3 px-3 rounded-lg font-medium text-sm flex justify-between items-center transition-all border ${outcome === 0
                        ? 'bg-green-500/10 border-green-500 text-green-700'
                        : 'bg-muted/30 border-foreground/10 text-muted-foreground hover:border-foreground/20'
                        }`}
                >
                    <span className="font-semibold">YES</span>
                    <span className="text-xs">{(bestAskYes * 100).toFixed(0)}¢</span>
                </button>
                <button
                    onClick={() => setOutcome(1)}
                    className={`flex-1 py-3 px-3 rounded-lg font-medium text-sm flex justify-between items-center transition-all border ${outcome === 1
                        ? 'bg-red-500/10 border-red-500 text-red-700'
                        : 'bg-muted/30 border-foreground/10 text-muted-foreground hover:border-foreground/20'
                        }`}
                >
                    <span className="font-semibold">NO</span>
                    <span className="text-xs">{(bestAskNo * 100).toFixed(0)}¢</span>
                </button>
            </div>

            {/* Order Type Toggle */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setOrderType('limit')}
                    className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${orderType === 'limit'
                        ? 'bg-foreground text-background'
                        : 'bg-muted/30 text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Limit
                </button>
                <button
                    onClick={() => setOrderType('market')}
                    className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${orderType === 'market'
                        ? 'bg-foreground text-background'
                        : 'bg-muted/30 text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Market
                </button>
            </div>

            {/* Order Inputs */}
            <div className="space-y-4">
                {orderType === 'limit' && (
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2">Limit Price</label>
                        <div className="flex items-center border border-foreground/10 rounded-lg p-1 bg-muted/20">
                            <button
                                onClick={() => {
                                    const current = parseFloat(limitPrice) || 0.5;
                                    setLimitPrice(Math.max(0.01, current - 0.01).toFixed(2));
                                }}
                                className="p-2 hover:bg-muted/50 rounded-md text-muted-foreground"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            <div className="flex-1 text-center font-semibold text-foreground">
                                {((parseFloat(limitPrice) || 0) * 100).toFixed(0)}¢
                            </div>
                            <button
                                onClick={() => {
                                    const current = parseFloat(limitPrice) || 0.5;
                                    setLimitPrice(Math.min(0.99, current + 0.01).toFixed(2));
                                }}
                                className="p-2 hover:bg-muted/50 rounded-md text-muted-foreground"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                        {orderType === 'market' ? 'Amount (USDC)' : 'Shares'}
                    </label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full border border-foreground/10 rounded-lg py-3 px-4 text-right font-medium bg-muted/20 text-foreground focus:ring-2 focus:ring-foreground/20 focus:border-foreground/30 outline-none"
                        placeholder="0"
                    />
                    <div className="flex gap-1 mt-2 justify-end">
                        {[10, 50, 100, 500].map(val => (
                            <button
                                key={val}
                                onClick={() => setAmount(val.toString())}
                                className="px-2 py-1 rounded border border-foreground/10 text-[10px] font-medium text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                            >
                                {val}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Summary */}
                <div className="pt-4 border-t border-foreground/10">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Potential Return</span>
                        <span className={`text-lg font-semibold ${side === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                            ${calculatePotentialReturn()}
                        </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Price: {orderType === 'market' ? (outcome === 0 ? bestAskYes : bestAskNo) * 100 : (parseFloat(limitPrice) || 0) * 100}¢</span>
                        <span>Cost: ${orderType === 'market' ? amount : ((parseFloat(amount) || 0) * (parseFloat(limitPrice) || 0)).toFixed(2)}</span>
                    </div>
                </div>

                {/* Trade Button */}
                <button
                    onClick={handlePlaceOrder}
                    disabled={placingOrder || !amount || parseFloat(amount) <= 0}
                    className={`w-full py-3 rounded-xl text-white font-semibold text-sm shadow-lg transition-all ${placingOrder || !amount || parseFloat(amount) <= 0
                        ? 'bg-muted cursor-not-allowed text-muted-foreground'
                        : side === 'buy'
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                >
                    {placingOrder ? (
                        <div className="flex items-center justify-center gap-2">
                            <Loader2 className="animate-spin w-4 h-4" />
                            <span>Processing...</span>
                        </div>
                    ) : (
                        `${side === 'buy' ? 'Buy' : 'Sell'} ${outcome === 0 ? 'YES' : 'NO'}`
                    )}
                </button>
            </div>

            {/* Order Book Section */}
            <div className="mt-6 pt-6 border-t border-foreground/10">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-foreground">Order Book</h4>
                    {/* YES/NO Tabs */}
                    <div className="flex bg-muted/30 rounded-lg p-0.5">
                        <button
                            onClick={() => setOrderBookTab('yes')}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${orderBookTab === 'yes'
                                ? 'bg-green-600 text-white'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            YES
                        </button>
                        <button
                            onClick={() => setOrderBookTab('no')}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${orderBookTab === 'no'
                                ? 'bg-red-600 text-white'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            NO
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="animate-spin w-5 h-5 text-muted-foreground" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {/* Bids (Buy Orders) */}
                        <div>
                            <div className="text-[10px] font-medium text-muted-foreground mb-2 flex justify-between px-1">
                                <span>Qty</span>
                                <span>Bid</span>
                            </div>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {currentBids.length === 0 ? (
                                    <div className="text-[10px] text-muted-foreground text-center py-3 bg-muted/20 rounded">No bids</div>
                                ) : (
                                    currentBids.slice(0, 5).map((order) => (
                                        <div key={order.id} className="flex justify-between text-xs py-1.5 px-2 rounded bg-green-500/10 text-green-700">
                                            <span>{order.amount.toFixed(0)}</span>
                                            <span className="font-mono font-medium">{(order.price * 100).toFixed(1)}¢</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Asks (Sell Orders) */}
                        <div>
                            <div className="text-[10px] font-medium text-muted-foreground mb-2 flex justify-between px-1">
                                <span>Ask</span>
                                <span>Qty</span>
                            </div>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {currentAsks.length === 0 ? (
                                    <div className="text-[10px] text-muted-foreground text-center py-3 bg-muted/20 rounded">No asks</div>
                                ) : (
                                    currentAsks.slice(0, 5).map((order) => (
                                        <div key={order.id} className="flex justify-between text-xs py-1.5 px-2 rounded bg-red-500/10 text-red-700">
                                            <span className="font-mono font-medium">{(order.price * 100).toFixed(1)}¢</span>
                                            <span>{order.amount.toFixed(0)}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Helper icons
function Plus(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
    )
}

function Minus(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /></svg>
    )
}
