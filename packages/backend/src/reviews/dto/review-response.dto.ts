import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ReviewResponseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  response: string;
}
