import { Module } from '@nestjs/common';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { HoursController } from './hours.controller';
import { HoursService } from './hours.service';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { HolidaysController } from './holidays.controller';
import { HolidaysService } from './holidays.service';
import { ContactInfoController, PublicContactInfoController } from './contact-info.controller';
import { ContactInfoService } from './contact-info.service';

@Module({
    imports: [DrizzleModule],
    controllers: [HoursController, SettingsController, HolidaysController, ContactInfoController, PublicContactInfoController],
    providers: [HoursService, SettingsService, HolidaysService, ContactInfoService],
    exports: [HoursService, SettingsService, HolidaysService, ContactInfoService],
})
export class AdminModule { }

