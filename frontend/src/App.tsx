import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import HomePage from './pages/HomePage';
import { MarketPage } from './pages/MarketPage';
import { CreatorPage } from './pages/CreatorPage';
import { MarketsPage } from './pages/MarketsPage';
import { CreatorsPage } from './pages/CreatorsPage';
import { ProfilePage } from './pages/ProfilePage';
import { CreateMarketPage } from './pages/CreateMarketPage';
import { BecomeCreatorPage } from './pages/BecomeCreatorPage';
import { AdminPage } from './pages/AdminPage';
import { BTCMarketsPage } from './pages/BTCMarketsPage';
import { BTCMarketDetailPage } from './pages/BTCMarketDetailPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { WhalesPage } from './pages/WhalesPage';
import { TradingTerminalPage } from './pages/TradingTerminalPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './contexts/WalletContext';

export default function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <div className="min-h-screen bg-background pb-16 md:pb-0">
          <Navbar />
          <div className="pt-[70px]">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/markets" element={<MarketsPage />} />
              <Route path="/discover" element={<DiscoverPage />} />
              <Route path="/whales" element={<WhalesPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/btc-markets" element={<BTCMarketsPage />} />
              <Route path="/btc-market/:address" element={<BTCMarketDetailPage />} />
              <Route path="/creators" element={<CreatorsPage />} />
              <Route path="/market/:id" element={<MarketPage />} />
              <Route path="/terminal/:marketId" element={<TradingTerminalPage />} />
              <Route path="/creator/:id" element={<CreatorPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/create-market" element={<CreateMarketPage />} />
              <Route path="/become-creator" element={<BecomeCreatorPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </div>
          <MobileBottomNav />
        </div>
      </WalletProvider>
    </BrowserRouter>
  );
}