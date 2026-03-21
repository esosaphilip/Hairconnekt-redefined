import { IsDateString, IsString, IsOptional, MaxLength, Matches } from 'class-validator';

export class RescheduleBookingDto {
  @IsDateString()
  scheduledDate: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):?([0-5]\d)$/, { message: 'Time must be in HH:mm format' })
  scheduledTime: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  reason?: string;
}
