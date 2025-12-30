import { useState, useEffect } from 'react';
import { MarketCard } from '../components/MarketCard';
import { FilterPanel } from '../components/FilterPanel';
import { Search, TrendingUp, Clock, Sparkles, SlidersHorizontal, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getTrendingMarkets, getExpiringMarkets, getNewMarkets } from '../lib/api';

type QuickFilter = 'trending' | 'expiring' | 'new';
type SortOption = 'volume-high' | 'volume-low' | 'newest' | 'expiring' | 'active';

export function DiscoverPage() {
    const [quickFilter, setQuickFilter] = useState<QuickFilter>('trending');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('volume-high');
    const [showFilters, setShowFilters] = useState(false);
    const [markets, setMarkets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [filters, setFilters] = useState({
        volumeRange: [0, 100000] as [number, number],
        categories: [] as string[],
        priceRange: [0, 100] as [number, number],
        expiringDays: undefined as number | undefined
    });

    const categories = ['Crypto', 'Sports', 'Politics', 'Entertainment', 'Tech', 'Finance', 'Gaming'];

    useEffect(() => {
        fetchMarkets();
    }, [quickFilter]);

    const fetchMarkets = async () => {
        setLoading(true);
        try {
            let data;
            if (quickFilter === 'trending') {
                data = await getTrendingMarkets();
            } else if (quickFilter === 'expiring') {
                data = await getExpiringMarkets();
            } else {
                data = await getNewMarkets();
            }
            setMarkets(data);
        } catch (error) {
            console.error('Failed to fetch markets:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredMarkets = markets.filter(market => {
        // Search filter
        if (searchQuery && !market.question.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }

        // Volume filter
        const volume = market.volume || 0;
        if (volume < filters.volumeRange[0] || volume > filters.volumeRange[1]) {
            return false;
        }

        // Category filter
        if (filters.categories.length > 0 && !filters.categories.includes(market.category)) {
            return false;
        }

        // Price filter
        const yesOutcome = market.outcomes?.find((o: any) => o.name === 'Yes');
        const yesPrice = yesOutcome ? Math.round(Number(yesOutcome.current_price) * 100) : 50;
        if (yesPrice < filters.priceRange[0] || yesPrice > filters.priceRange[1]) {
            return false;
        }

        // Expiring filter
        if (filters.expiringDays) {
            const deadline = new Date(market.deadline);
            const daysUntil = (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
            if (daysUntil > filters.expiringDays) {
                return false;
            }
        }

        return true;
    });

    const sortedMarkets = [...filteredMarkets].sort((a, b) => {
        switch (sortBy) {
            case 'volume-high':
                return (b.volume || 0) - (a.volume || 0);
            case 'volume-low':
                return (a.volume || 0) - (b.volume || 0);
            case 'newest':
                return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            case 'expiring':
                return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
            case 'active':
                return (b.volume || 0) - (a.volume || 0); // Use volume as proxy for activity
            default:
                return 0;
        }
    });

    return (
        <>
            <div className="bg-black min-h-screen text-white pt-[58px] overflow-x-hidden">
                <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 md:py-6">
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                            Discover Markets
                        </h1>
                        <p className="text-gray-400">
                            Fast market analytics with advanced filtering
                        </p>
                    </div>

                    {/* Quick Filters */}
                    <div className="flex flex-wrap gap-3 mb-6">
                        <button
                            onClick={() => setQuickFilter('trending')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${quickFilter === 'trending'
                                ? 'bg-[#A4E977] text-black shadow-lg'
                                : 'bg-[#0a0a0a] border text-white hover:border-[#A4E977]/50'
                                }`}
                            style={{ fontWeight: 600, borderColor: quickFilter === 'trending' ? '#A4E977' : 'rgba(140, 180, 130, 0.35)' }}
                        >
                            <TrendingUp className="w-4 h-4" />
                            Trending
                        </button>
                        <button
                            onClick={() => setQuickFilter('expiring')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${quickFilter === 'expiring'
                                ? 'bg-[#A4E977] text-black shadow-lg'
                                : 'bg-[#0a0a0a] border text-white hover:border-[#A4E977]/50'
                                }`}
                            style={{ fontWeight: 600, borderColor: quickFilter === 'expiring' ? '#A4E977' : 'rgba(140, 180, 130, 0.35)' }}
                        >
                            <Clock className="w-4 h-4" />
                            Expiring Soon
                        </button>
                        <button
                            onClick={() => setQuickFilter('new')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${quickFilter === 'new'
                                ? 'bg-[#A4E977] text-black shadow-lg'
                                : 'bg-[#0a0a0a] border text-white hover:border-[#A4E977]/50'
                                }`}
                            style={{ fontWeight: 600, borderColor: quickFilter === 'new' ? '#A4E977' : 'rgba(140, 180, 130, 0.35)' }}
                        >
                            <Sparkles className="w-4 h-4" />
                            New Markets
                        </button>
                    </div>

                    {/* Search and Controls */}
                    <div className="flex flex-col md:flex-row gap-3 mb-6">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search markets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-[#0a0a0a] border rounded-lg focus:border-[#A4E977] outline-none transition-colors text-sm text-white placeholder-gray-500"
                                style={{ borderColor: 'rgba(140, 180, 130, 0.35)' }}
                            />
                        </div>

                        {/* Sort */}
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="px-4 py-3 bg-[#0a0a0a] border rounded-lg focus:border-[#A4E977] outline-none transition-colors text-sm font-medium text-white"
                            style={{ borderColor: 'rgba(140, 180, 130, 0.35)' }}
                        >
                            <option value="volume-high">Volume: High to Low</option>
                            <option value="volume-low">Volume: Low to High</option>
                            <option value="newest">Newest First</option>
                            <option value="expiring">Expiring Soon</option>
                            <option value="active">Most Active</option>
                        </select>

                        {/* Advanced Filters Button */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 px-4 py-3 bg-[#0a0a0a] border rounded-lg hover:border-[#A4E977]/50 transition-colors text-sm font-semibold text-white"
                            style={{ borderColor: 'rgba(140, 180, 130, 0.35)' }}
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            Filters
                            {(filters.categories.length > 0 || filters.expiringDays) && (
                                <span className="ml-1 px-2 py-0.5 bg-[#A4E977] text-black rounded-full text-xs">
                                    {filters.categories.length + (filters.expiringDays ? 1 : 0)}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Filter Panel */}
                    <FilterPanel
                        isOpen={showFilters}
                        onClose={() => setShowFilters(false)}
                        filters={filters}
                        onFiltersChange={setFilters}
                        availableCategories={categories}
                    />

                    {/* Loading State */}
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="animate-spin w-8 h-8 text-[#A4E977]" />
                        </div>
                    ) : (
                        <>
                            {/* Markets Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {sortedMarkets.map((market) => {
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
                            {sortedMarkets.length === 0 && (
                                <div className="text-center py-16 bg-[#0a0a0a] rounded-lg border" style={{ borderColor: 'rgba(140, 180, 130, 0.35)' }}>
                                    <p className="text-gray-400 mb-2">No markets found</p>
                                    <button
                                        onClick={() => {
                                            setSearchQuery('');
                                            setFilters({
                                                volumeRange: [0, 100000],
                                                categories: [],
                                                priceRange: [0, 100],
                                                expiringDays: undefined
                                            });
                                        }}
                                        className="text-sm text-[#A4E977] hover:opacity-60 transition-opacity"
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
        </>
    );
}
