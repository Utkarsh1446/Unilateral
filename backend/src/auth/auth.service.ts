import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ethers } from 'ethers';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async validateWallet(address: string, signature: string, message: string): Promise<any> {
        const recoveredAddress = ethers.verifyMessage(message, signature);

        if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
            throw new UnauthorizedException('Invalid signature');
        }

        let user = await this.prisma.user.findUnique({
            where: { wallet_address: address },
        });

        if (!user) {
            user = await this.prisma.user.create({
                data: { wallet_address: address },
            });
        }

        return user;
    }

    async login(user: any) {
        const payload = { sub: user.id, wallet_address: user.wallet_address };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
}
