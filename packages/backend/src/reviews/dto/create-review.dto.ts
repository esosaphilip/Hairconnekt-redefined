import { IsString, IsNotEmpty, IsNumber, Min, Max, MinLength, MaxLength, IsUUID } from 'class-validator';

export class CreateReviewDto {
  @IsUUID()
  @IsNotEmpty()
  bookingId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @MinLength(10, { message: 'Comment must be at least 10 characters long' })
  @MaxLength(500, { message: 'Comment must not exeed 500 characters' })
  comment: string;
}
