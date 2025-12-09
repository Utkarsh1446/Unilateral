import { CheckCircle, XCircle, Loader2, DollarSign } from 'lucide-react';

interface DividendClaimPopupProps {
  state: 'claiming' | 'success' | 'error' | null;
  amount?: string;
  onClose: () => void;
}

export function DividendClaimPopup({ state, amount = '$0.00', onClose }: DividendClaimPopupProps) {
  if (!state) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-background rounded-t-2xl md:rounded-xl border-t md:border border-foreground/10 p-6 md:p-8 max-w-md w-full shadow-xl animate-slide-up">
        <div className="flex flex-col items-center text-center">
          {state === 'claiming' && (
            <>
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              </div>
              <h2 className="text-2xl mb-2" style={{ fontWeight: 700 }}>Claiming Dividends...</h2>
              <p className="text-muted-foreground">
                Processing your dividend claim. Please wait...
              </p>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl mb-2" style={{ fontWeight: 700 }}>Dividends Claimed!</h2>
              <div className="flex items-center justify-center gap-2 mb-4">
                <DollarSign className="w-8 h-8 text-green-600" />
                <span className="text-4xl text-green-600" style={{ fontWeight: 700 }}>{amount}</span>
              </div>
              <p className="text-muted-foreground mb-6">
                Your dividends have been successfully claimed and added to your wallet.
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
              <h2 className="text-2xl mb-2" style={{ fontWeight: 700 }}>Claim Failed</h2>
              <p className="text-muted-foreground mb-6">
                Unable to claim dividends. There might be no dividends available or a network issue occurred. Please try again.
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
