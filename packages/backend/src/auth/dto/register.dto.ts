import {
  IsEmail, IsEnum, IsOptional, IsString,
  Matches, MinLength, MaxLength, IsBoolean, Equals
} from 'class-validator';
import { UserRole } from '../../entities/user.entity';

export class RegisterDto {
  @IsString()
  @MaxLength(50)
  firstName: string;

  @IsString()
  @MaxLength(50)
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'Telefonnummer muss im E.164-Format sein, z.B. +49170...' })
  phone?: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsBoolean()
  @Equals(true, { message: 'Terms and conditions must be accepted' })
  acceptedTerms: boolean;
}
