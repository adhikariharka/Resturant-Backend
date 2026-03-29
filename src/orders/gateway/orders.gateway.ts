import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
        // Ideally, verify token here to join rooms (staff vs customer)
        // For now, simpler implementation
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    // Method to emit order updates
    emitOrderUpdate(orderId: string, status: string, order: any) {
        console.log('Emitting order_updated event:', { orderId, status });
        this.server.emit('order_updated', { orderId, status, order });
    }

    // Method to emit new orders to staff
    emitNewOrder(order: any) {
        console.log('Emitting new_order event to staff_updates room:', order.orderNumber);
        this.server.to('staff_updates').emit('new_order', order);
    }

    @SubscribeMessage('join_staff_room')
    handleJoinStaffRoom(client: Socket) {
        console.log(`Client ${client.id} joined staff_updates room`);
        client.join('staff_updates');
        return { event: 'joined_staff_room', data: 'success' };
    }
}
