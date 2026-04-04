import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { HolidaysService } from './holidays.service';
import type { CreateHolidayDto, UpdateHolidayDto } from './holidays.service';

@Controller('admin/holidays')
export class HolidaysController {
    constructor(private readonly holidaysService: HolidaysService) { }

    @Get()
    async getAllHolidays() {
        return this.holidaysService.getAllHolidays();
    }

    @Get(':date')
    async getHoliday(@Param('date') date: string) {
        return this.holidaysService.getHoliday(date);
    }

    @Post()
    async createHoliday(@Body() data: CreateHolidayDto) {
        return this.holidaysService.createHoliday(data);
    }

    @Patch(':date')
    async updateHoliday(
        @Param('date') date: string,
        @Body() data: UpdateHolidayDto
    ) {
        return this.holidaysService.updateHoliday(date, data);
    }

    @Delete(':date')
    @HttpCode(HttpStatus.OK)
    async deleteHoliday(@Param('date') date: string) {
        return this.holidaysService.deleteHoliday(date);
    }
}
