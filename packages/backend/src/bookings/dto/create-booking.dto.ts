import { IsUUID, IsArray, IsString, IsBoolean, IsOptional, ValidateNested, Matches } from 'class-validator';

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
  clientNotes?: string;

  @IsString()
  @IsOptional()
  addressId?: string;
}
