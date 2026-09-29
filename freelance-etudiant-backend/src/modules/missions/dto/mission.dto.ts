import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { normaliserCategorie } from '../../../common/utils/categorie.util';
import {
  MESSAGE_URL_IMAGE_UPLOAD,
  REGEX_URL_IMAGE_UPLOAD,
} from '../../../common/utils/upload-url.util';

/** decimal(10,2) : au-dela, PostgreSQL leve une erreur de depassement (500). */
const MONTANT_MAX = 99_999_999;

const versCategorieNormalisee = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? normaliserCategorie(value) : value;

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
  @Max(MONTANT_MAX)
  budget: number;

  @ApiProperty({
    example: '2026-09-30',
    description: 'Date limite de candidature, incluse (RG3)',
  })
  @IsDateString()
  dateLimite: string;

  @ApiProperty({ example: 'Developpement' })
  @Transform(versCategorieNormalisee)
  @IsString()
  @MaxLength(50)
  categorie: string;

  @ApiProperty({ required: false, type: [String], example: ['Next.js', 'NestJS', 'PostgreSQL'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  competencesRequises?: string[];

  @ApiProperty({
    required: false,
    nullable: true,
    description: "URL de l'image principale (renvoyee par POST /uploads/image)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Matches(REGEX_URL_IMAGE_UPLOAD, { message: MESSAGE_URL_IMAGE_UPLOAD })
  imageUrl?: string | null;
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
  @Max(MONTANT_MAX)
  budget?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateLimite?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(versCategorieNormalisee)
  @IsString()
  @MaxLength(50)
  categorie?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  competencesRequises?: string[];

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      "URL de l'image principale (renvoyee par POST /uploads/image) ; null pour retirer l'image",
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Matches(REGEX_URL_IMAGE_UPLOAD, { message: MESSAGE_URL_IMAGE_UPLOAD })
  imageUrl?: string | null;
}
