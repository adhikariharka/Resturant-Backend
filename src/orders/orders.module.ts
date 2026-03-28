import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { AdminModule } from '../admin/admin.module';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { OrdersGateway } from './gateway/orders.gateway';
import { StaffOrdersController } from './controllers/staff-orders.controller';
import { StaffModule } from '../staff/staff.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
    imports: [
        DrizzleModule,
        AdminModule,
        StaffModule,
        JwtModule.registerAsync({
            global: false,
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get('JWT_SECRET') || 'secretKey',
                signOptions: { expiresIn: '12h' },
            }),
        }),
    ],
    controllers: [OrdersController, StaffOrdersController],
    providers: [OrdersService, OrdersGateway],
    exports: [OrdersService], // Export if needed elsewhere
})
export class OrdersModule { }
