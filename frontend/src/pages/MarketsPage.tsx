import { Footer } from '../components/Footer';
import { TrendingUp, TrendingDown, Search, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getMarkets } from '../lib/api';
import { MarketCard } from '../components/MarketCard';

export function MarketsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Markets');
  const [selectedStatus, setSelectedStatus] = useState('active');
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
    'Sports',
    'Politics',
    'Entertainment',
    'Tech',
    'Finance',
    'Gaming',
  ];

  const filteredMarkets = markets.filter(market => {
    const matchesSearch = market.question.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All Markets' || market.category === selectedCategory;

    // Status filter logic
    let matchesStatus = true;
    if (selectedStatus === 'active') matchesStatus = !market.resolved && new Date(market.deadline) > new Date();
    if (selectedStatus === 'resolved') matchesStatus = market.resolved;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <>
      <div className="bg-muted/20 min-h-screen">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex gap-6">
            {/* Left Sidebar - Hidden on mobile */}
            <div className="hidden lg:block w-64 flex-shrink-0">
              <div className="bg-background rounded-xl border border-foreground/10 p-4 sticky top-6">
                {/* Create Market Button */}
                <button
                  onClick={() => navigate('/create-market')}
                  className="w-full py-2.5 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity text-sm mb-6"
                  style={{ fontWeight: 600 }}
                >
                  + Create Market
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

                {/* Status Filters */}
                <div>
                  <h3 className="text-xs text-muted-foreground mb-3 uppercase tracking-wider" style={{ letterSpacing: '0.05em' }}>
                    Status
                  </h3>
                  <div className="space-y-1">
                    <button
                      onClick={() => setSelectedStatus('all')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${selectedStatus === 'all'
                        ? 'bg-foreground/5 text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                        }`}
                      style={{ fontWeight: selectedStatus === 'all' ? 600 : 400 }}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedStatus('active')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${selectedStatus === 'active'
                        ? 'bg-foreground/5 text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                        }`}
                      style={{ fontWeight: selectedStatus === 'active' ? 600 : 400 }}
                    >
                      Active
                    </button>
                    <button
                      onClick={() => setSelectedStatus('resolved')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${selectedStatus === 'resolved'
                        ? 'bg-foreground/5 text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                        }`}
                      style={{ fontWeight: selectedStatus === 'resolved' ? 600 : 400 }}
                    >
                      Resolved
                    </button>
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
                    placeholder="Search markets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 md:py-2.5 bg-background border border-foreground/10 rounded-lg focus:border-foreground/30 outline-none transition-colors text-sm"
                  />
                </div>
              </div>

              {/* Loading State */}
              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Markets Grid - Smaller Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMarkets.map((market) => {
                      // Mock data for missing fields if API doesn't return them yet
                      const yesOutcome = market.outcomes?.find((o: any) => o.name === 'Yes');
                      const yesPrice = yesOutcome ? Math.round(Number(yesOutcome.current_price) * 100) : 50;
                      const noPrice = 100 - yesPrice;
                      const priceChange = market.priceChange || 0;
                      const volume = market.volume ? `${Number(market.volume).toLocaleString()}` : '0';
                      const creatorName = market.creator?.display_name || market.creator?.twitter_handle || 'Guessly User';

                      return (
                        <Link
                          key={market.id}
                          to={`/market/${market.id}`}
                          className="block hover:scale-[1.02] transition-transform duration-200"
                        >
                          <MarketCard
                            title={market.question}
                            creator={creatorName}
                            yesPrice={yesPrice}
                            noPrice={noPrice}
                            volume={volume}
                            priceChange={priceChange}
                            imageUrl={market.image_url}
                          />
                        </Link>
                      );
                    })}
                  </div>

                  {/* Empty State */}
                  {filteredMarkets.length === 0 && (
                    <div className="text-center py-16 bg-background rounded-xl border border-foreground/10">
                      <p className="text-muted-foreground mb-2">No markets found</p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('All Markets');
                          setSelectedStatus('all');
                        }}
                        className="text-sm text-foreground hover:opacity-60 transition-opacity"
                        style={{ fontWeight: 500 }}
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