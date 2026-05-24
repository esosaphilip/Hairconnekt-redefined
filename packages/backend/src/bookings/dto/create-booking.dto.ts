import { IsUUID, IsArray, IsString, IsBoolean, IsOptional, Matches, MaxLength } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  providerId: string;

  @IsArray()
  @IsUUID('all', { each: true })
  serviceIds: string[];

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'scheduledDate must be in YYYY-MM-DD format' })
  scheduledDate: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'scheduledTime must be in HH:MM format' })
  scheduledTime: string;

  @IsBoolean()
  isMobile: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  clientNotes?: string;

  @IsOptional()
  @IsUUID()
  addressId?: string;
}
