import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../drizzle/drizzle.module';
import type { DrizzleDB } from '../drizzle/types';
import { orders, orderItems, foodItems } from '../drizzle/schema';
import { sql, desc, eq, ne } from 'drizzle-orm';

@Injectable()
export class DashboardService {
    constructor(@Inject(DRIZZLE) private db: DrizzleDB) { }

    async getStats() {
        // Mock aggregations or real ones
        // Real aggregation for Order Count
        const orderCountResult = await this.db.select({ count: sql<number>`count(*)` }).from(orders);
        const orderCount = orderCountResult[0].count;

        // Real aggregation for Revenue
        const revenueResult = await this.db.select({ total: sql<number>`sum(total)` }).from(orders).where(ne(orders.status, 'cancelled'));
        const revenue = revenueResult[0].total || 0;

        // Mock Active Items (count of available food items)
        const activeItemsResult = await this.db.select({ count: sql<number>`count(*)` }).from(foodItems).where(eq(foodItems.isAvailable, true));
        const activeItems = activeItemsResult[0].count;

        return [
            { name: "Today's Orders", value: orderCount.toString(), change: "+0%", trend: "up" },
            { name: "Revenue", value: `£${revenue}`, change: "+0%", trend: "up" },
            { name: "Active Items", value: activeItems.toString(), change: "0", trend: "neutral" },
            { name: "New Customers", value: "0", change: "+0", trend: "neutral" },
        ];
    }

    async getRecentOrders() {
        return this.db.query.orders.findMany({
            limit: 5,
            orderBy: [desc(orders.createdAt)],
            with: {
                user: true
            }
        });
    }
}
