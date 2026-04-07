import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { DrizzleModule } from '../drizzle/drizzle.module';

@Module({
    imports: [DrizzleModule],
    controllers: [SettingsController],
    providers: [SettingsService],
    exports: [SettingsService],
})
export class SettingsModule { }
