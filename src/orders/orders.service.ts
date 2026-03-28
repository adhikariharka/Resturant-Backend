
import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { DRIZZLE } from '../drizzle/drizzle.module';
import type { DrizzleDB } from '../drizzle/types';
import { orders, orderItems, foodItems, cartItems } from '../drizzle/schema';
import { eq, desc, and, lt, notInArray } from 'drizzle-orm';
import { CreateOrderDto } from './dto/create-order.dto';
import { HoursService } from '../admin/hours.service';
import { SettingsService } from '../admin/settings.service';
import { PaymentsService } from '../payments/payments.service';
import { OrdersGateway } from './gateway/orders.gateway';

@Injectable()
export class OrdersService {
    constructor(
        @Inject(DRIZZLE) private db: DrizzleDB,
        private hoursService: HoursService,
        private settingsService: SettingsService,
        private paymentsService: PaymentsService,
        private ordersGateway: OrdersGateway
    ) { }

    async create(createOrderDto: CreateOrderDto) {
        // 0. Check Store Status
        const status = await this.hoursService.getCurrentStatus();
        if (!status.isOpen) {
            throw new BadRequestException(status.message || 'Restaurant is currently closed.');
        }

        const result = await this.db.transaction(async (tx) => {
            // 1. Fetch Cart Items from DB (Source of Truth)
            const userCartItems = await tx.query.cartItems.findMany({
                where: eq(cartItems.userId, createOrderDto.userId),
                with: {
                    foodItem: true
                }
            });

            if (!userCartItems || userCartItems.length === 0) {
                throw new BadRequestException("Cannot place order: Cart is empty");
            }

            // 2. Calculate Totals
            let subtotal = 0;
            const orderItemsData = [];

            for (const cartItem of userCartItems) {
                if (!cartItem.foodItem) continue;

                // Use discount price if available
                const price = cartItem.foodItem.discountPrice || cartItem.foodItem.price;
                const lineTotal = price * cartItem.quantity;
                subtotal += lineTotal;

                orderItemsData.push({
                    foodItemId: cartItem.foodItemId,
                    quantity: cartItem.quantity,
                    priceAtOrder: price,
                    selectedOptions: [],
                    foodItem: cartItem.foodItem // Pass full object for metadata if needed
                });
            }

            // Get Settings from DB
            const settings = await this.settingsService.getSettings();
            const taxRate = settings.taxRate || 0.20;
            const serviceChargeRate = settings.serviceCharge || 0.10;

            const tax = subtotal * taxRate;
            const serviceCharge = subtotal * serviceChargeRate;
            const deliveryFee = 3.5; // TODO: Delivery fee logic/settings
            const total = subtotal + tax + serviceCharge + deliveryFee;

            // Determine initial status
            const initialStatus = createOrderDto.paymentMethod === 'card' ? 'pending_payment' : 'confirmed';

            // 3. Create Order
            const [order] = await tx.insert(orders).values({
                orderNumber: `ORD-${Date.now()}`,
                userId: createOrderDto.userId,
                status: initialStatus,
                subtotal: subtotal,
                tax: tax,
                serviceCharge: serviceCharge,
                total: total,
                deliveryAddress: createOrderDto.deliveryAddress,
                paymentMethod: createOrderDto.paymentMethod,
            }).returning();

            // 4. Create Order Items
            for (const item of orderItemsData) {
                await tx.insert(orderItems).values({
                    orderId: order.id,
                    foodItemId: item.foodItemId,
                    quantity: item.quantity,
                    selectedOptions: item.selectedOptions,
                    priceAtOrder: item.priceAtOrder
                });
            }

            // 5. Clear Cart for cash payments
            if (createOrderDto.paymentMethod !== 'card') {
                await tx.delete(cartItems).where(eq(cartItems.userId, createOrderDto.userId));
            }

            // 6. Handle Stripe Logic
            let checkoutUrl = null;
            if (createOrderDto.paymentMethod === 'card') {
                const session = await this.paymentsService.createCheckoutSession(order, orderItemsData);
                checkoutUrl = session.url;
            }

            return {
                order,
                checkoutUrl
            };
        });

        // Emit new_order event AFTER transaction commits (for cash orders)
        if (createOrderDto.paymentMethod === 'cash') {
            console.log('Cash order created, fetching full order details:', result.order.id);
            const fullOrder = await this.findOne(result.order.id);
            console.log('Emitting new_order for cash order:', fullOrder?.orderNumber);
            if (fullOrder) {
                this.ordersGateway.emitNewOrder(fullOrder);
            }
        }

        return {
            ...result.order,
            checkoutUrl: result.checkoutUrl
        };
    }

    async findAllByUser(userId: string) {
        // Auto-cancel expired pending card orders (older than 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        await this.db.update(orders)
            .set({ status: 'cancelled' })
            .where(and(
                eq(orders.userId, userId),
                eq(orders.status, 'pending_payment'),
                eq(orders.paymentMethod, 'card'),
                lt(orders.createdAt, fiveMinutesAgo)
            ));

        return this.db.query.orders.findMany({
            where: eq(orders.userId, userId),
            orderBy: [desc(orders.createdAt)],
            with: {
                items: {
                    with: {
                        foodItem: true
                    }
                },
                user: true
            }
        });
    }

    async findAll() {
        return this.db.query.orders.findMany({
            orderBy: [desc(orders.createdAt)],
            with: {
                items: {
                    with: {
                        foodItem: true
                    }
                },
                user: true
            }
        });
    }

    async findOne(id: string) {
        return this.db.query.orders.findFirst({
            where: eq(orders.id, id),
            with: {
                items: {
                    with: {
                        foodItem: true
                    }
                },
            },
        });
    }

    async verifyPayment(sessionId: string) {
        const session = await this.paymentsService.verifySession(sessionId);

        if (session.payment_status === 'paid') {
            return this.fulfillOrder(session);
        }
        return { success: false };
    }

    async handleWebhook(signature: string, payload: Buffer) {
        try {
            const event = this.paymentsService.constructEventFromPayload(signature, payload);

            switch (event.type) {
                case 'checkout.session.completed':
                    const session = event.data.object as any;
                    await this.fulfillOrder(session);
                    break;
                case 'payment_intent.payment_failed':
                case 'payment_intent.canceled':
                    const paymentIntent = event.data.object as any;
                    await this.cancelOrder(paymentIntent);
                    break;
                default:
                    console.log(`Unhandled event type ${event.type}`);
            }

            return { received: true };
        } catch (err: any) {
            console.error(`Webhook Error: ${err.message}`);
            throw new BadRequestException(`Webhook Error: ${err.message}`);
        }
    }

    private async cancelOrder(paymentObject: any) {
        const orderId = paymentObject.metadata?.orderId;
        if (orderId) {
            await this.db.update(orders)
                .set({ status: 'cancelled' })
                .where(eq(orders.id, orderId));
        }
    }

    private async fulfillOrder(session: any) {
        const orderId = session.metadata?.orderId;
        const userId = session.metadata?.userId;

        if (orderId) {
            await this.db.transaction(async (tx) => {
                // Check if already confirmed to avoid redundant updates?
                // For now, idempotent update is fine.
                await tx.update(orders)
                    .set({ status: 'confirmed' })
                    .where(eq(orders.id, orderId));

                if (userId) {
                    await tx.delete(cartItems).where(eq(cartItems.userId, userId));
                }
            });

            // Emit new order event for card payments after confirmation
            console.log('Card order confirmed, fetching full order details:', orderId);
            const fullOrder = await this.findOne(orderId);
            console.log('Emitting new_order for card order:', fullOrder?.orderNumber);
            this.ordersGateway.emitNewOrder(fullOrder);

            return { success: true, orderId };
        }
        return { success: false };
    }
    async retryPayment(orderId: string, userId: string) {
        const order = await this.db.query.orders.findFirst({
            where: eq(orders.id, orderId),
            with: {
                items: {
                    with: {
                        foodItem: true
                    }
                }
            }
        });

        if (!order) {
            throw new BadRequestException('Order not found');
        }

        if (order.userId !== userId) {
            throw new BadRequestException('Unauthorized access to order');
        }

        if (order.status !== 'pending_payment' && order.status !== 'cancelled') {
            throw new BadRequestException('Order is already paid or in a state that cannot be repaid');
        }

        // Reconstruct items for Stripe Session
        const orderItemsData = order.items.map(item => ({
            foodItem: item.foodItem,
            quantity: item.quantity,
            priceAtOrder: item.priceAtOrder, // Use original price or fetch current? Using original for consistency.
        }));

        const session = await this.paymentsService.createCheckoutSession(order, orderItemsData);

        return { checkoutUrl: session.url };
    }
    async findActiveOrders() {
        return this.db.query.orders.findMany({
            where: notInArray(orders.status, ['delivered', 'cancelled']),
            orderBy: [desc(orders.createdAt)],
            with: {
                items: {
                    with: {
                        foodItem: true
                    }
                },
                user: true
            }
        });
    }

    async updateStatus(id: string, status: typeof orders.$inferSelect.status) {
        const [updatedOrder] = await this.db.update(orders)
            .set({ status })
            .where(eq(orders.id, id))
            .returning();
        return updatedOrder;
    }

    async getStatus(id: string) {
        const order = await this.db.query.orders.findFirst({
            where: eq(orders.id, id),
            columns: { status: true }
        });
        return order?.status;
    }
}
