import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
    constructor(private readonly cartService: CartService) { }

    @Get()
    @ApiOperation({ summary: 'Get user cart' })
    @ApiResponse({ status: 200, description: 'Return user cart items' })
    async getCart(@Request() req: any) {
        return this.cartService.getCart(req.user.userId);
    }

    @Post()
    @ApiOperation({ summary: 'Add item to cart' })
    @ApiResponse({ status: 201, description: 'Item added to cart' })
    async addToCart(
        @Request() req: any,
        @Body() body: { foodItemId: string; quantity?: number }
    ) {
        return this.cartService.addToCart(req.user.userId, body.foodItemId, body.quantity || 1);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update cart item quantity' })
    @ApiResponse({ status: 200, description: 'Cart item updated' })
    async updateCartItem(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { quantity: number }
    ) {
        return this.cartService.updateCartItem(req.user.userId, id, body.quantity);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Remove item from cart' })
    @ApiResponse({ status: 200, description: 'Item removed from cart' })
    async removeFromCart(@Request() req: any, @Param('id') id: string) {
        return this.cartService.removeFromCart(req.user.userId, id);
    }

    @Delete()
    @ApiOperation({ summary: 'Clear cart' })
    @ApiResponse({ status: 200, description: 'Cart cleared' })
    async clearCart(@Request() req: any) {
        return this.cartService.clearCart(req.user.userId);
    }
}
