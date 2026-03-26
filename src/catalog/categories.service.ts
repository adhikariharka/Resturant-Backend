import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../drizzle/drizzle.module';
import type { DrizzleDB } from '../drizzle/types';
import { categories } from '../drizzle/schema';
import { eq, like } from 'drizzle-orm';

@Injectable()
export class CategoriesService {
    constructor(@Inject(DRIZZLE) private db: DrizzleDB) { }

    private async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
        // Convert name to slug format: lowercase and replace spaces with hyphens
        const baseSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        // Check if base slug exists
        const existingSlugs = await this.db.query.categories.findMany({
            where: like(categories.slug, `${baseSlug}%`),
        });

        // Filter out the current category if updating
        const filteredSlugs = excludeId
            ? existingSlugs.filter(cat => cat.id !== excludeId)
            : existingSlugs;

        // If no conflicts, return base slug
        if (filteredSlugs.length === 0) {
            return baseSlug;
        }

        // Check if exact base slug exists
        const exactMatch = filteredSlugs.find(cat => cat.slug === baseSlug);
        if (!exactMatch) {
            return baseSlug;
        }

        // Find the highest increment number
        let maxIncrement = 1;
        filteredSlugs.forEach(cat => {
            const match = cat.slug.match(new RegExp(`^${baseSlug}-(\\d+)$`));
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxIncrement) {
                    maxIncrement = num;
                }
            }
        });

        // Return slug with next increment
        return `${baseSlug}-${maxIncrement + 1}`;
    }

    async create(data: Omit<typeof categories.$inferInsert, 'slug'> & { slug?: string }) {
        const slug = await this.generateUniqueSlug(data.name);
        return this.db.insert(categories).values({ ...data, slug }).returning();
    }

    async findAll() {
        return this.db.query.categories.findMany({
            with: {
                foodItems: true,
            }
        });
    }

    async findOne(id: string) {
        return this.db.query.categories.findFirst({
            where: eq(categories.id, id),
        });
    }

    async update(id: string, data: Partial<Omit<typeof categories.$inferInsert, 'slug'> & { slug?: string }>) {
        // If name is being updated, regenerate slug
        const updateData: any = { ...data };
        if (data.name) {
            updateData.slug = await this.generateUniqueSlug(data.name, id);
        }

        const [updated] = await this.db.update(categories)
            .set(updateData)
            .where(eq(categories.id, id))
            .returning();
        return updated;
    }

    async remove(id: string) {
        return this.db.delete(categories).where(eq(categories.id, id));
    }
}
