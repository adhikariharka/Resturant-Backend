import { Controller, Get, Patch, Param, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { OrdersService } from '../../orders/orders.service';
import { StaffAuthGuard } from '../../auth/staff-auth.guard';
import { OrdersGateway } from '../gateway/orders.gateway';
import { StaffService } from '../../staff/staff.service';

@Controller('staff/orders')
@UseGuards(StaffAuthGuard)
export class StaffOrdersController {
    constructor(
        private ordersService: OrdersService,
        private ordersGateway: OrdersGateway,
        private staffService: StaffService,
    ) { }

    @Get()
    async getActiveOrders(@Request() req: any) {
        return this.ordersService.findActiveOrders();
    }

    @Patch(':id/status')
    async updateStatus(
        @Param('id') id: string,
        @Body('status') status: string,
        @Request() req: any,
    ) {
        const user = req.user;
        const permissions = user.permissions || [];

        // Permission Logic
        const allowed =
            (permissions.includes('kitchen') && ['confirmed', 'cooking', 'on_the_way'].includes(status)) ||
            (permissions.includes('delivery') && ['delivered'].includes(status)) ||
            user.role === 'admin';

        if (!allowed) {
            console.warn(`User ${user.email ?? user.sub} tried to set status ${status} without permission`);
            // throw new ForbiddenException('You do not have permission'); 
        }

        const prevStatus = await this.ordersService.getStatus(id);
        const order = await this.ordersService.updateStatus(id, status as any);

        this.ordersGateway.emitOrderUpdate(id, status, order);

        if (prevStatus) {
            await this.staffService.logAction({
                staffId: user.sub,
                orderId: id,
                previousStatus: prevStatus,
                newStatus: status,
            });
        }

        return order;
    }
}
