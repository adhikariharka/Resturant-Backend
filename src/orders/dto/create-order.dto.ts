import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderItemDto {
    @ApiProperty({ example: 'food-item-uuid' })
    foodItemId: string;

    @ApiProperty({ example: 2 })
    quantity: number;

    @ApiProperty({ required: false, example: [] })
    selectedOptions?: any[];
}

export class CreateOrderDto {
    @ApiProperty({ example: 'user-uuid' })
    userId: string;

    @ApiProperty({ type: [CreateOrderItemDto] })
    items: CreateOrderItemDto[];

    @ApiProperty({ example: { street: '123 Main St', city: 'London' } })
    deliveryAddress: any;

    @ApiProperty({ enum: ['card', 'cash'], example: 'card' })
    paymentMethod: 'card' | 'cash';

    @ApiProperty({ example: 25.50 })
    subtotal: number;

    @ApiProperty({ example: 2.50 })
    tax: number;

    @ApiProperty({ example: 1.50 })
    serviceCharge: number;

    @ApiProperty({ example: 29.50 })
    total: number;
}
