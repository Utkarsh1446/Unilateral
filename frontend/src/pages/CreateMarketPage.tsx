import { Footer } from '../components/Footer';
import { ArrowLeft, CheckCircle, XCircle, Loader2, UserX } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { createMarketRequest, getCreatorByWallet } from '../lib/api';
import { getContract, CONTRACTS, ABIS } from '../lib/contracts';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3001";

export function CreateMarketPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState<boolean | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [endDate, setEndDate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [initialLiquidity, setInitialLiquidity] = useState('500'); // Kept for UI, but not used yet
  const [seedMarket, setSeedMarket] = useState(true); // Kept for UI
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const categories = ['Crypto', 'Technology', 'Sports', 'Politics', 'Business', 'Entertainment', 'Science'];

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    if (typeof window.ethereum !== "undefined") {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        const walletAddress = accounts[0].address;
        setAccount(walletAddress);

        // Check if user is a creator
        const creatorData = await getCreatorByWallet(walletAddress);
        setIsCreator(creatorData && creatorData.isCreator === true);
      } else {
        setIsCreator(false);
      }
    } else {
      setIsCreator(false);
    }
    setCheckingEligibility(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      alert("Please connect your wallet");
      return;
    }

    setLoading(true);
    setStatus('Initializing market request...');

    try {
      // 1. Submit request to backend (to get ID and basic validation)
      const market = await createMarketRequest(
        question,
        description,
        category,
        new Date(endDate).toISOString(),
        account,
        imageUrl
      );

      setStatus('Getting creation signature...');
      // 2. Get Creation Signature
      // We need to import getCreationSignature from api.ts (ensure it's exported)
      const sigRes = await fetch(`${API_URL}/markets/creation-signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: account,
          marketId: market.id, // Send marketId
          questionId: market.question_id
        })
      });

      if (!sigRes.ok) throw new Error("Failed to get signature");
      const { signature, feeAmount, deadline } = await sigRes.json();

      setStatus('Approving USDC...');
      // 3. Approve USDC
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      console.log("Current Network:", network.chainId, network.name);
      // Require Base Sepolia (84532)
      if (network.chainId !== 84532n) {
        alert("Wrong Network! Please connect to Base Sepolia (Chain ID 84532).");
        return;
      }

      const signer = await provider.getSigner();
      console.log("Using PlatformToken:", CONTRACTS.PlatformToken);
      console.log("Using Factory:", CONTRACTS.OpinionMarketFactory);

      const usdc = getContract(CONTRACTS.PlatformToken, ABIS.PlatformToken, signer);
      const factoryAddress = CONTRACTS.OpinionMarketFactory;

      // Check initial allowance
      const allowance = await usdc.allowance(account, factoryAddress);
      console.log("Current Allowance:", allowance.toString(), "Required:", feeAmount);

      if (allowance < BigInt(feeAmount)) {
        console.log("Approving USDC (max amount)...");
        // Use MaxUint256 for unlimited approval - more user-friendly
        const tx = await usdc.approve(factoryAddress, ethers.MaxUint256);
        const receipt = await tx.wait();
        console.log("USDC Approved in block:", receipt.blockNumber);
        // Trust the receipt - if tx succeeded, approval is set
      }

      setStatus('Requesting market (Escrow)...');
      // 4. Request Market On-Chain (Escrow)
      const factory = getContract(CONTRACTS.OpinionMarketFactory, ABIS.OpinionMarketFactory, signer);

      // requestMarket(questionId, feeAmount, deadline, signature)
      const tx = await factory.requestMarket(
        market.question_id,
        feeAmount,
        deadline,
        signature
      );
      await tx.wait();

      console.log("Market Requested:", market.question_id);
      alert(`Market requested successfully! Waiting for Admin approval.`);

      setShowSuccessPopup(true);
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("User not found")) {
        setErrorMessage(
          <span>
            You must be a registered creator to create a market.{" "}
            <a href="/become-creator" className="underline font-bold">
              Click here to register.
            </a>
          </span> as any
        );
      } else {
        setErrorMessage(err.message || "Failed to request market");
      }
      setShowErrorPopup(true);
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessPopup(false);
    navigate('/profile'); // Redirect to profile to see pending requests
  };

  const handleErrorClose = () => {
    setShowErrorPopup(false);
  };

  // Show loading while checking eligibility
  if (checkingEligibility) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show eligibility popup for non-creators
  if (isCreator === false) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-muted/20 px-4">
          <div className="bg-background rounded-xl border border-foreground/10 p-8 max-w-md text-center shadow-lg">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserX className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Creator Access Required</h2>
            <p className="text-muted-foreground mb-6">
              Only verified creators can create prediction markets. Connect your Twitter and verify your eligibility to become a creator.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/become-creator')}
                className="w-full px-6 py-3 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                Become a Creator
              </button>
              <button
                onClick={() => navigate('/markets')}
                className="w-full px-6 py-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Browse Markets Instead
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <div className="bg-muted/20 min-h-screen">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
          <button
            onClick={() => navigate('/creators')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>

          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-4xl" style={{ fontWeight: 700 }}>Create Market</h1>
              </div>
              <p className="text-muted-foreground">Submit a proposal for a new prediction market. Admin approval required.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-background rounded-xl border border-foreground/10 p-6">
              {/* Question */}
              <div className="mb-6">
                <label className="block text-sm mb-2" style={{ fontWeight: 600 }}>Question</label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Will Bitcoin hit $100k by 2025?"
                  className="w-full px-4 py-3 bg-background border border-foreground/10 rounded-xl focus:border-foreground/30 outline-none transition-colors"
                  required
                />
                <p className="text-xs text-muted-foreground mt-2">Ask a clear yes/no question with a specific outcome</p>
              </div>

              {/* Description */}
              <div className="mb-6">
                <label className="block text-sm mb-2" style={{ fontWeight: 600 }}>Resolution Criteria</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe how this market will be resolved. Be specific about data sources and conditions..."
                  className="w-full px-4 py-3 bg-background border border-foreground/10 rounded-xl focus:border-foreground/30 outline-none transition-colors min-h-32 resize-none"
                  required
                />
                <p className="text-xs text-muted-foreground mt-2">Clear resolution criteria build trust with traders</p>
              </div>

              {/* Image URL */}
              <div className="mb-6">
                <label className="block text-sm mb-2" style={{ fontWeight: 600 }}>Image URL (Optional)</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-foreground/10 rounded-xl focus:border-foreground/30 outline-none transition-colors"
                  placeholder="https://example.com/image.png"
                />
                <p className="text-xs text-muted-foreground mt-2">Add an image to represent your market</p>
              </div>

              {/* Category */}
              <div className="mb-6">
                <label className="block text-sm mb-2" style={{ fontWeight: 600 }}>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-foreground/10 rounded-xl focus:border-foreground/30 outline-none transition-colors"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* End Date */}
              <div className="mb-6">
                <label className="block text-sm mb-2" style={{ fontWeight: 600 }}>Market End Date</label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-foreground/10 rounded-xl focus:border-foreground/30 outline-none transition-colors"
                  required
                />
                <p className="text-xs text-muted-foreground mt-2">When should trading close for this market?</p>
              </div>

              {/* Fee Info */}
              <div className="bg-muted/30 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Creation Fee</span>
                  <span className="text-sm" style={{ fontWeight: 600 }}>100 USDC</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="text-sm text-yellow-600" style={{ fontWeight: 600 }}>Pending Approval</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity text-sm flex items-center justify-center gap-2"
                style={{ fontWeight: 600 }}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4" />
                    {status || "Processing..."}
                  </>
                ) : "Submit Request"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl border border-foreground/10 p-8 max-w-md w-full shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl mb-2" style={{ fontWeight: 700 }}>Request Submitted!</h2>
              <p className="text-muted-foreground mb-6">
                Your market proposal has been submitted for approval. You can track its status in your profile.
              </p>
              <button
                onClick={handleSuccessClose}
                className="w-full py-3 bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity"
                style={{ fontWeight: 600 }}
              >
                View Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Popup */}
      {showErrorPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl border border-foreground/10 p-8 max-w-md w-full shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl mb-2" style={{ fontWeight: 700 }}>Submission Failed</h2>
              <p className="text-muted-foreground mb-6">
                {errorMessage || "Unable to submit request."}
              </p>
              <button
                onClick={handleErrorClose}
                className="w-full py-3 bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity"
                style={{ fontWeight: 600 }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
