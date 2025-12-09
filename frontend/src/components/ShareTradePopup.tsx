import { CheckCircle, XCircle, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

interface ShareTradePopupProps {
  state: 'processing' | 'success' | 'error' | null;
  tradeType: 'buy' | 'sell';
  shares?: string;
  amount?: string;
  onClose: () => void;
}

export function ShareTradePopup({ state, tradeType, shares = '0', amount = '$0.00', onClose }: ShareTradePopupProps) {
  if (!state) return null;

  const isBuy = tradeType === 'buy';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-background rounded-t-2xl md:rounded-xl border-t md:border border-foreground/10 p-6 md:p-8 max-w-md w-full shadow-xl animate-slide-up">
        <div className="flex flex-col items-center text-center">
          {state === 'processing' && (
            <>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                isBuy ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}>
                <Loader2 className={`w-10 h-10 animate-spin ${
                  isBuy ? 'text-green-600' : 'text-red-600'
                }`} />
              </div>
              <h2 className="text-2xl mb-2" style={{ fontWeight: 700 }}>
                {isBuy ? 'Buying' : 'Selling'} Shares...
              </h2>
              <p className="text-muted-foreground">
                Processing your {tradeType} order. Please wait...
              </p>
            </>
          )}

          {state === 'success' && (
            <>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                isBuy ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}>
                <CheckCircle className={`w-10 h-10 ${
                  isBuy ? 'text-green-600' : 'text-red-600'
                }`} />
              </div>
              <h2 className="text-2xl mb-2" style={{ fontWeight: 700 }}>
                {isBuy ? 'Purchase' : 'Sale'} Complete!
              </h2>
              
              <div className="bg-muted/30 rounded-xl p-4 mb-4 w-full">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Shares</span>
                  <div className="flex items-center gap-2">
                    {isBuy ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
                    <span className="text-sm" style={{ fontWeight: 600 }}>{shares}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-lg" style={{ fontWeight: 700 }}>{amount}</span>
                </div>
              </div>

              <p className="text-muted-foreground mb-6">
                You have successfully {isBuy ? 'purchased' : 'sold'} {shares} shares.
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
                Unable to {tradeType} shares. You may have insufficient balance or there was a network issue. Please try again.
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
