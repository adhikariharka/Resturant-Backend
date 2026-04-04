import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../drizzle/drizzle.module';
import type { DrizzleDB } from '../drizzle/types';
import { holidays } from '../drizzle/schema';
import { eq, asc } from 'drizzle-orm';

export interface CreateHolidayDto {
    date: string; // ISO date string (YYYY-MM-DD)
    name: string;
    message: string;
}

export interface UpdateHolidayDto {
    name?: string;
    message?: string;
}

@Injectable()
export class HolidaysService {
    constructor(@Inject(DRIZZLE) private db: DrizzleDB) { }

    async getAllHolidays() {
        return await this.db.query.holidays.findMany({
            orderBy: [asc(holidays.date)],
        });
    }

    async getHoliday(date: string) {
        const holiday = await this.db.query.holidays.findFirst({
            where: eq(holidays.date, date),
        });

        if (!holiday) {
            throw new NotFoundException(`Holiday not found for date: ${date}`);
        }

        return holiday;
    }

    async createHoliday(data: CreateHolidayDto) {
        const [newHoliday] = await this.db.insert(holidays)
            .values(data)
            .returning();

        return newHoliday;
    }

    async updateHoliday(date: string, data: UpdateHolidayDto) {
        // Check if holiday exists
        await this.getHoliday(date);

        const [updated] = await this.db.update(holidays)
            .set(data)
            .where(eq(holidays.date, date))
            .returning();

        return updated;
    }

    async deleteHoliday(date: string) {
        // Check if holiday exists
        await this.getHoliday(date);

        await this.db.delete(holidays)
            .where(eq(holidays.date, date));

        return { message: 'Holiday deleted successfully' };
    }

    async isHoliday(date: string): Promise<boolean> {
        const holiday = await this.db.query.holidays.findFirst({
            where: eq(holidays.date, date),
        });

        return !!holiday;
    }
}
