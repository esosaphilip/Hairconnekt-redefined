import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';

export class RescheduleBookingDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'scheduledDate must be in YYYY-MM-DD format' })
  scheduledDate: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'scheduledTime must be in HH:MM format' })
  scheduledTime: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  reason?: string;
}
