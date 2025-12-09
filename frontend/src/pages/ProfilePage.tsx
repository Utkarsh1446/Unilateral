import { Footer } from '../components/Footer';
import { TrendingUp, TrendingDown, Wallet, DollarSign, TrendingUp as Growth, Users, BadgeCheck, ArrowLeft, Loader2, BarChart3, Coins, Clock, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { DividendClaimPopup } from '../components/DividendClaimPopup';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, ABIS, getContract } from '../lib/contracts';
import { fetchLogsWithChunking } from '../lib/ethereum';

interface CreatorDashboardData {
  isCreator: boolean;
  creatorId?: string;
  twitterHandle?: string;
  displayName?: string;
  profileImage?: string;
  hasShares?: boolean;
  shareContractAddress?: string;
  sharesTotalSupply?: number;
  sharesUnlocked?: boolean;
  totalVolume?: number;
  volumeEligibility?: { eligible: boolean; volume: number; details: string };
  volumeProgress?: string;
  totalFeesEarned?: string;
  creatorFeesEarned?: string;
  dividendFeesEarned?: string;
  marketsCount?: number;
  activeMarkets?: number;
  pendingMarkets?: number;
  markets?: Array<{ id: string; question: string; volume: number; status: string; deadline: string }>;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<string | null>(null);
  const [claimState, setClaimState] = useState<'claiming' | 'success' | 'error' | null>(null);
  const [claimedAmount, setClaimedAmount] = useState('$0.00');

  const [positions, setPositions] = useState<any[]>([]);
  const [resolvedPositions, setResolvedPositions] = useState<any[]>([]);
  const [redeemingPosition, setRedeemingPosition] = useState<string | null>(null);
  const [shareHoldings, setShareHoldings] = useState<any[]>([]);
  const [creatorDashboard, setCreatorDashboard] = useState<CreatorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingShares, setLoadingShares] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [portfolioStats, setPortfolioStats] = useState({
    totalValue: '$0.00',
    totalGain: '+$0.00',
    gainPercent: '+0.0%',
    dividendsEarned: '$0.00',
  });

  const [selectedShareAddress, setSelectedShareAddress] = useState<string | null>(null);
  const [deployingShare, setDeployingShare] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState('0.00');

  // Handle deploying creator share
  const handleDeployShare = async () => {
    if (!account || !creatorDashboard) return;

    setDeployingShare(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Get signature from backend
      const name = `${creatorDashboard.twitterHandle} Shares`;
      const symbol = `$${creatorDashboard.twitterHandle?.toUpperCase().slice(0, 4) || 'CSHARE'}`;

      const sigRes = await fetch('http://127.0.0.1:3001/creators/onboarding-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: account,
          name,
          symbol,
          userId: creatorDashboard.creatorId
        })
      });

      if (!sigRes.ok) throw new Error('Failed to get signature');
      const { signature, deadline } = await sigRes.json();

      // Deploy via CreatorShareFactory
      const factory = getContract(CONTRACTS.CreatorShareFactory, ABIS.CreatorShareFactory, signer);
      const tx = await factory.createCreatorShare(name, symbol, deadline, signature);
      console.log("Deploy tx:", tx.hash);

      const receipt = await tx.wait();
      console.log("Share deployed in block:", receipt.blockNumber);

      // Get the deployed share address from events
      let shareAddress = null;

      // Method 1: Parse logs with factory interface
      for (const log of receipt.logs) {
        try {
          const parsed = factory.interface.parseLog(log);
          if (parsed?.name === 'ShareCreated') {
            // Args: (creator, shareAddress) - shareAddress is at index 1 or named
            shareAddress = parsed.args.shareAddress || parsed.args[1];
            console.log("Found ShareCreated event, shareAddress:", shareAddress);
            break;
          }
        } catch { /* Not our event */ }
      }

      // Method 2: Fallback - get from logs data directly
      if (!shareAddress && receipt.logs.length >= 2) {
        // The ShareCreated event is usually the second log, data contains shareAddress
        const shareLog = receipt.logs[1];
        if (shareLog?.data && shareLog.data.length >= 66) {
          shareAddress = '0x' + shareLog.data.slice(26, 66);
          console.log("Extracted shareAddress from log data:", shareAddress);
        }
      }

      if (shareAddress) {
        console.log("Updating backend with Creator Share at:", shareAddress);

        // Update backend with share address
        const updateRes = await fetch('http://127.0.0.1:3001/creators/update-share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creatorId: creatorDashboard.creatorId,
            shareAddress
          })
        });

        if (updateRes.ok) {
          console.log("Backend updated successfully");
        } else {
          console.error("Backend update failed:", await updateRes.text());
        }
      } else {
        console.warn("Could not extract share address from logs");
      }

      alert('Creator Share deployed successfully! 🎉');
      fetchCreatorDashboard(); // Refresh
    } catch (error: any) {
      console.error("Deploy share error:", error);
      alert('Failed to deploy share: ' + (error.message || error));
    } finally {
      setDeployingShare(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    if (account) {
      fetchPositions();
      fetchShareHoldings();
      fetchCreatorDashboard();
      fetchUsdcBalance();
    }
  }, [account]);

  const fetchUsdcBalance = async () => {
    if (!account) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const token = getContract(CONTRACTS.PlatformToken, ABIS.PlatformToken, provider);
      const bal = await token.balanceOf(account);
      setUsdcBalance(parseFloat(ethers.formatUnits(bal, 6)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    } catch (e) {
      console.error('Failed to fetch USDC balance:', e);
    }
  };

  const fetchCreatorDashboard = async () => {
    if (!account) return;
    setLoadingDashboard(true);
    try {
      const res = await fetch(`http://127.0.0.1:3001/creators/dashboard/${account}`);
      if (res.ok) {
        const data = await res.json();
        setCreatorDashboard(data);
      }
    } catch (err) {
      console.error("Failed to fetch creator dashboard:", err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const checkConnection = async () => {
    if (typeof window.ethereum !== "undefined") {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) setAccount(accounts[0].address);
    }
  };

  const fetchPositions = async () => {
    if (!account) return;

    try {
      // Fetch all markets from backend
      const res = await fetch(`http://127.0.0.1:3001/markets`);
      const markets = await res.json();

      if (!markets || markets.length === 0) {
        setPositions([]);
        setResolvedPositions([]);
        setLoading(false);
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const conditionalTokens = getContract(CONTRACTS.ConditionalTokens, ABIS.ConditionalTokens, provider);

      const activePositions: any[] = [];
      const resolvedPositionsList: any[] = [];
      let totalVal = 0;

      // Check on-chain balance for each market
      for (const market of markets) {
        if (!market.contract_address || market.approval_status !== 'approved') continue;

        try {
          // Get market contract to fetch conditionId
          const marketContract = getContract(market.contract_address, ABIS.OpinionMarket, provider);
          const conditionId = await marketContract.conditionId();
          const collateralAddress = await marketContract.collateralToken();

          // Check if market is resolved
          const isResolved = market.resolved || false;
          const resolutionOutcome = market.resolution_outcome; // 0 = YES wins, 1 = NO wins

          // Check balance for YES (index 0) and NO (index 1)
          for (let outcomeIndex = 0; outcomeIndex < 2; outcomeIndex++) {
            // Calculate positionId: keccak256(collateral, conditionId, indexSet)
            const indexSet = 1 << outcomeIndex; // 1 for YES, 2 for NO
            const positionId = ethers.solidityPackedKeccak256(
              ['address', 'bytes32', 'uint256'],
              [collateralAddress, conditionId, indexSet]
            );

            const balance = await conditionalTokens.balanceOf(account, positionId);
            const balanceNum = Number(ethers.formatUnits(balance, 6));

            if (balanceNum > 0.01) { // Only show positions with meaningful balance
              const positionData = {
                id: market.id,
                question: market.question,
                position: outcomeIndex === 0 ? 'YES' : 'NO',
                outcomeIndex,
                shares: balanceNum.toFixed(2),
                sharesRaw: balanceNum,
                avgPrice: '50.0¢',
                currentPrice: '50.0¢',
                value: `$${(balanceNum * 0.50).toFixed(2)}`,
                gain: '+0.0%',
                contractAddress: market.contract_address,
                conditionId,
                collateralAddress,
                isResolved,
                resolutionOutcome,
                isWinner: isResolved && resolutionOutcome === outcomeIndex,
                redeemValue: isResolved && resolutionOutcome === outcomeIndex ? `$${balanceNum.toFixed(2)}` : '$0.00'
              };

              if (isResolved) {
                resolvedPositionsList.push(positionData);
              } else {
                const value = balanceNum * 0.50;
                totalVal += value;
                activePositions.push(positionData);
              }
            }
          }
        } catch (err) {
          console.warn(`Failed to check position for market ${market.id}:`, err);
        }
      }

      setPositions(activePositions);
      setResolvedPositions(resolvedPositionsList);
      setPortfolioStats(prev => ({ ...prev, totalValue: `$${totalVal.toFixed(2)}` }));
    } catch (err) {
      console.error('Error fetching positions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemPosition = async (position: any) => {
    if (!account || !position.isWinner) return;
    setRedeemingPosition(position.id + '-' + position.outcomeIndex);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const conditionalTokens = getContract(CONTRACTS.ConditionalTokens, ABIS.ConditionalTokens, signer);

      // Redeem the winning position
      const tx = await conditionalTokens.redeemPositions(
        position.collateralAddress,
        position.conditionId,
        [position.outcomeIndex]
      );
      await tx.wait();

      alert(`Successfully redeemed ${position.redeemValue}! 🎉`);
      fetchPositions(); // Refresh
      fetchUsdcBalance(); // Refresh balance
    } catch (error: any) {
      console.error('Redeem error:', error);
      alert('Failed to redeem: ' + (error.message || error));
    } finally {
      setRedeemingPosition(null);
    }
  };

  const fetchShareHoldings = async () => {
    if (!account) return;

    try {
      // Fetch all creator shares from backend
      const res = await fetch(`http://127.0.0.1:3001/creators/holdings/${account}`);
      if (!res.ok) throw new Error("Failed to fetch holdings");

      const sharesData = await res.json();

      if (!sharesData || sharesData.length === 0) {
        setShareHoldings([]);
        setLoadingShares(false);
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      // Check on-chain balance for each share
      const holdingsWithBalance = await Promise.all(sharesData.map(async (s: any) => {
        try {
          const shareContract = getContract(s.shareAddress, ABIS.CreatorShare, provider);

          // Get user's share balance
          const balance = await shareContract.balanceOf(account);
          const balanceNum = parseFloat(ethers.formatEther(balance));

          if (balanceNum <= 0) return null; // Skip if no balance

          // Get pending dividends
          let dividends = '0.00';
          try {
            const pending = await shareContract.pendingDividends(account);
            dividends = parseFloat(ethers.formatUnits(pending, 6)).toFixed(2);
          } catch (e) {
            console.warn("Failed to fetch dividends for", s.shareAddress, e);
          }

          // Get current sell price as value estimate (1 share in wei = 1e18)
          let currentPrice = 0;
          let value = 0;
          try {
            const oneShareWei = ethers.parseEther("1"); // 1 share in 18 decimals
            const sellPrice = await shareContract.getSellPrice(oneShareWei);
            currentPrice = parseFloat(ethers.formatUnits(sellPrice, 6));
            value = currentPrice * balanceNum;
          } catch (e) {
            console.warn("Failed to get sell price:", e);
          }

          return {
            creator: {
              name: s.creatorName || s.creatorHandle,
              handle: s.creatorHandle,
              avatar: (s.creatorName || s.creatorHandle).substring(0, 2).toUpperCase(),
              image: s.creatorImage
            },
            shares: balanceNum.toFixed(2),
            avgPrice: '$0.00', // Would need cost basis tracking
            currentPrice: `$${currentPrice.toFixed(2)}`,
            value: `$${value.toFixed(2)}`,
            gain: '+0.0%',
            dividends: `$${dividends}`,
            shareAddress: s.shareAddress
          };
        } catch (e) {
          console.warn("Error checking balance for share:", s.shareAddress, e);
          return null;
        }
      }));

      // Filter out nulls (shares with 0 balance or errors)
      const validHoldings = holdingsWithBalance.filter(h => h !== null);

      setShareHoldings(validHoldings);

      // Update stats
      const totalDivs = validHoldings.reduce((acc, h) => acc + parseFloat(h.dividends.replace('$', '')), 0);
      setPortfolioStats(prev => ({ ...prev, dividendsEarned: `$${totalDivs.toFixed(2)}` }));

    } catch (error) {
      console.error("Error loading share holdings:", error);
    } finally {
      setLoadingShares(false);
    }
  };

  const handleClaimDividends = async (shareAddress: string) => {
    if (!shareAddress) return;
    setSelectedShareAddress(shareAddress);
    setClaimState('claiming');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const shareContract = getContract(shareAddress, ABIS.CreatorShare, signer);

      const tx = await shareContract.claimDividends();
      await tx.wait();

      const pending = await shareContract.pendingDividends(account); // Should be 0 now, but maybe fetch before claim to show amount?
      // Actually we want to show what was claimed.
      // For simplicity, we just show success.

      setClaimState('success');
      fetchShareHoldings(); // Refresh
    } catch (error) {
      console.error(error);
      setClaimState('error');
    }
  };

  const handleClosePopup = () => {
    setClaimState(null);
    setSelectedShareAddress(null);
  };

  if (!account) return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please connect your wallet</h2>
          <p className="text-muted-foreground">Connect your wallet to view your profile and portfolio.</p>
        </div>
      </div>
      <Footer />
    </div>
  );

  return (
    <>
      <div className="bg-muted/20 min-h-screen">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
          {/* Go Back */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 md:mb-6 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>

          {/* User Header */}
          <div className="mb-6 bg-background rounded-xl border border-foreground/10 p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {/* Avatar and Info */}
              <div className="flex items-center gap-4">
                {creatorDashboard?.profileImage ? (
                  <img
                    src={creatorDashboard.profileImage}
                    alt={creatorDashboard.displayName || 'Profile'}
                    className="w-20 h-20 rounded-full object-cover border-2 border-foreground/20"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center border-2 border-foreground/20">
                    <span className="text-2xl" style={{ fontWeight: 600 }}>
                      {creatorDashboard?.displayName?.substring(0, 2).toUpperCase() || account.slice(2, 4)}
                    </span>
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 text-2xl mb-1" style={{ fontWeight: 700 }}>
                    {creatorDashboard?.displayName || 'User'}
                    {creatorDashboard?.isCreator && (
                      <BadgeCheck className="w-6 h-6 fill-blue-500 text-white" />
                    )}
                  </div>
                  {creatorDashboard?.twitterHandle && (
                    <div className="text-sm text-blue-600 mb-1">
                      @{creatorDashboard.twitterHandle}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Wallet className="w-4 h-4" />
                    <span>{account.slice(0, 6)}...{account.slice(-4)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {creatorDashboard?.isCreator ? 'Verified Creator' : 'Member since Dec 2024'}
                  </div>
                </div>
              </div>

              {/* Portfolio Stats */}
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 md:ml-auto">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1" style={{ letterSpacing: '0.05em' }}>Total Value</div>
                  <div className="text-xl" style={{ fontWeight: 700 }}>{portfolioStats.totalValue}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1" style={{ letterSpacing: '0.05em' }}>Total Gain</div>
                  <div className="text-xl text-green-600" style={{ fontWeight: 700 }}>{portfolioStats.totalGain}</div>
                  <div className="text-xs text-green-600" style={{ fontWeight: 600 }}>{portfolioStats.gainPercent}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1" style={{ letterSpacing: '0.05em' }}>Dividends</div>
                  <div className="text-xl" style={{ fontWeight: 700 }}>{portfolioStats.dividendsEarned}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1" style={{ letterSpacing: '0.05em' }}>USDC Balance</div>
                  <div className="text-xl text-blue-600" style={{ fontWeight: 700 }}>${usdcBalance}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Creator Dashboard - Only shown if user is a creator */}
          {creatorDashboard?.isCreator && (
            <div className="mb-6 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-xl border-2 border-purple-500/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl" style={{ fontWeight: 700 }}>Creator Dashboard</h2>
                  <div className="text-sm text-muted-foreground">
                    @{creatorDashboard.twitterHandle}
                    {creatorDashboard.hasShares && (
                      <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-700 rounded-full text-xs font-semibold">
                        Shares Active
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {loadingDashboard ? (
                <div className="flex justify-center py-6"><Loader2 className="animate-spin" /></div>
              ) : (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-background rounded-xl p-4 border border-foreground/10">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
                        <BarChart3 className="w-4 h-4" />
                        Total Volume
                      </div>
                      <div className="text-2xl" style={{ fontWeight: 700 }}>
                        ${(creatorDashboard.totalVolume || 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="bg-background rounded-xl p-4 border border-foreground/10">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
                        <Coins className="w-4 h-4" />
                        Fees Earned
                      </div>
                      <div className="text-2xl text-green-600" style={{ fontWeight: 700 }}>
                        ${creatorDashboard.totalFeesEarned}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ${creatorDashboard.creatorFeesEarned} creator + ${creatorDashboard.dividendFeesEarned} dividend
                      </div>
                    </div>

                    <div className="bg-background rounded-xl p-4 border border-foreground/10">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
                        <Clock className="w-4 h-4" />
                        Markets
                      </div>
                      <div className="text-2xl" style={{ fontWeight: 700 }}>
                        {creatorDashboard.marketsCount}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {creatorDashboard.activeMarkets} active · {creatorDashboard.pendingMarkets} pending
                      </div>
                    </div>

                    <div className="bg-background rounded-xl p-4 border border-foreground/10">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
                        <CheckCircle className="w-4 h-4" />
                        Share Eligibility
                      </div>
                      {creatorDashboard.hasShares ? (
                        <div className="text-green-600 text-lg" style={{ fontWeight: 700 }}>
                          ✓ Shares Active
                        </div>
                      ) : creatorDashboard.volumeEligibility?.eligible ? (
                        <>
                          <div className="text-green-600 text-lg mb-2" style={{ fontWeight: 700 }}>
                            ✓ Eligible!
                          </div>
                          <button
                            onClick={handleDeployShare}
                            disabled={deployingShare}
                            className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg text-sm font-bold transition-colors"
                          >
                            {deployingShare ? 'Deploying...' : '🚀 Deploy Share'}
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="text-lg" style={{ fontWeight: 700 }}>
                            {creatorDashboard.volumeProgress}%
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${creatorDashboard.volumeProgress}%` }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            ${(creatorDashboard.volumeEligibility?.volume || 0).toLocaleString()} / $30,000
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Your Markets */}
                  {creatorDashboard.markets && creatorDashboard.markets.length > 0 && (
                    <div>
                      <h3 className="text-lg mb-3" style={{ fontWeight: 600 }}>Your Markets</h3>
                      <div className="space-y-2">
                        {creatorDashboard.markets.slice(0, 5).map((market) => (
                          <Link
                            key={market.id}
                            to={`/market/${market.id}`}
                            className="flex items-center justify-between bg-background rounded-lg p-3 border border-foreground/10 hover:shadow-md transition-all"
                          >
                            <div className="flex-1 mr-4">
                              <div className="text-sm truncate" style={{ fontWeight: 500 }}>{market.question}</div>
                              <div className="text-xs text-muted-foreground">
                                Volume: ${market.volume.toLocaleString()}
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-lg text-xs ${market.status === 'approved' ? 'bg-green-100 text-green-700' :
                              market.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                market.status === 'resolved' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                              }`} style={{ fontWeight: 600 }}>
                              {market.status}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Creator Shares */}
          <div className="mb-6">
            <h2 className="text-2xl mb-4" style={{ fontWeight: 700 }}>Creator Shares</h2>
            {loadingShares ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
            ) : shareHoldings.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">No creator shares found.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {shareHoldings.map((holding, idx) => (
                  <div
                    key={idx}
                    className="bg-background rounded-2xl border-2 border-foreground p-5 hover:shadow-lg transition-all group"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                      {/* Creator Info */}
                      <div className="md:col-span-2 flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center border-2 border-foreground/20">
                          <span className="text-lg" style={{ fontWeight: 600 }}>{holding.creator.avatar}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span style={{ fontWeight: 600 }}>{holding.creator.name}</span>
                            <BadgeCheck className="w-4 h-4 fill-blue-500 text-white" />
                          </div>
                          <div className="text-xs text-muted-foreground">@{holding.creator.handle}</div>
                        </div>
                      </div>

                      {/* Shares */}
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1" style={{ letterSpacing: '0.05em' }}>Shares</div>
                        <div style={{ fontWeight: 600 }}>{holding.shares}</div>
                      </div>

                      {/* Avg Price */}
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1" style={{ letterSpacing: '0.05em' }}>Avg Price</div>
                        <div style={{ fontWeight: 600 }}>{holding.avgPrice}</div>
                      </div>

                      {/* Current Value */}
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1" style={{ letterSpacing: '0.05em' }}>Value</div>
                        <div style={{ fontWeight: 700 }}>{holding.value}</div>
                        <div className="text-xs text-green-600" style={{ fontWeight: 600 }}>{holding.gain}</div>
                      </div>

                      {/* Dividends */}
                      <div className="flex items-center justify-between md:block">
                        <div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1" style={{ letterSpacing: '0.05em' }}>Dividends</div>
                          <div className="text-green-600" style={{ fontWeight: 700 }}>{holding.dividends}</div>
                        </div>
                        <button
                          onClick={() => handleClaimDividends(holding.shareAddress)}
                          className="md:hidden px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-bold"
                        >
                          Claim
                        </button>
                      </div>

                      {/* Desktop Claim Button */}
                      <div className="hidden md:flex justify-end">
                        <button
                          onClick={() => handleClaimDividends(holding.shareAddress)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors"
                        >
                          Claim
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Market Positions */}
          <div className="mb-6">
            <h2 className="text-2xl mb-4" style={{ fontWeight: 700 }}>Active Positions</h2>
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
            ) : positions.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">No active positions found.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {positions.map((position) => (
                  <Link
                    key={position.id + '-' + position.outcomeIndex}
                    to={`/market/${position.id}`}
                    className="bg-background rounded-2xl border-2 border-foreground p-5 hover:shadow-lg transition-all cursor-pointer group"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                      {/* Question */}
                      <div className="md:col-span-2">
                        <div className="text-sm leading-snug mb-2">{position.question}</div>
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider ${position.position === 'YES'
                          ? 'bg-green-500/10 text-green-700 border border-green-600/30'
                          : 'bg-red-500/10 text-red-700 border border-red-600/30'
                          }`} style={{ fontWeight: 600 }}>
                          {position.position}
                        </span>
                      </div>

                      {/* Shares */}
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1" style={{ letterSpacing: '0.05em' }}>Shares</div>
                        <div style={{ fontWeight: 600 }}>{position.shares}</div>
                      </div>

                      {/* Avg Price */}
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1" style={{ letterSpacing: '0.05em' }}>Avg Price</div>
                        <div style={{ fontWeight: 600 }}>{position.avgPrice}</div>
                      </div>

                      {/* Current Price */}
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1" style={{ letterSpacing: '0.05em' }}>Current</div>
                        <div style={{ fontWeight: 600 }}>{position.currentPrice}</div>
                      </div>

                      {/* Value & Gain */}
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1" style={{ letterSpacing: '0.05em' }}>Value</div>
                        <div style={{ fontWeight: 700 }}>{position.value}</div>
                        <div className="text-xs text-green-600" style={{ fontWeight: 600 }}>{position.gain}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Resolved Positions */}
          {resolvedPositions.length > 0 && (
            <div className="mb-6">
              <h2 className="text-2xl mb-4" style={{ fontWeight: 700 }}>Resolved Positions</h2>
              <div className="grid grid-cols-1 gap-4">
                {resolvedPositions.map((position) => (
                  <div
                    key={position.id + '-' + position.outcomeIndex}
                    className={`bg-background rounded-2xl border-2 p-5 transition-all ${position.isWinner
                        ? 'border-green-500 bg-green-50/50'
                        : 'border-foreground/30 opacity-60'
                      }`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                      {/* Question + Status */}
                      <div className="md:col-span-2">
                        <div className="flex items-center gap-2 mb-2">
                          {position.isWinner ? (
                            <span className="px-2 py-0.5 bg-green-500 text-white rounded-full text-[10px] font-bold uppercase">
                              Won
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-[10px] font-bold uppercase">
                              Lost
                            </span>
                          )}
                        </div>
                        <div className="text-sm leading-snug mb-2">{position.question}</div>
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider ${position.position === 'YES'
                          ? 'bg-green-500/10 text-green-700 border border-green-600/30'
                          : 'bg-red-500/10 text-red-700 border border-red-600/30'
                          }`} style={{ fontWeight: 600 }}>
                          {position.position}
                        </span>
                      </div>

                      {/* Shares */}
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1" style={{ letterSpacing: '0.05em' }}>Shares</div>
                        <div style={{ fontWeight: 600 }}>{position.shares}</div>
                      </div>

                      {/* Original Value */}
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1" style={{ letterSpacing: '0.05em' }}>Original</div>
                        <div style={{ fontWeight: 600 }}>{position.value}</div>
                      </div>

                      {/* Redeem Value */}
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1" style={{ letterSpacing: '0.05em' }}>Redeemable</div>
                        <div className={position.isWinner ? 'text-green-600' : 'text-muted-foreground'} style={{ fontWeight: 700 }}>
                          {position.redeemValue}
                        </div>
                      </div>

                      {/* Redeem Button */}
                      <div className="flex justify-end">
                        {position.isWinner ? (
                          <button
                            onClick={() => handleRedeemPosition(position)}
                            disabled={redeemingPosition === position.id + '-' + position.outcomeIndex}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl text-sm font-bold transition-colors"
                          >
                            {redeemingPosition === position.id + '-' + position.outcomeIndex ? (
                              <span className="flex items-center gap-2">
                                <Loader2 className="animate-spin w-4 h-4" />
                                Redeeming...
                              </span>
                            ) : (
                              'Redeem'
                            )}
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-sm">No value</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
      <Footer />
      <DividendClaimPopup
        state={claimState}
        amount={claimedAmount}
        onClose={handleClosePopup}
      />
    </>
  );
}