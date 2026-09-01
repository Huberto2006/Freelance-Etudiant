import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMissionDto {
  @ApiProperty({ example: "Developpement d'un site vitrine" })
  @IsString()
  @MaxLength(100)
  titre: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(0)
  budget: number;

  @ApiProperty({ example: '2026-09-30', description: 'Date limite de candidature (RG3)' })
  @IsDateString()
  dateLimite: string;

  @ApiProperty({ example: 'Developpement' })
  @IsString()
  @MaxLength(50)
  categorie: string;

  @ApiProperty({ required: false, type: [String], example: ['Next.js', 'NestJS', 'PostgreSQL'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  competencesRequises?: string[];

  @ApiProperty({
    required: false,
    description: "URL de l'image principale (renvoyee par POST /uploads/document)",
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class UpdateMissionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  titre?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateLimite?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  categorie?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  competencesRequises?: string[];

  @ApiProperty({
    required: false,
    description: "URL de l'image principale (renvoyee par POST /uploads/document)",
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
