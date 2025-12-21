import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string | number;
    change?: number;
    changeLabel?: string;
    icon?: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    className?: string;
}

export function StatCard({ label, value, change, changeLabel, icon, trend, className = '' }: StatCardProps) {
    const getTrendColor = () => {
        if (trend === 'up') return 'text-green-600';
        if (trend === 'down') return 'text-red-600';
        return 'text-muted-foreground';
    };

    const getTrendIcon = () => {
        if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5" />;
        if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5" />;
        return null;
    };

    return (
        <div className={`bg-background border border-foreground/10 rounded-xl p-4 ${className}`}>
            <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider" style={{ letterSpacing: '0.05em' }}>
                    {label}
                </p>
                {icon && <div className="text-muted-foreground">{icon}</div>}
            </div>

            <div className="flex items-end justify-between">
                <h3 className="text-2xl font-bold text-foreground">
                    {value}
                </h3>

                {(change !== undefined || changeLabel) && (
                    <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`} style={{ fontWeight: 600 }}>
                        {getTrendIcon()}
                        <span>{changeLabel || `${change && change > 0 ? '+' : ''}${change}%`}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
