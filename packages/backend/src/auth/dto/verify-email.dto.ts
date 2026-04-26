import { IsString, Length, Matches } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'OTP muss genau 6 Ziffern enthalten.' })
  otp: string;
}

