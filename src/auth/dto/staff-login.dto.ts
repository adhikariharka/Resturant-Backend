import { IsString, MinLength } from 'class-validator';

export class StaffLoginDto {
    @IsString()
    username: string;

    @IsString()
    @MinLength(6)
    password: string;
}
