import {
  pgTable,
  text,
  uuid,
  pgEnum,
  boolean,
  integer,
  timestamp,
  doublePrecision,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// =============================================================================
// Enums
// =============================================================================
export const roleEnum = pgEnum('role', ['customer', 'admin', 'staff']);
export const orderStatusEnum = pgEnum('order_status', [
  'pending_payment',
  'placed',
  'confirmed',
  'cooking',
  'on_the_way',
  'delivered',
  'cancelled',
]);
export const paymentMethodEnum = pgEnum('payment_method', ['card', 'cash']);
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'paid',
  'failed',
  'refunded',
]);
export const dayOfWeekEnum = pgEnum('day_of_week', [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

// =============================================================================
// Users
// =============================================================================
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').unique().notNull(),
    password: text('password').notNull(),
    name: text('name').notNull(),
    phone: text('phone'),
    avatar: text('avatar'),
    role: roleEnum('role').default('customer').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    resetToken: text('reset_token'),
    resetTokenExpiry: timestamp('reset_token_expiry'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    roleIdx: index('users_role_idx').on(t.role),
  }),
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('refresh_tokens_user_idx').on(t.userId),
  }),
);

export const addresses = pgTable(
  'addresses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    label: text('label').notNull(), // "Home", "Work"
    line1: text('line1').notNull(),
    line2: text('line2'),
    city: text('city').notNull(),
    postcode: text('postcode').notNull(),
    country: text('country').default('United Kingdom').notNull(),
    phone: text('phone'),
    instructions: text('instructions'), // "Leave at front door"
    isDefault: boolean('is_default').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('addresses_user_idx').on(t.userId),
  }),
);

// =============================================================================
// Menu
// =============================================================================
export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').unique().notNull(),
    description: text('description'),
    image: text('image'),
    displayOrder: integer('display_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    activeIdx: index('categories_active_idx').on(t.isActive),
    orderIdx: index('categories_order_idx').on(t.displayOrder),
  }),
);

export const foodItems = pgTable(
  'food_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').unique().notNull(),
    description: text('description').notNull(),
    price: doublePrecision('price').notNull(),
    discountPrice: doublePrecision('discount_price'),
    image: text('image').notNull(),
    categoryId: uuid('category_id')
      .references(() => categories.id)
      .notNull(),
    isAvailable: boolean('is_available').default(true).notNull(),
    isPopular: boolean('is_popular').default(false).notNull(),
    quantity: integer('quantity').default(0).notNull(), // Stock on hand
    preparationTime: integer('preparation_time').default(15).notNull(), // minutes
    calories: integer('calories'),
    spicyLevel: integer('spicy_level').default(0).notNull(), // 0-3
    allergens: jsonb('allergens').$type<string[]>().default([]).notNull(), // e.g., ['gluten', 'nuts']
    tags: jsonb('tags').$type<string[]>().default([]).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    categoryIdx: index('food_items_category_idx').on(t.categoryId),
    availableIdx: index('food_items_available_idx').on(t.isAvailable),
    popularIdx: index('food_items_popular_idx').on(t.isPopular),
  }),
);

export const foodOptions = pgTable(
  'food_options',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    foodItemId: uuid('food_item_id')
      .references(() => foodItems.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(), // "Size", "Spice level", "Add-ons"
    isRequired: boolean('is_required').default(false).notNull(),
    allowMultiple: boolean('allow_multiple').default(false).notNull(),
    displayOrder: integer('display_order').default(0).notNull(),
    choices: jsonb('choices')
      .$type<Array<{ id: string; name: string; priceModifier: number }>>()
      .notNull(),
  },
  (t) => ({
    foodItemIdx: index('food_options_item_idx').on(t.foodItemId),
  }),
);

// =============================================================================
// Orders
// =============================================================================
export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderNumber: text('order_number').unique().notNull(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    status: orderStatusEnum('status').default('placed').notNull(),
    paymentStatus: paymentStatusEnum('payment_status').default('pending').notNull(),
    subtotal: doublePrecision('subtotal').notNull(),
    tax: doublePrecision('tax').notNull(),
    serviceCharge: doublePrecision('service_charge').notNull(),
    deliveryFee: doublePrecision('delivery_fee').default(3.5).notNull(),
    discount: doublePrecision('discount').default(0).notNull(),
    total: doublePrecision('total').notNull(),
    deliveryAddress: jsonb('delivery_address').notNull(), // Snapshot of address
    paymentMethod: paymentMethodEnum('payment_method').notNull(),
    stripeSessionId: text('stripe_session_id'),
    notes: text('notes'), // Customer note to kitchen
    estimatedDelivery: timestamp('estimated_delivery'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('orders_user_idx').on(t.userId),
    statusIdx: index('orders_status_idx').on(t.status),
    createdAtIdx: index('orders_created_at_idx').on(t.createdAt),
    paymentStatusIdx: index('orders_payment_status_idx').on(t.paymentStatus),
  }),
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .references(() => orders.id, { onDelete: 'cascade' })
      .notNull(),
    foodItemId: uuid('food_item_id')
      .references(() => foodItems.id)
      .notNull(),
    // Snapshot of the dish at purchase time — stays intact even if the dish
    // is later renamed, reimaged, or removed from the menu.
    itemName: text('item_name'),
    itemImage: text('item_image'),
    quantity: integer('quantity').notNull(),
    selectedOptions: jsonb('selected_options'),
    priceAtOrder: doublePrecision('price_at_order').notNull(),
  },
  (t) => ({
    orderIdx: index('order_items_order_idx').on(t.orderId),
    foodItemIdx: index('order_items_food_idx').on(t.foodItemId),
  }),
);

// =============================================================================
// Reviews
// =============================================================================
export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .references(() => orders.id, { onDelete: 'cascade' })
      .unique()
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    adminResponse: text('admin_response'),
    isApproved: boolean('is_approved').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('reviews_user_idx').on(t.userId),
    approvedIdx: index('reviews_approved_idx').on(t.isApproved),
  }),
);

// =============================================================================
// App / Restaurant Config
// =============================================================================
export const openingHours = pgTable(
  'opening_hours',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    day: text('day').notNull(), // Keep as text for compat (Monday, Tuesday...)
    dayOrder: integer('day_order').notNull(), // 1=Monday, 7=Sunday
    openTime: text('open_time').notNull(),
    closeTime: text('close_time').notNull(),
    isClosed: boolean('is_closed').default(false).notNull(),
    timezone: text('timezone').default('Europe/London').notNull(),
  },
  (t) => ({
    dayOrderIdx: uniqueIndex('opening_hours_day_order_idx').on(t.dayOrder),
  }),
);

export const holidays = pgTable('holidays', {
  id: uuid('id').defaultRandom().primaryKey(),
  date: text('date').notNull().unique(), // YYYY-MM-DD
  name: text('name').notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const restaurantSettings = pgTable('restaurant_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  taxRate: doublePrecision('tax_rate').default(0.2).notNull(),
  serviceCharge: doublePrecision('service_charge').default(0.1).notNull(),
  deliveryFee: doublePrecision('delivery_fee').default(3.5).notNull(),
  freeDeliveryThreshold: doublePrecision('free_delivery_threshold').default(40).notNull(),
  minOrderAmount: doublePrecision('min_order_amount').default(10).notNull(),
  currency: text('currency').default('GBP').notNull(),
  isTemporaryClosed: boolean('is_temporary_closed').default(false).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const contactInfo = pgTable('contact_info', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantName: text('restaurant_name').default('The Kitchen').notNull(),
  tagline: text('tagline'),
  description: text('description'),
  logo: text('logo'),
  email: text('email').default('hello@thekitchen.com').notNull(),
  phone: text('phone').default('+44 20 1234 5678').notNull(),
  address: text('address').default('123 High Street, London').notNull(),
  facebook: text('facebook'),
  instagram: text('instagram'),
  twitter: text('twitter'),
  whatsapp: text('whatsapp'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// =============================================================================
// Cart
// =============================================================================
export const cartItems = pgTable(
  'cart_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    foodItemId: uuid('food_item_id')
      .references(() => foodItems.id, { onDelete: 'cascade' })
      .notNull(),
    quantity: integer('quantity').default(1).notNull(),
    selectedOptions: jsonb('selected_options'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    // One row per (user, item) — updates bump quantity instead of duplicating.
    userItemUnique: uniqueIndex('cart_user_item_unique').on(t.userId, t.foodItemId),
    userIdx: index('cart_user_idx').on(t.userId),
  }),
);

// =============================================================================
// Staff
// =============================================================================
export const staff = pgTable(
  'staff',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').unique().notNull(),
    password: text('password').notNull(),
    name: text('name').notNull(),
    phone: text('phone'),
    role: roleEnum('role').default('staff').notNull(),
    permissions: jsonb('permissions').$type<string[]>().default([]).notNull(), // e.g. ['kitchen', 'delivery']
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    activeIdx: index('staff_active_idx').on(t.isActive),
  }),
);

export const staffLogs = pgTable(
  'staff_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    staffId: uuid('staff_id')
      .references(() => staff.id)
      .notNull(),
    orderId: uuid('order_id')
      .references(() => orders.id, { onDelete: 'cascade' })
      .notNull(),
    previousStatus: text('previous_status').notNull(),
    newStatus: text('new_status').notNull(),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
  },
  (t) => ({
    orderIdx: index('staff_logs_order_idx').on(t.orderId),
    staffIdx: index('staff_logs_staff_idx').on(t.staffId),
  }),
);

// =============================================================================
// Relations
// =============================================================================
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  addresses: many(addresses),
  reviews: many(reviews),
  refreshTokens: many(refreshTokens),
  cartItems: many(cartItems),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  foodItems: many(foodItems),
}));

export const foodItemsRelations = relations(foodItems, ({ one, many }) => ({
  category: one(categories, {
    fields: [foodItems.categoryId],
    references: [categories.id],
  }),
  options: many(foodOptions),
  cartItems: many(cartItems),
}));

export const foodOptionsRelations = relations(foodOptions, ({ one }) => ({
  foodItem: one(foodItems, {
    fields: [foodOptions.foodItemId],
    references: [foodItems.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
  review: one(reviews, {
    fields: [orders.id],
    references: [reviews.orderId],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  foodItem: one(foodItems, {
    fields: [orderItems.foodItemId],
    references: [foodItems.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  order: one(orders, {
    fields: [reviews.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
  foodItem: one(foodItems, {
    fields: [cartItems.foodItemId],
    references: [foodItems.id],
  }),
}));

export const staffRelations = relations(staff, ({ many }) => ({
  logs: many(staffLogs),
}));

export const staffLogsRelations = relations(staffLogs, ({ one }) => ({
  staff: one(staff, {
    fields: [staffLogs.staffId],
    references: [staff.id],
  }),
  order: one(orders, {
    fields: [staffLogs.orderId],
    references: [orders.id],
  }),
}));
