import { Controller, Get, Post, Body, Param, Request } from '@nestjs/common';
import { MarketsService } from './markets.service';

@Controller('markets')
export class MarketsController {
    constructor(private marketsService: MarketsService) { }

    @Get()
    findAll() {
        return this.marketsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.marketsService.findOne(id);
    }

    @Post('create')
    async createMarket(@Body() body: {
        question: string;
        description: string;
        category: string;
        deadline: string;
        creatorId: string;
        imageUrl?: string;
    }) {
        return this.marketsService.createMarketRequest(
            body.question,
            body.description,
            body.category,
            new Date(body.deadline),
            body.creatorId,
            body.imageUrl
        );
    }

    @Post(':id/address')
    async updateMarketAddress(@Param('id') id: string, @Body('contractAddress') contractAddress: string) {
        return this.marketsService.updateMarketAddress(id, contractAddress);
    }

    // @UseGuards(AuthGuard('jwt'))
    @Post('creation-signature')
    async getCreationSignature(@Request() req: any, @Body() body: { userAddress: string, marketId: string }) {
        return this.marketsService.getSignature(body.marketId, body.userAddress);
    }

    @Post(':id/position')
    async updatePosition(@Param('id') id: string, @Body() body: { userAddress: string, outcomeIndex: number, amountChange: number, price: number }) {
        return this.marketsService.updatePosition(id, body.userAddress, body.outcomeIndex, body.amountChange, body.price);
    }

    @Get('positions/:userAddress')
    async getUserPositions(@Param('userAddress') userAddress: string) {
        return this.marketsService.getUserPositions(userAddress);
    }

    // Update volume when trades happen (called by frontend after successful trade)
    @Post('volume/update')
    async updateVolume(@Body() body: { contractAddress: string, tradeVolume: number }) {
        return this.marketsService.updateVolumeByAddress(body.contractAddress, body.tradeVolume);
    }

    // Get market volume stats
    @Get(':id/volume')
    async getMarketVolume(@Param('id') id: string) {
        return this.marketsService.getMarketVolume(id);
    }
}
