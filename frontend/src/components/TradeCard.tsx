import { formatDistanceToNow } from 'date-fns';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TradeCardProps {
    marketId: string;
    marketQuestion: string;
    traderAddress: string;
    outcome: 'Yes' | 'No';
    shares: number;
    price: number;
    totalCost: number;
    timestamp: Date;
    isSuspicious?: boolean;
    className?: string;
}

export function TradeCard({
    marketId,
    marketQuestion,
    traderAddress,
    outcome,
    shares,
    price,
    totalCost,
    timestamp,
    isSuspicious = false,
    className = ''
}: TradeCardProps) {
    const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    return (
        <div className={`bg-background border border-foreground/10 rounded-xl p-4 hover:border-foreground/20 transition-colors ${className}`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <Link
                        to={`/market/${marketId}`}
                        className="text-sm font-medium text-foreground hover:opacity-70 transition-opacity line-clamp-1"
                    >
                        {marketQuestion}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                            {truncateAddress(traderAddress)}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(timestamp, { addSuffix: true })}
                        </span>
                    </div>
                </div>

                {isSuspicious && (
                    <div className="ml-2 flex-shrink-0">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                    </div>
                )}
            </div>

            {/* Trade Details */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <p className="text-xs text-muted-foreground mb-1">Outcome</p>
                    <div className="flex items-center gap-1.5">
                        {outcome === 'Yes' ? (
                            <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                        )}
                        <span className={`text-sm font-semibold ${outcome === 'Yes' ? 'text-green-600' : 'text-red-600'}`}>
                            {outcome}
                        </span>
                    </div>
                </div>

                <div>
                    <p className="text-xs text-muted-foreground mb-1">Shares</p>
                    <p className="text-sm font-semibold text-foreground">{shares.toLocaleString()}</p>
                </div>

                <div>
                    <p className="text-xs text-muted-foreground mb-1">Price</p>
                    <p className="text-sm font-semibold text-foreground">{price}¢</p>
                </div>

                <div>
                    <p className="text-xs text-muted-foreground mb-1">Total</p>
                    <p className="text-sm font-semibold text-foreground">${totalCost.toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
}
