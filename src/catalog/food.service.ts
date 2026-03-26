import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../drizzle/drizzle.module';
import type { DrizzleDB } from '../drizzle/types';
import { foodItems } from '../drizzle/schema';
import { eq, like } from 'drizzle-orm';

@Injectable()
export class FoodService {
    constructor(@Inject(DRIZZLE) private db: DrizzleDB) { }

    // Generate URL-friendly slug from name
    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
    }

    // Ensure slug is unique by appending number if needed
    private async ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
        let slug = baseSlug;
        let counter = 1;

        while (true) {
            const existing = await this.db.query.foodItems.findFirst({
                where: eq(foodItems.slug, slug),
            });

            // If no existing item found, or it's the same item being updated
            if (!existing || (excludeId && existing.id === excludeId)) {
                return slug;
            }

            // Append counter and try again
            counter++;
            slug = `${baseSlug}-${counter}`;
        }
    }

    async create(data: Omit<typeof foodItems.$inferInsert, 'slug'> & { slug?: string }) {
        // Always generate slug from name
        const baseSlug = this.generateSlug(data.name);
        const uniqueSlug = await this.ensureUniqueSlug(baseSlug);

        return this.db.insert(foodItems).values({
            ...data,
            slug: uniqueSlug,
        }).returning();
    }

    async findAll() {
        return this.db.query.foodItems.findMany({
            with: {
                category: true,
                options: true,
            },
        });
    }

    async findOne(id: string) {
        return this.db.query.foodItems.findFirst({
            where: eq(foodItems.id, id),
            with: {
                options: true,
            },
        });
    }

    async findBySlug(slug: string) {
        return this.db.query.foodItems.findFirst({
            where: eq(foodItems.slug, slug),
            with: {
                category: true,
                options: true,
            },
        });
    }

    async updateStock(id: string, quantity: number) {
        const item = await this.findOne(id);
        if (!item) throw new Error('Item not found');
        return this.db.update(foodItems)
            .set({ quantity: item.quantity + quantity })
            .where(eq(foodItems.id, id))
            .returning();
    }

    async update(id: string, data: Partial<Omit<typeof foodItems.$inferInsert, 'slug'> & { slug?: string }>) {
        // If name is being updated, regenerate slug
        const updateData: any = { ...data };
        if (data.name) {
            const baseSlug = this.generateSlug(data.name);
            const uniqueSlug = await this.ensureUniqueSlug(baseSlug, id);
            updateData.slug = uniqueSlug;
        }

        const [updated] = await this.db.update(foodItems)
            .set(updateData)
            .where(eq(foodItems.id, id))
            .returning();
        return updated;
    }

    async remove(id: string) {
        return this.db.delete(foodItems).where(eq(foodItems.id, id));
    }
}
