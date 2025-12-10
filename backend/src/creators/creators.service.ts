import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ethers } from 'ethers';
import { TwitterScraperService } from '../twitter/twitter-scraper.service';
import { TwitterService } from '../twitter/twitter.service';

@Injectable()
export class CreatorsService {
    constructor(
        private prisma: PrismaService,
        private twitterService: TwitterService,
        private twitterScraper: TwitterScraperService
    ) { }

    async createProfile(data: any) {
        console.log('[CreateProfile] Received data:', JSON.stringify(data, null, 2));

        // Validate required fields
        if (!data.walletAddress) {
            throw new Error('walletAddress is required');
        }
        if (!data.twitterHandle) {
            throw new Error('twitterHandle is required');
        }

        try {
            // Create user if doesn't exist
            console.log('[CreateProfile] Creating/upserting user...');
            const user = await this.prisma.user.upsert({
                where: { wallet_address: data.walletAddress.toLowerCase() },
                update: {
                    twitter_handle: data.twitterHandle,
                },
                create: {
                    wallet_address: data.walletAddress.toLowerCase(),
                    twitter_handle: data.twitterHandle,
                },
            });
            console.log('[CreateProfile] User created/updated:', user.id);

            // Check if creator already exists for this user
            const existingCreator = await this.prisma.creator.findFirst({
                where: { user_id: user.id }
            });
            if (existingCreator) {
                console.log('[CreateProfile] Creator already exists, returning existing');
                return existingCreator;
            }

            // Check if twitter_handle already used by another creator
            const handleInUse = await this.prisma.creator.findFirst({
                where: { twitter_handle: data.twitterHandle }
            });
            if (handleInUse) {
                console.log('[CreateProfile] Twitter handle already in use by:', handleInUse.user_id);
                throw new Error(`Twitter handle @${data.twitterHandle} is already registered to another account`);
            }

            // Create creator profile
            console.log('[CreateProfile] Creating creator profile...');
            const creator = await this.prisma.creator.create({
                data: {
                    user_id: user.id,
                    twitter_handle: data.twitterHandle,
                    display_name: data.display_name || data.twitterHandle,
                    profile_image: data.profile_image || null,
                    contract_address: data.shareContractAddress || null,
                    twitter_access_token: data.twitterAccessToken || null,
                    twitter_refresh_token: data.twitterRefreshToken || null,
                    qualified: true,
                    qualified_at: new Date(),
                },
            });
            console.log('[CreateProfile] Creator created successfully:', creator.id);
            return creator;
        } catch (error: any) {
            console.error('[CreateProfile] Error:', error.message);
            console.error('[CreateProfile] Full error:', error);
            throw error;
        }
    }

    async createShareForWallet(walletAddress: string, name: string, symbol: string) {
        const ethers = require('ethers');

        // Generate signature for share creation
        const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
        const chainId = 84532; // Base Sepolia

        const hash = ethers.solidityPackedKeccak256(
            ['address', 'string', 'string', 'uint256', 'uint256'],
            [walletAddress, name, symbol, deadline, chainId]
        );

        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
        const signature = await wallet.signMessage(ethers.getBytes(hash));

        return {
            walletAddress,
            name,
            symbol,
            deadline,
            signature
        };
    }

    async findAll() {
        const creators = await this.prisma.creator.findMany({
            include: {
                markets: true,
                shares: {
                    include: {
                        transactions: true
                    }
                }
            }
        });

        return creators.map(creator => {
            // Calculate total market volume
            const total_market_volume = creator.markets.reduce((sum, market) => {
                return sum + (Number(market.volume) || 0);
            }, 0);

            // Get share price from bonding curve or shares table
            const share_price = creator.shares?.current_price
                ? Number(creator.shares.current_price).toFixed(2)
                : '1.00';

            // Calculate unique holders from share transactions
            let holders_count = 0;
            if (creator.shares?.transactions) {
                const balances = new Map<string, number>();
                for (const tx of creator.shares.transactions) {
                    const addr = tx.user_address.toLowerCase();
                    const current = balances.get(addr) || 0;
                    if (tx.type === 'BUY') {
                        balances.set(addr, current + tx.amount);
                    } else if (tx.type === 'SELL') {
                        balances.set(addr, current - tx.amount);
                    }
                }
                // Count addresses with positive balance
                balances.forEach((bal) => { if (bal > 0) holders_count++; });
            }

            return {
                id: creator.id,
                user_id: creator.user_id,
                twitter_handle: creator.twitter_handle,
                display_name: creator.display_name || creator.twitter_handle,
                profile_image: creator.profile_image,
                follower_count: creator.follower_count || 0,
                engagement_rate: creator.engagement_rate?.toString() || '0',
                total_market_volume,
                total_shares: creator.total_shares,
                share_price,
                holders_count,
                dividend_rate: 0.38, // 0.38% dividend rate
                contract_address: creator.contract_address,
                status: creator.status,
                approval_status: creator.approval_status,
                created_at: creator.created_at
            };
        });
    }

    async findOne(id: string) {
        const creator = await this.prisma.creator.findUnique({
            where: { id },
            include: {
                markets: true,
                shares: true
            },
        });

        if (!creator) return null;

        // Calculate total market volume
        const totalVolume = creator.markets.reduce((sum, market) => {
            return sum + (Number(market.volume) || 0);
        }, 0);

        return {
            ...creator,
            total_market_volume: totalVolume
        };
    }

    async checkEligibility(twitterHandle: string) {
        // Use Scraper Service for real checks
        const metrics = await this.twitterScraper.getTwitterMetrics(twitterHandle);
        const eligible = this.twitterScraper.verifyEligibility(metrics.followers, metrics.engagementRate);

        return {
            eligible,
            followerCount: metrics.followers,
            engagementRate: metrics.engagementRate,
            profileImage: metrics.profileImage,
            name: metrics.name,
            username: metrics.username
        };
    }

    async checkVolumeEligibility(userId: string): Promise<{ eligible: boolean, volume: number, details: string }> {
        // Get ALL approved markets by this creator and sum their volume
        const markets = await this.prisma.opinionMarket.findMany({
            where: {
                creator: { user_id: userId },
                approval_status: 'approved'
            },
            select: { id: true, volume: true, question: true }
        });

        const totalVolume = markets.reduce((sum, m) => sum + (Number(m.volume) || 0), 0);

        const details = `${markets.length} approved markets, total volume: $${totalVolume.toLocaleString()}`;
        console.log(`User ${userId} volume eligibility: ${details}`);

        return {
            eligible: totalVolume >= 30000,
            volume: totalVolume,
            details
        };
    }

    // Legacy method for backward compatibility
    async checkWeeklyVolume(userId: string): Promise<boolean> {
        const result = await this.checkVolumeEligibility(userId);
        return result.eligible;
    }

    async canCreateMarket(creatorId: string): Promise<{ allowed: boolean, reason?: string }> {
        // Check 1: Only 1 active (unresolved) market at a time
        const activeMarkets = await this.prisma.opinionMarket.count({
            where: {
                creator_id: creatorId,
                resolved: false,
                approval_status: 'approved'
            }
        });
        if (activeMarkets >= 1) {
            return { allowed: false, reason: "You already have an active market. Wait for it to resolve before creating another." };
        }

        // Check 2: Only 1 market per day
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const marketsToday = await this.prisma.opinionMarket.count({
            where: {
                creator_id: creatorId,
                created_at: { gte: today }
            }
        });
        if (marketsToday >= 1) {
            return { allowed: false, reason: "You can only create 1 market per day. Try again tomorrow." };
        }

        return { allowed: true };
    }

    async generateOnboardingSignature(userAddress: string, name: string, symbol: string, userId: string) {
        // Volume check replaced by Twitter Engagement check on frontend/controller
        // const volumeEligible = await this.checkWeeklyVolume(userId);
        // if (!volumeEligible) throw new Error("Insufficient weekly volume (> $30k required)");

        // Check if already has a share
        const existingShare = await this.prisma.creatorShare.findFirst({
            where: { creator: { user_id: userId } }
        });
        if (existingShare) throw new Error("Creator Share already exists");

        // In production, load private key from secure env/vault
        // For v1.2 demo, we use a hardcoded key or env var
        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) throw new Error("PRIVATE_KEY not set");

        const wallet = new ethers.Wallet(privateKey);
        console.log("Signing with address:", wallet.address);
        // Write address to file for debugging
        const fs = require('fs');
        fs.writeFileSync('signer_address.txt', wallet.address);

        const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour

        // Chain ID should be fetched or configured. Assuming Base Sepolia (84532) or local (31337)
        // For now, let's assume we pass it or use a default.
        const chainId = 84532; // Base Sepolia

        console.log("Signature Params:", { userAddress, name, symbol, deadline, chainId });

        fs.writeFileSync('signature_params.json', JSON.stringify({ userAddress, name, symbol, deadline, chainId }, null, 2));

        const hash = ethers.solidityPackedKeccak256(
            ["address", "string", "string", "uint256", "uint256"],
            [userAddress, name, symbol, deadline, chainId]
        );

        console.log("Generated Hash:", hash);

        const signature = await wallet.signMessage(ethers.getBytes(hash));

        return { signature, deadline };
    }
    async getShareHoldings(userAddress: string) {
        // Return ALL creator shares - frontend will check on-chain balances
        // This is more reliable than tracking transactions in DB since trades happen on-chain
        const shares = await this.prisma.creatorShare.findMany({
            include: {
                creator: {
                    select: {
                        twitter_handle: true,
                        display_name: true,
                        profile_image: true,
                        user_id: true
                    }
                }
            }
        });

        // Return all shares - frontend will filter by checking on-chain balance
        return shares.map(s => ({
            shareId: s.id,
            shareAddress: s.contract_address,
            creatorHandle: s.creator.twitter_handle,
            creatorName: s.creator.display_name || s.creator.twitter_handle,
            creatorImage: s.creator.profile_image,
            // balance will be fetched on-chain by frontend
        }));
    }

    // Get creator dashboard stats for profile page
    async getCreatorDashboard(walletAddress: string) {
        const user = await this.prisma.user.findFirst({
            where: { wallet_address: walletAddress.toLowerCase() }
        });

        if (!user) {
            return { isCreator: false };
        }

        const creator = await this.prisma.creator.findFirst({
            where: { user_id: user.id },
            include: {
                markets: {
                    select: {
                        id: true,
                        question: true,
                        volume: true,
                        approval_status: true,
                        resolved: true,
                        created_at: true,
                        deadline: true
                    },
                    orderBy: { created_at: 'desc' }
                },
                shares: true
            }
        });

        if (!creator) {
            return { isCreator: false };
        }

        // Calculate total volume across all markets
        const totalVolume = creator.markets.reduce((sum, m) => sum + (Number(m.volume) || 0), 0);

        // Estimate fees earned (1.5% total fee, 0.37% goes to creator + 0.38% dividend)
        const CREATOR_FEE_BPS = 37;
        const DIVIDEND_FEE_BPS = 38;
        const creatorFees = (totalVolume * CREATOR_FEE_BPS) / 10000;
        const dividendFees = (totalVolume * DIVIDEND_FEE_BPS) / 10000;
        const totalFeesEarned = creatorFees + dividendFees;

        // Check volume eligibility for creator shares
        const eligibility = await this.checkVolumeEligibility(user.id);

        return {
            isCreator: true,
            creatorId: creator.id,
            twitterHandle: creator.twitter_handle,
            displayName: creator.display_name,
            profileImage: creator.profile_image,
            status: creator.status,
            approvalStatus: creator.approval_status,

            // Creator Shares Info
            hasShares: !!creator.shares,
            shareContractAddress: creator.shares?.contract_address || null,
            sharesTotalSupply: creator.shares?.total_supply || 0,
            sharesCurrentPrice: creator.shares?.current_price || 0,
            sharesUnlocked: creator.shares_unlocked,

            // Volume & Eligibility
            totalVolume,
            volumeEligibility: eligibility,
            volumeProgress: Math.min(100, (eligibility.volume / 30000) * 100).toFixed(1),

            // Fees
            totalFeesEarned: totalFeesEarned.toFixed(2),
            creatorFeesEarned: creatorFees.toFixed(2),
            dividendFeesEarned: dividendFees.toFixed(2),

            // Markets
            marketsCount: creator.markets.length,
            activeMarkets: creator.markets.filter(m => !m.resolved && m.approval_status === 'approved').length,
            pendingMarkets: creator.markets.filter(m => m.approval_status === 'pending').length,
            markets: creator.markets.map(m => ({
                id: m.id,
                question: m.question,
                volume: Number(m.volume),
                status: m.resolved ? 'resolved' : m.approval_status,
                createdAt: m.created_at,
                deadline: m.deadline
            })),

            createdAt: creator.created_at
        };
    }

    // Update creator with deployed share address
    async updateShareAddress(creatorId: string, shareAddress: string) {
        // Update creator record
        const creator = await this.prisma.creator.update({
            where: { id: creatorId },
            data: {
                contract_address: shareAddress,
                shares_unlocked: true
            }
        });

        // Create CreatorShare record
        await this.prisma.creatorShare.upsert({
            where: { creator_id: creatorId },
            update: { contract_address: shareAddress },
            create: {
                creator_id: creatorId,
                contract_address: shareAddress,
                total_supply: 0,
                current_price: 0
            }
        });

        console.log(`Creator ${creatorId} share deployed at ${shareAddress}`);
        return { success: true, shareAddress };
    }
}
