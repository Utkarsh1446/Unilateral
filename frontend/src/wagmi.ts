import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
    appName: 'Unilateral',
    projectId: 'YOUR_PROJECT_ID', // Get from WalletConnect Cloud
    chains: [baseSepolia],
    ssr: false,
});
