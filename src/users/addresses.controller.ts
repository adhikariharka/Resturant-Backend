import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Controller('addresses')
export class AddressesController {
    constructor(private readonly addressesService: AddressesService) { }

    @Post()
    create(@Body() createAddressDto: CreateAddressDto) {
        return this.addressesService.create(createAddressDto);
    }

    @Get('user/:userId')
    findAllByUserId(@Param('userId') userId: string) {
        return this.addressesService.findAllByUserId(userId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.addressesService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateAddressDto: UpdateAddressDto) {
        return this.addressesService.update(id, updateAddressDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.addressesService.remove(id);
    }
}
