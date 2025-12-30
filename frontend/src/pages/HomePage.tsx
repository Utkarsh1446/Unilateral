import { TrendingUp, TrendingDown, Users, DollarSign } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { MarketCard } from '../components/MarketCard';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();

  const featuredMarkets = [
    {
      id: 1,
      title: 'Will Bitcoin reach $150k by end of Q1 2025?',
      creator: 'Sarah Chen',
      category: 'Crypto',
      yesPrice: 67,
      noPrice: 33,
      volume: '$234.5K',
      priceChange: 5.2,
      endDate: 'Mar 31, 2025',
      imageUrl: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
    },
    {
      id: 2,
      title: 'Will Apple announce AR glasses at WWDC 2025?',
      creator: 'Jordan Blake',
      category: 'Technology',
      yesPrice: 42,
      noPrice: 58,
      volume: '$189.2K',
      priceChange: -2.1,
      endDate: 'Jun 10, 2025',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
    },
    {
      id: 3,
      title: 'Will Tesla stock hit $400 in Q1 2025?',
      creator: 'Alex Rivera',
      category: 'Business',
      yesPrice: 55,
      noPrice: 45,
      volume: '$156.8K',
      priceChange: 3.7,
      endDate: 'Mar 31, 2025',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Tesla_logo.png',
    },
    {
      id: 4,
      title: 'Will Ethereum surpass $5,000 before February?',
      creator: 'Morgan Lee',
      category: 'Crypto',
      yesPrice: 38,
      noPrice: 62,
      volume: '$145.3K',
      priceChange: -1.5,
      endDate: 'Jan 31, 2025',
      imageUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    },
  ];

  return (
    <>
      <div className="bg-black min-h-screen text-white pt-[58px] overflow-x-hidden">
        {/* Hero Section */}
        <section className="mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-12 max-w-[1600px]">
          <div className="bg-[#0a0a0a] rounded-lg border shadow-lg" style={{ borderColor: 'rgba(140, 180, 130, 0.35)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)' }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x" style={{ borderColor: 'rgba(140, 180, 130, 0.35)' }}>
              {/* Left Section - Text */}
              <div className="p-6 sm:p-8 md:p-12 lg:p-20 flex flex-col justify-center min-h-[300px] sm:min-h-[400px] md:min-h-[500px]">
                <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl mb-3 sm:mb-4 md:mb-6 tracking-tight leading-tight text-white" style={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                  You have followers<br />but<br />Have you got the voice?
                </h1>

                <p className="text-xs sm:text-sm md:text-lg text-gray-400 leading-relaxed" style={{ fontWeight: 400 }}>
                  Buy shares in creators. Trade on their prediction markets. Earn dividends from every trade.
                </p>
              </div>

              {/* Right Section - Empty for now */}
              <div className="p-6 sm:p-8 md:p-12 lg:p-20 min-h-[200px] sm:min-h-[300px] md:min-h-[500px]">
                {/* Empty for now */}
              </div>
            </div>
          </div>
        </section>

        {/* Featured Markets */}
        <section className="mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-24 max-w-[1600px]">
          <div className="mb-6 sm:mb-8 md:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-4xl mb-1 sm:mb-2 md:mb-3 text-white" style={{ fontWeight: 700 }}>Featured Markets</h2>
            <p className="text-xs sm:text-sm md:text-lg text-gray-400">Top prediction markets right now</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {featuredMarkets.map((market) => (
              <div key={market.id} onClick={() => navigate(`/market/${market.id}`)} className="cursor-pointer">
                <MarketCard {...market} />
              </div>
            ))}
          </div>
        </section>

        {/* Trending Creators */}
        <section className="mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-24 max-w-[1600px]">
          <div className="mb-6 sm:mb-8 md:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-4xl mb-1 sm:mb-2 md:mb-3 text-white" style={{ fontWeight: 700 }}>Trending Creators</h2>
            <p className="text-xs sm:text-sm md:text-lg text-gray-400">Top performing creators this week</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {[
              { name: 'Sarah Chen', handle: 'cryptoanalyst', earnings: '$12,450', markets: 23, followers: '125K', growth: '+12.4%', sharePrice: '$8.45' },
              { name: 'Jordan Blake', handle: 'econwatch', earnings: '$9,870', markets: 18, followers: '203K', growth: '+8.2%', sharePrice: '$6.32' },
              { name: 'Alex Rivera', handle: 'techinsider', earnings: '$7,230', markets: 15, followers: '89K', growth: '+15.7%', sharePrice: '$5.21' },
              { name: 'Morgan Lee', handle: 'defitrader', earnings: '$6,890', markets: 12, followers: '67K', growth: '+9.8%', sharePrice: '$4.15' },
            ].map((creator, idx) => (
              <div
                key={idx}
                onClick={() => navigate(`/creator/${creator.handle}`)}
                className="bg-[#0a0a0a] rounded-lg border p-4 sm:p-5 hover:shadow-lg transition-all cursor-pointer group active:scale-[0.98]"
                style={{ borderColor: 'rgba(140, 180, 130, 0.35)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)' }}
              >
                <div className="flex items-center gap-3 mb-4 sm:mb-5">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 overflow-hidden bg-gradient-to-br from-[#A4E977]/20 to-[#A4E977]/10 flex items-center justify-center" style={{ borderColor: 'rgba(140, 180, 130, 0.35)' }}>
                    <span className="text-lg sm:text-xl font-bold text-gray-500">{creator.name.substring(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="mb-0.5 text-xs sm:text-sm truncate text-white" style={{ fontWeight: 600 }}>{creator.name}</div>
                    <div className="text-[10px] sm:text-xs text-gray-400 truncate">@{creator.handle}</div>
                  </div>
                </div>

                {/* Share Price */}
                <div className="mb-4 sm:mb-5">
                  <div className="text-[10px] sm:text-xs text-gray-500 mb-1 uppercase tracking-wider" style={{ letterSpacing: '0.05em' }}>Share Price</div>
                  <div className="text-2xl sm:text-3xl text-white" style={{ fontWeight: 700 }}>{creator.sharePrice}</div>
                </div>

                {/* Stats */}
                <div className="space-y-2 sm:space-y-2.5 mb-4 sm:mb-5">
                  <div className="flex items-center justify-between text-[10px] sm:text-xs">
                    <span className="text-gray-500 uppercase tracking-wider" style={{ letterSpacing: '0.05em' }}>Earnings</span>
                    <span className="text-white" style={{ fontWeight: 600 }}>{creator.earnings}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] sm:text-xs">
                    <span className="text-gray-500 uppercase tracking-wider" style={{ letterSpacing: '0.05em' }}>Growth</span>
                    <span className="text-[#A4E977]" style={{ fontWeight: 700 }}>{creator.growth}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] sm:text-xs">
                    <span className="text-gray-500 uppercase tracking-wider" style={{ letterSpacing: '0.05em' }}>Markets</span>
                    <span className="text-white" style={{ fontWeight: 600 }}>{creator.markets}</span>
                  </div>
                </div>

                <button className="w-full py-2 sm:py-2.5 bg-[#A4E977] text-black border-2 rounded-lg hover:bg-[#93d666] transition-all text-[10px] sm:text-xs uppercase tracking-wider" style={{ fontWeight: 600, borderColor: '#A4E977' }}>
                  Buy Shares
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-[#0f0f0f] py-8 sm:py-12 md:py-24">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8">
            <div className="mb-6 sm:mb-8 md:mb-12">
              <h2 className="text-xl sm:text-2xl md:text-4xl mb-1 sm:mb-2 md:mb-3 text-white" style={{ fontWeight: 700 }}>How It Works</h2>
              <p className="text-xs sm:text-sm md:text-lg text-gray-400">Get started in three simple steps</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div className="bg-[#0a0a0a] rounded-lg border p-4 sm:p-5 md:p-6 hover:shadow-lg transition-all active:scale-[0.98]" style={{ borderColor: 'rgba(140, 180, 130, 0.35)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)' }}>
                <div className="mb-3 sm:mb-4">
                  <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 stroke-[1.5] text-[#A4E977]" />
                </div>
                <div className="mb-1 sm:mb-2 text-base sm:text-lg text-white" style={{ fontWeight: 600 }}>Connect Wallet</div>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                  Connect your wallet and link your Twitter account to get started
                </p>
              </div>

              <div className="bg-[#0a0a0a] rounded-lg border p-4 sm:p-5 md:p-6 hover:shadow-lg transition-all active:scale-[0.98]" style={{ borderColor: 'rgba(140, 180, 130, 0.35)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)' }}>
                <div className="mb-3 sm:mb-4">
                  <Users className="w-8 h-8 sm:w-10 sm:h-10 stroke-[1.5] text-[#A4E977]" />
                </div>
                <div className="mb-1 sm:mb-2 text-base sm:text-lg text-white" style={{ fontWeight: 600 }}>Trade Markets</div>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                  Purchase creator shares or trade on prediction markets
                </p>
              </div>

              <div className="bg-[#0a0a0a] rounded-lg border p-4 sm:p-5 md:p-6 hover:shadow-lg transition-all active:scale-[0.98]" style={{ borderColor: 'rgba(140, 180, 130, 0.35)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)' }}>
                <div className="mb-3 sm:mb-4">
                  <DollarSign className="w-8 h-8 sm:w-10 sm:h-10 stroke-[1.5] text-[#A4E977]" />
                </div>
                <div className="mb-1 sm:mb-2 text-base sm:text-lg text-white" style={{ fontWeight: 600 }}>Earn Dividends</div>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                  Share holders earn 0.15% of all market trading fees
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}