import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ServicePriceType } from '../../entities/service.entity';

export class CreateServiceDto {
  @IsUUID()
  categoryId: string;

  @IsString()
  @MaxLength(120)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(5)
  @Max(1440)
  durationMin: number;

  @IsEnum(ServicePriceType)
  priceType: ServicePriceType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  price: number;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateServiceDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @IsOptional()
  @Min(5)
  @Max(1440)
  durationMin?: number;

  @IsEnum(ServicePriceType)
  @IsOptional()
  priceType?: ServicePriceType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Max(100000)
  price?: number;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateTimeBlockDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @Type(() => Boolean)
  @IsBoolean()
  isAllDay: boolean;

  @IsString()
  @MaxLength(200)
  reason: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime must be in HH:MM format',
  })
  startTime?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'endTime must be in HH:MM format',
  })
  endTime?: string;
}
