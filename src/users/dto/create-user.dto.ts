import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
    @ApiProperty({ example: 'newuser@example.com' })
    email: string;

    @ApiProperty({ example: 'John Doe' })
    name: string;

    @ApiProperty({ example: 'password123', minLength: 6 })
    password: string;

    @ApiProperty({ enum: ['customer', 'admin', 'staff'], required: false })
    role?: 'customer' | 'admin' | 'staff';
}
