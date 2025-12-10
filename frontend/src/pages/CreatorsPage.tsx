import { Footer } from '../components/Footer';
import { TrendingUp, TrendingDown, Search, Users, BadgeCheck, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getCreators } from '../lib/api';

interface Creator {
  id: string;
  twitter_handle: string;
  display_name?: string;
  profile_image?: string;
  follower_count: number;
  engagement_rate: string;
  total_market_volume: string;
  total_shares: number;
  share_price?: string;
  holders_count?: number;
  dividend_rate?: number;
}

export function CreatorsPage() {
  const navigate = useNavigate();
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Creators');
  const [sortBy, setSortBy] = useState('volume');

  const categories = [
    'All Creators',
    'Crypto',
    'Sports',
    'Politics',
    'Entertainment',
    'Tech',
    'Finance',
    'Gaming',
  ];

  useEffect(() => {
    fetchCreators();
  }, []);

  const fetchCreators = async () => {
    try {
      const data = await getCreators();
      const mapped = data.map((c: Creator) => ({
        id: c.id,
        handle: c.twitter_handle,
        name: c.display_name || c.twitter_handle,
        avatar: c.twitter_handle.substring(0, 2).toUpperCase(),
        profileImage: c.profile_image,
        sharePrice: c.share_price || '1.00',
        priceChange: (Math.random() * 20 - 10).toFixed(1), // TODO: Calculate from actual data
        totalVolume: `$${parseFloat(c.total_market_volume || '0').toLocaleString()}`,
        holders: c.holders_count || 0,
        dividend: c.dividend_rate || 0.38, // Default dividend rate
        activeMarkets: 0, // Will be fetched separately if needed
        verified: true,
        category: 'Crypto',
      }));
      setCreators(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCreators = creators.filter(creator => {
    const matchesSearch = creator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creator.handle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All Creators' || creator.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const sortedCreators = [...filteredCreators].sort((a, b) => {
    switch (sortBy) {
      case 'volume':
        return parseFloat(b.totalVolume.replace(/[^0-9.-]+/g, '')) - parseFloat(a.totalVolume.replace(/[^0-9.-]+/g, ''));
      case 'price':
        return parseFloat(b.sharePrice) - parseFloat(a.sharePrice);
      case 'holders':
        return b.holders - a.holders;
      case 'markets':
        return b.activeMarkets - a.activeMarkets;
      default:
        return 0;
    }
  });

  return (
    <>
      <div className="bg-muted/20 min-h-screen">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex gap-6">
            {/* Left Sidebar - Hidden on mobile */}
            <div className="hidden lg:block w-64 flex-shrink-0">
              <div className="bg-background rounded-xl border border-foreground/10 p-4 sticky top-6">
                {/* Become Creator Button */}
                <button
                  onClick={() => navigate('/become-creator')}
                  className="w-full py-2.5 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity text-sm mb-6"
                  style={{ fontWeight: 600 }}
                >
                  + Become a Creator
                </button>

                {/* Categories */}
                <div className="mb-6">
                  <h3 className="text-xs text-muted-foreground mb-3 uppercase tracking-wider" style={{ letterSpacing: '0.05em' }}>
                    Categories
                  </h3>
                  <div className="space-y-1">
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${selectedCategory === category
                          ? 'bg-foreground/5 text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                          }`}
                        style={{ fontWeight: selectedCategory === category ? 600 : 400 }}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort Options */}
                <div>
                  <h3 className="text-xs text-muted-foreground mb-3 uppercase tracking-wider" style={{ letterSpacing: '0.05em' }}>
                    Sort By
                  </h3>
                  <div className="space-y-1">
                    {[
                      { value: 'volume', label: 'Volume' },
                      { value: 'price', label: 'Share Price' },
                      { value: 'holders', label: 'Holders' },
                      { value: 'markets', label: 'Active Markets' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSortBy(option.value)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${sortBy === option.value
                          ? 'bg-foreground/5 text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                          }`}
                        style={{ fontWeight: sortBy === option.value ? 600 : 400 }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {/* Mobile Category Filters - Horizontal Scroll */}
              <div className="lg:hidden mb-4 -mx-4 px-4">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`flex-shrink-0 px-4 py-2 rounded-full text-xs transition-all ${selectedCategory === category
                        ? 'bg-foreground text-background'
                        : 'bg-background border border-foreground/10 text-muted-foreground'
                        }`}
                      style={{ fontWeight: selectedCategory === category ? 600 : 400 }}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="mb-4 md:mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search creators..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 md:py-2.5 bg-background border border-foreground/10 rounded-lg focus:border-foreground/30 outline-none transition-colors text-sm"
                  />
                </div>
              </div>

              {/* Creators Grid */}
              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  {sortedCreators.map((creator) => {
                    const isPositive = parseFloat(creator.priceChange) > 0;
                    return (
                      <Link
                        key={creator.id}
                        to={`/creator/${creator.id}`}
                        className="block bg-background rounded-2xl border-2 border-foreground/20 p-2 hover:shadow-lg hover:border-foreground/40 transition-all group active:scale-[0.98]"
                      >
                        {/* Inner Card */}
                        <div className="border border-foreground/10 rounded-xl p-4 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/50 min-h-[260px] flex flex-col">
                          {/* Category Badge - Top Right */}
                          <div className="flex justify-end mb-2">
                            <div className="px-1.5 py-0.5 bg-background/80 border border-foreground/10 rounded text-[8px] uppercase tracking-wider" style={{ fontWeight: 600 }}>
                              {creator.category}
                            </div>
                          </div>

                          {/* Large Avatar - Center */}
                          <div className="flex-1 flex items-center justify-center mb-3">
                            <div className="relative">
                              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-foreground/20 group-hover:scale-105 transition-transform bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                                {creator.profileImage ? (
                                  <img
                                    src={creator.profileImage.replace('_normal', '')}
                                    alt={creator.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                ) : null}
                                <span className={`text-2xl font-bold text-foreground/50 ${creator.profileImage ? 'hidden' : ''}`}>
                                  {creator.avatar}
                                </span>
                              </div>
                              {creator.verified && (
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center border-2 border-background">
                                  <BadgeCheck className="w-3.5 h-3.5 text-white" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Name Section */}
                          <div className="text-center mb-3">
                            <h3 className="text-base mb-0.5" style={{ fontWeight: 700 }}>{creator.name}</h3>
                            <div className="text-xs text-muted-foreground">@{creator.handle}</div>
                          </div>

                          {/* Stats Bar - Holders, Price, Dividend */}
                          <div className="grid grid-cols-3 gap-2 mb-2.5 pb-2.5 border-b border-foreground/10">
                            <div className="text-center">
                              <div className="text-[8px] text-muted-foreground mb-0.5 uppercase" style={{ letterSpacing: '0.05em' }}>
                                Holders
                              </div>
                              <div className="text-xs" style={{ fontWeight: 700 }}>{creator.holders}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[8px] text-muted-foreground mb-0.5 uppercase" style={{ letterSpacing: '0.05em' }}>
                                Price
                              </div>
                              <div className="text-xs" style={{ fontWeight: 700 }}>${creator.sharePrice}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[8px] text-muted-foreground mb-0.5 uppercase" style={{ letterSpacing: '0.05em' }}>
                                Dividend
                              </div>
                              <div className="text-xs" style={{ fontWeight: 700 }}>{creator.dividend}%</div>
                            </div>
                          </div>

                          {/* Price Change - Bottom */}
                          <div className="bg-background/80 border border-foreground/10 rounded-lg p-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-[8px] text-muted-foreground mb-0.5 uppercase tracking-wider" style={{ letterSpacing: '0.05em' }}>
                                  Share Price
                                </div>
                                <div className="text-lg" style={{ fontWeight: 700 }}>
                                  ${creator.sharePrice}
                                </div>
                              </div>
                              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${isPositive ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                <span className="text-xs" style={{ fontWeight: 700 }}>{isPositive ? '+' : ''}{creator.priceChange}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Empty State */}
              {!loading && sortedCreators.length === 0 && (
                <div className="text-center py-16 bg-background rounded-xl border border-foreground/10">
                  <p className="text-muted-foreground mb-2">No creators found</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All Creators');
                    }}
                    className="text-sm text-foreground hover:opacity-60 transition-opacity"
                    style={{ fontWeight: 500 }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}