import { Module } from '@nestjs/common';
import { TwitterService } from './twitter.service';
import { TwitterOAuthService } from './twitter-oauth.service';
import { TwitterScraperService } from './twitter-scraper.service';

@Module({
    providers: [TwitterService, TwitterOAuthService, TwitterScraperService],
    exports: [TwitterService, TwitterOAuthService, TwitterScraperService],
})
export class TwitterModule { }
