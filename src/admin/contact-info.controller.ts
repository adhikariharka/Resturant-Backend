import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ContactInfoService } from './contact-info.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin/contact-info')
export class ContactInfoController {
    constructor(private readonly contactInfoService: ContactInfoService) { }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async getContactInfo() {
        return this.contactInfoService.getContactInfo();
    }

    @Patch()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async updateContactInfo(
        @Body() data: {
            restaurantName?: string;
            email?: string;
            phone?: string;
            address?: string;
        },
    ) {
        return this.contactInfoService.updateContactInfo(data);
    }
}

// Public endpoint for contact info
@Controller('contact-info')
export class PublicContactInfoController {
    constructor(private readonly contactInfoService: ContactInfoService) { }

    @Get()
    async getContactInfo() {
        return this.contactInfoService.getContactInfo();
    }
}
