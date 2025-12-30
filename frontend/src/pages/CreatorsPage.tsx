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
      <div className="bg-black min-h-screen text-white pt-[58px] overflow-x-hidden">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex gap-6">
            {/* Left Sidebar - Hidden on mobile */}
            <div className="hidden lg:block w-[200px] flex-shrink-0">
              <div className="bg-[#A4E977] rounded-lg p-4 mb-4" style={{ border: '1px solid #A4E977' }}>
                <button
                  onClick={() => navigate('/become-creator')}
                  className="w-full py-2.5 bg-black text-[#A4E977] rounded-lg hover:bg-gray-900 transition-colors text-sm font-semibold"
                >
                  + Become a Creator
                </button>
              </div>

              {/* Categories */}
              <div className="bg-[#0f0f0f] rounded-lg p-4" style={{ border: '1px solid #A4E977' }}>
                <h3 className="text-sm font-semibold text-white mb-3">Categories</h3>
                <div className="space-y-1">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${selectedCategory === category
                        ? 'bg-[#A4E977]/20 text-[#A4E977] font-medium'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                        }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0 w-full">
              {/* Mobile "Become a Creator" Button */}
              <div className="lg:hidden mb-4">
                <button
                  onClick={() => navigate('/become-creator')}
                  className="w-full py-3 bg-[#A4E977] text-black rounded-lg hover:bg-[#93d666] transition-colors text-sm font-semibold"
                >
                  + Become a Creator
                </button>
              </div>

              {/* Mobile Category Filters - Horizontal Scroll */}
              <div className="lg:hidden mb-4 -mx-4 sm:-mx-6 px-4 sm:px-6">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`flex-shrink-0 px-4 py-2 rounded-full text-xs transition-all font-semibold ${selectedCategory === category
                        ? 'bg-[#A4E977] text-black'
                        : 'bg-[#1a1a1a] border text-gray-400 hover:text-white'
                        }`}
                      style={{ borderColor: selectedCategory === category ? '#A4E977' : 'rgba(140, 180, 130, 0.35)' }}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="mb-6">

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search creators..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-[#0f0f0f] rounded-lg focus:border-[#A4E977] outline-none transition-colors text-sm text-white placeholder-gray-500"
                    style={{ border: '1px solid #A4E977' }}
                  />
                </div>
              </div>

              {/* Creators Grid */}
              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-[#A4E977]" /></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sortedCreators.map((creator) => {
                    const isPositive = parseFloat(creator.priceChange) > 0;
                    return (
                      <Link
                        key={creator.id}
                        to={`/creator/${creator.id}`}
                        className="block bg-[#0f0f0f] rounded-lg hover:shadow-lg transition-all group active:scale-[0.98]"
                        style={{ border: '1px solid #A4E977' }}
                      >
                        {/* Inner Card */}
                        <div className="p-4 min-h-[280px] flex flex-col">
                          {/* Category Badge - Top Right */}
                          <div className="flex justify-end mb-2">
                            <div className="px-2 py-0.5 bg-[#1a1a1a] border rounded text-[9px] uppercase tracking-wider font-semibold text-gray-400" style={{ borderColor: 'rgba(140, 180, 130, 0.35)' }}>
                              {creator.category}
                            </div>
                          </div>

                          {/* Large Avatar - Center */}
                          <div className="flex-1 flex items-center justify-center mb-3">
                            <div className="relative">
                              <div className="w-20 h-20 rounded-full overflow-hidden border-2 group-hover:scale-105 transition-transform bg-gradient-to-br from-[#A4E977]/20 to-[#A4E977]/10 flex items-center justify-center" style={{ borderColor: 'rgba(140, 180, 130, 0.35)' }}>
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
                                <span className={`text-2xl font-bold text-gray-500 ${creator.profileImage ? 'hidden' : ''}`}>
                                  {creator.avatar}
                                </span>
                              </div>
                              {creator.verified && (
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#A4E977] rounded-full flex items-center justify-center border-2 border-black">
                                  <BadgeCheck className="w-3.5 h-3.5 text-black" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Name Section */}
                          <div className="text-center mb-3">
                            <h3 className="text-base font-bold text-white mb-0.5">{creator.name}</h3>
                            <div className="text-xs text-gray-500">@{creator.handle}</div>
                          </div>

                          {/* Stats Bar - Holders, Price, Dividend */}
                          <div className="grid grid-cols-3 gap-2 mb-2.5 pb-2.5 border-b" style={{ borderColor: 'rgba(140, 180, 130, 0.35)' }}>
                            <div className="text-center">
                              <div className="text-[9px] text-gray-500 mb-0.5 uppercase tracking-wider font-semibold">
                                Holders
                              </div>
                              <div className="text-xs font-bold text-white">{creator.holders}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[9px] text-gray-500 mb-0.5 uppercase tracking-wider font-semibold">
                                Price
                              </div>
                              <div className="text-xs font-bold text-white">${creator.sharePrice}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[9px] text-gray-500 mb-0.5 uppercase tracking-wider font-semibold">
                                Dividend
                              </div>
                              <div className="text-xs font-bold text-white">{creator.dividend}%</div>
                            </div>
                          </div>

                          {/* Price Change - Bottom */}
                          <div className="bg-[#1a1a1a] border rounded-lg p-2" style={{ borderColor: 'rgba(140, 180, 130, 0.35)' }}>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-[9px] text-gray-500 mb-0.5 uppercase tracking-wider font-semibold">
                                  Share Price
                                </div>
                                <div className="text-lg font-bold text-white">
                                  ${creator.sharePrice}
                                </div>
                              </div>
                              <div className={`flex items-center gap-1 px-2 py-1 rounded ${isPositive ? 'bg-[#A4E977]/20 text-[#A4E977]' : 'bg-red-500/20 text-red-400'}`}>
                                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                <span className="text-xs font-bold">{isPositive ? '+' : ''}{creator.priceChange}%</span>
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
                <div className="text-center py-16 bg-[#0f0f0f] rounded-lg" style={{ border: '1px solid #A4E977' }}>
                  <p className="text-gray-400 mb-2">No creators found</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All Creators');
                    }}
                    className="text-sm text-[#A4E977] hover:opacity-60 transition-opacity font-medium"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}