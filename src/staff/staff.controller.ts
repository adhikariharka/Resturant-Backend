import { Controller, Post, Body, UnauthorizedException, Get, UseGuards, ConflictException } from '@nestjs/common';
import { StaffService } from './staff.service';
import { StaffLoginDto } from '../auth/dto/staff-login.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('staff')
export class StaffController {
    constructor(
        private staffService: StaffService,
        private jwtService: JwtService,
    ) { }

    @Post('auth/login')
    async login(@Body() loginDto: StaffLoginDto) {
        const staff = await this.staffService.validate(loginDto.username, loginDto.password);
        if (!staff) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload = {
            sub: staff.id,
            username: staff.username,
            role: staff.role,
            permissions: staff.permissions
        };

        return {
            access_token: await this.jwtService.signAsync(payload),
            staff: {
                id: staff.id,
                name: staff.name,
                role: staff.role,
                permissions: staff.permissions,
            }
        };
    }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async findAll() {
        return this.staffService.findAll();
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async create(@Body() createStaffDto: any) {
        try {
            return await this.staffService.create(createStaffDto);
        } catch (error) {
            if (error.code === '23505') {
                throw new ConflictException('Username is already taken');
            }
            throw error;
        }
    }
}
