import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';

interface TraderCardProps {
    address: string;
    totalPnL: number;
    winRate: number;
    totalVolume: number;
    activePositions: number;
    avgHoldTime?: string;
    className?: string;
    onClick?: () => void;
}

export function TraderCard({
    address,
    totalPnL,
    winRate,
    totalVolume,
    activePositions,
    avgHoldTime,
    className = '',
    onClick
}: TraderCardProps) {
    const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    const isProfitable = totalPnL >= 0;

    return (
        <div
            className={`bg-background border border-foreground/10 rounded-xl p-4 hover:border-foreground/20 transition-all ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''} ${className}`}
            onClick={onClick}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                            {address.slice(2, 4).toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground">{truncateAddress(address)}</p>
                        <p className="text-xs text-muted-foreground">Trader</p>
                    </div>
                </div>

                <div className={`flex items-center gap-1 ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                    {isProfitable ? (
                        <TrendingUp className="w-4 h-4" />
                    ) : (
                        <TrendingDown className="w-4 h-4" />
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <p className="text-xs text-muted-foreground mb-1">Total PnL</p>
                    <p className={`text-sm font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                        {isProfitable ? '+' : ''}${totalPnL.toLocaleString()}
                    </p>
                </div>

                <div>
                    <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                    <p className="text-sm font-bold text-foreground">{winRate}%</p>
                </div>

                <div>
                    <p className="text-xs text-muted-foreground mb-1">Volume</p>
                    <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-muted-foreground" />
                        <p className="text-sm font-bold text-foreground">{(totalVolume / 1000).toFixed(1)}K</p>
                    </div>
                </div>

                <div>
                    <p className="text-xs text-muted-foreground mb-1">Positions</p>
                    <div className="flex items-center gap-1">
                        <Activity className="w-3 h-3 text-muted-foreground" />
                        <p className="text-sm font-bold text-foreground">{activePositions}</p>
                    </div>
                </div>
            </div>

            {avgHoldTime && (
                <div className="mt-3 pt-3 border-t border-foreground/10">
                    <p className="text-xs text-muted-foreground">Avg Hold Time: <span className="text-foreground font-medium">{avgHoldTime}</span></p>
                </div>
            )}
        </div>
    );
}
