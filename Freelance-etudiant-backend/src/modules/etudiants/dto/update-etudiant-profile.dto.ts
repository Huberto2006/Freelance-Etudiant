import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateEtudiantProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  niveauEtude?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  universite?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  competences?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  langues?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tarifHoraire?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  disponibilite?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  portfolioUrls?: string[];
}
