import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FiltrerMissionsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  motsCles?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categorie?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  competence?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetMin?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetMax?: number;
}
