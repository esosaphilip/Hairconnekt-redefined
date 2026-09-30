import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  /** Email or phone — matches DOC 08 "identifier" field */
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
