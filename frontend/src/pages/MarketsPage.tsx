import { Search, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getMarkets } from '../lib/api';

export function MarketsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Markets');
  const [markets, setMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarkets();
  }, []);

  const fetchMarkets = async () => {
    try {
      const data = await getMarkets();
      setMarkets(data);
    } catch (error) {
      console.error("Failed to fetch markets:", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'All Markets',
    'Crypto',
    'Politics',
    'Entertainment',
    'Technology',
    'Finance',
    'Gaming',
  ];

  const filteredMarkets = markets.filter(market => {
    const matchesSearch = market.question.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All Markets' || market.category === selectedCategory;
    const isActive = !market.resolved && new Date(market.deadline) > new Date();
    return matchesSearch && matchesCategory && isActive;
  });

  return (
    <>
      <div className="bg-black min-h-screen text-white pt-[58px]">
        <div className="max-w-[1920px] mx-auto px-6 py-6">
          <div className="flex gap-6">
            {/* Left Sidebar */}
            <div className="w-[200px] flex-shrink-0">
              <div className="bg-[#A4E977] rounded-lg p-4 mb-4" style={{ border: '1px solid #A4E977' }}>
                <button
                  onClick={() => navigate('/create-market')}
                  className="w-full py-2.5 bg-black text-[#A4E977] rounded-lg hover:bg-gray-900 transition-colors text-sm font-semibold"
                >
                  Create Market
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
            <div className="flex-1">
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search markets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-[#0f0f0f] rounded-lg focus:border-[#A4E977] outline-none transition-colors text-sm text-white placeholder-gray-500"
                    style={{ border: '1px solid #A4E977' }}
                  />
                </div>
              </div>

              {/* Loading State */}
              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="animate-spin w-8 h-8 text-[#A4E977]" />
                </div>
              ) : (
                <>
                  {/* Markets Grid */}
                  <div className="flex flex-wrap gap-4">
                    {filteredMarkets.map((market) => {
                      const yesOutcome = market.outcomes?.find((o: any) => o.name === 'Yes');
                      const yesPrice = yesOutcome ? Math.round(Number(yesOutcome.current_price) * 100) : 50;
                      const noPrice = 100 - yesPrice;
                      const volume = market.volume ? `${(Number(market.volume) / 1000).toFixed(0)}k` : '0';

                      return (
                        <Link
                          key={market.id}
                          to={`/market/${market.id}`}
                          className="block group"
                        >
                          <div
                            className="bg-[#171717] rounded-3xl p-5 hover:shadow-lg hover:shadow-[#35A921]/20 transition-all duration-200"
                            style={{
                              width: '375px',
                              height: '192px',
                              border: '1px solid rgba(211, 211, 211, 0.2)'
                            }}
                          >
                            {/* Title with Image */}
                            <div className="flex items-start gap-3 mb-3">
                              {market.image_url ? (
                                <img
                                  src={market.image_url}
                                  alt=""
                                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-purple-600/30 border-2 border-purple-500/60 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                  </svg>
                                </div>
                              )}
                              <h3 className="text-sm font-normal text-white line-clamp-2 leading-snug flex-1">
                                {market.question}
                              </h3>
                            </div>

                            {/* Percentage Display - Aligned with title start */}
                            <div className="mb-3 ml-[52px]">
                              <span className="text-3xl font-bold text-[#35A921]">{yesPrice}% Chances</span>
                            </div>

                            {/* YES/NO Buttons */}
                            <div className="flex gap-3 mb-3 ml-[52px]">
                              <button
                                className="bg-[#35A921] text-white hover:bg-[#2d8f1c] transition-colors"
                                style={{
                                  width: '150px',
                                  height: '36px',
                                  borderRadius: '9999px',
                                  fontFamily: 'Inter',
                                  fontWeight: 500,
                                  fontSize: '14px',
                                  lineHeight: '20px'
                                }}
                              >
                                YES
                              </button>
                              <button
                                className="bg-[#1f1f1f] text-white hover:bg-[#2a2a2a] transition-colors"
                                style={{
                                  width: '150px',
                                  height: '36px',
                                  borderRadius: '9999px',
                                  border: '1px solid rgba(211, 211, 211, 0.2)',
                                  fontFamily: 'Inter',
                                  fontWeight: 500,
                                  fontSize: '14px',
                                  lineHeight: '20px'
                                }}
                              >
                                NO
                              </button>
                            </div>

                            {/* Footer - Volume Left, Market by Right */}
                            <div className="flex items-center justify-between text-xs ml-[52px]">
                              <div className="text-gray-400">
                                ${volume} Volume
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-500">
                                <span>Market by Super Pumped</span>
                                <svg className="w-3.5 h-3.5 text-[#35A921]" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Empty State */}
                  {filteredMarkets.length === 0 && (
                    <div className="text-center py-16 bg-[#0a0a0a] rounded-lg" style={{ border: '1px solid #A4E977' }}>
                      <p className="text-gray-400 mb-2">No markets found</p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('All Markets');
                        }}
                        className="text-sm text-[#A4E977] hover:opacity-60 transition-opacity font-medium"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}