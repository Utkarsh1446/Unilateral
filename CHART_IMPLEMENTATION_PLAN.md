# Professional Trading Chart Implementation Plan

## Current State Analysis

### Backend Data Available:
- ✅ Market outcomes with `current_price` and `probability`
- ✅ Volume tracking in `OpinionMarket.volume`
- ✅ User positions in `MarketPosition`
- ❌ **Missing**: Historical price data (price over time)
- ❌ **Missing**: Volume history (volume over time)
- ❌ **Missing**: Trade history with timestamps

### What Kalshi/Polymarket/Limitless Show:

#### 1. **Price Chart** (Primary Feature)
- Line chart showing odds/price over time
- Separate lines for YES and NO outcomes
- Time ranges: 1H, 1D, 1W, 1M, ALL
- Hover tooltip showing exact price and time

#### 2. **Volume Visualization**
- Bar chart overlay showing trading volume
- Color-coded by outcome (green for YES, red for NO)
- Helps identify high-activity periods

#### 3. **Market Stats Panel**
- Current price (odds)
- 24h change (+/- percentage)
- 24h volume
- Total volume
- High/Low prices

#### 4. **Interactive Features**
- Crosshair cursor
- Tooltip with detailed info
- Zoom and pan
- Multiple timeframes

## Required Backend Changes

### 1. Create Price History Table
```prisma
model PriceHistory {
  id            String   @id @default(uuid())
  market_id     String
  outcome_index Int      // 0 for YES, 1 for NO
  price         Decimal
  volume        Decimal  // Volume at this point
  timestamp     DateTime @default(now())
  
  market OpinionMarket @relation(fields: [market_id], references: [id])
  
  @@index([market_id, timestamp])
  @@index([outcome_index])
}
```

### 2. Create Trade History Table
```prisma
model TradeHistory {
  id            String   @id @default(uuid())
  market_id     String
  user_address  String
  outcome_index Int
  type          String   // BUY or SELL
  amount        Decimal
  price         Decimal
  total_value   Decimal
  timestamp     DateTime @default(now())
  tx_hash       String?
  
  market OpinionMarket @relation(fields: [market_id], references: [id])
  
  @@index([market_id, timestamp])
  @@index([user_address])
}
```

### 3. Add API Endpoints

#### GET `/markets/:id/price-history`
```typescript
{
  timeframe: '1h' | '1d' | '1w' | '1m' | 'all',
  data: [
    {
      timestamp: '2025-01-26T10:00:00Z',
      yesPrice: 0.65,
      noPrice: 0.35,
      volume: 1250.50
    },
    // ...more data points
  ]
}
```

#### GET `/markets/:id/stats`
```typescript
{
  currentPrice: {
    yes: 0.65,
    no: 0.35
  },
  change24h: {
    yes: +0.05,  // +5%
    no: -0.05    // -5%
  },
  volume24h: 15000,
  totalVolume: 45000,
  high24h: 0.70,
  low24h: 0.60,
  trades24h: 234
}
```

## Frontend Implementation

### Chart Library: Lightweight Charts (TradingView)
**Why?** 
- Professional trading charts
- Better performance than Recharts
- Built for financial data
- Used by major platforms

### Installation:
```bash
npm install lightweight-charts
```

### Chart Features to Implement:

#### 1. **Dual Line Chart**
```typescript
// YES line (green)
const yesSeries = chart.addLineSeries({
  color: '#A4E977',
  lineWidth: 3,
  priceFormat: {
    type: 'custom',
    formatter: (price) => price.toFixed(2)
  }
});

// NO line (red)
const noSeries = chart.addLineSeries({
  color: '#EF4444',
  lineWidth: 2,
  priceFormat: {
    type: 'custom',
    formatter: (price) => price.toFixed(2)
  }
});
```

#### 2. **Volume Histogram**
```typescript
const volumeSeries = chart.addHistogramSeries({
  color: '#A4E977',
  priceFormat: {
    type: 'volume',
  },
  priceScaleId: 'volume',
});
```

#### 3. **Market Stats Display**
```tsx
<div className="market-stats">
  <StatCard 
    label="Current Odds"
    value="0.65"
    change="+5%"
    positive={true}
  />
  <StatCard 
    label="24h Volume"
    value="$15,234"
  />
  <StatCard 
    label="Total Volume"
    value="$45,678"
  />
</div>
```

## Implementation Steps

### Phase 1: Backend (Required First)
1. ✅ Add `PriceHistory` model to schema
2. ✅ Add `TradeHistory` model to schema
3. ✅ Run migration: `npx prisma migrate dev`
4. ✅ Create service methods:
   - `recordPriceChange(marketId, outcomeIndex, price, volume)`
   - `recordTrade(marketId, userAddress, outcomeIndex, type, amount, price)`
   - `getPriceHistory(marketId, timeframe)`
   - `getMarketStats(marketId)`
5. ✅ Add API endpoints in controller
6. ✅ Update `updateVolume()` to also record price history

### Phase 2: Frontend
1. ✅ Install `lightweight-charts`
2. ✅ Create `TradingChart` component
3. ✅ Fetch price history data
4. ✅ Render dual-line chart (YES/NO)
5. ✅ Add volume histogram
6. ✅ Add market stats panel
7. ✅ Add timeframe selector
8. ✅ Add tooltips and crosshair
9. ✅ Mobile responsive design

### Phase 3: Real-time Updates
1. ✅ WebSocket connection for live prices
2. ✅ Update chart in real-time
3. ✅ Animate price changes

## Quick Start (Temporary Solution)

If you want to see the chart working NOW without backend changes:

### Use Mock Data:
```typescript
const mockPriceHistory = [
  { time: '2025-01-26 10:00', yes: 0.50, no: 0.50, volume: 1000 },
  { time: '2025-01-26 11:00', yes: 0.55, no: 0.45, volume: 1500 },
  { time: '2025-01-26 12:00', yes: 0.60, no: 0.40, volume: 2000 },
  { time: '2025-01-26 13:00', yes: 0.65, no: 0.35, volume: 1800 },
  // ... generate more data
];
```

This will let you build and test the UI while backend is being updated.

## Recommended Next Steps

1. **Immediate**: I can create the frontend chart component with mock data
2. **Short-term**: Add backend price history tracking
3. **Long-term**: Add WebSocket for real-time updates

Would you like me to:
A) Create the professional chart component with mock data now?
B) Help you add the backend tables and API first?
C) Both - start with mock data and prepare backend migration?
