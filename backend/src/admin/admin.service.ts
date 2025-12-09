import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) { }

    // Creator Management
    async getAllCreators() {
        return this.prisma.creator.findMany({
            include: {
                user: true,
                markets: true,
            },
            orderBy: {
                created_at: 'desc'
            }
        });
    }

    async approveCreator(creatorId: string, adminWallet: string) {
        return this.prisma.creator.update({
            where: { id: creatorId },
            data: {
                approval_status: 'approved',
                approved_by: adminWallet,
                approved_at: new Date()
            }
        });
    }

    async rejectCreator(creatorId: string, adminWallet: string) {
        return this.prisma.creator.update({
            where: { id: creatorId },
            data: {
                approval_status: 'rejected',
                approved_by: adminWallet,
                approved_at: new Date()
            }
        });
    }

    // Market Management
    async getAllMarkets() {
        return this.prisma.opinionMarket.findMany({
            include: {
                creator: {
                    include: {
                        user: true
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });
    }

    async approveMarket(marketId: string, adminWallet: string) {
        return this.prisma.opinionMarket.update({
            where: { id: marketId },
            data: {
                approval_status: 'approved',
                // approved_by: adminWallet, // Add to schema if needed
                // approved_at: new Date()
            }
        });
    }

    async rejectMarket(marketId: string, reason: string, adminWallet: string) {
        return this.prisma.opinionMarket.update({
            where: { id: marketId },
            data: {
                approval_status: 'rejected',
                rejection_reason: reason,
                // rejected_by: adminWallet,
                // rejected_at: new Date()
            }
        });
    }

    async resolveMarket(marketId: string, outcome: number, adminWallet: string) {
        return this.prisma.opinionMarket.update({
            where: { id: marketId },
            data: {
                resolved: true,
                outcome: outcome,
            }
        });
    }

    // Platform Statistics
    async getPlatformStats() {
        const [
            totalMarkets,
            totalCreators,
            totalVolume,
            activeMarkets
        ] = await Promise.all([
            this.prisma.opinionMarket.count(),
            this.prisma.creator.count(),
            this.prisma.opinionMarket.aggregate({
                _sum: {
                    volume: true
                }
            }),
            this.prisma.opinionMarket.count({
                where: {
                    resolved: false,
                    approval_status: 'approved'
                }
            })
        ]);

        return {
            totalMarkets,
            totalCreators,
            totalVolume: totalVolume._sum.volume || '0',
            activeMarkets,
            timestamp: new Date()
        };
    }

    // Audit Log
    async logAdminAction(adminWallet: string, action: string, details: any) {
        // Could create an AdminLog model in Prisma schema
        console.log('Admin Action:', { adminWallet, action, details, timestamp: new Date() });
        // For now, just log to console
        // In production, save to database
    }
}
