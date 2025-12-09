
import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { TwitterApi } from 'twitter-api-v2';

@Injectable()
export class TwitterService {
    private client: TwitterApi;

    constructor() {
        if (process.env.TWITTER_API_KEY && process.env.TWITTER_API_SECRET) {
            this.client = new TwitterApi({
                appKey: process.env.TWITTER_API_KEY,
                appSecret: process.env.TWITTER_API_SECRET,
                accessToken: process.env.TWITTER_ACCESS_TOKEN,
                accessSecret: process.env.TWITTER_ACCESS_SECRET,
            });
        }
    }

    async getUserProfile(username: string) {
        if (!this.client) {
            console.warn("Twitter API credentials not set. Returning mock data.");
            return { id: "123", username, name: "Mock User", profile_image_url: "https://via.placeholder.com/150" };
        }

        try {
            const user = await this.client.v2.userByUsername(username, { "user.fields": ["profile_image_url"] });
            return user.data;
        } catch (error) {
            console.error("Error fetching Twitter profile:", error);
            throw error;
        }
    }

    async getEngagementMetrics(handle: string) {
        // Note: Scraping X is fragile and against TOS. 
        // This is a demonstration implementation using Puppeteer.
        // In production, use official API (Enterprise) or specialized providers.

        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        try {
            await page.goto(`https://twitter.com/${handle}`, { waitUntil: 'networkidle2' });

            // Mock data extraction for stability in this demo environment
            // Real scraping requires handling login, rate limits, and dynamic classes

            // Simulate extracting data
            let followers = 10000;
            let engagementRate = 3.5;

            if (handle.toLowerCase() === 'elonmusk') {
                followers = 100000000;
                engagementRate = 5.0;
            }

            return { followers, engagementRate };
        } catch (error) {
            console.error("Error scraping Twitter:", error);
            return { followers: 0, engagementRate: 0 };
        } finally {
            await browser.close();
        }
    }

    verifyEligibility(followers: number, engagementRate: number): boolean {
        if (followers >= 10) {
            return engagementRate >= 1.0;
        }
        return false;
    }
}
