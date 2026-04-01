import { Module, Global } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [PaymentsService],
    exports: [PaymentsService],
})
export class PaymentsModule { }
