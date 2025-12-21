import { X, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';

interface FilterPanelProps {
    isOpen: boolean;
    onClose: () => void;
    filters: {
        volumeRange: [number, number];
        categories: string[];
        priceRange: [number, number];
        expiringDays?: number;
    };
    onFiltersChange: (filters: any) => void;
    availableCategories: string[];
}

export function FilterPanel({
    isOpen,
    onClose,
    filters,
    onFiltersChange,
    availableCategories
}: FilterPanelProps) {
    const [localFilters, setLocalFilters] = useState(filters);

    const handleApply = () => {
        onFiltersChange(localFilters);
        onClose();
    };

    const handleReset = () => {
        const resetFilters = {
            volumeRange: [0, 100000] as [number, number],
            categories: [],
            priceRange: [0, 100] as [number, number],
            expiringDays: undefined
        };
        setLocalFilters(resetFilters);
        onFiltersChange(resetFilters);
    };

    const toggleCategory = (category: string) => {
        setLocalFilters(prev => ({
            ...prev,
            categories: prev.categories.includes(category)
                ? prev.categories.filter(c => c !== category)
                : [...prev.categories, category]
        }));
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={onClose}
            />

            {/* Panel */}
            <div className={`
        fixed md:absolute top-0 right-0 h-full md:h-auto w-full md:w-80 
        bg-background border-l md:border border-foreground/10 rounded-none md:rounded-xl 
        shadow-2xl z-50 overflow-y-auto
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        transition-transform duration-300
      `}>
                {/* Header */}
                <div className="sticky top-0 bg-background border-b border-foreground/10 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-foreground" />
                        <h3 className="text-sm font-semibold text-foreground">Advanced Filters</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-foreground/5 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>

                {/* Filters */}
                <div className="p-4 space-y-6">
                    {/* Volume Range */}
                    <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block" style={{ letterSpacing: '0.05em' }}>
                            Volume Range
                        </label>
                        <div className="space-y-2">
                            <input
                                type="range"
                                min="0"
                                max="100000"
                                step="1000"
                                value={localFilters.volumeRange[1]}
                                onChange={(e) => setLocalFilters(prev => ({
                                    ...prev,
                                    volumeRange: [0, parseInt(e.target.value)]
                                }))}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>$0</span>
                                <span className="font-semibold text-foreground">
                                    ${localFilters.volumeRange[1].toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Categories */}
                    <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block" style={{ letterSpacing: '0.05em' }}>
                            Categories
                        </label>
                        <div className="space-y-2">
                            {availableCategories.map(category => (
                                <label key={category} className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={localFilters.categories.includes(category)}
                                        onChange={() => toggleCategory(category)}
                                        className="w-4 h-4 rounded border-foreground/20 text-foreground focus:ring-foreground/20"
                                    />
                                    <span className="text-sm text-foreground group-hover:opacity-70 transition-opacity">
                                        {category}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Price Range */}
                    <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block" style={{ letterSpacing: '0.05em' }}>
                            Price Range (%)
                        </label>
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={localFilters.priceRange[0]}
                                    onChange={(e) => setLocalFilters(prev => ({
                                        ...prev,
                                        priceRange: [parseInt(e.target.value) || 0, prev.priceRange[1]]
                                    }))}
                                    className="w-full px-3 py-2 bg-background border border-foreground/10 rounded-lg text-sm focus:border-foreground/30 outline-none"
                                    placeholder="Min"
                                />
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={localFilters.priceRange[1]}
                                    onChange={(e) => setLocalFilters(prev => ({
                                        ...prev,
                                        priceRange: [prev.priceRange[0], parseInt(e.target.value) || 100]
                                    }))}
                                    className="w-full px-3 py-2 bg-background border border-foreground/10 rounded-lg text-sm focus:border-foreground/30 outline-none"
                                    placeholder="Max"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Expiring Days */}
                    <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block" style={{ letterSpacing: '0.05em' }}>
                            Expiring Within
                        </label>
                        <select
                            value={localFilters.expiringDays || ''}
                            onChange={(e) => setLocalFilters(prev => ({
                                ...prev,
                                expiringDays: e.target.value ? parseInt(e.target.value) : undefined
                            }))}
                            className="w-full px-3 py-2 bg-background border border-foreground/10 rounded-lg text-sm focus:border-foreground/30 outline-none"
                        >
                            <option value="">Any time</option>
                            <option value="1">24 hours</option>
                            <option value="3">3 days</option>
                            <option value="7">7 days</option>
                            <option value="30">30 days</option>
                        </select>
                    </div>
                </div>

                {/* Actions */}
                <div className="sticky bottom-0 bg-background border-t border-foreground/10 p-4 flex gap-2">
                    <button
                        onClick={handleReset}
                        className="flex-1 px-4 py-2.5 border border-foreground/20 text-foreground rounded-lg hover:bg-foreground/5 transition-colors text-sm font-semibold"
                    >
                        Reset
                    </button>
                    <button
                        onClick={handleApply}
                        className="flex-1 px-4 py-2.5 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity text-sm font-semibold"
                    >
                        Apply
                    </button>
                </div>
            </div>
        </>
    );
}
