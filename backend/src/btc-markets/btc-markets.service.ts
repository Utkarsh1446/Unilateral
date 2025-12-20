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
     * Fetch current BTC price from Pyth Network oracle
     * Pyth provides reliable, decentralized price feeds with no rate limits
     * BTC/USD Price Feed ID: 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43
     */
    async getBTCPrice(): Promise<number> {
        const PYTH_BTC_USD_FEED = '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43';

        try {
            // Pyth Hermes API - free, no authentication, no rate limits
            const response = await axios.get(
                `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${PYTH_BTC_USD_FEED}`
            );

            const priceData = response.data.parsed[0];
            const price = parseFloat(priceData.price.price) * Math.pow(10, priceData.price.expo);

            this.logger.debug(`Current BTC price (Pyth): $${price.toFixed(2)}`);
            this.logger.debug(`Pyth confidence: ±$${(parseFloat(priceData.price.conf) * Math.pow(10, priceData.price.expo)).toFixed(2)}`);

            return price;
        } catch (error) {
            this.logger.error('Pyth price fetch failed, trying CryptoCompare fallback...', error);

            // Fallback to CryptoCompare
            try {
                const response = await axios.get('https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD');
                const price = response.data.USD;
                this.logger.log(`Using fallback price from CryptoCompare: $${price.toFixed(2)}`);
                return price;
            } catch (fallbackError) {
                this.logger.error('All price sources failed', fallbackError);
                throw new Error('Unable to fetch BTC price from any source');
            }
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
            const startTimestamp = Math.floor(Date.now() / 1000);

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
            let marketId = this.extractMarketIdFromReceipt(receipt);

            if (!marketId) {
                this.logger.warn('Failed to extract marketId from receipt, fetching from contract...');

                // Fallback: Get all market IDs and use the latest one
                try {
                    const allMarketIds = await factory.getAllMarketIds();
                    if (allMarketIds.length > 0) {
                        marketId = allMarketIds[allMarketIds.length - 1];
                        this.logger.log(`Using latest marketId from contract: ${marketId}`);
                    } else {
                        this.logger.error('No markets found in contract');
                        return;
                    }
                } catch (error) {
                    this.logger.error('Failed to fetch market IDs from contract', error);
                    return;
                }
            }

            // Get market details from contract
            const marketDetails = await factory.getMarket(marketId);

            this.logger.log(`Market details: ${JSON.stringify({
                marketAddress: marketDetails.marketAddress,
                interval: marketDetails.interval.toString(),
                startTime: marketDetails.startTime.toString(),
                endTime: marketDetails.endTime.toString()
            })}`);

            // Save to database
            const endTime = new Date(Number(marketDetails.endTime) * 1000);
            const startTimeDb = new Date(Number(marketDetails.startTime) * 1000);

            await this.prisma.bTCMarket.create({
                data: {
                    market_id: marketId as string, // Already checked for null above
                    contract_address: marketDetails.marketAddress,
                    interval: Number(marketDetails.interval),
                    start_time: startTimeDb,
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
        try {
            // Create interface to parse events
            const iface = new ethers.Interface([
                'event BTCMarketCreated(bytes32 indexed marketId, address indexed marketAddress, uint256 interval, uint256 startTime, uint256 endTime, uint256 startPrice)'
            ]);

            // Parse all logs
            for (const log of receipt.logs) {
                try {
                    const parsed = iface.parseLog(log);
                    if (parsed && parsed.name === 'BTCMarketCreated') {
                        this.logger.log(`Found BTCMarketCreated event, marketId: ${parsed.args.marketId}`);
                        return parsed.args.marketId;
                    }
                } catch (e) {
                    // Not this event, continue
                }
            }

            this.logger.error('BTCMarketCreated event not found in receipt');
            this.logger.debug(`Receipt logs: ${JSON.stringify(receipt.logs)}`);
            return null;
        } catch (error) {
            this.logger.error('Error extracting marketId:', error);
            return null;
        }
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
