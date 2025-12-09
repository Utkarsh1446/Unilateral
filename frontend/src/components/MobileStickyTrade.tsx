interface MobileStickyTradeProps {
  selectedOutcome: 'yes' | 'no';
  onBuyClick: () => void;
  className?: string;
}

export function MobileStickyTrade({ selectedOutcome, onBuyClick, className = '' }: MobileStickyTradeProps) {
  return (
    <div className={`md:hidden fixed bottom-16 left-0 right-0 bg-background border-t border-foreground/10 p-4 z-30 safe-area-bottom ${className}`}>
      <button 
        onClick={onBuyClick}
        className={`w-full py-4 rounded-xl hover:opacity-90 transition-all text-sm active:scale-[0.98] ${
          selectedOutcome === 'yes' 
            ? 'bg-green-600 text-white' 
            : 'bg-red-600 text-white'
        }`}
        style={{ fontWeight: 600 }}
      >
        Buy {selectedOutcome.toUpperCase()}
      </button>
    </div>
  );
}
