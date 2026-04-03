import { Controller, Get, Patch, Post, Delete, Body, Param } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('admin/settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get()
    async getSettings() {
        return this.settingsService.getSettings();
    }

    @Patch()
    async updateSettings(@Body() data: { taxRate?: number; serviceCharge?: number }) {
        return this.settingsService.updateSettings(data);
    }
}
