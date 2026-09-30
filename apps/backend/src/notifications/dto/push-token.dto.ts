import { IsNotEmpty, IsString } from 'class-validator';

export class PushTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

