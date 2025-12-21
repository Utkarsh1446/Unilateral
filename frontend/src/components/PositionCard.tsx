import { TrendingUp, TrendingDown, ExternalLink, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PositionCardProps {
    marketId: string;
    marketQuestion: string;
    outcome: 'Yes' | 'No';
    shares: number;
    avgBuyPrice: number;
    currentPrice: number;
    positionValue: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
    imageUrl?: string;
    className?: string;
}

export function PositionCard({
    marketId,
    marketQuestion,
    outcome,
    shares,
    avgBuyPrice,
    currentPrice,
    positionValue,
    unrealizedPnL,
    unrealizedPnLPercent,
    imageUrl,
    className = ''
}: PositionCardProps) {
    const isProfitable = unrealizedPnL >= 0;

    return (
        <div className={`bg-background border border-foreground/10 rounded-xl overflow-hidden hover:border-foreground/20 transition-all hover:scale-[1.01] ${className}`}>
            {/* Image Header */}
            {imageUrl && (
                <div className="relative h-32 bg-muted/20 overflow-hidden">
                    <img
                        src={imageUrl}
                        alt={marketQuestion}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${outcome === 'Yes' ? 'bg-green-600/90 text-white' : 'bg-red-600/90 text-white'}`}>
                            {outcome}
                        </span>
                    </div>
                </div>
            )}

            <div className="p-4">
                {/* Market Question */}
                <Link
                    to={`/market/${marketId}`}
                    className="text-sm font-semibold text-foreground hover:opacity-70 transition-opacity line-clamp-2 mb-3 block"
                >
                    {marketQuestion}
                </Link>

                {/* Position Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Shares</p>
                        <p className="text-sm font-bold text-foreground">{shares.toLocaleString()}</p>
                    </div>

                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Avg Price</p>
                        <p className="text-sm font-bold text-foreground">{avgBuyPrice}¢</p>
                    </div>

                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Current Price</p>
                        <p className="text-sm font-bold text-foreground">{currentPrice}¢</p>
                    </div>

                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Value</p>
                        <p className="text-sm font-bold text-foreground">${positionValue.toLocaleString()}</p>
                    </div>
                </div>

                {/* PnL Display */}
                <div className={`p-3 rounded-lg mb-3 ${isProfitable ? 'bg-green-600/10' : 'bg-red-600/10'}`}>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Unrealized PnL</span>
                        <div className={`flex items-center gap-1 ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                            {isProfitable ? (
                                <TrendingUp className="w-3.5 h-3.5" />
                            ) : (
                                <TrendingDown className="w-3.5 h-3.5" />
                            )}
                            <span className="text-sm font-bold">
                                {isProfitable ? '+' : ''}${Math.abs(unrealizedPnL).toLocaleString()} ({isProfitable ? '+' : ''}{unrealizedPnLPercent.toFixed(1)}%)
                            </span>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                    <Link
                        to={`/terminal/${marketId}`}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity text-xs font-semibold"
                    >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Trade
                    </Link>
                    <Link
                        to={`/market/${marketId}`}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 border border-foreground/20 text-foreground rounded-lg hover:bg-foreground/5 transition-colors text-xs font-semibold"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View
                    </Link>
                </div>
            </div>
        </div>
    );
}
