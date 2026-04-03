import { Controller, Get, Put, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { HoursService } from './hours.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('hours')
@Controller('hours')
export class HoursController {
    constructor(private readonly hoursService: HoursService) { }

    @Get()
    findAll() {
        return this.hoursService.findAll();
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'staff')
    @Patch(':id')
    async update(@Param('id') id: string, @Body() data: any) {
        return this.hoursService.update(id, data);
    }

    @Get('status')
    async getStatus() {
        return this.hoursService.getCurrentStatus();
    }

    @Get('next-open')
    async getNextOpen() {
        const nextOpenTime = await this.hoursService.getNextOpenTime();
        return { nextOpenTime };
    }
}
