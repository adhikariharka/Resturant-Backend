CREATE TYPE "public"."day_of_week" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'failed', 'refunded');--> statement-breakpoint
ALTER TABLE "addresses" DROP CONSTRAINT "addresses_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "food_options" DROP CONSTRAINT "food_options_food_item_id_food_items_id_fk";
--> statement-breakpoint
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_order_id_orders_id_fk";
--> statement-breakpoint
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_order_id_orders_id_fk";
--> statement-breakpoint
ALTER TABLE "staff_logs" DROP CONSTRAINT "staff_logs_order_id_orders_id_fk";
--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "country" text DEFAULT 'United Kingdom' NOT NULL;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "instructions" text;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "display_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_info" ADD COLUMN "tagline" text;--> statement-breakpoint
ALTER TABLE "contact_info" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "contact_info" ADD COLUMN "logo" text;--> statement-breakpoint
ALTER TABLE "contact_info" ADD COLUMN "facebook" text;--> statement-breakpoint
ALTER TABLE "contact_info" ADD COLUMN "instagram" text;--> statement-breakpoint
ALTER TABLE "contact_info" ADD COLUMN "twitter" text;--> statement-breakpoint
ALTER TABLE "contact_info" ADD COLUMN "whatsapp" text;--> statement-breakpoint
ALTER TABLE "food_items" ADD COLUMN "preparation_time" integer DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE "food_items" ADD COLUMN "calories" integer;--> statement-breakpoint
ALTER TABLE "food_items" ADD COLUMN "spicy_level" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "food_items" ADD COLUMN "allergens" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "food_items" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "food_items" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "food_options" ADD COLUMN "is_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "food_options" ADD COLUMN "allow_multiple" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "food_options" ADD COLUMN "display_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "item_name" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "item_image" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_status" "payment_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_fee" double precision DEFAULT 3.5 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "stripe_session_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurant_settings" ADD COLUMN "delivery_fee" double precision DEFAULT 3.5 NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurant_settings" ADD COLUMN "free_delivery_threshold" double precision DEFAULT 40 NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurant_settings" ADD COLUMN "min_order_amount" double precision DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurant_settings" ADD COLUMN "currency" text DEFAULT 'GBP' NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "admin_response" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_options" ADD CONSTRAINT "food_options_food_item_id_food_items_id_fk" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_logs" ADD CONSTRAINT "staff_logs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addresses_user_idx" ON "addresses" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_user_item_unique" ON "cart_items" USING btree ("user_id","food_item_id");--> statement-breakpoint
CREATE INDEX "cart_user_idx" ON "cart_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "categories_active_idx" ON "categories" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "categories_order_idx" ON "categories" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "food_items_category_idx" ON "food_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "food_items_available_idx" ON "food_items" USING btree ("is_available");--> statement-breakpoint
CREATE INDEX "food_items_popular_idx" ON "food_items" USING btree ("is_popular");--> statement-breakpoint
CREATE INDEX "food_options_item_idx" ON "food_options" USING btree ("food_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "opening_hours_day_order_idx" ON "opening_hours" USING btree ("day_order");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_food_idx" ON "order_items" USING btree ("food_item_id");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_payment_status_idx" ON "orders" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reviews_user_idx" ON "reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reviews_approved_idx" ON "reviews" USING btree ("is_approved");--> statement-breakpoint
CREATE INDEX "staff_active_idx" ON "staff" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "staff_logs_order_idx" ON "staff_logs" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "staff_logs_staff_idx" ON "staff_logs" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");