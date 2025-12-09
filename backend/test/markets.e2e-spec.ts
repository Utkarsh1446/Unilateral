import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { ethers } from 'ethers';

describe('MarketsController (e2e)', () => {
    let app: INestApplication;
    let accessToken: string;
    let creatorId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        // Login
        const wallet = ethers.Wallet.createRandom();
        const message = 'Login';
        const signature = await wallet.signMessage(message);

        const loginRes = await request(app.getHttpServer())
            .post('/auth/connect-wallet')
            .send({ address: wallet.address, signature, message });

        accessToken = loginRes.body.access_token;

        // Create Creator
        const creatorRes = await request(app.getHttpServer())
            .post('/creators/create')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                twitter_id: Math.floor(Math.random() * 1000000).toString(),
                twitter_handle: `marketmaker_${Math.floor(Math.random() * 1000000)}`,
                follower_count: 50000,
                engagement_rate: 3.0,
            });

        creatorId = creatorRes.body.id;
    });

    afterAll(async () => {
        await app.close();
    });

    it('/markets (POST)', () => {
        return request(app.getHttpServer())
            .post('/markets')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                questionId: '0x' + '1'.repeat(64), // Mock bytes32
                question: 'Will ETH hit $10k?',
            })
            .expect(201)
            .expect((res) => {
                expect(res.body).toHaveProperty('id');
                expect(res.body.question).toBe('Will ETH hit $10k?');
            });
    });

    it('/markets (GET)', () => {
        return request(app.getHttpServer())
            .get('/markets')
            .expect(200)
            .expect((res) => {
                expect(Array.isArray(res.body)).toBe(true);
                expect(res.body.length).toBeGreaterThan(0);
            });
    });
});
