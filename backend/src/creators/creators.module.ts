import { Module } from '@nestjs/common';
import { CreatorsController } from './creators.controller';
import { CreatorsService } from './creators.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TwitterModule } from '../twitter/twitter.module';

@Module({
    imports: [PrismaModule, TwitterModule],
    controllers: [CreatorsController],
    providers: [CreatorsService],
    exports: [CreatorsService],
})
export class CreatorsModule { }
