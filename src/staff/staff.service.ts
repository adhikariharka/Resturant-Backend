import { Injectable, Inject, BadRequestException } from '@nestjs/common';
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

    async findByUsername(username: string) {
        const [staffMember] = await this.db
            .select()
            .from(schema.staff)
            .where(eq(schema.staff.username, username));
        return staffMember;
    }

    async create(data: typeof schema.staff.$inferInsert) {
        const username = data.username.toLowerCase();

        if (!/^[a-z0-9_-]+$/.test(username)) {
            throw new BadRequestException('Username must be lowercase and contain only letters, numbers, underscores, or hyphens');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);
        return this.db.insert(schema.staff).values({ ...data, username, password: hashedPassword }).returning();
    }

    async validate(username: string, pass: string) {
        const staff = await this.findByUsername(username);
        if (staff && await bcrypt.compare(pass, staff.password)) {
            const { password, ...result } = staff;
            return result;
        }
        return null;
    }
    async findAll() {
        return this.db.select().from(schema.staff).orderBy(schema.staff.createdAt);
    }

    async getLogs(orderId: string) {
        return this.db.select({
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
