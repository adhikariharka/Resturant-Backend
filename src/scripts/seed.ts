/* eslint-disable no-console */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../drizzle/schema';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// ---------- tiny helpers ----------
const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const pickMany = <T>(arr: T[], n: number) => {
    const copy = [...arr];
    const out: T[] = [];
    for (let i = 0; i < n && copy.length; i++) {
        out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
    }
    return out;
};
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const minutesAgo = (n: number) => new Date(Date.now() - n * 60 * 1000);

// ============================================================================
// 1. Restaurant config — hours, settings, contact, holidays
// ============================================================================
async function seedOpeningHours() {
    console.log('⏳ Seeding Opening Hours…');
    const existing = await db.query.openingHours.findMany();
    if (existing.length) {
        console.log('   (already seeded, skipping)');
        return;
    }

    const schedule = [
        { day: 'Monday', dayOrder: 1, openTime: '11:30', closeTime: '22:00', isClosed: false },
        { day: 'Tuesday', dayOrder: 2, openTime: '11:30', closeTime: '22:00', isClosed: false },
        { day: 'Wednesday', dayOrder: 3, openTime: '11:30', closeTime: '22:00', isClosed: false },
        { day: 'Thursday', dayOrder: 4, openTime: '11:30', closeTime: '22:30', isClosed: false },
        { day: 'Friday', dayOrder: 5, openTime: '11:30', closeTime: '23:30', isClosed: false },
        { day: 'Saturday', dayOrder: 6, openTime: '10:00', closeTime: '23:30', isClosed: false },
        { day: 'Sunday', dayOrder: 7, openTime: '10:00', closeTime: '22:00', isClosed: false },
    ];
    await db.insert(schema.openingHours).values(
        schedule.map((s) => ({ ...s, timezone: 'Europe/London' })),
    );
    console.log('✅ Opening Hours seeded.');
}

async function seedRestaurantSettings() {
    console.log('⏳ Seeding Restaurant Settings…');
    const existing = await db.query.restaurantSettings.findFirst();
    if (existing) {
        console.log('   (already seeded, skipping)');
        return;
    }
    await db.insert(schema.restaurantSettings).values({
        taxRate: 0.2,
        serviceCharge: 0.1,
        deliveryFee: 3.5,
        freeDeliveryThreshold: 40,
        minOrderAmount: 10,
        currency: 'GBP',
    });
    console.log('✅ Restaurant Settings seeded.');
}

async function seedContactInfo() {
    console.log('⏳ Seeding Contact Info…');
    const existing = await db.query.contactInfo.findFirst();
    if (existing) {
        console.log('   (already seeded, skipping)');
        return;
    }
    await db.insert(schema.contactInfo).values({
        restaurantName: 'The British Kitchen',
        tagline: 'Timeless British classics, delivered hot.',
        description:
            'Family-run kitchen in the heart of London, serving reimagined British classics made from local, seasonal produce.',
        logo: 'https://res.cloudinary.com/demo/image/upload/v1/harke/logo.png',
        email: 'hello@thebritishkitchen.co.uk',
        phone: '+44 20 7123 4567',
        address: '42 Oxford Street, Fitzrovia, London, W1D 1LT',
        facebook: 'https://facebook.com/thebritishkitchen',
        instagram: 'https://instagram.com/thebritishkitchen',
        twitter: 'https://twitter.com/britishkitchen',
        whatsapp: '+442071234567',
    });
    console.log('✅ Contact Info seeded.');
}

async function seedHolidays() {
    console.log('⏳ Seeding Holidays…');
    const existing = await db.query.holidays.findMany();
    if (existing.length) {
        console.log('   (already seeded, skipping)');
        return;
    }
    const year = new Date().getFullYear();
    const next = year + 1;
    await db.insert(schema.holidays).values([
        {
            date: `${year}-12-25`,
            name: 'Christmas Day',
            message: 'Closed for Christmas Day — see you on the 26th!',
        },
        {
            date: `${year}-12-26`,
            name: 'Boxing Day',
            message: 'Resting the ovens. Back on the 27th.',
        },
        {
            date: `${next}-01-01`,
            name: "New Year's Day",
            message: 'Happy New Year — kitchen reopens the next day.',
        },
        {
            date: `${next}-05-05`,
            name: 'Early May Bank Holiday',
            message: 'Closed for the bank holiday.',
        },
    ]);
    console.log('✅ Holidays seeded.');
}

// ============================================================================
// 2. Staff
// ============================================================================
async function seedStaff() {
    console.log('⏳ Seeding Staff…');
    const existing = await db.select({ username: schema.staff.username }).from(schema.staff);
    const existingUsernames = new Set(existing.map((s) => s.username));

    const hash = (plain: string) => bcrypt.hash(plain, 10);

    const accounts = [
        {
            username: 'kitchen',
            password: await hash('kitchen123'),
            name: 'Gordon (Head Chef)',
            email: 'kitchen@thebritishkitchen.co.uk',
            phone: '+44 7700 900001',
            role: 'staff' as const,
            permissions: ['kitchen'],
        },
        {
            username: 'kitchen2',
            password: await hash('kitchen123'),
            name: 'Priya (Sous Chef)',
            email: 'priya@thebritishkitchen.co.uk',
            phone: '+44 7700 900002',
            role: 'staff' as const,
            permissions: ['kitchen'],
        },
        {
            username: 'delivery',
            password: await hash('delivery123'),
            name: 'Marcus (Rider)',
            email: 'marcus@thebritishkitchen.co.uk',
            phone: '+44 7700 900003',
            role: 'staff' as const,
            permissions: ['delivery'],
        },
        {
            username: 'delivery2',
            password: await hash('delivery123'),
            name: 'Sofia (Rider)',
            email: 'sofia@thebritishkitchen.co.uk',
            phone: '+44 7700 900004',
            role: 'staff' as const,
            permissions: ['delivery'],
        },
        {
            username: 'manager',
            password: await hash('manager123'),
            name: 'Olivia (Floor Manager)',
            email: 'olivia@thebritishkitchen.co.uk',
            phone: '+44 7700 900005',
            role: 'admin' as const,
            permissions: ['kitchen', 'delivery', 'admin'],
        },
    ];

    const toInsert = accounts.filter((a) => !existingUsernames.has(a.username));
    if (toInsert.length) {
        await db.insert(schema.staff).values(toInsert);
    }
    console.log(`✅ Staff seeded (${toInsert.length} new, ${existingUsernames.size} already existed).`);
}

// ============================================================================
// 3. Customer users + addresses
// ============================================================================
async function seedUsers() {
    console.log('⏳ Seeding Customers & Admin…');
    const existing = await db.select({ email: schema.users.email }).from(schema.users);
    const existingEmails = new Set(existing.map((u) => u.email));

    const hash = (plain: string) => bcrypt.hash(plain, 10);

    const adminPw = await hash('admin123');
    const customerPw = await hash('password123');

    const people = [
        {
            email: 'admin@thebritishkitchen.co.uk',
            password: adminPw,
            name: 'Sarah Thompson',
            phone: '+44 7700 900100',
            role: 'admin' as const,
            emailVerified: true,
        },
        {
            email: 'james@example.com',
            password: customerPw,
            name: 'James Wilson',
            phone: '+44 7700 900101',
            role: 'customer' as const,
            emailVerified: true,
        },
        {
            email: 'emily@example.com',
            password: customerPw,
            name: 'Emily Harper',
            phone: '+44 7700 900102',
            role: 'customer' as const,
            emailVerified: true,
        },
        {
            email: 'oliver@example.com',
            password: customerPw,
            name: 'Oliver Brown',
            phone: '+44 7700 900103',
            role: 'customer' as const,
            emailVerified: true,
        },
        {
            email: 'sophie@example.com',
            password: customerPw,
            name: 'Sophie Davies',
            phone: '+44 7700 900104',
            role: 'customer' as const,
            emailVerified: true,
        },
        {
            email: 'rajesh@example.com',
            password: customerPw,
            name: 'Rajesh Patel',
            phone: '+44 7700 900105',
            role: 'customer' as const,
            emailVerified: true,
        },
        {
            email: 'mia@example.com',
            password: customerPw,
            name: 'Mia Chen',
            phone: '+44 7700 900106',
            role: 'customer' as const,
            emailVerified: false,
        },
    ];

    const toInsert = people.filter((p) => !existingEmails.has(p.email));
    if (toInsert.length) {
        await db.insert(schema.users).values(toInsert);
    }

    // Addresses — only for customers we just introduced (or existing ones without addresses).
    const allUsers = await db.query.users.findMany();
    const existingAddresses = await db.select({ userId: schema.addresses.userId }).from(schema.addresses);
    const hasAddressFor = new Set(existingAddresses.map((a) => a.userId));

    const customerAddresses = [
        { email: 'james@example.com', label: 'Home', line1: '42 Baker Street', city: 'London', postcode: 'W1U 7EU', instructions: 'Leave with concierge' },
        { email: 'james@example.com', label: 'Work', line1: '1 Canada Square', line2: 'Canary Wharf', city: 'London', postcode: 'E14 5AB' },
        { email: 'emily@example.com', label: 'Home', line1: '15 Kings Road', city: 'Chelsea', postcode: 'SW3 4RP' },
        { email: 'oliver@example.com', label: 'Home', line1: '221B Baker Street', city: 'London', postcode: 'NW1 6XE', instructions: 'Ring twice' },
        { email: 'sophie@example.com', label: 'Home', line1: '10 Downing Street', city: 'Westminster', postcode: 'SW1A 2AA' },
        { email: 'rajesh@example.com', label: 'Home', line1: '88 Brick Lane', city: 'London', postcode: 'E1 6RL' },
        { email: 'mia@example.com', label: 'Home', line1: '2 Shoreditch High St', city: 'London', postcode: 'E1 6JJ' },
    ];

    const addrRows: Array<typeof schema.addresses.$inferInsert> = [];
    const seenDefault = new Set<string>();
    for (const a of customerAddresses) {
        const user = allUsers.find((u) => u.email === a.email);
        if (!user || hasAddressFor.has(user.id)) continue;
        const isDefault = !seenDefault.has(user.id);
        seenDefault.add(user.id);
        addrRows.push({
            userId: user.id,
            label: a.label,
            line1: a.line1,
            line2: a.line2,
            city: a.city,
            postcode: a.postcode,
            country: 'United Kingdom',
            phone: user.phone ?? null,
            instructions: a.instructions,
            isDefault,
        });
    }
    if (addrRows.length) {
        await db.insert(schema.addresses).values(addrRows);
    }
    console.log(`✅ Users seeded (${toInsert.length} new) + ${addrRows.length} addresses.`);
}

// ============================================================================
// 4. Menu — categories, food items, options
// ============================================================================
async function seedMenu() {
    console.log('⏳ Seeding Menu (wiping existing menu data first)…');
    // Clear in correct dep order
    await db.delete(schema.staffLogs);
    await db.delete(schema.reviews);
    await db.delete(schema.orderItems);
    await db.delete(schema.orders);
    await db.delete(schema.cartItems);
    await db.delete(schema.foodOptions);
    await db.delete(schema.foodItems);
    await db.delete(schema.categories);
    console.log('🧹 Menu, orders, and reviews cleared.');

    // ---------------- Categories ----------------
    const categoriesData = [
        {
            name: 'Starters',
            slug: 'starters',
            description: 'Light bites to whet the appetite — prawn cocktail, soups, and more.',
            displayOrder: 1,
            image: 'https://images.unsplash.com/photo-1626077513812-706bc75240bc?auto=format&fit=crop&q=80&w=800',
        },
        {
            name: 'British Classics',
            slug: 'classics',
            description: 'The pub-style comfort food we all grew up on.',
            displayOrder: 2,
            image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800',
        },
        {
            name: 'Mains',
            slug: 'mains',
            description: 'Chef-led plates built around the best of British produce.',
            displayOrder: 3,
            image: 'https://images.unsplash.com/photo-1546964124-0cce460f38ef?auto=format&fit=crop&q=80&w=800',
        },
        {
            name: 'Sunday Roasts',
            slug: 'roasts',
            description: 'Available all day Sunday — with trimmings and a proper gravy.',
            displayOrder: 4,
            image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=800',
        },
        {
            name: 'Curry House',
            slug: 'curry',
            description: 'Britain’s favourite curries — slow-cooked and spiced to order.',
            displayOrder: 5,
            image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=80&w=800',
        },
        {
            name: 'Vegan & Plant-based',
            slug: 'vegan',
            description: 'Hearty plates for plant-lovers.',
            displayOrder: 6,
            image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
        },
        {
            name: 'Sides',
            slug: 'sides',
            description: 'Triple-cooked chips, buttered greens, and Yorkshire puds.',
            displayOrder: 7,
            image: 'https://images.unsplash.com/photo-1621360841013-c768371e93cf?auto=format&fit=crop&q=80&w=800',
        },
        {
            name: 'Desserts',
            slug: 'desserts',
            description: 'Sticky toffee pudding, Eton mess, and seasonal crumbles.',
            displayOrder: 8,
            image: 'https://images.unsplash.com/photo-1563729768-6af7c46d3eb6?auto=format&fit=crop&q=80&w=800',
        },
        {
            name: 'Drinks',
            slug: 'drinks',
            description: 'Ales, teas, and soft drinks from British makers.',
            displayOrder: 9,
            image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&q=80&w=800',
        },
        {
            name: 'Kids Menu',
            slug: 'kids',
            description: 'Smaller plates for smaller humans.',
            displayOrder: 10,
            image: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?auto=format&fit=crop&q=80&w=800',
        },
    ];

    const insertedCategories = await db.insert(schema.categories).values(categoriesData).returning();
    const catMap = new Map(insertedCategories.map((c) => [c.slug, c.id]));

    // ---------------- Food items ----------------
    type Item = {
        name: string;
        slug: string;
        description: string;
        price: number;
        discountPrice?: number;
        categorySlug: string;
        image: string;
        isPopular?: boolean;
        prep: number;
        calories?: number;
        spicy?: number;
        allergens?: string[];
        tags?: string[];
        quantity?: number;
        isAvailable?: boolean;
    };

    const foodData: Item[] = [
        // ======= STARTERS =======
        {
            name: 'Prawn Cocktail',
            slug: 'prawn-cocktail',
            description: 'Atlantic prawns in Marie Rose sauce, avocado, and buttered brown bread.',
            price: 9.5,
            categorySlug: 'starters',
            image: 'https://images.unsplash.com/photo-1626077513812-706bc75240bc?auto=format&fit=crop&q=80&w=800',
            prep: 8,
            calories: 320,
            allergens: ['shellfish', 'gluten', 'dairy'],
            tags: ['seafood', 'starter', 'cold'],
            quantity: 50,
        },
        {
            name: 'Soup of the Day',
            slug: 'soup-day',
            description: 'Freshly made soup — ask your server — with crusty sourdough.',
            price: 7.0,
            categorySlug: 'starters',
            image: 'https://images.unsplash.com/photo-1547592166-23acbe3226bf?auto=format&fit=crop&q=80&w=800',
            prep: 5,
            calories: 210,
            allergens: ['gluten'],
            tags: ['vegetarian', 'soup', 'warm'],
            quantity: 80,
        },
        {
            name: 'Scotch Egg',
            slug: 'scotch-egg',
            description: 'Free-range egg wrapped in Cumberland sausage, crumbed and deep-fried. Served with piccalilli.',
            price: 8.0,
            categorySlug: 'starters',
            image: 'https://images.unsplash.com/photo-1625944228744-4c7d6d5e8b41?auto=format&fit=crop&q=80&w=800',
            prep: 10,
            calories: 420,
            allergens: ['egg', 'gluten', 'pork'],
            tags: ['meat', 'starter'],
            quantity: 40,
        },
        {
            name: 'Welsh Rarebit',
            slug: 'welsh-rarebit',
            description: 'Toasted sourdough with a Cheddar, ale, and mustard béchamel, grilled until bubbling.',
            price: 8.5,
            categorySlug: 'starters',
            image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800',
            prep: 10,
            calories: 480,
            allergens: ['gluten', 'dairy', 'mustard'],
            tags: ['vegetarian', 'cheese'],
            quantity: 40,
        },
        {
            name: 'Chicken Liver Pâté',
            slug: 'chicken-pate',
            description: 'House-made pâté with Madeira jelly and toasted brioche.',
            price: 9.0,
            categorySlug: 'starters',
            image: 'https://images.unsplash.com/photo-1559622214-f4a29c5c6e1b?auto=format&fit=crop&q=80&w=800',
            prep: 8,
            calories: 390,
            allergens: ['gluten', 'dairy', 'egg'],
            tags: ['meat'],
            quantity: 30,
        },

        // ======= BRITISH CLASSICS =======
        {
            name: 'Traditional Fish & Chips',
            slug: 'fish-and-chips',
            description: 'Beer-battered cod, chunky chips, mushy peas, and tartare sauce.',
            price: 16.5,
            discountPrice: 14.95,
            categorySlug: 'classics',
            image: 'https://images.unsplash.com/photo-1599599810769-bcde5a45ddfa?auto=format&fit=crop&q=80&w=800',
            isPopular: true,
            prep: 18,
            calories: 890,
            allergens: ['fish', 'gluten', 'egg'],
            tags: ['fish', 'seafood', 'fried'],
            quantity: 60,
        },
        {
            name: 'Bangers & Mash',
            slug: 'sausage-and-mash',
            description: 'Cumberland sausages, creamy mash, and rich onion gravy.',
            price: 14.5,
            categorySlug: 'classics',
            image: 'https://images.unsplash.com/photo-1593560708920-61dd94046d97?auto=format&fit=crop&q=80&w=800',
            isPopular: true,
            prep: 20,
            calories: 780,
            allergens: ['gluten', 'dairy', 'pork'],
            tags: ['meat', 'comfort'],
            quantity: 50,
        },
        {
            name: "Shepherd's Pie",
            slug: 'shepherds-pie',
            description: 'Slow-cooked lamb with carrots and peas, under cheesy mash.',
            price: 15.0,
            categorySlug: 'classics',
            image: 'https://images.unsplash.com/photo-1619895092538-3299cbc53bea?auto=format&fit=crop&q=80&w=800',
            prep: 25,
            calories: 820,
            allergens: ['gluten', 'dairy'],
            tags: ['meat', 'lamb'],
            quantity: 40,
        },
        {
            name: 'Steak & Ale Pie',
            slug: 'steak-ale-pie',
            description: 'Slow-braised beef in London Pride gravy, topped with golden puff pastry.',
            price: 16.0,
            categorySlug: 'classics',
            image: 'https://images.unsplash.com/photo-1619894991295-dfb8b8b5e4de?auto=format&fit=crop&q=80&w=800',
            prep: 22,
            calories: 910,
            allergens: ['gluten', 'dairy', 'egg'],
            tags: ['meat', 'beef', 'pie'],
            quantity: 45,
        },
        {
            name: 'Toad in the Hole',
            slug: 'toad-in-the-hole',
            description: 'Cumberland sausages baked into a Yorkshire pudding, with onion gravy.',
            price: 13.5,
            categorySlug: 'classics',
            image: 'https://images.unsplash.com/photo-1624300629298-e9de39c13be5?auto=format&fit=crop&q=80&w=800',
            prep: 25,
            calories: 860,
            allergens: ['gluten', 'egg', 'dairy', 'pork'],
            tags: ['meat'],
            quantity: 30,
        },
        {
            name: 'Ploughman’s Lunch',
            slug: 'ploughmans',
            description: 'Aged Cheddar, honey-roast ham, pickled onions, pork pie, and crusty bread.',
            price: 13.0,
            categorySlug: 'classics',
            image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800',
            prep: 8,
            calories: 720,
            allergens: ['gluten', 'dairy', 'egg'],
            tags: ['cold', 'meat', 'cheese'],
            quantity: 25,
        },

        // ======= MAINS =======
        {
            name: 'Beef Wellington',
            slug: 'beef-wellington',
            description: 'Fillet steak, mushroom duxelles, wrapped in puff pastry. Tenderstem broccoli and red-wine jus.',
            price: 28.0,
            categorySlug: 'mains',
            image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&q=80&w=800',
            isPopular: true,
            prep: 35,
            calories: 1050,
            allergens: ['gluten', 'dairy', 'egg'],
            tags: ['premium', 'beef', 'chef'],
            quantity: 20,
        },
        {
            name: 'Pan-seared Sea Bass',
            slug: 'sea-bass',
            description: 'Crispy-skinned sea bass, saffron mash, brown shrimp butter.',
            price: 22.0,
            categorySlug: 'mains',
            image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=800',
            prep: 20,
            calories: 640,
            allergens: ['fish', 'shellfish', 'dairy'],
            tags: ['fish', 'seafood'],
            quantity: 25,
        },
        {
            name: 'Ribeye Steak',
            slug: 'ribeye-steak',
            description: '28-day aged 300g ribeye, triple-cooked chips, peppercorn sauce.',
            price: 26.0,
            categorySlug: 'mains',
            image: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&q=80&w=800',
            isPopular: true,
            prep: 22,
            calories: 1180,
            allergens: ['dairy'],
            tags: ['meat', 'beef'],
            quantity: 30,
        },
        {
            name: 'Cornish Mussels',
            slug: 'cornish-mussels',
            description: 'Steamed in white wine, shallots and cream, with fries.',
            price: 18.0,
            categorySlug: 'mains',
            image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&q=80&w=800',
            prep: 15,
            calories: 680,
            allergens: ['shellfish', 'dairy', 'sulphites'],
            tags: ['seafood'],
            quantity: 25,
        },
        {
            name: 'Wild Mushroom Risotto',
            slug: 'mushroom-risotto',
            description: 'Carnaroli rice, seasonal wild mushrooms, Parmesan, truffle oil.',
            price: 16.0,
            categorySlug: 'mains',
            image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&q=80&w=800',
            prep: 20,
            calories: 720,
            allergens: ['dairy'],
            tags: ['vegetarian', 'rice'],
            quantity: 35,
        },

        // ======= ROASTS =======
        {
            name: 'Sunday Roast Beef',
            slug: 'roast-beef',
            description: 'Roast sirloin, duck-fat potatoes, Yorkshire pud, seasonal veg, rich gravy.',
            price: 19.5,
            categorySlug: 'roasts',
            image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=800',
            isPopular: true,
            prep: 25,
            calories: 1040,
            allergens: ['gluten', 'egg', 'dairy'],
            tags: ['sunday', 'meat'],
            quantity: 25,
        },
        {
            name: 'Roast Chicken',
            slug: 'roast-chicken',
            description: 'Half free-range chicken, sage stuffing, Yorkshire pud, all the trimmings.',
            price: 17.5,
            categorySlug: 'roasts',
            image: 'https://images.unsplash.com/photo-1598103442947-a2c2b5e6e2d8?auto=format&fit=crop&q=80&w=800',
            prep: 25,
            calories: 920,
            allergens: ['gluten', 'egg', 'dairy'],
            tags: ['sunday', 'chicken'],
            quantity: 30,
        },
        {
            name: 'Nut Roast',
            slug: 'nut-roast',
            description: 'Chestnut, squash, and sage roast — cranberry gravy. (Vegan Sunday option.)',
            price: 16.0,
            categorySlug: 'roasts',
            image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=800',
            prep: 25,
            calories: 760,
            allergens: ['nuts', 'gluten'],
            tags: ['vegan', 'sunday'],
            quantity: 20,
        },

        // ======= CURRY =======
        {
            name: 'Chicken Tikka Masala',
            slug: 'chicken-tikka-masala',
            description: 'Marinated chicken in a spiced tomato & cream sauce. Served with pilau rice.',
            price: 15.95,
            categorySlug: 'curry',
            image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=80&w=800',
            isPopular: true,
            prep: 20,
            calories: 870,
            spicy: 1,
            allergens: ['dairy'],
            tags: ['chicken', 'curry'],
            quantity: 40,
        },
        {
            name: 'Lamb Rogan Josh',
            slug: 'lamb-rogan-josh',
            description: 'Slow-cooked lamb in a fragrant Kashmiri-style masala. Basmati rice.',
            price: 17.5,
            categorySlug: 'curry',
            image: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&q=80&w=800',
            prep: 25,
            calories: 930,
            spicy: 2,
            allergens: ['dairy'],
            tags: ['lamb', 'curry'],
            quantity: 25,
        },
        {
            name: 'Vegetable Biryani',
            slug: 'veg-biryani',
            description: 'Saffron basmati layered with spiced seasonal vegetables, raita.',
            price: 13.5,
            categorySlug: 'curry',
            image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f4?auto=format&fit=crop&q=80&w=800',
            prep: 22,
            calories: 780,
            spicy: 2,
            allergens: ['dairy'],
            tags: ['vegetarian', 'rice'],
            quantity: 30,
        },

        // ======= VEGAN =======
        {
            name: 'Beetroot Wellington',
            slug: 'beetroot-wellington',
            description: 'Whole beetroot, mushroom duxelles, vegan puff pastry, red-wine jus.',
            price: 17.0,
            categorySlug: 'vegan',
            image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=800',
            prep: 30,
            calories: 690,
            allergens: ['gluten'],
            tags: ['vegan', 'chef'],
            quantity: 20,
        },
        {
            name: 'Buddha Bowl',
            slug: 'buddha-bowl',
            description: 'Miso roasted squash, crispy chickpeas, tahini dressing, quinoa, seasonal greens.',
            price: 13.0,
            categorySlug: 'vegan',
            image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=800',
            prep: 12,
            calories: 540,
            allergens: ['sesame'],
            tags: ['vegan', 'healthy', 'bowl'],
            quantity: 30,
        },
        {
            name: 'Jackfruit "Pulled" Bun',
            slug: 'jackfruit-bun',
            description: 'Smoky pulled jackfruit, slaw, brioche bun, sweet potato fries.',
            price: 12.5,
            categorySlug: 'vegan',
            image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800',
            prep: 15,
            calories: 640,
            allergens: ['gluten', 'soy'],
            tags: ['vegan', 'burger'],
            quantity: 25,
        },

        // ======= SIDES =======
        {
            name: 'Triple-cooked Chips',
            slug: 'chunky-chips',
            description: 'Crunchy outside, fluffy inside, flaked sea salt.',
            price: 4.5,
            categorySlug: 'sides',
            image: 'https://images.unsplash.com/photo-1630384060421-cb20d0e06497?auto=format&fit=crop&q=80&w=800',
            prep: 10,
            calories: 480,
            tags: ['vegan', 'side'],
            quantity: 100,
        },
        {
            name: 'Sweet Potato Fries',
            slug: 'sweet-potato-fries',
            description: 'Crispy fries with a lime and chipotle mayo.',
            price: 5.0,
            categorySlug: 'sides',
            image: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&q=80&w=800',
            prep: 10,
            calories: 420,
            allergens: ['egg'],
            tags: ['vegetarian', 'side'],
            quantity: 80,
        },
        {
            name: 'Yorkshire Puddings',
            slug: 'yorkshire-puds',
            description: 'Three crispy Yorkies with a jug of gravy.',
            price: 3.5,
            categorySlug: 'sides',
            image: 'https://images.unsplash.com/photo-1588335060573-1e0fdcd80c3e?auto=format&fit=crop&q=80&w=800',
            prep: 6,
            calories: 320,
            allergens: ['gluten', 'egg', 'dairy'],
            tags: ['side'],
            quantity: 60,
        },
        {
            name: 'Garlic Bread',
            slug: 'garlic-bread',
            description: 'Ciabatta, garlic-parsley butter, charred.',
            price: 4.0,
            categorySlug: 'sides',
            image: 'https://images.unsplash.com/photo-1573140247632-f84660f67126?auto=format&fit=crop&q=80&w=800',
            prep: 5,
            calories: 360,
            allergens: ['gluten', 'dairy'],
            tags: ['vegetarian', 'bread', 'side'],
            quantity: 60,
        },
        {
            name: 'Buttered Greens',
            slug: 'buttered-greens',
            description: 'Tenderstem, kale, butter, sea salt, lemon.',
            price: 4.5,
            categorySlug: 'sides',
            image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800',
            prep: 6,
            calories: 190,
            allergens: ['dairy'],
            tags: ['vegetarian', 'healthy', 'side'],
            quantity: 50,
        },

        // ======= DESSERTS =======
        {
            name: 'Sticky Toffee Pudding',
            slug: 'sticky-toffee-pudding',
            description: 'Date sponge, hot butterscotch sauce, clotted cream.',
            price: 7.5,
            categorySlug: 'desserts',
            image: 'https://images.unsplash.com/photo-1563729768-6af7c46d3eb6?auto=format&fit=crop&q=80&w=800',
            isPopular: true,
            prep: 8,
            calories: 620,
            allergens: ['gluten', 'egg', 'dairy'],
            tags: ['sweet', 'warm'],
            quantity: 50,
        },
        {
            name: 'Apple Crumble',
            slug: 'apple-crumble',
            description: 'Bramley apples, oat crumble, vanilla custard.',
            price: 7.0,
            categorySlug: 'desserts',
            image: 'https://images.unsplash.com/photo-1621236378699-8597faf6a176?auto=format&fit=crop&q=80&w=800',
            prep: 8,
            calories: 560,
            allergens: ['gluten', 'dairy', 'egg'],
            tags: ['sweet', 'fruit'],
            quantity: 40,
        },
        {
            name: 'Eton Mess',
            slug: 'eton-mess',
            description: 'Strawberries, broken meringue, whipped double cream.',
            price: 7.5,
            categorySlug: 'desserts',
            image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&q=80&w=800',
            prep: 5,
            calories: 490,
            allergens: ['egg', 'dairy'],
            tags: ['sweet', 'fruit', 'gluten-free'],
            quantity: 40,
        },
        {
            name: 'Chocolate Fondant',
            slug: 'chocolate-fondant',
            description: '70% dark chocolate fondant, salted-caramel ice cream.',
            price: 8.5,
            categorySlug: 'desserts',
            image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&q=80&w=800',
            prep: 12,
            calories: 720,
            allergens: ['gluten', 'dairy', 'egg'],
            tags: ['sweet', 'chocolate'],
            quantity: 30,
        },
        {
            name: 'Cheese Board',
            slug: 'cheese-board',
            description: 'Three British cheeses, quince, oat biscuits, grapes.',
            price: 11.0,
            categorySlug: 'desserts',
            image: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&q=80&w=800',
            prep: 6,
            calories: 580,
            allergens: ['dairy', 'gluten'],
            tags: ['cheese', 'savoury'],
            quantity: 20,
        },

        // ======= DRINKS =======
        {
            name: "Fuller's London Pride",
            slug: 'london-pride',
            description: 'Premium amber ale, rich and malty. 500ml.',
            price: 5.5,
            categorySlug: 'drinks',
            image: 'https://images.unsplash.com/photo-1566633806327-68e152aaf26d?auto=format&fit=crop&q=80&w=800',
            prep: 1,
            calories: 210,
            tags: ['alcohol', 'beer'],
            quantity: 120,
        },
        {
            name: 'House Red',
            slug: 'house-red',
            description: 'Spanish Garnacha — juicy, medium-bodied. 175ml.',
            price: 6.5,
            categorySlug: 'drinks',
            image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800',
            prep: 1,
            calories: 160,
            allergens: ['sulphites'],
            tags: ['alcohol', 'wine'],
            quantity: 80,
        },
        {
            name: 'English Breakfast Tea',
            slug: 'english-tea',
            description: 'Traditional blend, best with milk.',
            price: 3.0,
            categorySlug: 'drinks',
            image: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&q=80&w=800',
            prep: 3,
            calories: 25,
            allergens: ['dairy'],
            tags: ['hot-drink', 'tea'],
            quantity: 200,
        },
        {
            name: 'Elderflower Fizz',
            slug: 'elderflower-fizz',
            description: 'Sparkling elderflower, cucumber, lime.',
            price: 4.0,
            categorySlug: 'drinks',
            image: 'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?auto=format&fit=crop&q=80&w=800',
            prep: 2,
            calories: 90,
            tags: ['soft-drink', 'vegan'],
            quantity: 60,
        },

        // ======= KIDS =======
        {
            name: 'Fish Fingers & Chips',
            slug: 'kids-fish-fingers',
            description: 'Cod fish fingers, chips, peas. Little-portion.',
            price: 6.95,
            categorySlug: 'kids',
            image: 'https://images.unsplash.com/photo-1599599810653-9849a6310f9e?auto=format&fit=crop&q=80&w=800',
            prep: 12,
            calories: 490,
            allergens: ['fish', 'gluten'],
            tags: ['kids', 'fish'],
            quantity: 40,
        },
        {
            name: 'Mini Margherita',
            slug: 'kids-margherita',
            description: 'Little pizza with tomato and mozzarella.',
            price: 6.5,
            categorySlug: 'kids',
            image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=800',
            prep: 10,
            calories: 420,
            allergens: ['gluten', 'dairy'],
            tags: ['kids', 'vegetarian'],
            quantity: 40,
        },
        {
            name: 'Kids Roast',
            slug: 'kids-roast',
            description: 'Small roast chicken, soft roasties, gravy.',
            price: 8.5,
            categorySlug: 'kids',
            image: 'https://images.unsplash.com/photo-1598103442947-a2c2b5e6e2d8?auto=format&fit=crop&q=80&w=800',
            prep: 15,
            calories: 520,
            allergens: ['gluten'],
            tags: ['kids', 'sunday'],
            quantity: 25,
        },
    ];

    const insertedFood = await db
        .insert(schema.foodItems)
        .values(
            foodData.map((f) => ({
                name: f.name,
                slug: f.slug,
                description: f.description,
                price: f.price,
                discountPrice: f.discountPrice,
                image: f.image,
                categoryId: catMap.get(f.categorySlug)!,
                isAvailable: f.isAvailable ?? true,
                isPopular: f.isPopular ?? false,
                quantity: f.quantity ?? 50,
                preparationTime: f.prep,
                calories: f.calories,
                spicyLevel: f.spicy ?? 0,
                allergens: f.allergens ?? [],
                tags: f.tags ?? [],
            })),
        )
        .returning();

    const foodBySlug = new Map(insertedFood.map((f) => [f.slug, f]));

    // ---------------- Food options ----------------
    const optionRows: Array<typeof schema.foodOptions.$inferInsert> = [];

    const sizeChoices = [
        { id: 'reg', name: 'Regular', priceModifier: 0 },
        { id: 'lg', name: 'Large (+£3)', priceModifier: 3 },
    ];
    const extraChoices = [
        { id: 'tartare', name: 'Extra tartare sauce', priceModifier: 0.5 },
        { id: 'mushy', name: 'Extra mushy peas', priceModifier: 1 },
        { id: 'gravy', name: 'Extra gravy', priceModifier: 0.75 },
    ];
    const spiceChoices = [
        { id: 'mild', name: 'Mild', priceModifier: 0 },
        { id: 'medium', name: 'Medium', priceModifier: 0 },
        { id: 'hot', name: 'Hot', priceModifier: 0 },
        { id: 'extra', name: 'Extra hot', priceModifier: 0 },
    ];
    const doneness = [
        { id: 'rare', name: 'Rare', priceModifier: 0 },
        { id: 'mr', name: 'Medium rare', priceModifier: 0 },
        { id: 'med', name: 'Medium', priceModifier: 0 },
        { id: 'mw', name: 'Medium well', priceModifier: 0 },
        { id: 'well', name: 'Well done', priceModifier: 0 },
    ];

    const addOption = (slug: string, o: Omit<typeof schema.foodOptions.$inferInsert, 'foodItemId'>) => {
        const fi = foodBySlug.get(slug);
        if (!fi) return;
        optionRows.push({ ...o, foodItemId: fi.id });
    };

    addOption('fish-and-chips', {
        name: 'Portion size',
        isRequired: true,
        allowMultiple: false,
        displayOrder: 1,
        choices: sizeChoices,
    });
    addOption('fish-and-chips', {
        name: 'Extras',
        isRequired: false,
        allowMultiple: true,
        displayOrder: 2,
        choices: extraChoices,
    });
    addOption('chicken-tikka-masala', {
        name: 'Spice level',
        isRequired: true,
        allowMultiple: false,
        displayOrder: 1,
        choices: spiceChoices,
    });
    addOption('lamb-rogan-josh', {
        name: 'Spice level',
        isRequired: true,
        allowMultiple: false,
        displayOrder: 1,
        choices: spiceChoices,
    });
    addOption('ribeye-steak', {
        name: 'How do you like it?',
        isRequired: true,
        allowMultiple: false,
        displayOrder: 1,
        choices: doneness,
    });
    addOption('beef-wellington', {
        name: 'How do you like it?',
        isRequired: true,
        allowMultiple: false,
        displayOrder: 1,
        choices: doneness,
    });
    addOption('roast-beef', {
        name: 'Add extra Yorkshire pudding?',
        isRequired: false,
        allowMultiple: false,
        displayOrder: 1,
        choices: [
            { id: 'no', name: 'No thanks', priceModifier: 0 },
            { id: 'yes', name: 'Yes please (+£1.50)', priceModifier: 1.5 },
        ],
    });

    if (optionRows.length) {
        await db.insert(schema.foodOptions).values(optionRows);
    }

    console.log(
        `✅ Menu seeded: ${insertedCategories.length} categories, ${insertedFood.length} items, ${optionRows.length} options.`,
    );
    return { foodBySlug };
}

// ============================================================================
// 5. Sample orders + reviews
// ============================================================================
async function seedOrdersAndReviews(foodBySlug: Map<string, typeof schema.foodItems.$inferSelect>) {
    console.log('⏳ Seeding sample orders & reviews…');

    const customers = await db.select().from(schema.users).where(eq(schema.users.role, 'customer'));
    if (!customers.length) {
        console.log('   (no customers found; skipping orders)');
        return;
    }

    const addressesList = await db.query.addresses.findMany();
    const addressByUser = new Map<string, (typeof addressesList)[number]>();
    for (const a of addressesList) {
        if (!addressByUser.has(a.userId) || a.isDefault) addressByUser.set(a.userId, a);
    }

    const itemBySlug = foodBySlug;

    // Define sample orders across statuses + ages
    const plans: Array<{
        userEmail: string;
        itemSlugs: Array<[string, number]>; // [slug, qty]
        status: typeof schema.orders.$inferInsert.status;
        paymentStatus?: typeof schema.orders.$inferInsert.paymentStatus;
        paymentMethod: typeof schema.orders.$inferInsert.paymentMethod;
        placedMinutesAgo: number;
        notes?: string;
    }> = [
            {
                userEmail: 'james@example.com',
                itemSlugs: [['fish-and-chips', 2], ['sticky-toffee-pudding', 1]],
                status: 'placed',
                paymentStatus: 'paid',
                paymentMethod: 'card',
                placedMinutesAgo: 2,
                notes: 'Extra tartare sauce please.',
            },
            {
                userEmail: 'emily@example.com',
                itemSlugs: [['roast-beef', 1], ['buttered-greens', 1]],
                status: 'confirmed',
                paymentStatus: 'paid',
                paymentMethod: 'card',
                placedMinutesAgo: 9,
            },
            {
                userEmail: 'oliver@example.com',
                itemSlugs: [['chicken-tikka-masala', 1], ['veg-biryani', 1], ['garlic-bread', 1]],
                status: 'cooking',
                paymentStatus: 'paid',
                paymentMethod: 'card',
                placedMinutesAgo: 18,
                notes: 'Medium spice on the tikka.',
            },
            {
                userEmail: 'sophie@example.com',
                itemSlugs: [['beef-wellington', 1], ['house-red', 1]],
                status: 'on_the_way',
                paymentStatus: 'paid',
                paymentMethod: 'card',
                placedMinutesAgo: 32,
            },
            {
                userEmail: 'rajesh@example.com',
                itemSlugs: [['lamb-rogan-josh', 1], ['english-tea', 1]],
                status: 'placed',
                paymentStatus: 'pending',
                paymentMethod: 'cash',
                placedMinutesAgo: 5,
            },
            // Recent delivered orders → eligible for review
            {
                userEmail: 'james@example.com',
                itemSlugs: [['sausage-and-mash', 1], ['chunky-chips', 1]],
                status: 'delivered',
                paymentStatus: 'paid',
                paymentMethod: 'card',
                placedMinutesAgo: 60 * 24 * 2, // 2 days ago
            },
            {
                userEmail: 'emily@example.com',
                itemSlugs: [['fish-and-chips', 1], ['apple-crumble', 1]],
                status: 'delivered',
                paymentStatus: 'paid',
                paymentMethod: 'card',
                placedMinutesAgo: 60 * 24 * 5,
            },
            {
                userEmail: 'oliver@example.com',
                itemSlugs: [['ribeye-steak', 1], ['sticky-toffee-pudding', 1]],
                status: 'delivered',
                paymentStatus: 'paid',
                paymentMethod: 'card',
                placedMinutesAgo: 60 * 24 * 7,
            },
            {
                userEmail: 'mia@example.com',
                itemSlugs: [['buddha-bowl', 1], ['elderflower-fizz', 1]],
                status: 'delivered',
                paymentStatus: 'paid',
                paymentMethod: 'card',
                placedMinutesAgo: 60 * 24 * 10,
            },
            // Cancelled
            {
                userEmail: 'sophie@example.com',
                itemSlugs: [['mushroom-risotto', 1]],
                status: 'cancelled',
                paymentStatus: 'refunded',
                paymentMethod: 'card',
                placedMinutesAgo: 60 * 24 * 3,
            },
        ];

    const settings = await db.query.restaurantSettings.findFirst();
    const taxRate = settings?.taxRate ?? 0.2;
    const serviceRate = settings?.serviceCharge ?? 0.1;
    const deliveryFee = settings?.deliveryFee ?? 3.5;
    const freeDeliveryThreshold = settings?.freeDeliveryThreshold ?? 40;

    const customerByEmail = new Map(customers.map((c) => [c.email, c]));

    let orderIdx = 1;
    const reviewPayloads: Array<typeof schema.reviews.$inferInsert> = [];

    for (const plan of plans) {
        const user = customerByEmail.get(plan.userEmail);
        if (!user) continue;
        const address = addressByUser.get(user.id);
        if (!address) continue;

        let subtotal = 0;
        const orderItemRows: Array<Omit<typeof schema.orderItems.$inferInsert, 'orderId'>> = [];
        for (const [slug, qty] of plan.itemSlugs) {
            const f = itemBySlug.get(slug);
            if (!f) continue;
            const price = f.discountPrice ?? f.price;
            subtotal += price * qty;
            orderItemRows.push({
                foodItemId: f.id,
                itemName: f.name,
                itemImage: f.image,
                quantity: qty,
                priceAtOrder: price,
                selectedOptions: [],
            });
        }

        const tax = subtotal * taxRate;
        const serviceCharge = subtotal * serviceRate;
        const fee = subtotal >= freeDeliveryThreshold ? 0 : deliveryFee;
        const total = subtotal + tax + serviceCharge + fee;
        const placedAt = minutesAgo(plan.placedMinutesAgo);

        const [order] = await db
            .insert(schema.orders)
            .values({
                orderNumber: `ORD-${Date.now()}-${String(orderIdx++).padStart(3, '0')}`,
                userId: user.id,
                status: plan.status,
                paymentStatus: plan.paymentStatus ?? 'pending',
                subtotal,
                tax,
                serviceCharge,
                deliveryFee: fee,
                discount: 0,
                total,
                deliveryAddress: {
                    id: address.id,
                    label: address.label,
                    line1: address.line1,
                    line2: address.line2,
                    city: address.city,
                    postcode: address.postcode,
                    country: address.country,
                    phone: address.phone,
                    instructions: address.instructions,
                },
                paymentMethod: plan.paymentMethod,
                notes: plan.notes,
                createdAt: placedAt,
                updatedAt: placedAt,
            })
            .returning();

        if (orderItemRows.length) {
            await db.insert(schema.orderItems).values(orderItemRows.map((r) => ({ ...r, orderId: order.id })));
        }

        // Seed a review for some delivered orders
        if (plan.status === 'delivered' && Math.random() < 0.8) {
            const rating = pick([5, 5, 5, 4, 4, 3]); // mostly great
            const commentPool = [
                'Absolutely stunning — will order again.',
                'Fast delivery and the food was still hot, nice packaging.',
                'Portion was generous and everything tasted fresh.',
                'Great comfort food, reminded me of home.',
                'A bit of a wait but worth it. Lovely flavours.',
                'The pudding was next level. 10/10.',
                'Good as always — our go-to Sunday roast now.',
            ];
            reviewPayloads.push({
                orderId: order.id,
                userId: user.id,
                rating,
                comment: pick(commentPool),
                isApproved: rating >= 4,
                createdAt: new Date(placedAt.getTime() + 60 * 60 * 1000), // +1h
                updatedAt: new Date(placedAt.getTime() + 60 * 60 * 1000),
            });
        }
    }

    if (reviewPayloads.length) {
        await db.insert(schema.reviews).values(reviewPayloads);
    }

    console.log(`✅ Orders seeded (${plans.length}) + ${reviewPayloads.length} reviews.`);
}

// ============================================================================
// 6. Cart — seed a basket for one customer so the UI has something to show
// ============================================================================
async function seedSampleCart(foodBySlug: Map<string, typeof schema.foodItems.$inferSelect>) {
    console.log('⏳ Seeding sample cart…');
    const [james] = await db.select().from(schema.users).where(eq(schema.users.email, 'james@example.com'));
    if (!james) return;

    const items: Array<[string, number]> = [
        ['shepherds-pie', 1],
        ['yorkshire-puds', 2],
        ['elderflower-fizz', 1],
    ];

    const rows = items
        .map(([slug, qty]) => {
            const f = foodBySlug.get(slug);
            if (!f) return null;
            return {
                userId: james.id,
                foodItemId: f.id,
                quantity: qty,
                selectedOptions: [],
            };
        })
        .filter((r): r is NonNullable<typeof r> => r != null);

    if (rows.length) {
        // Use ON CONFLICT ... DO UPDATE via the unique(user,item) index
        await db
            .insert(schema.cartItems)
            .values(rows)
            .onConflictDoUpdate({
                target: [schema.cartItems.userId, schema.cartItems.foodItemId],
                set: { quantity: sql`excluded.quantity`, updatedAt: new Date() },
            });
    }
    console.log(`✅ Sample cart seeded for james@example.com (${rows.length} items).`);
}

// ============================================================================
// Main
// ============================================================================
async function main() {
    console.log('🍽  Harke — seeding database');
    console.log('─────────────────────────────');
    try {
        await seedOpeningHours();
        await seedRestaurantSettings();
        await seedContactInfo();
        await seedHolidays();
        await seedStaff();
        await seedUsers();
        const { foodBySlug } = await seedMenu();
        await seedOrdersAndReviews(foodBySlug);
        await seedSampleCart(foodBySlug);

        console.log('─────────────────────────────');
        console.log('🎉 Seed complete.');
        console.log('');
        console.log('🔑 Test credentials');
        console.log('   Admin (customer-side):   admin@thebritishkitchen.co.uk / admin123');
        console.log('   Customer:                james@example.com / password123');
        console.log('   Staff portal:');
        console.log('     - kitchen / kitchen123     (kitchen permissions)');
        console.log('     - kitchen2 / kitchen123    (kitchen permissions)');
        console.log('     - delivery / delivery123   (delivery permission)');
        console.log('     - delivery2 / delivery123  (delivery permission)');
        console.log('     - manager / manager123     (admin — all permissions)');
    } catch (error) {
        console.error('\n💥 Seed failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
