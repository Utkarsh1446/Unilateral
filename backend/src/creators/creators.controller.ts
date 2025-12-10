import { Controller, Get, Post, Body, Param, Query, Res, HttpStatus, Request } from '@nestjs/common';
import type { Response } from 'express';
import { CreatorsService } from './creators.service';
import { TwitterOAuthService } from '../twitter/twitter-oauth.service';
import { TwitterScraperService } from '../twitter/twitter-scraper.service';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

@Controller('creators')
export class CreatorsController {
    constructor(
        private readonly creatorsService: CreatorsService,
        private readonly twitterOAuthService: TwitterOAuthService,
        private readonly twitterScraperService: TwitterScraperService,
    ) { }

    @Get()
    findAll() {
        return this.creatorsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.creatorsService.findOne(id);
    }

    // Twitter OAuth - Initiate
    @Get('auth/twitter')
    initiateTwitterAuth(@Query('walletAddress') walletAddress: string, @Res() res: Response) {
        // Generate state with wallet address for security
        const state = Buffer.from(JSON.stringify({ walletAddress, timestamp: Date.now() })).toString('base64');
        const authUrl = this.twitterOAuthService.getAuthorizationUrl(state);
        return res.redirect(authUrl);
    }

    // Twitter OAuth - Callback
    @Get('auth/twitter/callback')
    async handleTwitterCallback(
        @Query('code') code: string,
        @Query('state') state: string,
        @Res() res: Response
    ) {
        console.log('=== Twitter OAuth Callback ===');
        console.log('Code received:', code ? 'yes' : 'no');
        console.log('State received:', state ? 'yes' : 'no');

        try {
            // Decode state to get wallet address
            const { walletAddress } = JSON.parse(Buffer.from(state, 'base64').toString());
            console.log('Wallet address from state:', walletAddress);

            // Exchange code for access token
            console.log('Exchanging code for access token...');
            const { access_token, refresh_token } = await this.twitterOAuthService.getAccessToken(code);
            console.log('Access token received:', access_token ? 'yes' : 'no');

            // Get basic user profile from Twitter API (just name, username, profile pic)
            console.log('Getting user profile from Twitter API...');
            const user = await this.twitterOAuthService.getUserProfile(access_token);
            console.log('User profile:', user.username, user.name);

            // Use Puppeteer to scrape engagement metrics
            console.log('Scraping engagement metrics with Puppeteer...');
            const metrics = await this.twitterScraperService.getTwitterMetrics(user.username);
            console.log('Metrics:', metrics);

            // Check eligibility using scraped data
            const eligible = this.twitterScraperService.verifyEligibility(metrics.followers, metrics.engagementRate);
            console.log('Eligible:', eligible);

            // Redirect to frontend with combined data
            const redirectUrl = `${FRONTEND_URL}/become-creator?` +
                `username=${user.username}&` +
                `name=${encodeURIComponent(user.name)}&` +
                `profileImage=${encodeURIComponent(user.profile_image_url)}&` +
                `followers=${metrics.followers}&` +
                `engagement=${metrics.engagementRate.toFixed(2)}&` +
                `eligible=${eligible}&` +
                `accessToken=${access_token}&` +
                `refreshToken=${refresh_token}`;

            console.log('Redirecting to:', redirectUrl);
            return res.redirect(redirectUrl);
        } catch (error) {
            console.error('Twitter OAuth error:', error);
            return res.redirect(`${FRONTEND_URL}/become-creator?error=auth_failed`);
        }
    }

    @Post('verify-twitter')
    async verifyTwitter(@Body() body: { handle: string }) {
        return this.creatorsService.checkEligibility(body.handle);
    }

    // Check eligibility using Puppeteer scraping
    @Post('check-eligibility')
    async checkEligibility(@Body() body: { twitterHandle: string }) {
        return this.creatorsService.checkEligibility(body.twitterHandle);
    }

    @Get('check-volume/:userId')
    async checkVolumeEligibility(@Param('userId') userId: string) {
        return this.creatorsService.checkVolumeEligibility(userId);
    }

    @Get('can-create-market/:creatorId')
    async canCreateMarket(@Param('creatorId') creatorId: string) {
        return this.creatorsService.canCreateMarket(creatorId);
    }

    @Post('create')
    async createProfile(@Body() body: {
        walletAddress: string,
        twitterHandle: string,
        shareContractAddress?: string,
        twitterAccessToken?: string,
        twitterRefreshToken?: string,
        display_name?: string,
        profile_image?: string
    }) {
        return this.creatorsService.createProfile(body);
    }

    // Admin-only: Create creator share without Twitter verification
    @Post('admin/create-share')
    async adminCreateShare(@Body() body: {
        walletAddress: string,
        name: string,
        symbol: string
    }) {
        try {
            // In production, verify admin status here
            // For now, allow anyone to create for testing

            const result = await this.creatorsService.createShareForWallet(
                body.walletAddress,
                body.name,
                body.symbol
            );

            return result;
        } catch (error) {
            console.error('Error creating share:', error);
            throw new Error('Failed to create creator share');
        }
    }

    @Post('onboarding-signature')
    async getOnboardingSignature(@Request() req: any, @Body() body: { userAddress: string, name: string, symbol: string, userId: string }) {
        return this.creatorsService.generateOnboardingSignature(body.userAddress, body.name, body.symbol, body.userId);
    }
    @Get('holdings/:userAddress')
    async getShareHoldings(@Param('userAddress') userAddress: string) {
        return this.creatorsService.getShareHoldings(userAddress);
    }

    // Get creator dashboard stats for profile page
    @Get('dashboard/:walletAddress')
    async getCreatorDashboard(@Param('walletAddress') walletAddress: string) {
        return this.creatorsService.getCreatorDashboard(walletAddress);
    }

    // Update creator with deployed share address
    @Post('update-share')
    async updateShareAddress(@Body() body: { creatorId: string, shareAddress: string }) {
        return this.creatorsService.updateShareAddress(body.creatorId, body.shareAddress);
    }
}
