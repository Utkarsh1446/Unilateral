import { TrendingUp, TrendingDown, Users, DollarSign } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { MarketCard } from '../components/MarketCard';
import { useNavigate } from 'react-router-dom';
import avatar1 from 'figma:asset/d5f3cf6e0ede9bba3fde8f3aae85b53f0dd4ad84.png';
import avatar2 from 'figma:asset/d7a7683f99c197cb4b3877e48543242a5d20395c.png';
import avatar3 from 'figma:asset/b18ac5ad404f2d64f43d9f66c0ba656f0a781795.png';

export default function HomePage() {
  const navigate = useNavigate();

  const featuredMarkets = [
    {
      id: 1,
      question: 'Will Bitcoin reach $150k by end of Q1 2025?',
      creator: 'Sarah Chen',
      category: 'Crypto',
      yesPrice: 67,
      noPrice: 33,
      volume: '$234.5K',
      endDate: 'Mar 31, 2025',
      imageUrl: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
    },
    {
      id: 2,
      question: 'Will Apple announce AR glasses at WWDC 2025?',
      creator: 'Jordan Blake',
      category: 'Technology',
      yesPrice: 42,
      noPrice: 58,
      volume: '$189.2K',
      endDate: 'Jun 10, 2025',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
    },
    {
      id: 3,
      question: 'Will Tesla stock hit $400 in Q1 2025?',
      creator: 'Alex Rivera',
      category: 'Business',
      yesPrice: 55,
      noPrice: 45,
      volume: '$156.8K',
      endDate: 'Mar 31, 2025',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Tesla_logo.png',
    },
    {
      id: 4,
      question: 'Will Ethereum surpass $5,000 before February?',
      creator: 'Morgan Lee',
      category: 'Crypto',
      yesPrice: 38,
      noPrice: 62,
      volume: '$145.3K',
      endDate: 'Jan 31, 2025',
      imageUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="mx-auto px-4 md:px-8 py-6 md:py-12 max-w-[1600px]">
        <div className="bg-background rounded-2xl border-2 border-foreground">
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y-2 lg:divide-y-0 lg:divide-x-2 divide-foreground">
            {/* Left Section - Text */}
            <div className="p-8 md:p-12 lg:p-20 flex flex-col justify-center min-h-[400px] md:min-h-[500px]">
              <h1 className="text-2xl md:text-4xl lg:text-5xl mb-4 md:mb-6 tracking-tight leading-tight" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>
                You have followers<br />but<br />Have you got the voice?
              </h1>

              <p className="text-sm md:text-lg text-muted-foreground leading-relaxed" style={{ fontWeight: 400 }}>
                Buy shares in creators. Trade on their prediction markets. Earn dividends from every trade.
              </p>
            </div>

            {/* Right Section - Empty for now */}
            <div className="p-8 md:p-12 lg:p-20 min-h-[300px] md:min-h-[500px]">
              {/* Empty for now */}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Markets */}
      <section className="mx-auto px-4 md:px-8 py-12 md:py-24 max-w-[1600px]">
        <div className="mb-8 md:mb-12">
          <h2 className="text-2xl md:text-4xl mb-2 md:mb-3" style={{ fontWeight: 700 }}>Featured Markets</h2>
          <p className="text-sm md:text-lg text-muted-foreground">Top prediction markets right now</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {featuredMarkets.map((market) => (
            <div key={market.id} onClick={() => navigate(`/market/${market.id}`)} className="cursor-pointer">
              <MarketCard {...market} />
            </div>
          ))}
        </div>
      </section>

      {/* Trending Creators */}
      <section className="mx-auto px-4 md:px-8 py-12 md:py-24 max-w-[1600px]">
        <div className="mb-8 md:mb-12">
          <h2 className="text-2xl md:text-4xl mb-2 md:mb-3" style={{ fontWeight: 700 }}>Trending Creators</h2>
          <p className="text-sm md:text-lg text-muted-foreground">Top performing creators this week</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[
            { name: 'Sarah Chen', handle: 'cryptoanalyst', earnings: '$12,450', markets: 23, followers: '125K', growth: '+12.4%', sharePrice: '$8.45', avatarImage: avatar1 },
            { name: 'Jordan Blake', handle: 'econwatch', earnings: '$9,870', markets: 18, followers: '203K', growth: '+8.2%', sharePrice: '$6.32', avatarImage: avatar2 },
            { name: 'Alex Rivera', handle: 'techinsider', earnings: '$7,230', markets: 15, followers: '89K', growth: '+15.7%', sharePrice: '$5.21', avatarImage: avatar3 },
            { name: 'Morgan Lee', handle: 'defitrader', earnings: '$6,890', markets: 12, followers: '67K', growth: '+9.8%', sharePrice: '$4.15', avatarImage: avatar1 },
          ].map((creator, idx) => (
            <div
              key={idx}
              onClick={() => navigate(`/creator/${creator.handle}`)}
              className="bg-background rounded-2xl border-2 border-foreground p-5 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-full border-2 border-foreground/20 overflow-hidden">
                  <img src={creator.avatarImage} alt={creator.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="mb-0.5 text-sm truncate" style={{ fontWeight: 600 }}>{creator.name}</div>
                  <div className="text-xs text-muted-foreground truncate">@{creator.handle}</div>
                </div>
              </div>

              {/* Share Price */}
              <div className="mb-5">
                <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider" style={{ letterSpacing: '0.05em' }}>Share Price</div>
                <div className="text-3xl" style={{ fontWeight: 700 }}>{creator.sharePrice}</div>
              </div>

              {/* Stats */}
              <div className="space-y-2.5 mb-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground uppercase tracking-wider" style={{ letterSpacing: '0.05em' }}>Earnings</span>
                  <span style={{ fontWeight: 600 }}>{creator.earnings}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground uppercase tracking-wider" style={{ letterSpacing: '0.05em' }}>Growth</span>
                  <span className="text-green-600" style={{ fontWeight: 700 }}>{creator.growth}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground uppercase tracking-wider" style={{ letterSpacing: '0.05em' }}>Markets</span>
                  <span style={{ fontWeight: 600 }}>{creator.markets}</span>
                </div>
              </div>

              <button className="w-full py-2.5 bg-foreground text-background border-2 border-foreground rounded-xl hover:bg-background hover:text-foreground transition-all text-xs uppercase tracking-wider" style={{ fontWeight: 600 }}>
                Buy Shares
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works - with background section */}
      <section className="bg-muted/30 py-12 md:py-24">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8">
          <div className="mb-8 md:mb-12">
            <h2 className="text-2xl md:text-4xl mb-2 md:mb-3" style={{ fontWeight: 700 }}>How It Works</h2>
            <p className="text-sm md:text-lg text-muted-foreground">Get started in three simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-background rounded-2xl border-2 border-foreground p-5 md:p-6 hover:shadow-lg transition-all active:scale-[0.98]">
              <div className="mb-4">
                <TrendingUp className="w-10 h-10 stroke-[1.5]" />
              </div>
              <div className="mb-2 text-lg" style={{ fontWeight: 600 }}>Connect Wallet</div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connect your wallet and link your Twitter account to get started
              </p>
            </div>

            <div className="bg-background rounded-2xl border-2 border-foreground p-5 md:p-6 hover:shadow-lg transition-all active:scale-[0.98]">
              <div className="mb-4">
                <Users className="w-10 h-10 stroke-[1.5]" />
              </div>
              <div className="mb-2 text-lg" style={{ fontWeight: 600 }}>Trade Markets</div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Purchase creator shares or trade on prediction markets
              </p>
            </div>

            <div className="bg-background rounded-2xl border-2 border-foreground p-5 md:p-6 hover:shadow-lg transition-all active:scale-[0.98]">
              <div className="mb-4">
                <DollarSign className="w-10 h-10 stroke-[1.5]" />
              </div>
              <div className="mb-2 text-lg" style={{ fontWeight: 600 }}>Earn Dividends</div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Share holders earn 0.15% of all market trading fees
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}