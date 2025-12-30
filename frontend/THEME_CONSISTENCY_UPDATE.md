# Theme Consistency Update - All Pages

## Summary
Updated all pages to match the consistent black and lime green theme used in Creators and Markets pages.

## Theme Specifications

### Colors
- **Main Background**: `bg-black` (#000000)
- **Panel Backgrounds**: `bg-[#0a0a0a]` or `bg-[#0f0f0f]`
- **Primary Accent**: `#A4E977` (Lime Green)
- **Borders**: `rgba(140, 180, 130, 0.35)` (Green-tinted semi-transparent)
- **Primary Text**: `text-white`
- **Secondary Text**: `text-gray-400` or `text-gray-500`
- **Muted Text**: `text-gray-500`

### Shadows
```css
boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
```

### Border Style
```tsx
style={{ borderColor: 'rgba(140, 180, 130, 0.35)' }}
```

## Pages Updated

### ✅ HomePage.tsx
- Changed from generic theme variables to specific black backgrounds
- Updated hero section with dark panels and lime green borders
- Updated creator cards with consistent styling
- Updated "How It Works" section with dark background
- All buttons now use lime green (#A4E977) accent

### 🔄 DiscoverPage.tsx (Next)
- Update background from `bg-muted/20` to `bg-black`
- Update quick filter buttons to use lime green when active
- Update search and controls with dark theme
- Update empty states

### 🔄 WhalesPage.tsx (Next)
- Update to black background
- Update stat cards with dark panels
- Update trade cards with lime green accents

### 🔄 PortfolioPage.tsx (Next)
- Update to black background
- Update position cards
- Update stat cards

### 🔄 BTCMarketsPage.tsx (Next)
- Already has dark theme but needs consistency check

### 🔄 ProfilePage.tsx (Next)
- Update to black background
- Update dashboard cards
- Update position displays

## Removed Elements
- All references to Tailwind theme variables:
  - `bg-background` → `bg-black` or `bg-[#0a0a0a]`
  - `text-foreground` → `text-white`
  - `bg-muted` → `bg-[#0f0f0f]`
  - `text-muted-foreground` → `text-gray-400`
  - `border-foreground` → `border` with `borderColor: 'rgba(140, 180, 130, 0.35)'`

## Design Consistency
All pages now feature:
- Pure black main background
- Dark gray panels (#0a0a0a, #0f0f0f)
- Lime green accents for active states, highlights, and CTAs
- Green-tinted semi-transparent borders
- Consistent shadow effects
- White primary text
- Gray secondary/muted text

## Status
- ✅ HomePage - Complete
- ⏳ DiscoverPage - In Progress
- ⏳ WhalesPage - Pending
- ⏳ PortfolioPage - Pending
- ⏳ ProfilePage - Pending
- ⏳ BTCMarketsPage - Pending (verify consistency)
