import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../drizzle/drizzle.module';
import type { DrizzleDB } from '../drizzle/types';
import { contactInfo } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class ContactInfoService {
    constructor(@Inject(DRIZZLE) private db: DrizzleDB) { }

    async getContactInfo() {
        const result = await this.db.query.contactInfo.findFirst();

        // If no contact info exists, create default
        if (!result) {
            const [newContactInfo] = await this.db.insert(contactInfo).values({}).returning();
            return newContactInfo;
        }

        return result;
    }

    async updateContactInfo(data: {
        restaurantName?: string;
        email?: string;
        phone?: string;
        address?: string;
    }) {
        const existing = await this.getContactInfo();

        const [updated] = await this.db
            .update(contactInfo)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(contactInfo.id, existing.id))
            .returning();

        return updated;
    }
}
