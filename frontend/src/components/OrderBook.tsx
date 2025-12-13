import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContract, ABIS, CONTRACTS } from '../lib/contracts';
import { Loader2, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3001";

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
        await fetch(`${API_URL}/markets/${marketId}/position`, {
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
    const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
    const [outcome, setOutcome] = useState<0 | 1>(0); // 0 for YES, 1 for NO
    const [amount, setAmount] = useState('');
    const [limitPrice, setLimitPrice] = useState('');
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

    const potentialReturn = calculatePotentialReturn();

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
                        await fetch(`${API_URL}/markets/volume/update`, {
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
                        await fetch(`${API_URL}/markets/volume/update`, {
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
                        await fetch(`${API_URL}/markets/volume/update`, {
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
                        await fetch(`${API_URL}/markets/volume/update`, {
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
        <div className="w-full">
            {/* Buy/Sell Tabs (Segmented Control) */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
                <button
                    onClick={() => setSide('buy')}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${side === 'buy'
                        ? 'bg-green-100 text-green-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Buy
                </button>
                <button
                    onClick={() => setSide('sell')}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${side === 'sell'
                        ? 'bg-red-100 text-red-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Sell
                </button>
            </div>

            {/* Outcome Selection */}
            <div className="flex gap-2 mb-3">
                <button
                    onClick={() => setOutcome(0)}
                    className={`flex-1 py-2 px-2 rounded-lg font-medium text-sm flex justify-between items-center transition-all border ${outcome === 0
                        ? 'bg-green-50 border-green-200 text-green-700 ring-1 ring-green-200'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                >
                    <span className="font-semibold">YES</span>
                    <span className="text-xs">{(bestAskYes * 100).toFixed(0)}¢</span>
                </button>
                <button
                    onClick={() => setOutcome(1)}
                    className={`flex-1 py-2 px-2 rounded-lg font-medium text-sm flex justify-between items-center transition-all border ${outcome === 1
                        ? 'bg-red-50 border-red-200 text-red-700 ring-1 ring-red-200'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                >
                    <span className="font-semibold">NO</span>
                    <span className="text-xs">{(bestAskNo * 100).toFixed(0)}¢</span>
                </button>
            </div>

            {/* Order Type Toggle */}
            <div className="flex gap-2 mb-3">
                <button
                    onClick={() => setOrderType('limit')}
                    className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${orderType === 'limit'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-gray-100 text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Limit
                </button>
                <button
                    onClick={() => setOrderType('market')}
                    className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${orderType === 'market'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-gray-100 text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Market
                </button>
            </div>

            {/* Order Inputs */}
            <div className="space-y-4">
                {orderType === 'limit' && (
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Limit Price</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={limitPrice}
                                onChange={(e) => setLimitPrice(e.target.value)}
                                className="block w-full rounded-lg border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-blue-500 p-3 text-lg font-medium text-left pr-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0.50"
                                step="0.01"
                                min="0"
                                max="1"
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 text-sm">USDC</span>
                            </div>
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                        {orderType === 'market' ? 'Amount' : 'Shares'}
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="block w-full rounded-lg border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-blue-500 p-3 text-lg font-medium text-left pr-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 text-sm">{side === 'buy' ? 'USDC' : 'Shares'}</span>
                        </div>
                    </div>
                    <div className="flex gap-1 mt-2 justify-end">
                        {[10, 50, 100, 500].map(val => (
                            <button
                                key={val}
                                onClick={() => setAmount(val.toString())}
                                className="px-2 py-1 rounded border border-gray-200 text-[10px] font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                            >
                                {val}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Avg. Price</span>
                        <span className="font-medium text-gray-900">
                            {potentialReturn ? (parseFloat(potentialReturn) / parseFloat(amount || '1')).toFixed(2) : '-'}¢
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">{side === 'buy' ? 'Est. Shares' : 'Est. Return'}</span>
                        <span className="font-medium text-gray-900">
                            {side === 'buy' ? (potentialReturn || '0.00') : `$${potentialReturn || '0.00'}`}
                        </span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                        <span className="font-bold text-gray-900">Total</span>
                        <span className="text-xl font-bold text-gray-900">
                            {side === 'buy' ? `$${amount || '0.00'}` : `${amount || '0'} Shares`}
                        </span>
                    </div>
                </div>

                {/* Trade Button */}
                <button
                    onClick={handlePlaceOrder}
                    disabled={placingOrder || !amount || parseFloat(amount) <= 0}
                    className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-[0.98] mt-4 ${placingOrder || !amount || parseFloat(amount) <= 0
                        ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                        : side === 'buy'
                            ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20'
                            : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
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
            <div className="mt-4 pt-4">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Order Book</h4>
                    {/* YES/NO Tabs */}
                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                        <button
                            onClick={() => setOrderBookTab('yes')}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${orderBookTab === 'yes'
                                ? 'bg-green-600 text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            YES
                        </button>
                        <button
                            onClick={() => setOrderBookTab('no')}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${orderBookTab === 'no'
                                ? 'bg-red-600 text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            NO
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="animate-spin w-5 h-5 text-gray-400" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {/* Bids (Buy Orders) */}
                        <div>
                            <div className="text-[10px] font-semibold text-gray-400 mb-2 flex justify-between px-1 uppercase">
                                <span>Qty</span>
                                <span>Bid</span>
                            </div>
                            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                                {currentBids.length === 0 ? (
                                    <div className="text-[10px] text-gray-400 text-center py-3 bg-gray-50 rounded italic">No bids</div>
                                ) : (
                                    currentBids.slice(0, 5).map((order) => (
                                        <div key={order.id} className="flex justify-between text-xs py-1.5 px-2 rounded bg-green-50 text-green-700 border border-green-100">
                                            <span>{order.amount.toFixed(0)}</span>
                                            <span className="font-mono font-semibold">{(order.price * 100).toFixed(1)}¢</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Asks (Sell Orders) */}
                        <div>
                            <div className="text-[10px] font-semibold text-gray-400 mb-2 flex justify-between px-1 uppercase">
                                <span>Ask</span>
                                <span>Qty</span>
                            </div>
                            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                                {currentAsks.length === 0 ? (
                                    <div className="text-[10px] text-gray-400 text-center py-3 bg-gray-50 rounded italic">No asks</div>
                                ) : (
                                    currentAsks.slice(0, 5).map((order) => (
                                        <div key={order.id} className="flex justify-between text-xs py-1.5 px-2 rounded bg-red-50 text-red-700 border border-red-100">
                                            <span className="font-mono font-semibold">{(order.price * 100).toFixed(1)}¢</span>
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


