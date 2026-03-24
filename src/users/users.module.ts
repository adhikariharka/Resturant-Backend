import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AddressesService } from './addresses.service';
import { AddressesController } from './addresses.controller';

@Module({
    controllers: [UsersController, AddressesController],
    providers: [UsersService, AddressesService],
    exports: [UsersService],
})
export class UsersModule { }
