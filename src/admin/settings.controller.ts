import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SettingsService } from './settings.service';

@ApiTags('Settings (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get()
    @ApiOperation({ summary: 'Get restaurant settings' })
    async getSettings() {
        return this.settingsService.getSettings();
    }

    @Patch()
    @ApiOperation({ summary: 'Update restaurant settings' })
    async updateSettings(
        @Body()
        data: {
            taxRate?: number;
            serviceCharge?: number;
            deliveryFee?: number;
            freeDeliveryThreshold?: number;
            minOrderAmount?: number;
            currency?: string;
        },
    ) {
        return this.settingsService.updateSettings(data);
    }
}
