import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BtcMarketsService } from './btc-markets.service';
import { BtcMarketsController } from './btc-markets.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
    imports: [ScheduleModule.forRoot()],
    controllers: [BtcMarketsController],
    providers: [BtcMarketsService, PrismaService],
    exports: [BtcMarketsService]
})
export class BtcMarketsModule { }
