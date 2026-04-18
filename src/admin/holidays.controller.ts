import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { HolidaysService } from './holidays.service';
import type { CreateHolidayDto, UpdateHolidayDto } from './holidays.service';

@ApiTags('Holidays (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/holidays')
export class HolidaysController {
    constructor(private readonly holidaysService: HolidaysService) { }

    @Get()
    @ApiOperation({ summary: 'List holidays' })
    async getAllHolidays() {
        return this.holidaysService.getAllHolidays();
    }

    @Get(':date')
    @ApiOperation({ summary: 'Get a holiday by ISO date' })
    async getHoliday(@Param('date') date: string) {
        return this.holidaysService.getHoliday(date);
    }

    @Post()
    @ApiOperation({ summary: 'Create a holiday' })
    async createHoliday(@Body() data: CreateHolidayDto) {
        return this.holidaysService.createHoliday(data);
    }

    @Patch(':date')
    @ApiOperation({ summary: 'Update a holiday' })
    async updateHoliday(
        @Param('date') date: string,
        @Body() data: UpdateHolidayDto,
    ) {
        return this.holidaysService.updateHoliday(date, data);
    }

    @Delete(':date')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete a holiday' })
    async deleteHoliday(@Param('date') date: string) {
        return this.holidaysService.deleteHoliday(date);
    }
}
