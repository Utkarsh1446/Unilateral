import { BadgeCheck } from 'lucide-react';

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
  return (
    <div className="bg-[#1C1C1E] rounded-[24px] p-5 hover:scale-[1.02] transition-transform duration-200 border border-white/5 cursor-pointer shadow-xl max-w-md mx-auto w-full group relative overflow-hidden">
      {/* Dynamic Glow Effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

      {/* Header */}
      <div className="flex gap-4 mb-2 relative z-10">
        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-blue-500/20 ring-2 ring-white/5">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Market"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-blue-500 text-white font-bold text-lg">
              {title.charAt(0)}
            </div>
          )}
        </div>
        <h3 className="text-white text-[17px] leading-snug font-medium line-clamp-2 pt-0.5">
          {title}
        </h3>
      </div>

      {/* Probability */}
      <div className="mb-6 pl-[64px] relative z-10 -mt-2">
        <span className="text-[#4ADE80] text-[32px] font-bold tracking-tight">
          {yesPrice}% Chances
        </span>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 mb-6 relative z-10">
        <button className="flex-1 bg-[#86EFAC] hover:bg-[#6ee7b7] text-black font-bold py-3 rounded-2xl text-[15px] transition-colors duration-200 shadow-lg shadow-green-900/20 active:scale-[0.98]">
          YES
        </button>
        <button className="flex-1 bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white font-bold py-3 rounded-2xl text-[15px] transition-colors duration-200 border border-white/5 active:scale-[0.98]">
          NO
        </button>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-zinc-400 text-xs font-medium relative z-10 px-1">
        <span>${volume} Volume</span>
        <div className="flex items-center gap-1.5 hover:text-white transition-colors">
          <span>Market by {creator}</span>
          <BadgeCheck className="w-4 h-4 text-[#3B82F6]" fill="currentColor" stroke="black" strokeWidth={1} />
        </div>
      </div>
    </div>
  );
}