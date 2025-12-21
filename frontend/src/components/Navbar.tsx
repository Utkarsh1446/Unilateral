import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Navbar() {
  const navigate = useNavigate();

  return (
    <nav className="bg-black border-b-2 border-[#A4E977]">
      <div className="max-w-[1920px] mx-auto px-6">
        <div className="flex items-center justify-between py-1">
          {/* Left: Logo and Navigation */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <img
                src="/Superpumped_SVG.svg"
                alt="SuperPumped"
                className="w-[130px] h-[130px]"
              />
            </button>

            {/* Navigation Links */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate('/markets')}
                className="text-sm text-[#A4E977] font-medium hover:text-white transition-colors"
              >
                Markets
              </button>
              <button
                onClick={() => navigate('/discover')}
                className="text-sm text-gray-400 font-medium hover:text-white transition-colors"
              >
                DISCOVER
              </button>
              <button
                onClick={() => navigate('/whales')}
                className="text-sm text-gray-400 font-medium hover:text-white transition-colors"
              >
                WHALES
              </button>
              <button
                onClick={() => navigate('/portfolio')}
                className="text-sm text-gray-400 font-medium hover:text-white transition-colors"
              >
                PORTFOLIO
              </button>
              <button
                onClick={() => navigate('/btc-markets')}
                className="text-sm text-gray-400 font-medium hover:text-white transition-colors"
              >
                BTC MARKETS
              </button>
              <button
                onClick={() => navigate('/creators')}
                className="text-sm text-gray-400 font-medium hover:text-white transition-colors"
              >
                CREATORS
              </button>
              <button
                onClick={() => navigate('/how-it-works')}
                className="text-sm text-gray-400 font-medium hover:text-white transition-colors"
              >
                How it works
              </button>
            </div>
          </div>

          {/* Right: Search and Connect Wallet */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search"
                className="bg-gray-900/50 border border-gray-800 rounded-lg pl-9 pr-12 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#A4E977] w-64"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] text-gray-500 bg-gray-800 rounded border border-gray-700">
                ⌘K
              </kbd>
            </div>

            {/* Connect Wallet Button */}
            <button className="px-6 py-2 bg-[#A4E977] hover:bg-[#8FD65E] text-black text-sm font-semibold rounded-full transition-colors">
              Connect wallet
            </button>

            {/* Menu Icon */}
            <button className="p-1.5 text-gray-400 hover:text-white transition-colors">
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