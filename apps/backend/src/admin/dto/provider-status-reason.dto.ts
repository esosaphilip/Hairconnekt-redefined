import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ProviderStatusReasonDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

