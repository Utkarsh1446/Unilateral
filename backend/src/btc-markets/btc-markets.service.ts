import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ethers } from 'ethers';
import axios from 'axios';

@Injectable()
export class BtcMarketsService {
    private readonly logger = new Logger(BtcMarketsService.name);
    private readonly provider: ethers.JsonRpcProvider;
    private readonly wallet: ethers.Wallet;

    // Contract addresses (update after deployment)
    private readonly BTC_FACTORY_ADDRESS = process.env.BTC_FACTORY_ADDRESS || '';
    private readonly FACTORY_ABI = [
        'function createBTCMarket(uint256 interval, uint256 startTime, uint256 startPrice) external returns (bytes32)',
        'function resolveBTCMarket(bytes32 marketId, uint256 endPrice) external',
        'function getMarket(bytes32 marketId) external view returns (tuple(address marketAddress, uint256 interval, uint256 startTime, uint256 endTime, uint256 startPrice, uint256 endPrice, bool resolved, uint256 outcome))'
    ];

    constructor(private prisma: PrismaService) {
        const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;
        const privateKey = process.env.PRIVATE_KEY;

        if (!rpcUrl || !privateKey) {
            this.logger.error('Missing RPC_URL or PRIVATE_KEY environment variables');
            return;
        }

        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.logger.log(`BTC Markets Service initialized with wallet: ${this.wallet.address}`);
    }

    /**
     * Fetch current BTC price from Binance API
     */
    async getBTCPrice(): Promise<number> {
        try {
            const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
            const price = parseFloat(response.data.price);
            this.logger.debug(`Current BTC price: $${price.toFixed(2)}`);
            return price;
        } catch (error) {
            this.logger.error('Failed to fetch BTC price from Binance', error);
            throw error;
        }
    }

    /**
     * Check if a market should be created for given interval at current time
     */
    shouldCreateMarket(now: Date, interval: number): boolean {
        const minutes = now.getUTCMinutes();
        const hours = now.getUTCHours();

        switch (interval) {
            case 15:
                // Create every 15 minutes (00, 15, 30, 45)
                return minutes % 15 === 0;
            case 60:
                // Create every hour (00 minutes)
                return minutes === 0;
            case 360:
                // Create every 6 hours (00:00, 06:00, 12:00, 18:00)
                return minutes === 0 && hours % 6 === 0;
            case 720:
                // Create every 12 hours (00:00, 12:00)
                return minutes === 0 && (hours === 0 || hours === 12);
            default:
                return false;
        }
    }

    /**
     * Create BTC markets - runs every minute to check if markets should be created
     */
    @Cron('0 * * * * *') // Every minute at :00 seconds
    async createBTCMarkets() {
        if (!this.BTC_FACTORY_ADDRESS) {
            this.logger.warn('BTC_FACTORY_ADDRESS not set, skipping market creation');
            return;
        }

        try {
            const now = new Date();
            const intervals = [15, 60, 360, 720];

            for (const interval of intervals) {
                if (this.shouldCreateMarket(now, interval)) {
                    await this.createMarket(interval, now);
                }
            }
        } catch (error) {
            this.logger.error('Error in createBTCMarkets cron', error);
        }
    }

    /**
     * Create a single BTC market
     */
    async createMarket(interval: number, startTime: Date) {
        try {
            this.logger.log(`Creating BTC ${interval}m market for ${startTime.toISOString()}`);

            // Get current BTC price
            const startPrice = await this.getBTCPrice();

            // Convert price to 8 decimals (contract expects 8 decimals)
            const startPriceScaled = Math.floor(startPrice * 1e8);

            // Calculate start time (round to nearest minute)
            const startTimestamp = Math.floor(startTime.getTime() / 1000);

            // Connect to factory contract
            const factory = new ethers.Contract(
                this.BTC_FACTORY_ADDRESS,
                this.FACTORY_ABI,
                this.wallet
            );

            // Create market on-chain
            this.logger.log(`Calling createBTCMarket(${interval}, ${startTimestamp}, ${startPriceScaled})`);
            const tx = await factory.createBTCMarket(interval, startTimestamp, startPriceScaled);
            const receipt = await tx.wait();

            this.logger.log(`Market created in tx: ${receipt.hash}`);

            // Extract marketId from events
            const marketId = this.extractMarketIdFromReceipt(receipt);

            if (!marketId) {
                this.logger.error('Failed to extract marketId from receipt');
                return;
            }

            // Get market details from contract
            const marketDetails = await factory.getMarket(marketId);

            // Save to database
            const endTime = new Date((startTimestamp + interval * 60) * 1000);

            await this.prisma.bTCMarket.create({
                data: {
                    market_id: marketId,
                    contract_address: marketDetails.marketAddress,
                    interval,
                    start_time: startTime,
                    end_time: endTime,
                    start_price: startPrice.toString(),
                    resolved: false
                }
            });

            this.logger.log(`✅ BTC ${interval}m market created successfully`);
            this.logger.log(`   Market ID: ${marketId}`);
            this.logger.log(`   Start Price: $${startPrice.toFixed(2)}`);
            this.logger.log(`   End Time: ${endTime.toISOString()}`);

        } catch (error) {
            this.logger.error(`Failed to create BTC ${interval}m market`, error);
        }
    }

    /**
     * Check and resolve expired markets - runs every minute
     */
    @Cron('30 * * * * *') // Every minute at :30 seconds
    async checkAndResolveMarkets() {
        if (!this.BTC_FACTORY_ADDRESS) {
            this.logger.warn('BTC_FACTORY_ADDRESS not set, skipping resolution check');
            return;
        }

        try {
            const now = new Date();

            // Find expired unresolved markets
            const expiredMarkets = await this.prisma.bTCMarket.findMany({
                where: {
                    resolved: false,
                    end_time: {
                        lte: now
                    }
                }
            });

            this.logger.debug(`Found ${expiredMarkets.length} expired markets to resolve`);

            for (const market of expiredMarkets) {
                await this.resolveMarket(market.market_id);
            }
        } catch (error) {
            this.logger.error('Error in checkAndResolveMarkets cron', error);
        }
    }

    /**
     * Resolve a single BTC market
     */
    async resolveMarket(marketId: string) {
        try {
            this.logger.log(`Resolving market: ${marketId}`);

            // Get market from database
            const market = await this.prisma.bTCMarket.findUnique({
                where: { market_id: marketId }
            });

            if (!market) {
                this.logger.error(`Market not found: ${marketId}`);
                return;
            }

            if (market.resolved) {
                this.logger.warn(`Market already resolved: ${marketId}`);
                return;
            }

            // Get current BTC price
            const endPrice = await this.getBTCPrice();
            const endPriceScaled = Math.floor(endPrice * 1e8);

            // Connect to factory contract
            const factory = new ethers.Contract(
                this.BTC_FACTORY_ADDRESS,
                this.FACTORY_ABI,
                this.wallet
            );

            // Resolve market on-chain
            this.logger.log(`Calling resolveBTCMarket(${marketId}, ${endPriceScaled})`);
            const tx = await factory.resolveBTCMarket(marketId, endPriceScaled);
            await tx.wait();

            // Determine outcome
            const startPrice = parseFloat(market.start_price.toString());
            const outcome = endPrice > startPrice ? 0 : 1; // 0 = UP, 1 = DOWN

            // Update database
            await this.prisma.bTCMarket.update({
                where: { market_id: marketId },
                data: {
                    end_price: endPrice.toString(),
                    resolved: true,
                    outcome
                }
            });

            this.logger.log(`✅ Market resolved successfully`);
            this.logger.log(`   Market ID: ${marketId}`);
            this.logger.log(`   Start Price: $${startPrice.toFixed(2)}`);
            this.logger.log(`   End Price: $${endPrice.toFixed(2)}`);
            this.logger.log(`   Outcome: ${outcome === 0 ? 'UP' : 'DOWN'}`);

        } catch (error) {
            this.logger.error(`Failed to resolve market ${marketId}`, error);
        }
    }

    /**
     * Extract marketId from transaction receipt
     */
    private extractMarketIdFromReceipt(receipt: any): string | null {
        // Look for BTCMarketCreated event
        // Event signature: BTCMarketCreated(bytes32 indexed marketId, ...)
        for (const log of receipt.logs) {
            try {
                // The first topic is the event signature
                // The second topic is the indexed marketId
                if (log.topics.length >= 2) {
                    return log.topics[1]; // marketId is the first indexed parameter
                }
            } catch (e) {
                // Continue to next log
            }
        }
        return null;
    }

    /**
     * Get all BTC markets
     */
    async getAllMarkets() {
        return this.prisma.bTCMarket.findMany({
            orderBy: { start_time: 'desc' }
        });
    }

    /**
     * Get markets by interval
     */
    async getMarketsByInterval(interval: number) {
        return this.prisma.bTCMarket.findMany({
            where: { interval },
            orderBy: { start_time: 'desc' }
        });
    }

    /**
     * Get active (unresolved) markets
     */
    async getActiveMarkets() {
        return this.prisma.bTCMarket.findMany({
            where: { resolved: false },
            orderBy: { start_time: 'desc' }
        });
    }
}
