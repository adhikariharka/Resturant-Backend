import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../drizzle/drizzle.module';
import type { DrizzleDB } from '../drizzle/types';
import { reviews } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class ReviewsService {
    constructor(@Inject(DRIZZLE) private db: DrizzleDB) { }

    async create(data: typeof reviews.$inferInsert) {
        return this.db.insert(reviews).values(data).returning();
    }

    async findAll() {
        return this.db.query.reviews.findMany({
            with: {
                user: true
            }
        });
    }
}
