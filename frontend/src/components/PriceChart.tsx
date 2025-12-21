import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';

interface PriceDataPoint {
    timestamp: number;
    yesPrice: number;
    noPrice: number;
    volume?: number;
}

interface PriceChartProps {
    data: PriceDataPoint[];
    timeRange: '1D' | '1W' | '1M' | 'ALL';
    onTimeRangeChange: (range: '1D' | '1W' | '1M' | 'ALL') => void;
    className?: string;
}

export function PriceChart({ data, timeRange, onTimeRangeChange, className = '' }: PriceChartProps) {
    const formatXAxis = (timestamp: number) => {
        if (timeRange === '1D') {
            return format(new Date(timestamp), 'HH:mm');
        } else if (timeRange === '1W') {
            return format(new Date(timestamp), 'EEE');
        } else {
            return format(new Date(timestamp), 'MMM d');
        }
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background border border-foreground/10 rounded-lg p-3 shadow-xl">
                    <p className="text-xs text-muted-foreground mb-2">
                        {format(new Date(payload[0].payload.timestamp), 'MMM d, yyyy HH:mm')}
                    </p>
                    <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-green-600 font-medium">Yes</span>
                            <span className="text-xs font-bold text-foreground">{payload[0].value}¢</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-red-600 font-medium">No</span>
                            <span className="text-xs font-bold text-foreground">{payload[1].value}¢</span>
                        </div>
                        {payload[0].payload.volume && (
                            <div className="flex items-center justify-between gap-4 pt-1 border-t border-foreground/10">
                                <span className="text-xs text-muted-foreground">Volume</span>
                                <span className="text-xs font-bold text-foreground">${payload[0].payload.volume.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className={`bg-background border border-foreground/10 rounded-xl p-4 ${className}`}>
            {/* Header with Time Range Selector */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">Price History</h3>
                <div className="flex gap-1 bg-muted/20 rounded-lg p-1">
                    {(['1D', '1W', '1M', 'ALL'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => onTimeRangeChange(range)}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${timeRange === range
                                    ? 'bg-foreground text-background'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart */}
            <div className="h-64">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                            <XAxis
                                dataKey="timestamp"
                                tickFormatter={formatXAxis}
                                stroke="currentColor"
                                opacity={0.5}
                                style={{ fontSize: '11px' }}
                            />
                            <YAxis
                                domain={[0, 100]}
                                stroke="currentColor"
                                opacity={0.5}
                                style={{ fontSize: '11px' }}
                                tickFormatter={(value) => `${value}¢`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="yesPrice"
                                stroke="rgb(22, 163, 74)"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="noPrice"
                                stroke="rgb(220, 38, 38)"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">No price data available</p>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-foreground/10">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-green-600 rounded-full" />
                    <span className="text-xs text-muted-foreground">Yes Price</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-red-600 rounded-full" />
                    <span className="text-xs text-muted-foreground">No Price</span>
                </div>
            </div>
        </div>
    );
}
