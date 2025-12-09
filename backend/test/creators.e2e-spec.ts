import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { ethers } from 'ethers';

describe('CreatorsController (e2e)', () => {
    let app: INestApplication;
    let accessToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        // Login to get token
        const wallet = ethers.Wallet.createRandom();
        const message = 'Login';
        const signature = await wallet.signMessage(message);

        const loginRes = await request(app.getHttpServer())
            .post('/auth/connect-wallet')
            .send({ address: wallet.address, signature, message });

        accessToken = loginRes.body.access_token;
    });

    afterAll(async () => {
        await app.close();
    });

    it('/creators/check-eligibility (POST)', () => {
        return request(app.getHttpServer())
            .post('/creators/check-eligibility')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ twitterHandle: 'testuser' })
            .expect(201)
            .expect((res) => {
                expect(res.body).toHaveProperty('eligible');
                expect(res.body.eligible).toBe(true);
            });
    });

    it('/creators/create (POST)', () => {
        return request(app.getHttpServer())
            .post('/creators/create')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                twitter_id: Math.floor(Math.random() * 1000000).toString(),
                twitter_handle: `testuser_${Math.floor(Math.random() * 1000000)}`,
                follower_count: 10000,
                engagement_rate: 2.5,
            })
            .expect(201)
            .expect((res) => {
                expect(res.body).toHaveProperty('id');
                expect(res.body.twitter_handle).toContain('testuser');
            });
    });
});
