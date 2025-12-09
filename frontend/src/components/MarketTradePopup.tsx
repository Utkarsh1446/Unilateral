import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface MarketTradePopupProps {
  state: 'processing' | 'success' | 'error' | null;
  tradeType: 'buy' | 'sell';
  outcome: 'yes' | 'no';
  shares?: string;
  amount?: string;
  onClose: () => void;
}

export function MarketTradePopup({ state, tradeType, outcome, shares = '0', amount = '$0.00', onClose }: MarketTradePopupProps) {
  if (!state) return null;

  const isBuy = tradeType === 'buy';
  const isYes = outcome === 'yes';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-background rounded-t-2xl md:rounded-xl border-t md:border border-foreground/10 p-6 md:p-8 max-w-md w-full shadow-xl animate-slide-up">
        <div className="flex flex-col items-center text-center">
          {state === 'processing' && (
            <>
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              </div>
              <h2 className="text-2xl mb-2" style={{ fontWeight: 700 }}>
                {isBuy ? 'Buying' : 'Selling'} {outcome.toUpperCase()} Tokens...
              </h2>
              <p className="text-muted-foreground">
                Processing your {tradeType} order. Please wait...
              </p>
            </>
          )}

          {state === 'success' && (
            <>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                isYes ? 'bg-blue-500/10' : 'bg-green-500/10'
              }`}>
                <CheckCircle className={`w-10 h-10 ${
                  isYes ? 'text-blue-600' : 'text-green-600'
                }`} />
              </div>
              <h2 className="text-2xl mb-2" style={{ fontWeight: 700 }}>
                {isBuy ? 'Purchase' : 'Sale'} Complete!
              </h2>
              
              <div className="bg-muted/30 rounded-xl p-4 mb-4 w-full">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Position</span>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${
                    isYes 
                      ? 'bg-blue-500/10 border border-blue-600/20' 
                      : 'bg-green-500/10 border border-green-600/20'
                  }`}>
                    <span className={`text-xs ${
                      isYes ? 'text-blue-700' : 'text-green-700'
                    }`} style={{ fontWeight: 600 }}>{outcome.toUpperCase()}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Shares</span>
                  <span className="text-sm" style={{ fontWeight: 600 }}>{shares}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-lg" style={{ fontWeight: 700 }}>{amount}</span>
                </div>
              </div>

              <p className="text-muted-foreground mb-6">
                You have successfully {isBuy ? 'purchased' : 'sold'} {shares} {outcome.toUpperCase()} tokens.
              </p>
              <button
                onClick={onClose}
                className="w-full py-3 bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity"
                style={{ fontWeight: 600 }}
              >
                Done
              </button>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl mb-2" style={{ fontWeight: 700 }}>Transaction Failed</h2>
              <p className="text-muted-foreground mb-6">
                Unable to {tradeType} {outcome.toUpperCase()} tokens. You may have insufficient balance or there was a network issue. Please try again.
              </p>
              <button
                onClick={onClose}
                className="w-full py-3 bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity"
                style={{ fontWeight: 600 }}
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
