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
        'function createBTCMarket(uint256 interval, uint256 startTime) external returns (bytes32)',
        'function resolveBTCMarket(bytes32 marketId) external',
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

        this.logger.debug(`shouldCreateMarket: interval=${interval}, minutes=${minutes}, hours=${hours}`);

        switch (interval) {
            case 15:
                // Create every 15 minutes (00, 15, 30, 45)
                const result15 = minutes % 15 === 0;
                this.logger.debug(`15m check: ${minutes} % 15 = ${minutes % 15}, result = ${result15}`);
                return result15;
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
    /**
     * Batch create all BTC markets for the day - runs daily at midnight UTC
     */
    @Cron('0 0 0 * * *') // Daily at 00:00:00 UTC
    async batchCreateDailyMarkets() {
        this.logger.log('🚀 Starting daily batch market creation');

        if (!this.BTC_FACTORY_ADDRESS) {
            this.logger.warn('BTC_FACTORY_ADDRESS not set, skipping batch creation');
            return;
        }

        try {
            // Calculate today's date at 00:00 UTC
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            const startOfDay = Math.floor(today.getTime() / 1000);
            const currentTime = Math.floor(Date.now() / 1000);

            this.logger.log(`Creating markets for: ${today.toISOString()}`);
            this.logger.log(`Start timestamp: ${startOfDay}`);
            this.logger.log(`Current timestamp: ${currentTime}`);

            // Create 96 markets (24 hours * 4 per hour = 96)
            const INTERVAL = 15; // 15 minutes
            const TOTAL_MARKETS = 96;
            let successCount = 0;
            let skipCount = 0;
            let failCount = 0;

            this.logger.log(`📊 Creating ${TOTAL_MARKETS} markets...\n`);

            for (let i = 0; i < TOTAL_MARKETS; i++) {
                const startTime = startOfDay + (i * 15 * 60); // Each market starts 15 min after previous

                // Skip markets that have already started
                if (startTime <= currentTime) {
                    this.logger.debug(`   ⏭️  Skipping past market at ${new Date(startTime * 1000).toISOString()}`);
                    skipCount++;
                    continue;
                }

                const marketTime = new Date(startTime * 1000);
                const hours = marketTime.getUTCHours().toString().padStart(2, '0');
                const minutes = marketTime.getUTCMinutes().toString().padStart(2, '0');

                this.logger.log(`[${i + 1}/${TOTAL_MARKETS}] Creating market for ${hours}:${minutes} UTC...`);

                try {
                    // Check if market already exists
                    const existing = await this.prisma.bTCMarket.findFirst({
                        where: {
                            interval: INTERVAL,
                            start_time: marketTime
                        }
                    });

                    if (existing) {
                        this.logger.log(`   ⏭️  Market already exists, skipping`);
                        skipCount++;
                        continue;
                    }

                    await this.createMarketAtTime(INTERVAL, marketTime, startTime);
                    successCount++;

                    // Small delay to avoid overwhelming the RPC
                    await new Promise(resolve => setTimeout(resolve, 1000));

                } catch (error: any) {
                    this.logger.error(`   ❌ Failed: ${error.message}`);
                    failCount++;

                    // Continue with next market even if one fails
                    if (error.message?.includes('Market already exists')) {
                        skipCount++;
                    }
                }
            }

            this.logger.log('\n' + '='.repeat(60));
            this.logger.log(`✅ Batch creation complete:`);
            this.logger.log(`   Created: ${successCount}/${TOTAL_MARKETS}`);
            this.logger.log(`   Skipped: ${skipCount}`);
            this.logger.log(`   Failed: ${failCount}`);
            this.logger.log('='.repeat(60));

        } catch (error) {
            this.logger.error('Error in batch market creation', error);
        }
    }

    // DEPRECATED: Old one-by-one creation - keeping for backward compatibility
    // @Cron('0 * * * * *') // Every minute at :00 seconds
    async createBTCMarkets() {
        this.logger.debug('🔄 Market creation cron triggered');

        if (!this.BTC_FACTORY_ADDRESS) {
            this.logger.warn('BTC_FACTORY_ADDRESS not set, skipping market creation');
            return;
        }

        try {
            const now = new Date();

            // If we're in the first 30 seconds of a minute, check the previous minute
            // This accounts for cron execution delay
            const seconds = now.getUTCSeconds();
            if (seconds > 0 && seconds < 30) {
                now.setUTCMinutes(now.getUTCMinutes() - 1);
                this.logger.debug(`Adjusted time back 1 minute due to cron delay (seconds=${seconds})`);
            }

            this.logger.debug(`Checking if markets should be created at ${now.toISOString()}`);
            this.logger.debug(`UTC time: ${now.getUTCHours()}:${now.getUTCMinutes().toString().padStart(2, '0')}`);

            const intervals = [15, 60, 360, 720];

            for (const interval of intervals) {
                const shouldCreate = this.shouldCreateMarket(now, interval);
                this.logger.debug(`Interval ${interval}m: shouldCreate = ${shouldCreate}`);

                if (shouldCreate) {
                    await this.createMarket(interval, now);
                }
            }
        } catch (error) {
            this.logger.error('Error in createBTCMarkets cron', error);
        }
    }

    /**
     * Create a single BTC market at a specific timestamp (used by batch creation)
     */
    async createMarketAtTime(interval: number, startTime: Date, startTimestamp: number) {
        try {
            this.logger.log(`Creating BTC ${interval}m market for ${startTime.toISOString()}`);

            // Connect to factory contract
            const factory = new ethers.Contract(
                this.BTC_FACTORY_ADDRESS,
                this.FACTORY_ABI,
                this.wallet
            );

            // Create market on-chain (no start price needed with oracle)
            this.logger.log(`Calling createBTCMarket(${interval}, ${startTimestamp})`);

            const tx = await factory.createBTCMarket(interval, startTimestamp);
            const receipt = await tx.wait();

            this.logger.log(`   ✅ Market created in tx: ${receipt.hash}`);

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
                    start_price: '0', // Will be determined by oracle at start time
                    resolved: false
                }
            });

            this.logger.log(`   Market ID: ${marketId}`);
            this.logger.log(`   End Time: ${endTime.toISOString()}`);

        } catch (error) {
            this.logger.error(`Failed to create BTC ${interval}m market`, error);
            throw error;
        }
    }

    /**
     * Create a single BTC market (DEPRECATED - use createMarketAtTime)
     */
    async createMarket(interval: number, startTime: Date) {
        try {
            this.logger.log(`Creating BTC ${interval}m market for ${startTime.toISOString()}`);

            // Get current BTC price
            const startPrice = await this.getBTCPrice();

            // Convert price to 8 decimals (contract expects 8 decimals)
            const startPriceScaled = Math.floor(startPrice * 1e8);

            // Use current timestamp + 300 seconds buffer (contract requires startTime >= block.timestamp)
            // Larger buffer to account for block timestamp variations on L2 and transaction mining time
            const startTimestamp = Math.floor(Date.now() / 1000) + 300;

            // Connect to factory contract
            const factory = new ethers.Contract(
                this.BTC_FACTORY_ADDRESS,
                this.FACTORY_ABI,
                this.wallet
            );

            // Create market on-chain
            this.logger.log(`Calling createBTCMarket(${interval}, ${startTimestamp}, ${startPriceScaled})`);
            this.logger.log(`Factory address: ${this.BTC_FACTORY_ADDRESS}`);
            this.logger.log(`Wallet address: ${this.wallet.address}`);

            // Encode the function call to verify it's working
            const iface = new ethers.Interface(this.FACTORY_ABI);
            const encodedData = iface.encodeFunctionData('createBTCMarket', [interval, startTimestamp, startPriceScaled]);
            this.logger.log(`Encoded transaction data: ${encodedData.substring(0, 66)}...`);

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

            // Connect to factory contract
            const factory = new ethers.Contract(
                this.BTC_FACTORY_ADDRESS,
                this.FACTORY_ABI,
                this.wallet
            );

            // Resolve market on-chain (oracle determines both prices automatically)
            this.logger.log(`Calling resolveBTCMarket(${marketId})`);

            try {
                const tx = await factory.resolveBTCMarket(marketId);
                const receipt = await tx.wait();

                this.logger.log(`✅ Market resolved in tx: ${receipt.hash}`);

                // Get updated market details from contract to get actual prices and outcome
                const marketDetails = await factory.getMarket(marketId);
                const startPrice = Number(marketDetails.startPrice) / 1e8; // Convert from 8 decimals
                const endPrice = Number(marketDetails.endPrice) / 1e8;
                const outcome = Number(marketDetails.outcome);

                // Update database with actual prices from oracle
                await this.prisma.bTCMarket.update({
                    where: { market_id: marketId },
                    data: {
                        start_price: startPrice.toString(),
                        end_price: endPrice.toString(),
                        resolved: true,
                        outcome
                    }
                });

                this.logger.log(`✅ Market resolved successfully`);
                this.logger.log(`   Market ID: ${marketId}`);
                this.logger.log(`   Start Price (Oracle): $${startPrice.toFixed(2)}`);
                this.logger.log(`   End Price (Oracle): $${endPrice.toFixed(2)}`);
                this.logger.log(`   Outcome: ${outcome === 0 ? 'UP' : 'DOWN'}`);

            } catch (error: any) {
                // If market doesn't exist in current factory (e.g., created with old factory), skip it
                if (error.message?.includes('Market does not exist')) {
                    this.logger.warn(`Market ${marketId} does not exist in current factory, marking as resolved in DB`);
                    // Just mark it as resolved in the database without on-chain resolution
                    const startPrice = parseFloat(market.start_price.toString());
                    const endPrice = await this.getBTCPrice();
                    await this.prisma.bTCMarket.update({
                        where: { market_id: marketId },
                        data: {
                            end_price: endPrice.toString(),
                            resolved: true,
                            outcome: endPrice > startPrice ? 0 : 1
                        }
                    });
                    return;
                }
                throw error;
            }

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
     * Get market by contract address
     */
    async getMarketByAddress(address: string) {
        const market = await this.prisma.bTCMarket.findFirst({
            where: { contract_address: address }
        });

        if (!market) {
            throw new Error('Market not found');
        }

        return market;
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
