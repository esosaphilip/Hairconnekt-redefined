import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ServicePriceType } from '../../entities/service.entity';

export class CreateServiceDto {
  @IsString() categoryId: string;
  @IsString() name: string;
  @IsString() @IsOptional() description?: string;
  @IsNumber() durationMin: number;
  @IsEnum(ServicePriceType) priceType: ServicePriceType;
  @IsNumber() price: number;
  @IsBoolean() @IsOptional() isActive?: boolean;
}

export class UpdateServiceDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() description?: string;
  @IsNumber() @IsOptional() durationMin?: number;
  @IsEnum(ServicePriceType) @IsOptional() priceType?: ServicePriceType;
  @IsNumber() @IsOptional() price?: number;
  @IsBoolean() @IsOptional() isActive?: boolean;
}

export class CreateTimeBlockDto {
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
  @IsBoolean() isAllDay: boolean;
  @IsString() reason: string;
  @IsString() @IsOptional() startTime?: string;
  @IsString() @IsOptional() endTime?: string;
}
