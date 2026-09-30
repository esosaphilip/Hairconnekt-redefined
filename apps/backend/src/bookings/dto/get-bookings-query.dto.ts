import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class GetBookingsQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  today?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Monat muss im JJJJ-MM-Format sein, z.B. 2026-09.' })
  month?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  @Max(50)
  limit?: number;
}
