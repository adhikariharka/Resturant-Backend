
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../drizzle/schema';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

async function seed() {
    console.log('Seeding staff...');

    const password = await bcrypt.hash('password123', 10);

    const kitchen = {
        username: 'kitchen',
        password: password,
        name: 'Head Chef',
        role: 'staff' as const,
        permissions: ['kitchen'],
    };

    const delivery = {
        username: 'delivery',
        password: password,
        name: 'Delivery Driver',
        role: 'staff' as const,
        permissions: ['delivery'],
    };

    try {
        await db.insert(schema.staff).values(kitchen).onConflictDoNothing();
        await db.insert(schema.staff).values(delivery).onConflictDoNothing();
        console.log('Staff seeded successfully');
    } catch (error) {
        console.error('Error seeding staff:', error);
    } finally {
        await pool.end();
    }
}

seed();
