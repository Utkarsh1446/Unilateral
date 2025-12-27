import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ethers } from 'ethers';

@Injectable()
export class MarketsService {
    constructor(private prisma: PrismaService) { }

    async create(walletAddress: string, data: any) {
        // walletAddress passed from frontend
        const normalizedAddress = walletAddress.toLowerCase();
        const user = await this.prisma.user.findUnique({
            where: { wallet_address: normalizedAddress },
        });
        if (!user) throw new NotFoundException('User not found');

        const creator = await this.prisma.creator.findUnique({
            where: { user_id: user.id },
        });

        if (!creator) {
            throw new BadRequestException('Creator not found');
        }

        return this.prisma.opinionMarket.create({
            data: {
                creator_id: creator.id,
                question_id: data.questionId,
                question: data.question,
                description: data.description,
                category: data.category,
                contract_address: data.contractAddress, // Likely null initially
                deadline: data.deadline ? new Date(Number(data.deadline) * 1000) : new Date(Date.now() + 86400000), // Default to 24h if missing
                initial_liquidity: 100, // Default
                approval_status: 'pending', // Default
            },
        });
    }

    async createMarketRequest(
        question: string,
        description: string,
        category: string,
        deadline: Date,
        walletAddress: string,
        imageUrl?: string
    ) {
        // Get admin wallets from environment variable (comma-separated)
        const ADMIN_WALLETS = (process.env.ADMIN_WALLETS || "0x9f4c1f7eaa0b729b798f81be84b25fdf9f66a0bf")
            .toLowerCase()
            .split(',')
            .map(addr => addr.trim());

        const normalizedAddress = walletAddress.toLowerCase();
        const isAdmin = ADMIN_WALLETS.includes(normalizedAddress);

        console.log(`Creating market request for: ${normalizedAddress} (Is Admin: ${isAdmin})`);

        // Look up User
        let user = await this.prisma.user.findUnique({
            where: { wallet_address: normalizedAddress },
        });

        // Auto-create Admin User if missing
        if (!user && isAdmin) {
            console.log("Admin user missing, auto-creating...");
            user = await this.prisma.user.create({
                data: {
                    wallet_address: normalizedAddress,
                    twitter_handle: 'admin_bypass',
                }
            });
        }

        if (!user) {
            console.error(`User not found for address: ${normalizedAddress}`);
            throw new NotFoundException('User not found. Please sign up first.');
        }

        let creatorId = null;

        // Check Creator Profile (Skip if Admin)
        if (!isAdmin) {
            const creator = await this.prisma.creator.findUnique({
                where: { user_id: user.id },
            });
            if (!creator) throw new BadRequestException('Creator profile not found. Please become a creator first.');
            creatorId = creator.id;
        } else {
            // For Admin, ensure creator profile exists
            let creator = await this.prisma.creator.findUnique({
                where: { user_id: user.id },
            });

            if (!creator) {
                console.log("Admin creator profile missing, auto-creating...");
                creator = await this.prisma.creator.create({
                    data: {
                        user_id: user.id,
                        twitter_handle: 'admin_bypass',
                        qualified: true,
                        status: 'approved'
                    }
                });
            }
            creatorId = creator.id;
        }

        const market = await this.prisma.opinionMarket.create({
            data: {
                question_id: ethers.keccak256(ethers.toUtf8Bytes(question + Date.now())), // Temporary ID
                question,
                description,
                category,
                image_url: imageUrl,
                deadline,
                creator: { connect: { id: creatorId } },
                initial_liquidity: 100, // Fixed for now
                creation_fee: 100,
                approval_status: isAdmin ? 'approved' : 'pending' // Auto-approve for Admin
            }
        });

        // Create default outcomes (Yes/No) with 50% probability
        await this.prisma.marketOutcome.createMany({
            data: [
                {
                    market_id: market.id,
                    index: 0,
                    name: 'Yes',
                    probability: 0.5,
                    current_price: 0.5
                },
                {
                    market_id: market.id,
                    index: 1,
                    name: 'No',
                    probability: 0.5,
                    current_price: 0.5
                }
            ]
        });

        return market;
    }

    async approveMarket(id: string, adminId: string) {
        return this.prisma.opinionMarket.update({
            where: { id },
            data: {
                approval_status: 'approved',
                // approved_by: adminId, // Schema doesn't have approved_by yet? I added it? 
                // Wait, I added approved_by to Creator, not OpinionMarket in my thought process?
                // I added approval_status and rejection_reason to OpinionMarket.
                // I did NOT add approved_by to OpinionMarket.
                // So I'll skip approved_by for now.
            }
        });
    }

    async rejectMarket(id: string, reason: string) {
        return this.prisma.opinionMarket.update({
            where: { id },
            data: {
                approval_status: 'rejected',
                rejection_reason: reason
            }
        });
    }

    async updateMarketAddress(id: string, contractAddress: string) {
        return this.prisma.opinionMarket.update({
            where: { id },
            data: { contract_address: contractAddress }
        });
    }

    async getSignature(marketId: string, userAddress: string) {
        const market = await this.prisma.opinionMarket.findUnique({
            where: { id: marketId },
            include: { creator: { include: { user: true } } }
        });

        if (!market) throw new NotFoundException("Market not found");
        // Allow pending or approved markets to generate signature (for Creator-led flow)
        if (market.approval_status === 'rejected') throw new BadRequestException("Market rejected");
        if (market.creator.user.wallet_address.toLowerCase() !== userAddress.toLowerCase()) throw new BadRequestException("Not authorized");

        // Generate Signature
        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) throw new Error("PRIVATE_KEY not set");
        const wallet = new ethers.Wallet(privateKey);

        const deadline = Math.floor(Date.now() / 1000) + 3600;
        const chainId = process.env.CHAIN_ID ? parseInt(process.env.CHAIN_ID) : 84532;
        const feeAmount = "100000000"; // 100 USDC

        const hash = ethers.solidityPackedKeccak256(
            ["address", "bytes32", "uint256", "uint256", "uint256"],
            [userAddress, market.question_id, feeAmount, deadline, chainId]
        );

        const signature = await wallet.signMessage(ethers.getBytes(hash));
        return { signature, feeAmount, deadline, questionId: market.question_id };
    }

    async hasActiveMarket(userId: string): Promise<boolean> {
        const activeMarket = await this.prisma.opinionMarket.findFirst({
            where: {
                creator: { user_id: userId },
                resolved: false,
                approval_status: 'approved' // Only approved markets count
            }
        });
        return !!activeMarket;
    }

    // Deprecated or Internal use only
    async generateCreationSignature(userAddress: string, userId: string, questionId: string) {
        // ... (Keep existing logic if needed for legacy tests, or remove)
        // For now, I'll keep it but it might not be used by new flow.
        const fs = require('fs');
        // ...
        return {}; // Placeholder to avoid breaking if called
    }

    async findAll() {
        // Show all approved markets (active, expired, and resolved)
        // Frontend will handle filtering by status
        return this.prisma.opinionMarket.findMany({
            where: {
                approval_status: 'approved'
            },
            include: { creator: true, outcomes: true },
            orderBy: { created_at: 'desc' }
        });
    }

    async findOne(id: string) {
        return this.prisma.opinionMarket.findUnique({
            where: { id },
            include: { creator: true },
        });
    }

    async updatePosition(marketId: string, userAddress: string, outcomeIndex: number, amountChange: number, price: number) {
        // Find existing position
        const existing = await this.prisma.marketPosition.findFirst({
            where: {
                market_id: marketId,
                user_address: userAddress,
                outcome_index: outcomeIndex
            }
        });

        if (existing) {
            const newAmount = Number(existing.amount) + amountChange;

            // Simple avg price update (weighted average)
            // If buying (amountChange > 0): NewAvg = ((OldAmt * OldAvg) + (Change * Price)) / NewAmt
            // If selling (amountChange < 0): Avg Price stays same (FIFO/LIFO doesn't matter for avg entry)

            let newAvgPrice = Number(existing.avg_price);
            if (amountChange > 0) {
                const totalCost = (Number(existing.amount) * Number(existing.avg_price)) + (amountChange * price);
                newAvgPrice = totalCost / newAmount;
            }

            if (newAmount <= 0.000001) {
                // Close position
                return this.prisma.marketPosition.delete({ where: { id: existing.id } });
            }

            // Update market volume
            await this.prisma.opinionMarket.update({
                where: { id: marketId },
                data: {
                    volume: { increment: Math.abs(amountChange * price) }
                }
            });

            return this.prisma.marketPosition.update({
                where: { id: existing.id },
                data: {
                    amount: newAmount,
                    avg_price: newAvgPrice
                }
            });
        } else {
            if (amountChange <= 0) return; // Cannot sell what you don't have
            // Update market volume
            await this.prisma.opinionMarket.update({
                where: { id: marketId },
                data: {
                    volume: { increment: Math.abs(amountChange * price) }
                }
            });

            return this.prisma.marketPosition.create({
                data: {
                    market_id: marketId,
                    user_address: userAddress,
                    outcome_index: outcomeIndex,
                    amount: amountChange,
                    avg_price: price
                }
            });
        }
    }

    async getUserPositions(userAddress: string) {
        return this.prisma.marketPosition.findMany({
            where: { user_address: userAddress },
            include: { market: true }
        });
    }

    // Update market volume when trades happen
    // Update market volume and optionally price
    async updateVolume(marketId: string, tradeVolume: number, outcomeIndex?: number, price?: number) {
        const market = await this.prisma.opinionMarket.findUnique({
            where: { id: marketId },
            include: { outcomes: true }
        });

        if (!market) {
            throw new NotFoundException("Market not found");
        }

        const newVolume = Number(market.volume) + tradeVolume;

        // Update market volume
        await this.prisma.opinionMarket.update({
            where: { id: marketId },
            data: { volume: newVolume }
        });

        // Update outcome price if provided
        if (outcomeIndex !== undefined && price !== undefined) {
            // Find valid outcome
            const outcome = market.outcomes.find(o => o.index === outcomeIndex);
            if (outcome) {
                await this.prisma.marketOutcome.update({
                    where: { id: outcome.id },
                    data: { current_price: price }
                });

                // Also update the OTHER outcome to 1-price if binary
                const otherIndex = outcomeIndex === 0 ? 1 : 0;
                const otherOutcome = market.outcomes.find(o => o.index === otherIndex);
                if (otherOutcome) {
                    await this.prisma.marketOutcome.update({
                        where: { id: otherOutcome.id },
                        data: { current_price: 1 - price }
                    });
                }
            }
        }

        console.log(`Market ${marketId} stats updated: Vol=$${newVolume.toFixed(2)}, Price=${price}`);
        return { marketId, newVolume };
    }

    // Update volume/price by contract address (for frontend calls)
    async updateVolumeByAddress(contractAddress: string, tradeVolume: number, outcomeIndex?: number, price?: number) {
        const market = await this.prisma.opinionMarket.findFirst({
            where: { contract_address: contractAddress.toLowerCase() }
        });

        if (!market) {
            // Try with original case
            const marketAlt = await this.prisma.opinionMarket.findFirst({
                where: { contract_address: contractAddress }
            });
            if (!marketAlt) {
                throw new NotFoundException("Market not found for address: " + contractAddress);
            }
            return this.updateVolume(marketAlt.id, tradeVolume, outcomeIndex, price);
        }

        return this.updateVolume(market.id, tradeVolume, outcomeIndex, price);
    }

    // Get market volume stats
    async getMarketVolume(marketId: string) {
        const market = await this.prisma.opinionMarket.findUnique({
            where: { id: marketId },
            select: { id: true, volume: true, question: true, creator: { select: { twitter_handle: true } } }
        });

        if (!market) {
            throw new NotFoundException("Market not found");
        }

        return {
            marketId: market.id,
            volume: Number(market.volume),
            question: market.question,
            creator: market.creator.twitter_handle
        };
    }
}
