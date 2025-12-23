import { ArrowLeft, CheckCircle, XCircle, Sparkles, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ethers } from 'ethers';
import { checkVolumeEligibility, getCreatorOnboardingSignature, createCreatorProfile, verifyTwitter } from '../lib/api';
import { getContract, CONTRACTS, ABIS } from '../lib/contracts';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3001";

export function BecomeCreatorPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<string | null>(null);
  const [step, setStep] = useState<'connect' | 'check' | 'create'>('connect');

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [twitter, setTwitter] = useState('');
  const [website, setWebsite] = useState('');
  const [initialShares, setInitialShares] = useState('');
  const [profileImage, setProfileImage] = useState('');

  // Status State
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [verifyingTwitter, setVerifyingTwitter] = useState(false);

  const [eligibilityCheck, setEligibilityCheck] = useState<{ loading: boolean; eligible?: boolean; error?: string }>({ loading: false });

  const [searchParams] = useSearchParams();

  // Combined effect: Handle OAuth callback AND check wallet connection
  useEffect(() => {
    const handleOAuthAndConnection = async () => {
      // First check for OAuth callback params
      const error = searchParams.get('error');
      const username = searchParams.get('username');
      const eligible = searchParams.get('eligible') === 'true';

      if (error) {
        setEligibilityCheck({
          loading: false,
          eligible: false,
          error: error === 'auth_failed' ? 'Twitter authentication failed' : error
        });
        // Still need to check wallet
        const walletConnected = await checkWallet();
        if (!walletConnected) setStep('connect');
        else setStep('check');
        return;
      }

      if (username) {
        // OAuth callback with user data
        console.log('OAuth callback detected:', { username, eligible });
        setHandle(username);
        setDisplayName(searchParams.get('name') || '');
        setProfileImage(searchParams.get('profileImage') || '');

        // Check wallet connection
        await checkWallet();

        if (eligible) {
          console.log('User is eligible, setting step to create');
          setEligibilityCheck({ loading: false, eligible: true });
          setStep('create');
        } else {
          const followers = searchParams.get('followers');
          const engagement = searchParams.get('engagement');
          setEligibilityCheck({
            loading: false,
            eligible: false,
            error: `Not eligible. Engagement Rate: ${engagement}% (Min 1%), Followers: ${followers} (Min 10)`
          });
          setStep('check');
        }
        return;
      }

      // No OAuth params - normal page load
      const walletConnected = await checkWallet();
      if (walletConnected) {
        setStep('check');
      } else {
        setStep('connect');
      }
    };

    const checkWallet = async () => {
      if (typeof (window as any).ethereum !== "undefined") {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0].address);
          return true;
        }
      }
      return false;
    };

    handleOAuthAndConnection();
  }, [searchParams]);

  const handleConnect = async () => {
    if (typeof (window as any).ethereum !== "undefined") {
      try {
        await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0].address);
          setStep('check');
        }
      } catch (error) {
        console.error("User denied account access");
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const handleVerifyTwitter = async () => {
    if (!handle) return;
    setVerifyingTwitter(true);
    setEligibilityCheck({ loading: true });
    try {
      // Call API to verify twitter
      const data = await verifyTwitter(handle);

      if (data.eligible) {
        setEligibilityCheck({ loading: false, eligible: true });
        setProfileImage(data.profileImage);
        setDisplayName(data.name || displayName);
        // Auto-advance to create step after short delay
        setTimeout(() => setStep('create'), 1500);
      } else setEligibilityCheck({
        loading: false,
        eligible: false,
        error: `Not eligible. Engagement Rate: ${data.engagementRate?.toFixed(2)}% (Min 1%), Followers: ${data.followers} (Min 5000)`
      });
    } catch (e: any) {
      console.error("Failed to verify twitter", e);
      setEligibilityCheck({ loading: false, error: e.message || "Failed to verify Twitter" });
    } finally {
      setVerifyingTwitter(false);
    }
  };

  const handleSubmit = async () => {
    if (!account) return;

    setLoading(true);
    setStatus('Creating creator profile...');

    try {
      // Create Profile in DB (NO share deployment - that comes after $30k volume)
      await createCreatorProfile(account, handle, {
        twitter_handle: handle,
        display_name: displayName,
        profile_image: profileImage,
        follower_count: 0,
        engagement_rate: 0,
        // No contract_address - shares unlocked after volume requirement
      });

      setShowSuccessPopup(true);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to create profile");
      setShowErrorPopup(true);
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  // ... existing close handlers ...
  const handleSuccessClose = () => {
    setShowSuccessPopup(false);
    navigate('/creators');
  };

  const handleErrorClose = () => {
    setShowErrorPopup(false);
  };

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
                <h1 className="text-4xl" style={{ fontWeight: 700 }}>Become a Creator</h1>
                <Sparkles className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-muted-foreground">Launch your creator shares and start earning from your community</p>
            </div>

            {/* Steps */}
            {step === 'connect' && (
              <div className="bg-background rounded-xl border border-foreground/10 p-8 text-center">
                <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
                <p className="text-muted-foreground mb-6">Connect your wallet to check eligibility.</p>
                <button onClick={handleConnect} className="px-6 py-3 bg-foreground text-background rounded-xl font-bold">
                  Connect Wallet
                </button>
              </div>
            )}

            {step === 'check' && (
              <div className="bg-background rounded-xl border border-foreground/10 p-8 text-center">
                <h2 className="text-2xl font-bold mb-4">Connect Twitter</h2>
                <p className="text-muted-foreground mb-6">
                  Verify your Twitter engagement to become a creator.
                  <br />
                  <span className="text-xs">(Min 10 followers, 1% engagement rate)</span>
                </p>

                {eligibilityCheck.error && (
                  <div className="bg-red-500/10 text-red-600 p-4 rounded-xl mb-6 text-sm">
                    {eligibilityCheck.error}
                  </div>
                )}



                <button
                  onClick={() => {
                    if (!account) return;
                    setEligibilityCheck({ loading: true });
                    window.location.href = `${API_URL}/creators/auth/twitter?walletAddress=${account}`;
                  }}
                  disabled={eligibilityCheck.loading || !account}
                  style={{
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    padding: '16px 32px',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    width: '100%',
                    maxWidth: '320px',
                    margin: '0 auto'
                  }}
                >
                  {eligibilityCheck.loading ? (
                    <span>Connecting...</span>
                  ) : (
                    <>
                      <svg width="24" height="24" fill="#ffffff" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      <span>Connect with Twitter</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {step === 'create' && (
              <div className="bg-background rounded-xl border border-foreground/10 p-8 text-center">
                <div className="flex flex-col items-center mb-6">
                  {/* Profile Image */}
                  <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-green-500">
                    {profileImage ? (
                      <img
                        src={profileImage.replace('_normal', '')}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-foreground/10 flex items-center justify-center">
                        <span className="text-2xl">{displayName.charAt(0)}</span>
                      </div>
                    )}
                  </div>

                  {/* Eligibility Badge */}
                  <div className="flex items-center gap-2 bg-green-500/10 text-green-600 px-4 py-2 rounded-full mb-4">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Eligible!</span>
                  </div>

                  {/* User Info */}
                  <h2 className="text-2xl font-bold mb-1">{displayName}</h2>
                  <p className="text-muted-foreground">@{handle}</p>
                </div>

                <p className="text-muted-foreground mb-6">
                  You're verified and ready to become a creator. Click below to launch your creator profile and start trading your shares!
                </p>

                {/* Status Messages */}
                {status && (
                  <div className="bg-foreground/5 text-foreground p-4 rounded-xl mb-6 flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {status}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={loading || !account}
                  style={{
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    padding: '16px 32px',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%',
                    maxWidth: '320px',
                    opacity: loading || !account ? 0.5 : 1
                  }}
                >
                  {loading ? 'Creating...' : '🚀 Become Creator'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Popups... */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl border border-foreground/10 p-8 max-w-md w-full shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl mb-2" style={{ fontWeight: 700 }}>Welcome, Creator!</h2>
              <p className="text-muted-foreground mb-6">
                Your creator profile is now live! Start creating prediction markets and generate $30,000 in trading volume to unlock your Creator Shares.
              </p>
              <button
                onClick={handleSuccessClose}
                className="w-full py-3 bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity"
                style={{ fontWeight: 600 }}
              >
                View Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {showErrorPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl border border-foreground/10 p-8 max-w-md w-full shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl mb-2" style={{ fontWeight: 700 }}>Registration Failed</h2>
              <p className="text-muted-foreground mb-6">
                {errorMessage}
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
    </>
  );
}
