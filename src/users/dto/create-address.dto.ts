import { ApiProperty } from '@nestjs/swagger';

export class CreateAddressDto {
    @ApiProperty()
    userId: string;

    @ApiProperty()
    label: string;

    @ApiProperty()
    line1: string;

    @ApiProperty()
    line2?: string;

    @ApiProperty()
    city: string;

    @ApiProperty()
    postcode: string;

    @ApiProperty()
    isDefault?: boolean;
}
