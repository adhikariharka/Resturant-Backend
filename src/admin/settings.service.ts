import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../drizzle/drizzle.module';
import type { DrizzleDB } from '../drizzle/types';
import { restaurantSettings } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class SettingsService {
    constructor(@Inject(DRIZZLE) private db: DrizzleDB) { }

    async getSettings() {
        // Get the first (and only) settings record
        const settings = await this.db.query.restaurantSettings.findFirst();

        // If no settings exist, create default settings
        if (!settings) {
            const [newSettings] = await this.db.insert(restaurantSettings)
                .values({
                    taxRate: 0.20,
                    serviceCharge: 0.10,
                })
                .returning();
            return newSettings;
        }

        return settings;
    }

    async updateSettings(data: { taxRate?: number; serviceCharge?: number }) {
        const settings = await this.getSettings();

        const [updated] = await this.db.update(restaurantSettings)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(restaurantSettings.id, settings.id))
            .returning();

        return updated;
    }
}
