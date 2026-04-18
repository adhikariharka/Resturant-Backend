/* eslint-disable no-console */
/**
 * Dumps the current category + food-item image URLs from the DB into
 * `src/scripts/data/image-backup.json`. The main seed reads that file and
 * applies the URLs by slug, so manually-uploaded images survive a re-seed.
 *
 *   npm run db:backup-images
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { writeFileSync } from 'fs';
import { join } from 'path';
import * as schema from '../drizzle/schema';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const OUT_PATH = join(__dirname, 'data', 'image-backup.json');

async function main() {
    console.log('📦  Backing up image URLs from', process.env.DATABASE_URL?.split('@')[1]);

    const categories = await db
        .select({ slug: schema.categories.slug, image: schema.categories.image })
        .from(schema.categories);

    const foodItems = await db
        .select({ slug: schema.foodItems.slug, image: schema.foodItems.image })
        .from(schema.foodItems);

    const categoryMap: Record<string, string> = {};
    for (const c of categories) {
        if (c.image) categoryMap[c.slug] = c.image;
    }

    const foodMap: Record<string, string> = {};
    for (const f of foodItems) {
        if (f.image) foodMap[f.slug] = f.image;
    }

    const payload = {
        $comment:
            'Backup of category + food-item image URLs keyed by slug. Regenerate any time with `npm run db:backup-images`. The seed reads this file and uses these URLs to override the hardcoded defaults — so manually-uploaded Cloudinary images survive re-seeding.',
        generatedAt: new Date().toISOString(),
        categories: categoryMap,
        foodItems: foodMap,
    };

    writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + '\n');
    console.log(
        `✅  Wrote ${Object.keys(categoryMap).length} category + ${Object.keys(foodMap).length} food-item URLs to ${OUT_PATH}`,
    );
}

main()
    .catch((err) => {
        console.error('❌ Backup failed:', err);
        process.exit(1);
    })
    .finally(() => pool.end());
