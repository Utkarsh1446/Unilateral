import { useState, useEffect } from 'react';
import { Wallet, User, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../assets/unilateral_logo.png';
import { WalletConnectPopup } from './WalletConnectPopup';
import { ethers } from 'ethers';
import { CONTRACTS, ABIS, getContract } from '../lib/contracts';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3001";

export function Navbar() {
  const [account, setAccount] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletPopupOpen, setWalletPopupOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          const address = accounts[0].address;
          setAccount(address);
          checkNetwork(provider);
          checkAdminStatus(address);
        }
      } catch (err) {
        console.error("Error checking connection:", err);
      }
    }
  };

  const checkAdminStatus = async (address: string) => {
    try {
      const response = await fetch(`${API_URL}/admin/stats?walletAddress=${address}`, {
        headers: { 'x-wallet-address': address }
      });
      setIsAdmin(response.ok);
    } catch {
      setIsAdmin(false);
    }
  };

  const checkNetwork = async (provider: ethers.BrowserProvider) => {
    try {
      const network = await provider.getNetwork();
      const chainId = network.chainId;
      const targetChainId = 84532n; // Base Sepolia

      if (chainId !== targetChainId) {
        console.log(`Wrong network: ${chainId}. Switching to ${targetChainId}...`);
        try {
          await provider.send('wallet_switchEthereumChain', [{ chainId: '0x14a34' }]);
        } catch (switchError: any) {
          if (switchError.code === 4902 || switchError.error?.code === 4902) {
            try {
              await provider.send('wallet_addEthereumChain', [
                {
                  chainId: '0x14a34',
                  chainName: 'Base Sepolia',
                  rpcUrls: ['https://sepolia.base.org'],
                  nativeCurrency: {
                    name: 'ETH',
                    symbol: 'ETH',
                    decimals: 18
                  },
                  blockExplorerUrls: ['https://sepolia-explorer.base.org']
                },
              ]);
            } catch (addError) {
              console.error("Failed to add network:", addError);
            }
          } else {
            console.error("Failed to switch network:", switchError);
          }
        }
      }
    } catch (err) {
      console.error("Error checking network:", err);
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      setIsConnecting(true);
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          setAccount(address);
          await checkNetwork(provider);
          await checkAdminStatus(address);
        }
      } catch (err: any) {
        console.error("Error connecting wallet:", err);
        alert(`Connection failed: ${err.message || "Unknown error"}`);
      } finally {
        setIsConnecting(false);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const handleMint = async () => {
    if (!account) return;
    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const token = getContract(CONTRACTS.PlatformToken, ABIS.PlatformToken, signer);

      const tx = await token.mint(account, ethers.parseUnits("1000", 6));
      await tx.wait();
      alert("Minted 1000 Test USDC!");
    } catch (err: any) {
      console.error("Minting error:", err);
      alert(`Failed to mint: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = (walletType: string) => {
    if (walletType === 'MetaMask') {
      connectWallet();
    } else {
      alert("Only MetaMask is supported in this demo.");
    }
  };

  return (
    <nav className="bg-background sticky top-0 z-50 border-b border-foreground/10">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <img src={logo} alt="Unilateral" className="w-24 md:w-36 h-auto object-contain" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/markets" className="text-sm uppercase tracking-wider hover:opacity-60 transition-opacity" style={{ letterSpacing: '0.08em', fontWeight: 400 }}>
              Markets
            </Link>
            <Link to="/creators" className="text-sm uppercase tracking-wider hover:opacity-60 transition-opacity" style={{ letterSpacing: '0.08em', fontWeight: 400 }}>
              Creators
            </Link>
            <a href="#how-it-works" className="text-sm uppercase tracking-wider hover:opacity-60 transition-opacity" style={{ letterSpacing: '0.08em', fontWeight: 400 }}>
              How it works
            </a>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Mint Button (Dev) */}
            {account && (
              <button
                onClick={handleMint}
                disabled={isConnecting}
                className="hidden md:block px-3 py-1 border border-foreground/20 rounded-full text-xs hover:bg-foreground/5 transition-colors"
              >
                {isConnecting ? "..." : "Mint USDC"}
              </button>
            )}

            {/* Desktop Wallet/Profile */}
            {account ? (
              <Link to="/profile" className="hidden md:block p-2 hover:opacity-60 transition-opacity" title={account}>
                <User className="w-5 h-5 stroke-[1.5]" />
              </Link>
            ) : (
              <button
                onClick={() => setWalletPopupOpen(true)}
                className="hidden md:block px-6 py-2 bg-foreground text-background rounded-full hover:opacity-90 transition-opacity text-sm uppercase tracking-wider"
                style={{ letterSpacing: '0.05em', fontWeight: 500 }}
              >
                Connect Wallet
              </button>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:opacity-60 transition-opacity"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-foreground/10 bg-background absolute top-full left-0 right-0 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            <Link
              to="/markets"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-3 px-4 text-sm uppercase tracking-wider hover:bg-muted/30 rounded-lg transition-colors"
              style={{ letterSpacing: '0.08em', fontWeight: 500 }}
            >
              Markets
            </Link>
            <Link
              to="/creators"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-3 px-4 text-sm uppercase tracking-wider hover:bg-muted/30 rounded-lg transition-colors"
              style={{ letterSpacing: '0.08em', fontWeight: 500 }}
            >
              Creators
            </Link>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-3 px-4 text-sm uppercase tracking-wider hover:bg-muted/30 rounded-lg transition-colors"
              style={{ letterSpacing: '0.08em', fontWeight: 500 }}
            >
              How it works
            </a>
            <div className="pt-2 border-t border-foreground/10 mt-2">
              {account ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 py-3 px-4 hover:bg-muted/30 rounded-lg transition-colors"
                  >
                    <User className="w-5 h-5 stroke-[1.5]" />
                    <span className="text-sm uppercase tracking-wider" style={{ letterSpacing: '0.05em', fontWeight: 500 }}>Profile</span>
                  </Link>
                  <button
                    onClick={() => { handleMint(); setMobileMenuOpen(false); }}
                    className="w-full text-left px-4 py-3 text-sm uppercase tracking-wider hover:bg-muted/30"
                  >
                    Mint Test USDC
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setWalletPopupOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-6 py-3 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity text-sm uppercase tracking-wider"
                  style={{ letterSpacing: '0.05em', fontWeight: 600 }}
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Wallet Connect Popup */}
      <WalletConnectPopup
        isOpen={walletPopupOpen}
        onClose={() => setWalletPopupOpen(false)}
        onConnect={handleConnect}
      />
    </nav>
  );
}