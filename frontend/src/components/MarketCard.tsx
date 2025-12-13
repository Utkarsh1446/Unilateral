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
    <div className="bg-white rounded-xl p-4 hover:scale-[1.02] transition-transform duration-200 border border-gray-200 cursor-pointer shadow-sm hover:shadow-md max-w-sm mx-auto w-full group relative overflow-hidden">

      {/* Header */}
      <div className="flex gap-3 mb-3 relative z-10">
        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 ring-1 ring-gray-200">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Market"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-500 font-bold text-sm">
              {title.charAt(0)}
            </div>
          )}
        </div>
        <h3 className="text-gray-900 text-base leading-snug font-semibold line-clamp-2 pt-0.5">
          {title}
        </h3>
      </div>

      {/* Probability */}
      <div className="mb-4 pl-14 relative z-10 -mt-1">
        <span className="text-green-600 text-2xl font-bold tracking-tight">
          {yesPrice}% Chance
        </span>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 mb-4 relative z-10">
        <button className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 font-semibold py-2.5 rounded-lg text-sm transition-colors duration-200 border border-green-200 active:scale-[0.98]">
          YES
        </button>
        <button className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-2.5 rounded-lg text-sm transition-colors duration-200 border border-red-200 active:scale-[0.98]">
          NO
        </button>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-gray-500 text-xs font-medium relative z-10 px-1">
        <span>${volume} Vol</span>
        <div className="flex items-center gap-1 hover:text-gray-800 transition-colors">
          <span>By {creator}</span>
          <BadgeCheck className="w-3.5 h-3.5 text-blue-500" fill="currentColor" stroke="white" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}