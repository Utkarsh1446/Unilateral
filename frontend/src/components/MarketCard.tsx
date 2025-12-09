import { TrendingUp, TrendingDown } from 'lucide-react';

interface MarketCardProps {
  title: string;
  creator: string;
  yesPrice: number;
  noPrice: number;
  volume: string;
  priceChange: number;
  imageUrl?: string;
}

export function MarketCard({ title, creator, yesPrice, noPrice, volume, priceChange, imageUrl }: MarketCardProps) {
  const isPositive = priceChange > 0;

  return (
    <div className="bg-background rounded-2xl border-2 border-foreground p-4 hover:shadow-lg transition-all cursor-pointer group active:scale-[0.98]">
      {/* Header with Image and Title */}
      <div className="flex gap-3 mb-3 min-h-[48px]">
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Market"
            className="w-12 h-12 rounded-lg object-cover border border-foreground/10 flex-shrink-0"
          />
        )}
        <div className="text-xs leading-snug font-medium line-clamp-3">
          {title}
        </div>
      </div>

      {/* Probability */}
      <div className="flex items-end gap-2 mb-3">
        <div className="text-3xl" style={{ fontWeight: 700 }}>{yesPrice}%</div>
        <div className={`flex items-center gap-1 pb-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span className="text-xs" style={{ fontWeight: 600 }}>{Math.abs(priceChange)}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-green-500 rounded-full transition-all"
          style={{ width: `${yesPrice}%` }}
        />
      </div>

      {/* YES/NO Prices */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="py-2 bg-green-500/10 border-2 border-green-600/30 rounded-xl text-center group-hover:border-green-600/50 transition-all">
          <div className="text-[9px] text-green-700 mb-0.5 uppercase tracking-wider" style={{ fontWeight: 600 }}>YES</div>
          <div className="text-xs text-green-600" style={{ fontWeight: 700 }}>{yesPrice}¢</div>
        </div>
        <div className="py-2 bg-red-500/10 border-2 border-red-600/30 rounded-xl text-center group-hover:border-red-600/50 transition-all">
          <div className="text-[9px] text-red-700 mb-0.5 uppercase tracking-wider" style={{ fontWeight: 600 }}>NO</div>
          <div className="text-xs text-red-600" style={{ fontWeight: 700 }}>{noPrice}¢</div>
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground uppercase tracking-wider" style={{ letterSpacing: '0.05em' }}>Volume</span>
        <span style={{ fontWeight: 600 }}>{volume}</span>
      </div>
    </div>
  );
}