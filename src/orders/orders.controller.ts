import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    Headers,
    NotFoundException,
    Param,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
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
    @ApiOperation({ summary: 'Create order — order is placed for the authenticated user' })
    create(@Body() createOrderDto: CreateOrderDto, @Request() req: any) {
        // Always tie the order to the authenticated user. Ignore any userId in the body.
        return this.ordersService.create({ ...createOrderDto, userId: req.user.userId });
    }

    @Get()
    @ApiOperation({ summary: 'List my orders' })
    findAll(@Request() req: any) {
        return this.ordersService.findAllByUser(req.user.userId);
    }

    @Get('all')
    @UseGuards(RolesGuard)
    @Roles('admin', 'staff')
    @ApiOperation({ summary: 'List all orders (admin/staff)' })
    findAllAdmin() {
        return this.ordersService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get order details (owner or admin/staff)' })
    async findOne(@Param('id') id: string, @Request() req: any) {
        const order = await this.ordersService.findOne(id);
        if (!order) throw new NotFoundException('Order not found.');
        const isPrivileged = req.user.role === 'admin' || req.user.role === 'staff';
        if (!isPrivileged && order.userId !== req.user.userId) {
            throw new ForbiddenException('You cannot view this order.');
        }
        return order;
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
