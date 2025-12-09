import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
    private readonly adminWallets: string[];

    constructor() {
        // Load admin wallets from environment variable
        const adminWalletsEnv = process.env.ADMIN_WALLETS || '';
        this.adminWallets = adminWalletsEnv
            .split(',')
            .map(addr => addr.trim().toLowerCase())
            .filter(addr => addr.length > 0);
    }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();

        // Get wallet address from header or query
        const walletAddress = (
            request.headers['x-wallet-address'] ||
            request.query.walletAddress ||
            request.body?.walletAddress ||
            request.body?.adminWallet // Added this check
        )?.toLowerCase();

        if (!walletAddress) {
            throw new ForbiddenException('Wallet address required');
        }

        if (!this.adminWallets.includes(walletAddress)) {
            throw new ForbiddenException('Admin access required');
        }

        return true;
    }
}
