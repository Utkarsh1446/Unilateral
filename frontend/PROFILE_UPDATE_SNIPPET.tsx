// Add this state at the top of ProfilePage component (around line 40)
const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history'>('positions');

// Replace the "Market Positions" section (lines 747-803) with this:

{/* Market Positions - Tabbed Interface */ }
<div className="mb-6">
    {/* Tabs */}
    <div className="flex gap-6 border-b border-foreground/10 mb-6">
        <button
            onClick={() => setActiveTab('positions')}
            className={`pb-3 px-1 text-sm font-semibold transition-colors ${activeTab === 'positions'
                    ? 'border-b-2 border-foreground text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
        >
            Positions
        </button>
        <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 px-1 text-sm transition-colors ${activeTab === 'orders'
                    ? 'border-b-2 border-foreground text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
        >
            Open orders
        </button>
        <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-1 text-sm transition-colors ${activeTab === 'history'
                    ? 'border-b-2 border-foreground text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
        >
            History
        </button>
    </div>

    {/* Search Bar */}
    <div className="mb-4">
        <div className="relative">
            <input
                type="text"
                placeholder="Search"
                className="w-full pl-10 pr-4 py-2 bg-background border border-foreground/10 rounded-lg text-sm focus:outline-none focus:border-foreground/30"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        </div>
    </div>

    {/* Positions Tab Content */}
    {activeTab === 'positions' && (
        <>
            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
            ) : positions.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    No positions found.
                </div>
            ) : (
                <div className="bg-background rounded-xl border border-foreground/10 overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/30 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        <div className="col-span-4">MARKET</div>
                        <div className="col-span-2 text-right">AVG → NOW</div>
                        <div className="col-span-2 text-right">BET</div>
                        <div className="col-span-2 text-right">TO WIN</div>
                        <div className="col-span-2 text-right">VALUE</div>
                    </div>

                    {/* Table Rows */}
                    <div className="divide-y divide-foreground/10">
                        {positions.map((position) => {
                            const betAmount = position.sharesRaw * 0.5; // Assuming avg price of 50¢
                            const toWin = position.sharesRaw * 1.0; // Potential win is 1:1
                            const currentValue = position.sharesRaw * (parseFloat(position.currentPrice.replace('¢', '')) / 100);

                            return (
                                <Link
                                    key={position.id + '-' + position.outcomeIndex}
                                    to={`/market/${position.id}`}
                                    className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-muted/20 transition-colors items-center"
                                >
                                    {/* Market */}
                                    <div className="col-span-4">
                                        <div className="text-sm font-medium mb-1 line-clamp-2">{position.question}</div>
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${position.position === 'YES'
                                                ? 'bg-green-500/10 text-green-700'
                                                : 'bg-red-500/10 text-red-700'
                                            }`}>
                                            {position.position}
                                        </span>
                                    </div>

                                    {/* AVG → NOW */}
                                    <div className="col-span-2 text-right">
                                        <div className="text-sm font-medium">
                                            {position.avgPrice} → {position.currentPrice}
                                        </div>
                                    </div>

                                    {/* BET */}
                                    <div className="col-span-2 text-right">
                                        <div className="text-sm font-medium">
                                            ${betAmount.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {position.shares} shares
                                        </div>
                                    </div>

                                    {/* TO WIN */}
                                    <div className="col-span-2 text-right">
                                        <div className="text-sm font-medium text-green-600">
                                            ${toWin.toFixed(2)}
                                        </div>
                                    </div>

                                    {/* VALUE */}
                                    <div className="col-span-2 text-right">
                                        <div className="text-sm font-bold">
                                            ${currentValue.toFixed(2)}
                                        </div>
                                        <div className={`text-xs font-semibold ${currentValue >= betAmount ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                            {currentValue >= betAmount ? '+' : ''}{((currentValue - betAmount) / betAmount * 100).toFixed(1)}%
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    )}

    {/* Open Orders Tab Content */}
    {activeTab === 'orders' && (
        <div className="text-center py-16 text-muted-foreground">
            No open orders found.
        </div>
    )}

    {/* History Tab Content */}
    {activeTab === 'history' && (
        <div className="text-center py-16 text-muted-foreground">
            No history found.
        </div>
    )}
</div>
