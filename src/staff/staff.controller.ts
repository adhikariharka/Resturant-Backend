import {
    Controller,
    Post,
    Body,
    UnauthorizedException,
    Get,
    UseGuards,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { StaffLoginDto } from '../auth/dto/staff-login.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Staff')
@Controller('staff')
export class StaffController {
    constructor(
        private staffService: StaffService,
        private jwtService: JwtService,
    ) { }

    @Post('auth/login')
    @ApiOperation({ summary: 'Staff login (email + password)' })
    async login(@Body() loginDto: StaffLoginDto) {
        const staff = await this.staffService.validate(loginDto.email, loginDto.password);
        if (!staff) {
            throw new UnauthorizedException('Invalid credentials.');
        }

        const payload = {
            sub: staff.id,
            email: staff.email,
            role: staff.role,
            permissions: staff.permissions,
        };

        return {
            access_token: await this.jwtService.signAsync(payload),
            staff: {
                id: staff.id,
                email: staff.email,
                name: staff.name,
                role: staff.role,
                permissions: staff.permissions,
            },
        };
    }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List all staff (admin)' })
    async findAll() {
        return this.staffService.findAll();
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a staff account (admin)' })
    async create(@Body() createStaffDto: any) {
        return this.staffService.create(createStaffDto);
    }
}
