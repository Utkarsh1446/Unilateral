import { Search, ChevronDown, LogOut, User, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useState, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';

interface SearchResult {
  id: string;
  description: string;
  type: 'opinion' | 'btc';
  contract_address?: string;
}

export function Navbar() {
  const navigate = useNavigate();
  const { account, isConnecting, connectWallet, disconnectWallet } = useWallet();
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const walletMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
      if (walletMenuRef.current && !walletMenuRef.current.contains(event.target as Node)) {
        setShowWalletMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        // Search opinion markets
        const opinionResponse = await fetch(`${API_URL}/markets`);
        const opinionMarkets = await opinionResponse.json();

        // Search BTC markets
        const btcResponse = await fetch(`${API_URL}/btc-markets`);
        const btcMarkets = await btcResponse.json();

        const query = searchQuery.toLowerCase();

        const opinionResults = opinionMarkets
          .filter((m: any) => m.description.toLowerCase().includes(query))
          .slice(0, 3)
          .map((m: any) => ({
            id: m.id,
            description: m.description,
            type: 'opinion' as const
          }));

        const btcResults = btcMarkets
          .filter((m: any) => {
            const marketTitle = `Bitcoin ${m.interval}m Up or Down`;
            return marketTitle.toLowerCase().includes(query) ||
              `${m.interval}`.includes(query);
          })
          .slice(0, 3)
          .map((m: any) => ({
            id: m.market_id,
            description: `Bitcoin ${m.interval}m Up or Down`,
            type: 'btc' as const,
            contract_address: m.contract_address
          }));

        setSearchResults([...opinionResults, ...btcResults]);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchResultClick = (result: SearchResult) => {
    if (result.type === 'opinion') {
      navigate(`/market/${result.id}`);
    } else {
      navigate(`/btc-market/${result.contract_address}`);
    }
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const truncateAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-[#A4E977]/20">
      <div className="max-w-[1920px] mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Logo and Navigation */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <img
                src="/20251223_135814.svg"
                alt="SuperPumped"
                className="h-[25px] w-auto"
              />
            </button>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-6">
              <button
                onClick={() => navigate('/markets')}
                className="text-[#A4E977] font-medium hover:text-white transition-colors"
                style={{ fontFamily: 'Inter', fontSize: '14px' }}
              >
                Markets
              </button>
              <button
                onClick={() => navigate('/btc-markets')}
                className="text-gray-400 font-medium hover:text-white transition-colors"
                style={{ fontFamily: 'Inter', fontSize: '14px' }}
              >
                BTC MARKETS
              </button>
              <button
                onClick={() => navigate('/creators')}
                className="text-gray-400 font-medium hover:text-white transition-colors"
                style={{ fontFamily: 'Inter', fontSize: '14px' }}
              >
                CREATORS
              </button>
              <button
                onClick={() => navigate('/how-it-works')}
                className="text-gray-400 font-medium hover:text-white transition-colors"
                style={{ fontFamily: 'Inter', fontSize: '14px' }}
              >
                How it works
              </button>
            </div>
          </div>

          {/* Right: Search and Connect Wallet */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search markets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setShowSearchResults(true)}
                className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg pl-9 pr-12 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#A4E977] w-64"
                style={{ fontFamily: 'Inter', fontSize: '14px' }}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setShowSearchResults(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Search Results Dropdown */}
              {showSearchResults && (
                <div className="absolute top-full mt-2 w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg shadow-xl max-h-96 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-4 text-center text-gray-500" style={{ fontFamily: 'Inter', fontSize: '14px' }}>
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handleSearchResultClick(result)}
                          className="w-full px-4 py-3 text-left hover:bg-[#1a1a1a] transition-colors border-b border-[#2a2a2a] last:border-b-0"
                        >
                          <div className="text-white mb-1" style={{ fontFamily: 'Inter', fontSize: '14px' }}>
                            {result.description}
                          </div>
                          <div className="text-xs text-gray-500" style={{ fontFamily: 'Inter' }}>
                            {result.type === 'opinion' ? 'Opinion Market' : 'BTC Market'}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500" style={{ fontFamily: 'Inter', fontSize: '14px' }}>
                      No markets found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Connect Wallet / Account */}
            {account ? (
              <div className="relative" ref={walletMenuRef}>
                <button
                  onClick={() => setShowWalletMenu(!showWalletMenu)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#A4E977] hover:bg-[#8FD65E] text-black font-semibold rounded-full transition-colors"
                  style={{ fontFamily: 'Inter', fontSize: '14px' }}
                >
                  <span>{truncateAddress(account)}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* Wallet Menu Dropdown */}
                {showWalletMenu && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg shadow-xl overflow-hidden">
                    <button
                      onClick={() => {
                        navigate('/profile');
                        setShowWalletMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-[#1a1a1a] transition-colors flex items-center gap-3 border-b border-[#2a2a2a]"
                    >
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-white" style={{ fontFamily: 'Inter', fontSize: '14px' }}>Profile</span>
                    </button>
                    <button
                      onClick={() => {
                        disconnectWallet();
                        setShowWalletMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-[#1a1a1a] transition-colors flex items-center gap-3"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span className="text-red-500" style={{ fontFamily: 'Inter', fontSize: '14px' }}>Disconnect</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="px-6 py-2 bg-[#A4E977] hover:bg-[#8FD65E] text-black font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'Inter', fontSize: '14px' }}
              >
                {isConnecting ? 'Connecting...' : 'Connect wallet'}
              </button>
            )}

            {/* Menu Icon (Mobile) */}
            <button className="md:hidden p-1.5 text-gray-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}