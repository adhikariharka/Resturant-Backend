import { pgTable, text, uuid, pgEnum, boolean, integer, timestamp, doublePrecision, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const roleEnum = pgEnum('role', ['customer', 'admin', 'staff']);
export const orderStatusEnum = pgEnum('order_status', ['pending_payment', 'placed', 'confirmed', 'cooking', 'on_the_way', 'delivered', 'cancelled']);
export const paymentMethodEnum = pgEnum('payment_method', ['card', 'cash']);

// Users
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique().notNull(),
  password: text('password').notNull(), // Hashed password
  name: text('name').notNull(),
  role: roleEnum('role').default('customer').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  resetToken: text('reset_token'), // For password reset
  resetTokenExpiry: timestamp('reset_token_expiry'), // Expiry time
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').notNull(), // Hashed
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const addresses = pgTable('addresses', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  label: text('label').notNull(), // e.g., "Home", "Work"
  line1: text('line1').notNull(),
  line2: text('line2'),
  city: text('city').notNull(),
  postcode: text('postcode').notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
});

// Menu
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  image: text('image'),
});

export const foodItems = pgTable('food_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  description: text('description').notNull(),
  price: doublePrecision('price').notNull(),
  discountPrice: doublePrecision('discount_price'),
  image: text('image').notNull(),
  categoryId: uuid('category_id').references(() => categories.id).notNull(),
  isAvailable: boolean('is_available').default(true).notNull(),
  isPopular: boolean('is_popular').default(false).notNull(),
  quantity: integer('quantity').default(0).notNull(), // Stock management
  tags: jsonb('tags').$type<string[]>().default([]).notNull(), // Item tags
});

export const foodOptions = pgTable('food_options', {
  id: uuid('id').defaultRandom().primaryKey(),
  foodItemId: uuid('food_item_id').references(() => foodItems.id).notNull(),
  name: text('name').notNull(), // e.g., "Size", "Spiciness"
  choices: jsonb('choices').notNull(), // Array of { id, name, priceModifier }
});

// Orders
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderNumber: text('order_number').unique().notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  status: orderStatusEnum('status').default('placed').notNull(),
  subtotal: doublePrecision('subtotal').notNull(),
  tax: doublePrecision('tax').notNull(),
  serviceCharge: doublePrecision('service_charge').notNull(),
  total: doublePrecision('total').notNull(),
  deliveryAddress: jsonb('delivery_address').notNull(), // Snapshot of address
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  estimatedDelivery: timestamp('estimated_delivery'),
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  foodItemId: uuid('food_item_id').references(() => foodItems.id).notNull(),
  quantity: integer('quantity').notNull(),
  selectedOptions: jsonb('selected_options'), // Array of selected choices
  priceAtOrder: doublePrecision('price_at_order').notNull(), // Snapshot of price
});

// Reviews
export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id).unique().notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  isApproved: boolean('is_approved').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// App Config
export const openingHours = pgTable('opening_hours', {
  id: uuid('id').defaultRandom().primaryKey(),
  day: text('day').notNull(), // Monday, Tuesday...
  dayOrder: integer('day_order').notNull(), // 1=Monday, 7=Sunday
  openTime: text('open_time').notNull(),
  closeTime: text('close_time').notNull(),
  isClosed: boolean('is_closed').default(false).notNull(),
  timezone: text('timezone').default('Europe/London').notNull(),
});

export const holidays = pgTable('holidays', {
  id: uuid('id').defaultRandom().primaryKey(),
  date: text('date').notNull().unique(), // ISO date string (YYYY-MM-DD)
  name: text('name').notNull(), // e.g., "Christmas Day", "New Year"
  message: text('message').notNull(), // Custom closure message
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const restaurantSettings = pgTable('restaurant_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  taxRate: doublePrecision('tax_rate').default(0.20).notNull(), // 20% VAT
  serviceCharge: doublePrecision('service_charge').default(0.10).notNull(), // 10% service charge
  isTemporaryClosed: boolean('is_temporary_closed').default(false).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const contactInfo = pgTable('contact_info', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantName: text('restaurant_name').default('The Kitchen').notNull(),
  email: text('email').default('hello@thekitchen.com').notNull(),
  phone: text('phone').default('+44 20 1234 5678').notNull(),
  address: text('address').default('123 High Street, London').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Cart
export const cartItems = pgTable('cart_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  foodItemId: uuid('food_item_id').references(() => foodItems.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  selectedOptions: jsonb('selected_options'), // For future customization
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
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

// Staff
export const staff = pgTable('staff', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: text('username').unique().notNull(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  role: roleEnum('role').default('staff').notNull(),
  permissions: jsonb('permissions').$type<string[]>().default([]).notNull(), // e.g. ['kitchen', 'delivery']
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const staffLogs = pgTable('staff_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  staffId: uuid('staff_id').references(() => staff.id).notNull(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  previousStatus: text('previous_status').notNull(),
  newStatus: text('new_status').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// Staff Relations
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
