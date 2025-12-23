import { Footer } from '../components/Footer';
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
      <div className="bg-black min-h-screen text-white">
        <div className="max-w-[1920px] mx-auto px-6 py-6">
          <div className="flex gap-6">
            {/* Left Sidebar */}
            <div className="w-[200px] flex-shrink-0">
              <div className="bg-[#A4E977] rounded-lg p-4 mb-4">
                <button
                  onClick={() => navigate('/create-market')}
                  className="w-full py-2.5 bg-black text-[#A4E977] rounded-lg hover:bg-gray-900 transition-colors text-sm font-semibold"
                >
                  Create Market
                </button>
              </div>

              {/* Categories */}
              <div className="bg-[#0f0f0f] rounded-lg border border-[rgba(140,180,130,0.35)] p-4">
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
                    className="w-full pl-11 pr-4 py-3 bg-[#0f0f0f] border border-[rgba(140,180,130,0.35)] rounded-lg focus:border-[#A4E977] outline-none transition-colors text-sm text-white placeholder-gray-500"
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                          <div className="bg-[#0a0a0a] border border-[rgba(140,180,130,0.35)] rounded-lg p-5 hover:border-[#A4E977] transition-all duration-200 hover:shadow-lg hover:shadow-[#A4E977]/20">
                            {/* Icon Badge */}
                            <div className="mb-4">
                              <div className="w-10 h-10 rounded-full bg-purple-600/30 border-2 border-purple-500/60 flex items-center justify-center">
                                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                              </div>
                            </div>

                            {/* Market Question */}
                            <h3 className="text-base font-normal text-white mb-4 line-clamp-2 leading-snug">
                              {market.question}
                            </h3>

                            {/* Percentage Display */}
                            <div className="mb-4">
                              <span className="text-3xl font-bold text-[#A4E977]">{yesPrice}%</span>
                              <span className="text-base font-normal text-gray-400 ml-2">Chances</span>
                            </div>

                            {/* YES/NO Buttons */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <button className="py-2.5 bg-[#A4E977] text-black rounded-lg text-sm font-bold hover:bg-[#8FD65E] transition-colors uppercase tracking-wide">
                                YES
                              </button>
                              <button className="py-2.5 bg-[#1f1f1f] text-white rounded-lg text-sm font-bold hover:bg-[#2a2a2a] transition-colors border border-gray-700/50 uppercase tracking-wide">
                                NO
                              </button>
                            </div>

                            {/* Volume */}
                            <div className="text-sm text-gray-400 mb-3">
                              ${volume} Volume
                            </div>

                            {/* Footer */}
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <span>Market by Super Pumped</span>
                              <svg className="w-3.5 h-3.5 text-[#A4E977]" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Empty State */}
                  {filteredMarkets.length === 0 && (
                    <div className="text-center py-16 bg-[#0a0a0a] rounded-lg border border-[rgba(140,180,130,0.35)]">
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
      <Footer />
    </>
  );
}