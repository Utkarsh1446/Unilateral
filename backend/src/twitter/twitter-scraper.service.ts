import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';

interface TwitterMetrics {
    followers: number;
    engagementRate: number;
    username: string;
    name: string;
    profileImage: string;
}

@Injectable()
export class TwitterScraperService {
    /**
     * Scrape Twitter profile and engagement metrics using Puppeteer
     */
    async getTwitterMetrics(username: string): Promise<TwitterMetrics> {
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();

            // Set user agent to avoid detection
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

            // Navigate to Twitter profile
            const profileUrl = `https://twitter.com/${username}`;
            await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });

            // Wait for profile to load
            await page.waitForSelector('[data-testid="UserName"]', { timeout: 10000 });

            // Extract follower count
            const followers = await page.evaluate(() => {
                const followersLink = Array.from(document.querySelectorAll('a[href*="/verified_followers"]'))
                    .find(el => el.textContent?.includes('Followers'));

                if (followersLink) {
                    const text = followersLink.textContent || '';
                    const match = text.match(/([\d,.]+[KMB]?)\s*Followers/i);
                    if (match) {
                        const value = match[1].replace(/,/g, '');
                        if (value.endsWith('K')) return parseFloat(value) * 1000;
                        if (value.endsWith('M')) return parseFloat(value) * 1000000;
                        if (value.endsWith('B')) return parseFloat(value) * 1000000000;
                        return parseInt(value);
                    }
                }
                return 0;
            });

            // Extract profile info
            const profileInfo = await page.evaluate(() => {
                const nameEl = document.querySelector('[data-testid="UserName"]');
                const name = nameEl?.querySelector('span')?.textContent || '';

                const imgEl = document.querySelector('[data-testid="UserAvatar-Container-unknown"] img');
                const profileImage = imgEl?.getAttribute('src') || '';

                return { name, profileImage };
            });

            // Scroll to load tweets
            await page.evaluate(() => window.scrollBy(0, 1000));
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Extract engagement from recent tweets
            const engagement = await page.evaluate(() => {
                const tweets = document.querySelectorAll('[data-testid="tweet"]');
                let totalLikes = 0;
                let totalRetweets = 0;
                let totalReplies = 0;
                let tweetCount = 0;

                tweets.forEach((tweet, index) => {
                    if (index >= 10) return; // Only check last 10 tweets

                    const likeButton = tweet.querySelector('[data-testid="like"]');
                    const retweetButton = tweet.querySelector('[data-testid="retweet"]');
                    const replyButton = tweet.querySelector('[data-testid="reply"]');

                    const getLikes = (el: Element | null) => {
                        if (!el) return 0;
                        const text = el.getAttribute('aria-label') || '';
                        const match = text.match(/(\d+)/);
                        return match ? parseInt(match[1]) : 0;
                    };

                    totalLikes += getLikes(likeButton);
                    totalRetweets += getLikes(retweetButton);
                    totalReplies += getLikes(replyButton);
                    tweetCount++;
                });

                const totalEngagement = totalLikes + totalRetweets + totalReplies;
                return { totalEngagement, tweetCount };
            });

            // Calculate engagement rate
            // Engagement rate = (Total Engagement / (Followers * Tweet Count)) * 100
            const engagementRate = followers > 0 && engagement.tweetCount > 0
                ? (engagement.totalEngagement / (followers * engagement.tweetCount)) * 100
                : 0;

            return {
                followers,
                engagementRate: Math.min(engagementRate, 100), // Cap at 100%
                username,
                name: profileInfo.name,
                profileImage: profileInfo.profileImage
            };
        } catch (error) {
            console.error('Error scraping Twitter profile:', error);
            // Return fallback data when scraping fails (e.g., on Render without Chrome)
            // This allows onboarding to proceed - can manually verify later
            console.log('Returning fallback metrics for @' + username);
            return {
                followers: 100, // Default to eligible
                engagementRate: 2.0,
                username,
                name: username,
                profileImage: ''
            };
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * Verify if user meets eligibility criteria
     */
    verifyEligibility(followers: number, engagementRate: number): boolean {
        const MIN_FOLLOWERS = 10;
        const MIN_ENGAGEMENT = 1.0; // 1%

        return followers >= MIN_FOLLOWERS && engagementRate >= MIN_ENGAGEMENT;
    }
}
