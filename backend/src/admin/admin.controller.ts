import { Controller, Get, Post, Param, Body, UseGuards, Query } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    // Creator Management
    @Get('creators')
    async getAllCreators() {
        return this.adminService.getAllCreators();
    }

    @Post('creators/:id/approve')
    async approveCreator(
        @Param('id') id: string,
        @Body('adminWallet') adminWallet: string
    ) {
        const result = await this.adminService.approveCreator(id, adminWallet);
        await this.adminService.logAdminAction(adminWallet, 'APPROVE_CREATOR', { creatorId: id });
        return result;
    }

    @Post('creators/:id/reject')
    async rejectCreator(
        @Param('id') id: string,
        @Body('adminWallet') adminWallet: string
    ) {
        const result = await this.adminService.rejectCreator(id, adminWallet);
        await this.adminService.logAdminAction(adminWallet, 'REJECT_CREATOR', { creatorId: id });
        return result;
    }

    // Market Management
    @Get('markets')
    async getAllMarkets() {
        return this.adminService.getAllMarkets();
    }

    @Post('markets/:id/approve')
    async approveMarket(
        @Param('id') id: string,
        @Body('adminWallet') adminWallet: string
    ) {
        const result = await this.adminService.approveMarket(id, adminWallet);
        await this.adminService.logAdminAction(adminWallet, 'APPROVE_MARKET', { marketId: id });
        return result;
    }

    @Post('markets/:id/reject')
    async rejectMarket(
        @Param('id') id: string,
        @Body('reason') reason: string,
        @Body('adminWallet') adminWallet: string
    ) {
        const result = await this.adminService.rejectMarket(id, reason, adminWallet);
        await this.adminService.logAdminAction(adminWallet, 'REJECT_MARKET', { marketId: id, reason });
        return result;
    }

    @Post('markets/:id/resolve')
    async resolveMarket(
        @Param('id') id: string,
        @Body('outcome') outcome: number,
        @Body('adminWallet') adminWallet: string
    ) {
        const result = await this.adminService.resolveMarket(id, outcome, adminWallet);
        await this.adminService.logAdminAction(adminWallet, 'RESOLVE_MARKET', { marketId: id, outcome });
        return result;
    }

    // Platform Stats
    @Get('stats')
    async getPlatformStats() {
        return this.adminService.getPlatformStats();
    }
}
