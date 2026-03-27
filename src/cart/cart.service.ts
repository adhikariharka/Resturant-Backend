import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE } from '../drizzle/drizzle.module';
import type { DrizzleDB } from '../drizzle/types';
import { cartItems, foodItems } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class CartService {
    constructor(@Inject(DRIZZLE) private db: DrizzleDB) { }

    async getCart(userId: string) {
        const items = await this.db.query.cartItems.findMany({
            where: eq(cartItems.userId, userId),
            with: {
                foodItem: {
                    with: {
                        category: true,
                    },
                },
            },
        });

        return items;
    }

    async addToCart(userId: string, foodItemId: string, quantity: number = 1) {
        // Check if food item exists and is available
        const foodItem = await this.db.query.foodItems.findFirst({
            where: eq(foodItems.id, foodItemId),
        });

        if (!foodItem) {
            throw new NotFoundException('Food item not found');
        }

        if (!foodItem.isAvailable) {
            throw new BadRequestException('Food item is not available');
        }

        // Check if item already exists in cart
        const existingCartItem = await this.db.query.cartItems.findFirst({
            where: and(
                eq(cartItems.userId, userId),
                eq(cartItems.foodItemId, foodItemId)
            ),
        });

        if (existingCartItem) {
            // Update quantity
            const [updated] = await this.db
                .update(cartItems)
                .set({
                    quantity: existingCartItem.quantity + quantity,
                    updatedAt: new Date(),
                })
                .where(eq(cartItems.id, existingCartItem.id))
                .returning();

            return updated;
        } else {
            // Add new item
            const [newItem] = await this.db
                .insert(cartItems)
                .values({
                    userId,
                    foodItemId,
                    quantity,
                })
                .returning();

            return newItem;
        }
    }

    async updateCartItem(userId: string, cartItemId: string, quantity: number) {
        if (quantity <= 0) {
            // Remove item if quantity is 0 or less
            return this.removeFromCart(userId, cartItemId);
        }

        const [updated] = await this.db
            .update(cartItems)
            .set({
                quantity,
                updatedAt: new Date(),
            })
            .where(and(
                eq(cartItems.id, cartItemId),
                eq(cartItems.userId, userId)
            ))
            .returning();

        if (!updated) {
            throw new NotFoundException('Cart item not found');
        }

        return updated;
    }

    async removeFromCart(userId: string, cartItemId: string) {
        const [deleted] = await this.db
            .delete(cartItems)
            .where(and(
                eq(cartItems.id, cartItemId),
                eq(cartItems.userId, userId)
            ))
            .returning();

        if (!deleted) {
            throw new NotFoundException('Cart item not found');
        }

        return { message: 'Item removed from cart' };
    }

    async clearCart(userId: string) {
        await this.db
            .delete(cartItems)
            .where(eq(cartItems.userId, userId));

        return { message: 'Cart cleared' };
    }
}
