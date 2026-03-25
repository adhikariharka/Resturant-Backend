import { Module } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { AddressesController } from './addresses.controller';
import { DrizzleModule } from '../drizzle/drizzle.module';

@Module({
    imports: [DrizzleModule],
    controllers: [AddressesController],
    providers: [AddressesService],
})
export class AddressesModule { }
