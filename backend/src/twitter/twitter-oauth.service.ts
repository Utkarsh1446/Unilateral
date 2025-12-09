import { Injectable } from '@nestjs/common';
import axios from 'axios';

interface TwitterUser {
    id: string;
    username: string;
    name: string;
    profile_image_url: string;
    public_metrics: {
        followers_count: number;
        following_count: number;
        tweet_count: number;
    };
}

interface TwitterMetrics {
    followers: number;
    engagementRate: number;
    username: string;
    name: string;
    profileImage: string;
}

@Injectable()
export class TwitterOAuthService {
    private readonly clientId = process.env.TWITTER_CLIENT_ID;
    private readonly clientSecret = process.env.TWITTER_CLIENT_SECRET;
    private readonly callbackUrl = process.env.TWITTER_CALLBACK_URL || 'http://localhost:3001/creators/auth/twitter/callback';
    private readonly baseUrl = 'https://api.twitter.com/2';

    /**
     * Generate Twitter OAuth authorization URL
     */
    getAuthorizationUrl(state: string): string {
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.clientId || '',
            redirect_uri: this.callbackUrl,
            scope: 'tweet.read users.read follows.read offline.access',
            state,
            code_challenge: 'challenge', // In production, use PKCE
            code_challenge_method: 'plain'
        });

        return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
    }

    /**
     * Exchange authorization code for access token
     */
    async getAccessToken(code: string): Promise<{ access_token: string; refresh_token: string }> {
        const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

        const response = await axios.post(
            'https://api.twitter.com/2/oauth2/token',
            new URLSearchParams({
                code,
                grant_type: 'authorization_code',
                client_id: this.clientId || '',
                redirect_uri: this.callbackUrl,
                code_verifier: 'challenge'
            }),
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        return {
            access_token: response.data.access_token,
            refresh_token: response.data.refresh_token
        };
    }

    /**
     * Get user profile and metrics from Twitter
     */
    async getUserProfile(accessToken: string): Promise<TwitterUser> {
        const response = await axios.get(`${this.baseUrl}/users/me`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            params: {
                'user.fields': 'profile_image_url,public_metrics'
            }
        });

        return response.data.data;
    }

    /**
     * Calculate engagement rate from recent tweets
     */
    async getEngagementMetrics(accessToken: string, userId: string): Promise<TwitterMetrics> {
        try {
            // Get user profile
            const user = await this.getUserProfile(accessToken);

            // Get recent tweets (last 10)
            const tweetsResponse = await axios.get(`${this.baseUrl}/users/${userId}/tweets`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                params: {
                    max_results: 10,
                    'tweet.fields': 'public_metrics'
                }
            });

            const tweets = tweetsResponse.data.data || [];

            // Calculate average engagement
            let totalEngagement = 0;
            let totalImpressions = 0;

            tweets.forEach((tweet: any) => {
                const metrics = tweet.public_metrics;
                const engagement = metrics.like_count + metrics.retweet_count + metrics.reply_count;
                totalEngagement += engagement;
                // Estimate impressions as followers * 0.1 (typical organic reach)
                totalImpressions += user.public_metrics.followers_count * 0.1;
            });

            const engagementRate = totalImpressions > 0
                ? (totalEngagement / totalImpressions) * 100
                : 0;

            return {
                followers: user.public_metrics.followers_count,
                engagementRate: Math.min(engagementRate, 100), // Cap at 100%
                username: user.username,
                name: user.name,
                profileImage: user.profile_image_url
            };
        } catch (error) {
            console.error('Error fetching Twitter metrics:', error);
            throw new Error('Failed to fetch Twitter metrics');
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
