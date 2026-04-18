import {
    Body,
    Controller,
    ForbiddenException,
    Param,
    Patch,
    Request,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

// Registration is handled by POST /auth/register.
// Profile reads are handled by GET /auth/whoami.
// This controller only exposes "update my profile" — the other CRUD methods
// were unused and removed.
@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Patch(':id')
    @ApiOperation({ summary: 'Update your own profile (admins may update anyone)' })
    async update(
        @Param('id') id: string,
        @Body() updateUserDto: UpdateUserDto,
        @Request() req: any,
    ) {
        if (req.user.role !== 'admin' && req.user.userId !== id) {
            throw new ForbiddenException('You can only update your own profile.');
        }
        // Non-admins cannot change their own role.
        if (req.user.role !== 'admin' && (updateUserDto as any).role) {
            delete (updateUserDto as any).role;
        }
        return this.usersService.update(id, updateUserDto);
    }
}
