import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('connect-wallet')
    async connectWallet(@Body() body: { address: string; signature: string; message: string }) {
        const user = await this.authService.validateWallet(body.address, body.signature, body.message);
        if (!user) {
            throw new UnauthorizedException();
        }
        return this.authService.login(user);
    }
}
