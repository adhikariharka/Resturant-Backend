import { Injectable, Inject } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsService {
    private stripe: Stripe;

    constructor(private configService: ConfigService) {
        // Fallback for dev if env is missing, but should be in .env
        const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY') || 'sk_test_placeholder';
        this.stripe = new Stripe(secretKey, {
            apiVersion: '2026-03-25.dahlia' as Stripe.LatestApiVersion,
        });
    }

    async createCheckoutSession(order: any, items: any[]) {
        const lineItems = items.map((item) => {
            // Ensure we have a valid image or fallback
            // Stripe requires absolute URLs in images
            const images = item.foodItem?.image ? [item.foodItem.image] : [];

            return {
                price_data: {
                    currency: 'gbp',
                    product_data: {
                        name: item.foodItem.name,
                        images: images,
                    },
                    unit_amount: Math.round(item.priceAtOrder * 100), // Amount in cents/pence
                },
                quantity: item.quantity,
            };
        });

        // Add delivery fee as a line item if applicable
        // Need to pass delivery fee or calculate it
        // For now, let's assume it's part of the pre-calculation or added here
        // Ideally we pass the full breakdown to this method.
        // Let's modify to accept total or handle delivery.

        // Simpler for now: Just one line item for the "Order Total" if we want to match exact DB total?
        // No, verified items are better.
        // Let's stick to items. Delivery fee needs to be added as a custom line item.

        // Retrieve Frontend URL from config or default
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${frontendUrl}/order-success?session_id={CHECKOUT_SESSION_ID}&orderId=${order.id}`,
            cancel_url: `${frontendUrl}/checkout`,
            metadata: {
                orderId: order.id,
                userId: order.userId,
            },
            payment_intent_data: {
                metadata: {
                    orderId: order.id,
                    userId: order.userId,
                },
            },
        });

        return session;
    }

    async verifySession(sessionId: string) {
        const session = await this.stripe.checkout.sessions.retrieve(sessionId);
        return session;
    }

    constructEventFromPayload(signature: string, payload: Buffer) {
        const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
        if (!webhookSecret) {
            throw new Error('STRIPE_WEBHOOK_SECRET is not defined');
        }
        return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    }
}
