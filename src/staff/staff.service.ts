import { Injectable, Inject, BadRequestException, ConflictException } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../drizzle/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../drizzle/drizzle.module';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StaffService {
    constructor(
        @Inject(DRIZZLE)
        private db: NodePgDatabase<typeof schema>,
    ) { }

    async findByEmail(email: string) {
        const [staffMember] = await this.db
            .select()
            .from(schema.staff)
            .where(eq(schema.staff.email, email.toLowerCase()));
        return staffMember;
    }

    async create(data: typeof schema.staff.$inferInsert) {
        const email = data.email.toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new BadRequestException('Invalid email address.');
        }

        const existing = await this.findByEmail(email);
        if (existing) {
            throw new ConflictException('A staff account with this email already exists.');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);
        return this.db
            .insert(schema.staff)
            .values({ ...data, email, password: hashedPassword })
            .returning();
    }

    async validate(email: string, pass: string) {
        const staff = await this.findByEmail(email);
        if (!staff) return null;
        if (!staff.isActive) return null;
        const match = await bcrypt.compare(pass, staff.password);
        if (!match) return null;
        const { password, ...rest } = staff;
        return rest;
    }

    async findAll() {
        return this.db
            .select({
                id: schema.staff.id,
                email: schema.staff.email,
                name: schema.staff.name,
                phone: schema.staff.phone,
                role: schema.staff.role,
                permissions: schema.staff.permissions,
                isActive: schema.staff.isActive,
                createdAt: schema.staff.createdAt,
            })
            .from(schema.staff)
            .orderBy(schema.staff.createdAt);
    }

    async getLogs(orderId: string) {
        return this.db
            .select({
                id: schema.staffLogs.id,
                previousStatus: schema.staffLogs.previousStatus,
                newStatus: schema.staffLogs.newStatus,
                timestamp: schema.staffLogs.timestamp,
                staffName: schema.staff.name,
                staffRole: schema.staff.role,
            })
            .from(schema.staffLogs)
            .leftJoin(schema.staff, eq(schema.staffLogs.staffId, schema.staff.id))
            .where(eq(schema.staffLogs.orderId, orderId))
            .orderBy(desc(schema.staffLogs.timestamp));
    }

    async logAction(data: typeof schema.staffLogs.$inferInsert) {
        return this.db.insert(schema.staffLogs).values(data).returning();
    }
}
