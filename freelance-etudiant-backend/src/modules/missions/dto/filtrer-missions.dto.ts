import { IsInt, IsOptional, IsString, IsNumber, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { normaliserCategorie } from '../../../common/utils/categorie.util';

export class FiltrerMissionsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  motsCles?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? normaliserCategorie(value) : value,
  )
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

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, default: 100, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limite?: number;
}
