import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { ethers } from 'ethers';

describe('AuthController (e2e)', () => {
    let app: INestApplication;
    let wallet: ethers.HDNodeWallet;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        // Create a random wallet for testing
        wallet = ethers.Wallet.createRandom();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/auth/connect-wallet (POST)', async () => {
        const message = 'Sign this message to login';
        const signature = await wallet.signMessage(message);

        return request(app.getHttpServer())
            .post('/auth/connect-wallet')
            .send({
                address: wallet.address,
                signature: signature,
                message: message,
            })
            .expect(201)
            .expect((res) => {
                expect(res.body).toHaveProperty('access_token');
            });
    });
});
