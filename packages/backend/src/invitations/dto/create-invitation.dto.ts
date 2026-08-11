import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateInvitationDto {
  @IsEmail()
  @MaxLength(255)
  email: string;
}

export class AcceptInvitationDto {
  @IsString()
  @MinLength(8)
  password: string;
}
