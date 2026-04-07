import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../drizzle/drizzle.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../drizzle/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class SettingsService {
    constructor(@Inject(DRIZZLE) private conn: NodePgDatabase<typeof schema>) { }

    async getSettings() {
        const settings = await this.conn.query.restaurantSettings.findFirst();
        if (!settings) {
            // Seed default settings if not exists
            const [newSettings] = await this.conn.insert(schema.restaurantSettings).values({}).returning();
            return newSettings;
        }
        return settings;
    }

    async updateStatus(isTemporaryClosed: boolean) {
        const settings = await this.getSettings();
        const [updated] = await this.conn
            .update(schema.restaurantSettings)
            .set({ isTemporaryClosed, updatedAt: new Date() })
            .where(eq(schema.restaurantSettings.id, settings.id))
            .returning();
        return updated;
    }
}
