import { Module } from '@nestjs/common';
import { StaffService } from './staff.service';
import { DrizzleModule } from '../drizzle/drizzle.module';
import { StaffController } from './staff.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
    imports: [
        DrizzleModule,
        JwtModule.registerAsync({
            global: false,
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get('JWT_SECRET') || 'secretKey',
                signOptions: { expiresIn: '12h' },
            }),
        }),
    ],
    controllers: [StaffController],
    providers: [StaffService],
    exports: [StaffService],
})
export class StaffModule { }
