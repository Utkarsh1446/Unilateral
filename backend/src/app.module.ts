import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';

import { UsersModule } from './users/users.module';
import { CreatorsModule } from './creators/creators.module';
import { MarketsModule } from './markets/markets.module';
import { AdminModule } from './admin/admin.module';
import { BtcMarketsModule } from './btc-markets/btc-markets.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CreatorsModule,
    MarketsModule,
    AdminModule,
    BtcMarketsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
