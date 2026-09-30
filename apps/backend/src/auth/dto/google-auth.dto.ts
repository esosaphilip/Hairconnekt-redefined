import { IsString, IsNotEmpty } from 'class-validator';

export class GoogleAuthDto {
  @IsString()
  @IsNotEmpty()
  idToken: string; // Firebase/Google ID token from mobile Google Sign-In
}
