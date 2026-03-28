import { Controller, Get, Post, Body, Param, UseGuards, Request, Headers } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { StaffService } from '../staff/staff.service';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
    constructor(
        private readonly ordersService: OrdersService,
        private readonly staffService: StaffService
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create order' })
    create(@Body() createOrderDto: CreateOrderDto) {
        return this.ordersService.create(createOrderDto);
    }

    @Get()
    @ApiOperation({ summary: 'List my orders' })
    findAll(@Request() req: any) {
        return this.ordersService.findAllByUser(req.user.userId);
    }

    @Get('all')
    @UseGuards(RolesGuard)
    @Roles('admin', 'staff')
    @ApiOperation({ summary: 'List all orders (Admin)' })
    findAllAdmin() {
        return this.ordersService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get order details' })
    findOne(@Param('id') id: string) {
        return this.ordersService.findOne(id);
    }
    @Post('verify-payment')
    @ApiOperation({ summary: 'Verify Stripe Payment' })
    verifyPayment(@Body() body: { sessionId: string }) {
        return this.ordersService.verifyPayment(body.sessionId);
    }

    @Post(':id/retry-payment')
    @ApiOperation({ summary: 'Retry Payment for Order' })
    retryPayment(@Param('id') id: string, @Request() req: any) {
        return this.ordersService.retryPayment(id, req.user.userId);
    }

    @Public()
    @Post('webhook')
    @ApiOperation({ summary: 'Stripe Webhook Endpoint' })
    webhook(@Headers('stripe-signature') signature: string, @Request() req: any) {
        // req.rawBody is available because we set { rawBody: true } in main.ts
        return this.ordersService.handleWebhook(signature, req.rawBody);
    }

    @Get(':id/logs')
    @UseGuards(RolesGuard)
    @Roles('admin')
    @ApiOperation({ summary: 'Get order logs (Admin)' })
    async getOrderLogs(@Param('id') id: string) {
        return this.staffService.getLogs(id);
    }
}
