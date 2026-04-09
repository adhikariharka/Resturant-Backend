import 'dotenv/config'; // Load env vars
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../drizzle/schema';
import { eq } from 'drizzle-orm';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const db = drizzle(pool, { schema });

async function seedOpeningHours() {
    console.log('⏳ Seeding Opening Hours...');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const defaultOpenTime = '08:00';
    const defaultCloseTime = '17:00';

    try {
        const existingHours = await db.query.openingHours.findMany();
        if (existingHours.length > 0) return;

        for (let i = 0; i < days.length; i++) {
            await db.insert(schema.openingHours).values({
                day: days[i],
                dayOrder: i + 1,
                openTime: defaultOpenTime,
                closeTime: defaultCloseTime,
                isClosed: false,
                timezone: 'Europe/London',
            });
        }
        console.log('✅ Opening Hours seeded.');
    } catch (error) {
        console.error('❌ Error seeding opening hours:', error);
        throw error;
    }
}

async function seedRestaurantSettings() {
    console.log('⏳ Seeding Restaurant Settings...');
    try {
        const existingSettings = await db.query.restaurantSettings.findFirst();
        if (existingSettings) return;

        await db.insert(schema.restaurantSettings).values({
            taxRate: 0.20,
            serviceCharge: 0.10,
        });
        console.log('✅ Restaurant Settings seeded.');
    } catch (error) {
        console.error('❌ Error seeding restaurant settings:', error);
        throw error;
    }
}

async function seedContactInfo() {
    console.log('⏳ Seeding Contact Info...');
    try {
        const existingInfo = await db.query.contactInfo.findFirst();
        if (existingInfo) return;

        await db.insert(schema.contactInfo).values({
            restaurantName: 'The London Kitchen',
            email: 'hello@londonkitchen.com',
            phone: '+44 20 7123 4567',
            address: '123 Oxford Street, London, W1D 1LT',
        });
        console.log('✅ Contact Info seeded.');
    } catch (error) {
        console.error('❌ Error seeding contact info:', error);
        throw error;
    }
}

async function seedMenu() {
    console.log('⏳ Seeding Menu...');
    try {
        // Clear existing menu to allow re-seeding with new items
        await db.delete(schema.orderItems); // Clear dependencies first
        await db.delete(schema.foodOptions);
        await db.delete(schema.cartItems);
        await db.delete(schema.foodItems);
        await db.delete(schema.categories);
        console.log('🧹 Cleared existing menu data.');

        // 1. Categories
        const categoriesData = [
            { name: 'Classics', slug: 'classics', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800' },
            { name: 'Mains', slug: 'mains', image: 'https://images.unsplash.com/photo-1546964124-0cce460f38ef?auto=format&fit=crop&q=80&w=800' },
            { name: 'Starters', slug: 'starters', image: 'https://images.unsplash.com/photo-1626077513812-706bc75240bc?auto=format&fit=crop&q=80&w=800' },
            { name: 'Sides', slug: 'sides', image: 'https://images.unsplash.com/photo-1621360841013-c768371e93cf?auto=format&fit=crop&q=80&w=800' },
            { name: 'Desserts', slug: 'desserts', image: 'https://images.unsplash.com/photo-1563729768-6af7c46d3eb6?auto=format&fit=crop&q=80&w=800' },
            { name: 'Drinks', slug: 'drinks', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&q=80&w=800' },
            { name: 'Kids Menu', slug: 'kids', image: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?auto=format&fit=crop&q=80&w=800' },
        ];

        const insertedCategories = await db.insert(schema.categories).values(categoriesData).returning();
        const catMap = new Map(insertedCategories.map(c => [c.slug, c.id]));

        // 2. Food Items
        const foodData = [
            // Starters
            {
                name: 'Prawn Cocktail',
                slug: 'prawn-cocktail',
                description: 'Atlantic prawns in Marie Rose sauce, served with avocado and buttered brown bread.',
                price: 9.50,
                categoryId: catMap.get('starters')!,
                image: 'https://images.unsplash.com/photo-1626077513812-706bc75240bc?auto=format&fit=crop&q=80&w=800',
                tags: ['seafood', 'starter'],
            },
            {
                name: 'Soup of the Day',
                slug: 'soup-day',
                description: 'Freshly made soup served with crusty sourdough bread.',
                price: 7.00,
                categoryId: catMap.get('starters')!,
                image: 'https://images.unsplash.com/photo-1547592166-23acbe3226bf?auto=format&fit=crop&q=80&w=800',
                tags: ['vegan', 'soup', 'starter'],
            },
            // Classics
            {
                name: 'Traditional Fish & Chips',
                slug: 'fish-and-chips',
                description: 'Beer-battered cod served with chunky chips, mushy peas, and tartare sauce.',
                price: 16.50,
                categoryId: catMap.get('classics')!,
                image: 'https://images.unsplash.com/photo-1599599810769-bcde5a45ddfa?auto=format&fit=crop&q=80&w=800',
                isPopular: true,
                tags: ['fish', 'seafood', 'fried'],
            },
            {
                name: 'Sausage & Mash',
                slug: 'sausage-and-mash',
                description: 'Cumberland sausages served with creamy mashed potatoes and rich onion gravy.',
                price: 14.50,
                categoryId: catMap.get('classics')!,
                image: 'https://images.unsplash.com/photo-1593560708920-61dd94046d97?auto=format&fit=crop&q=80&w=800',
                tags: ['meat', 'pork', 'comfort'],
            },
            {
                name: 'Shepherd\'s Pie',
                slug: 'shepherds-pie',
                description: 'Minced lamb cooked in a rich gravy with carrots and peas, topped with cheesy mash.',
                price: 15.00,
                categoryId: catMap.get('classics')!,
                image: 'https://images.unsplash.com/photo-1619895092538-3299cbc53bea?auto=format&fit=crop&q=80&w=800',
                tags: ['meat', 'lamb', 'pie'],
            },
            // Mains
            {
                name: 'Beef Wellington',
                slug: 'beef-wellington',
                description: 'Fillet steak coated with pâté and duxelles, wrapped in puff pastry. Served with tenderstem broccoli.',
                price: 28.00,
                categoryId: catMap.get('mains')!,
                image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&q=80&w=800',
                isPopular: true,
                tags: ['meat', 'beef', 'premium'],
            },
            {
                name: 'Chicken Tikka Masala',
                slug: 'chicken-tikka-masala',
                description: 'Roasted marinated chicken chunks in a spiced curry sauce. Served with pilau rice.',
                price: 15.95,
                categoryId: catMap.get('mains')!,
                image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=80&w=800',
                tags: ['chicken', 'curry', 'spicy'],
            },
            {
                name: 'Roasted Vegetable Tart',
                slug: 'veg-tart',
                description: 'Seasonal roasted vegetables in a puff pastry tart with goat cheese.',
                price: 14.00,
                categoryId: catMap.get('mains')!,
                image: 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&q=80&w=800',
                tags: ['vegetarian', 'tart'],
            },
            // Sides
            {
                name: 'Chunky Chips',
                slug: 'chunky-chips',
                description: 'Triple-cooked thick cut chips.',
                price: 4.50,
                categoryId: catMap.get('sides')!,
                image: 'https://images.unsplash.com/photo-1630384060421-cb20d0e06497?auto=format&fit=crop&q=80&w=800',
                tags: ['vegan', 'potato'],
            },
            {
                name: 'Garlic Bread',
                slug: 'garlic-bread',
                description: 'Ciabatta bread brushed with garlic butter and herbs.',
                price: 4.00,
                categoryId: catMap.get('sides')!,
                image: 'https://images.unsplash.com/photo-1573140247632-f84660f67126?auto=format&fit=crop&q=80&w=800',
                tags: ['vegetarian', 'bread'],
            },
            // Desserts
            {
                name: 'Sticky Toffee Pudding',
                slug: 'sticky-toffee-pudding',
                description: 'Classic British sponge cake made with finely chopped dates, covered in a toffee sauce.',
                price: 7.50,
                categoryId: catMap.get('desserts')!,
                image: 'https://images.unsplash.com/photo-1563729768-6af7c46d3eb6?auto=format&fit=crop&q=80&w=800',
                isPopular: true,
                tags: ['sweet', 'vegetarian'],
            },
            {
                name: 'Apple Crumble',
                slug: 'apple-crumble',
                description: 'Stewed apples topped with a golden crumble, served with vanilla custard.',
                price: 7.00,
                categoryId: catMap.get('desserts')!,
                image: 'https://images.unsplash.com/photo-1621236378699-8597faf6a176?auto=format&fit=crop&q=80&w=800', // Placeholder
                tags: ['sweet', 'vegetarian', 'fruit'],
            },
            {
                name: 'Eton Mess',
                slug: 'eton-mess',
                description: 'A mixture of strawberries, broken meringue, and whipped double cream.',
                price: 7.50,
                categoryId: catMap.get('desserts')!,
                image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&q=80&w=800', // Placeholder
                tags: ['sweet', 'vegetarian', 'fruit', 'gluten-free'],
            },
            // Drinks
            {
                name: 'London Pride',
                slug: 'london-pride',
                description: 'Fuller\'s London Pride is a premium ale with a rich, malty flavor.',
                price: 5.50,
                categoryId: catMap.get('drinks')!,
                image: 'https://images.unsplash.com/photo-1566633806327-68e152aaf26d?auto=format&fit=crop&q=80&w=800',
                tags: ['alcohol', 'beer'],
            },
            {
                name: 'English Breakfast Tea',
                slug: 'english-tea',
                description: 'A traditional blend of black teas, best served with milk.',
                price: 3.00,
                categoryId: catMap.get('drinks')!,
                image: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&q=80&w=800',
                tags: ['hot-drink', 'tea'],
            },
            // Kids
            {
                name: 'Fish Fingers & Chips',
                slug: 'kids-fish-fingers',
                description: 'Cod fish fingers served with chips and peas.',
                price: 6.95,
                categoryId: catMap.get('kids')!,
                image: 'https://images.unsplash.com/photo-1599599810653-9849a6310f9e?auto=format&fit=crop&q=80&w=800', // Placeholder
                tags: ['kids', 'fish'],
            },
        ];

        const insertedFood = await db.insert(schema.foodItems).values(foodData).returning();

        console.log('✅ Menu seeded successfully.');

    } catch (error) {
        console.error('❌ Error seeding menu:', error);
        throw error;
    }
}

async function main() {
    try {
        await seedOpeningHours();
        await seedRestaurantSettings();
        await seedContactInfo();
        await seedMenu();
    } catch (error) {
        console.error('\n💥 Seed failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
