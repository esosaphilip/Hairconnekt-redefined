import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';

export class CancelBookingDto {
  @IsString()
  @IsIn(['Andere Pläne', 'Krank', 'Notfall', 'Anbieter abgesagt', 'Sonstiges'])
  reason: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
