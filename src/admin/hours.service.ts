import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../drizzle/drizzle.module';
import type { DrizzleDB } from '../drizzle/types';
import { openingHours, holidays } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class HoursService {
    constructor(@Inject(DRIZZLE) private db: DrizzleDB) { }

    async findAll() {
        return this.db.query.openingHours.findMany({
            orderBy: (hours, { asc }) => [asc(hours.dayOrder)], // Order Monday (1) to Sunday (7)
        });
    }

    async update(id: string, data: Partial<typeof openingHours.$inferInsert>) {
        // Ensure we don't update ID
        const { id: _, ...updateData } = data as any;
        return this.db.update(openingHours)
            .set(updateData)
            .where(eq(openingHours.id, id))
            .returning();
    }

    async getCurrentStatus() {
        const londonTime = new Date().toLocaleString('en-US', { timeZone: 'Europe/London' });
        const now = new Date(londonTime);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = dayNames[now.getDay()];
        const todayDateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

        // 1. Priority: Temporary Closed
        const settings = await this.db.query.restaurantSettings.findFirst();
        console.log("DEBUG: HoursService found settings:", settings);

        if (settings?.isTemporaryClosed) {
            return {
                isOpen: false,
                message: 'Temporarily Closed',
                isTemporaryClosed: true
            };
        }

        // 2. Priority: Holidays
        const todayHoliday = await this.db.query.holidays.findFirst({
            where: eq(holidays.date, todayDateStr),
        });

        if (todayHoliday) {
            return {
                isOpen: false,
                message: todayHoliday.message || 'Closed for Holiday',
                nextOpenTime: await this.getNextOpenTime(),
            };
        }

        // 3. Priority: Opening Hours
        const hours = await this.findAll();
        const todayHours = hours.find(h => h.day === currentDay);

        if (!todayHours || todayHours.isClosed) {
            return {
                isOpen: false,
                message: 'Closed today',
                nextOpenTime: await this.getNextOpenTime(),
            };
        }

        // Parse open and close times
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const [openHour, openMin] = todayHours.openTime.split(':').map(Number);
        const [closeHour, closeMin] = todayHours.closeTime.split(':').map(Number);
        const openTime = openHour * 60 + openMin;
        const closeTime = closeHour * 60 + closeMin;

        const isOpen = currentTime >= openTime && currentTime < closeTime;

        return {
            isOpen,
            message: isOpen ? 'Open now' : 'Closed',
            nextOpenTime: isOpen ? null : await this.getNextOpenTime(),
        };
    }

    async getNextOpenTime() {
        const hours = await this.findAll();
        const londonTime = new Date().toLocaleString('en-US', { timeZone: 'Europe/London' });
        const now = new Date(londonTime);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = dayNames[now.getDay()];

        // Try to find next open time in the next 7 days
        for (let i = 0; i < 7; i++) {
            const checkDayIndex = (now.getDay() + i) % 7;
            const checkDay = dayNames[checkDayIndex];
            const dayHours = hours.find(h => h.day === checkDay);

            if (dayHours && !dayHours.isClosed) {
                if (i === 0) {
                    // Check if still opening today
                    const currentTime = now.getHours() * 60 + now.getMinutes();
                    const [openHour, openMin] = dayHours.openTime.split(':').map(Number);
                    const openTime = openHour * 60 + openMin;

                    if (currentTime < openTime) {
                        return `Today at ${dayHours.openTime}`;
                    }
                } else {
                    const dayLabel = i === 1 ? 'Tomorrow' : checkDay;
                    return `${dayLabel} at ${dayHours.openTime}`;
                }
            }
        }

        return 'Check back soon';
    }

    // Seed method if needed, but manual insert is fine for now
}
