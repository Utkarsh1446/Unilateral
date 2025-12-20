import { Controller, Get, Param, Post } from '@nestjs/common';
import { BtcMarketsService } from './btc-markets.service';

@Controller('btc-markets')
export class BtcMarketsController {
    constructor(private readonly btcMarketsService: BtcMarketsService) { }

    @Get()
    async getAllMarkets() {
        return this.btcMarketsService.getAllMarkets();
    }

    @Get('active')
    async getActiveMarkets() {
        return this.btcMarketsService.getActiveMarkets();
    }

    @Get('interval/:interval')
    async getMarketsByInterval(@Param('interval') interval: string) {
        return this.btcMarketsService.getMarketsByInterval(parseInt(interval));
    }

    @Get('market/:address')
    async getMarketByAddress(@Param('address') address: string) {
        return this.btcMarketsService.getMarketByAddress(address);
    }

    @Get('price')
    async getCurrentPrice() {
        const price = await this.btcMarketsService.getBTCPrice();
        return { price, timestamp: new Date().toISOString() };
    }

    @Post('create/:interval')
    async createMarketManually(@Param('interval') interval: string) {
        const now = new Date();
        await this.btcMarketsService.createMarket(parseInt(interval), now);
        return { success: true, message: `Market created for ${interval}m interval` };
    }

    @Post('resolve/:marketId')
    async resolveMarketManually(@Param('marketId') marketId: string) {
        await this.btcMarketsService.resolveMarket(marketId);
        return { success: true, message: `Market ${marketId} resolved` };
    }

    @Get('debug/config')
    async debugConfig() {
        return {
            factoryAddress: process.env.BTC_FACTORY_ADDRESS || 'NOT SET',
            rpcUrl: process.env.BASE_SEPOLIA_RPC_URL ? 'SET' : 'NOT SET',
            privateKey: process.env.PRIVATE_KEY ? 'SET (hidden)' : 'NOT SET',
            currentTime: new Date().toISOString(),
            currentUTCTime: new Date().toUTCString(),
            nextCronRun: 'Every minute at :00 seconds'
        };
    }
}
