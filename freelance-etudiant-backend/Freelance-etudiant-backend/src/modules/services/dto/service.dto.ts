import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateServiceDto {
  @ApiProperty({ example: 'Creation d\'une maquette Figma pour application mobile' })
  @IsString()
  @MaxLength(100)
  titre: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ example: 'Design' })
  @IsString()
  @MaxLength(50)
  categorie: string;

  @ApiProperty({ example: 80000 })
  @IsNumber()
  @Min(0)
  prix: number;

  @ApiProperty({ example: 5, description: 'Delai de realisation en jours' })
  @IsInt()
  @Min(1)
  delai: number;

  @ApiProperty({ required: false, type: [String], example: ['Figma', 'UI/UX'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  competences?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imagesUrls?: string[];
}

export class UpdateServiceDto {
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
  @IsString()
  @MaxLength(50)
  categorie?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  prix?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  delai?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  competences?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imagesUrls?: string[];

  @ApiProperty({ required: false, description: 'RG10 : disponibilite du service' })
  @IsOptional()
  @IsBoolean()
  disponible?: boolean;
}
