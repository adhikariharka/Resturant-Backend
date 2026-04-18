import { IsEmail, IsString, MinLength } from 'class-validator';

export class StaffLoginDto {
    @IsEmail({}, { message: 'A valid email is required.' })
    email: string;

    @IsString()
    @MinLength(6)
    password: string;
}
