import { Controller, Get, Patch, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { StaffAuthGuard } from '../auth/staff-auth.guard';

@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get()
    async getSettings() {
        return this.settingsService.getSettings();
    }

    @Patch('status')
    @UseGuards(StaffAuthGuard)
    async updateStatus(@Body() body: { isTemporaryClosed: boolean }, @Request() req: any) {
        const user = req.user;
        const permissions = user.permissions || [];

        if (!permissions.includes('temporary_status') && user.role !== 'admin') {
            throw new ForbiddenException('You do not have permission to change restaurant status');
        }

        return this.settingsService.updateStatus(body.isTemporaryClosed);
    }
}
