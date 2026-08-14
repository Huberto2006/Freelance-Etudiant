import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FiltrerServicesDto {
  @ApiProperty({ required: false, description: 'Recherche par mots-cles (titre/description)' })
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
  prixMin?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  prixMax?: number;
}
