import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    NotFoundException,
    Param,
    Patch,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@ApiTags('Addresses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressesController {
    constructor(private readonly addressesService: AddressesService) { }

    @Post()
    @ApiOperation({ summary: 'Create an address for the logged-in user' })
    create(@Body() createAddressDto: CreateAddressDto, @Request() req: any) {
        // Always bind the address to the authenticated user — the body's userId is ignored.
        return this.addressesService.create({
            ...createAddressDto,
            userId: req.user.userId,
        });
    }

    @Get('user/:userId')
    @ApiOperation({ summary: 'List addresses for a user (self or admin only)' })
    findAllByUserId(@Param('userId') userId: string, @Request() req: any) {
        if (req.user.role !== 'admin' && req.user.userId !== userId) {
            throw new ForbiddenException('You can only list your own addresses.');
        }
        return this.addressesService.findAllByUserId(userId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update one of your addresses' })
    async update(
        @Param('id') id: string,
        @Body() updateAddressDto: UpdateAddressDto,
        @Request() req: any,
    ) {
        await this.assertOwns(id, req);
        return this.addressesService.update(id, updateAddressDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete one of your addresses' })
    async remove(@Param('id') id: string, @Request() req: any) {
        await this.assertOwns(id, req);
        return this.addressesService.remove(id);
    }

    // ---- helpers ----
    private async assertOwns(id: string, req: any) {
        const address = await this.addressesService.findOne(id);
        if (!address) throw new NotFoundException('Address not found.');
        if (req.user.role !== 'admin' && address.userId !== req.user.userId) {
            throw new ForbiddenException('You can only modify your own addresses.');
        }
    }
}
