import { X } from 'lucide-react';

interface WalletConnectPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (walletType: string) => void;
}

export function WalletConnectPopup({ isOpen, onClose, onConnect }: WalletConnectPopupProps) {
  if (!isOpen) return null;

  const wallets = [
    {
      name: 'MetaMask',
      icon: (
        <svg viewBox="0 0 40 40" className="w-10 h-10">
          <path fill="#E17726" d="M32.9 5.9L20.7 14.8l2.3-5.3z"/>
          <path fill="#E27625" d="M7.1 5.9l12 9 2.2-5.3z"/>
          <path fill="#E27625" d="M28.3 27.9l-3.2 4.9 6.9 1.9 2-6.7z"/>
          <path fill="#E27625" d="M5.9 28l2 6.7 6.9-1.9-3.2-4.9z"/>
          <path fill="#E27625" d="M14.5 17.6l-2 3 6.8.3-.2-7.3z"/>
          <path fill="#E27625" d="M25.5 17.6l-4.7-4.1-.2 7.4 6.8-.3z"/>
          <path fill="#E27625" d="M14.7 32.8l4.1-2-3.5-2.8z"/>
          <path fill="#E27625" d="M21.2 30.8l4.1 2-.6-4.8z"/>
          <path fill="#D5BFB2" d="M25.3 32.8l-4.1-2-.3 2.5v1.2z"/>
          <path fill="#D5BFB2" d="M14.7 32.8l4.4 1.7v-1.2l-.3-2.5z"/>
          <path fill="#233447" d="M19.2 25.3l-3.4-1 2.4-1.1z"/>
          <path fill="#233447" d="M20.8 25.3l1-2.1 2.4 1.1z"/>
          <path fill="#CC6228" d="M14.7 32.8l.6-4.9-3.8.1z"/>
          <path fill="#CC6228" d="M24.7 27.9l.6 4.9 3.2-4.8z"/>
          <path fill="#CC6228" d="M27.5 20.6l-6.8.3.6 3.4 1-2.1 2.4 1.1z"/>
          <path fill="#CC6228" d="M15.8 24.3l2.4-1.1 1 2.1.6-3.4-6.8-.3z"/>
          <path fill="#E27525" d="M12.5 20.6l3.4 6.7-.1-3.3z"/>
          <path fill="#E27525" d="M24.3 24l-.1 3.3 3.4-6.7z"/>
          <path fill="#E27525" d="M21.4 20.9l-.6 3.4.8 4 .2-5.9z"/>
          <path fill="#E27525" d="M18.6 20.9l-.3 1.5.1 5.9.8-4z"/>
          <path fill="#F5841F" d="M21.4 25.3l-.8 4 .6.4 3.5-2.8.1-3.3z"/>
          <path fill="#F5841F" d="M15.8 24.3l.1 3.3 3.5 2.8.6-.4-.8-4z"/>
          <path fill="#C0AC9D" d="M21.4 34.5l.3-2.5-.3-.2h-2.8l-.2.2.3 2.5-4.4-1.7 1.5 1.3 3.1 2.2h2.9l3.1-2.2 1.5-1.3z"/>
          <path fill="#161616" d="M21.2 30.8l-.6-.4h-1.2l-.6.4-.3 2.5.2-.2h2.8l.3.2z"/>
          <path fill="#763E1A" d="M33.5 15.6l1.1-5.4-1.7-5-12.7 9.4 4.9 4.1 6.9 2 1.5-1.8-.7-.5 1.1-.9-.8-.7 1.1-.8z"/>
          <path fill="#763E1A" d="M5.4 10.2l1.1 5.4-.7.5.7.5 1.1.9-.8.7 1.1.8 1.5 1.8 6.9-2 4.9-4.1L8.5 5.2z"/>
          <path fill="#F5841F" d="M31.9 19.7l-6.9-2 2 3-3.4 6.7 4.5-.1h6.7z"/>
          <path fill="#F5841F" d="M15 17.7l-6.9 2-2.9 7.5h6.7l4.4.1-3.4-6.7z"/>
          <path fill="#F5841F" d="M21.4 20.9l.4-7.3 2.1-5.7h-9.4l2 5.7.5 7.3.2 2.4v5.9h1.2l.1-5.9z"/>
        </svg>
      ),
      description: 'Connect with MetaMask'
    },
    {
      name: 'Coinbase Wallet',
      icon: (
        <svg viewBox="0 0 40 40" className="w-10 h-10">
          <rect width="40" height="40" rx="8" fill="#0052FF"/>
          <path d="M20 8C13.4 8 8 13.4 8 20s5.4 12 12 12 12-5.4 12-12S26.6 8 20 8zm0 18.5c-3.6 0-6.5-2.9-6.5-6.5s2.9-6.5 6.5-6.5 6.5 2.9 6.5 6.5-2.9 6.5-6.5 6.5z" fill="white"/>
          <rect x="16.5" y="18.5" width="7" height="3" rx="1.5" fill="#0052FF"/>
        </svg>
      ),
      description: 'Connect with Coinbase Wallet'
    },
    {
      name: 'WalletConnect',
      icon: (
        <svg viewBox="0 0 40 40" className="w-10 h-10">
          <rect width="40" height="40" rx="8" fill="#3B99FC"/>
          <path d="M12.5 15.5c4.1-4 10.9-4 15 0l.5.5c.2.2.2.5 0 .7l-1.7 1.7c-.1.1-.3.1-.4 0l-.7-.7c-2.9-2.8-7.5-2.8-10.4 0l-.7.7c-.1.1-.3.1-.4 0l-1.7-1.7c-.2-.2-.2-.5 0-.7l.5-.5zm18.5 3.5l1.5 1.5c.2.2.2.5 0 .7l-6.8 6.7c-.2.2-.5.2-.7 0l-4.8-4.7c0-.1-.1-.1-.2 0l-4.8 4.7c-.2.2-.5.2-.7 0L8.5 21c-.2-.2-.2-.5 0-.7L10 19c.2-.2.5-.2.7 0l4.8 4.7c.1.1.2.1.2 0l4.8-4.7c.2-.2.5-.2.7 0l4.8 4.7c.1.1.2.1.2 0l4.8-4.7c.2-.2.5-.2.7 0z" fill="white"/>
        </svg>
      ),
      description: 'Connect with WalletConnect'
    },
    {
      name: 'Trust Wallet',
      icon: (
        <svg viewBox="0 0 40 40" className="w-10 h-10">
          <rect width="40" height="40" rx="8" fill="#3375BB"/>
          <path d="M20 8l-8 4v8c0 5 3.5 9.7 8 11 4.5-1.3 8-6 8-11v-8l-8-4zm0 4.5l5.5 2.8v6.2c0 3.4-2.4 6.6-5.5 7.5-3.1-.9-5.5-4.1-5.5-7.5v-6.2L20 12.5zm-2 9.5l-2-2 1-1 1 1 3-3 1 1-4 4z" fill="white"/>
        </svg>
      ),
      description: 'Connect with Trust Wallet'
    },
    {
      name: 'Phantom',
      icon: (
        <svg viewBox="0 0 40 40" className="w-10 h-10">
          <rect width="40" height="40" rx="8" fill="#AB9FF2"/>
          <path d="M20 8c-6.6 0-12 5.4-12 12v6c0 3.3 2.7 6 6 6h12c3.3 0 6-2.7 6-6v-6c0-6.6-5.4-12-12-12zm-4 14c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zm8 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5z" fill="white"/>
        </svg>
      ),
      description: 'Connect with Phantom'
    },
    {
      name: 'Rabby',
      icon: (
        <svg viewBox="0 0 40 40" className="w-10 h-10">
          <rect width="40" height="40" rx="8" fill="#8697FF"/>
          <circle cx="20" cy="18" r="10" fill="white"/>
          <circle cx="17" cy="16" r="1.5" fill="#8697FF"/>
          <circle cx="23" cy="16" r="1.5" fill="#8697FF"/>
          <path d="M15 13l-2-3m9 3l2-3m-9 11c0 1.5 1.3 2 3 2s3-.5 3-2" stroke="#8697FF" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        </svg>
      ),
      description: 'Connect with Rabby Wallet'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-background rounded-t-2xl md:rounded-2xl border-t md:border border-foreground/10 max-w-md w-full max-h-[85vh] md:max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-foreground/10">
          <div>
            <h2 className="text-lg" style={{ fontWeight: 600 }}>Connect Wallet</h2>
            <p className="text-xs text-muted-foreground mt-1">Choose your preferred wallet</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wallet Options */}
        <div className="p-4 space-y-2">
          {wallets.map((wallet) => (
            <button
              key={wallet.name}
              onClick={() => {
                onConnect(wallet.name);
                onClose();
              }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-foreground/10 hover:border-foreground/20 hover:bg-foreground/[0.02] transition-all group"
            >
              <div className="flex-shrink-0">
                {wallet.icon}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm" style={{ fontWeight: 600 }}>{wallet.name}</p>
                <p className="text-xs text-muted-foreground">{wallet.description}</p>
              </div>
              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-foreground/10 bg-muted/20">
          <p className="text-xs text-muted-foreground text-center">
            By connecting a wallet, you agree to Guessly's{' '}
            <a href="#" className="underline hover:text-foreground">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="underline hover:text-foreground">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
