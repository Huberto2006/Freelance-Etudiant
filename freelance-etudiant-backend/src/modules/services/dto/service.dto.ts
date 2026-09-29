import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
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
const DELAI_MAX_JOURS = 365;
export const IMAGES_MAX_PAR_SERVICE = 5;

const versCategorieNormalisee = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? normaliserCategorie(value) : value;

export class CreateServiceDto {
  @ApiProperty({ example: 'Creation d\'une maquette Figma pour application mobile' })
  @IsString()
  @MaxLength(100)
  titre!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty({ example: 'Design' })
  @Transform(versCategorieNormalisee)
  @IsString()
  @MaxLength(50)
  categorie!: string;

  @ApiProperty({ example: 80000 })
  @IsNumber()
  @Min(0)
  @Max(MONTANT_MAX)
  prix!: number;

  @ApiProperty({ example: 5, description: 'Delai de realisation en jours' })
  @IsInt()
  @Min(1)
  @Max(DELAI_MAX_JOURS)
  delai!: number;

  @ApiProperty({ required: false, type: [String], example: ['Figma', 'UI/UX'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  competences?: string[];

  @ApiProperty({ required: false, type: [String], description: 'Images (5 max, la premiere est la couverture)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(IMAGES_MAX_PAR_SERVICE)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  @Matches(REGEX_URL_IMAGE_UPLOAD, {
    each: true,
    message: MESSAGE_URL_IMAGE_UPLOAD,
  })
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
  @Transform(versCategorieNormalisee)
  @IsString()
  @MaxLength(50)
  categorie?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(MONTANT_MAX)
  prix?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(DELAI_MAX_JOURS)
  delai?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  competences?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(IMAGES_MAX_PAR_SERVICE)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  @Matches(REGEX_URL_IMAGE_UPLOAD, {
    each: true,
    message: MESSAGE_URL_IMAGE_UPLOAD,
  })
  imagesUrls?: string[];

  @ApiProperty({ required: false, description: 'RG10 : disponibilite du service' })
  @IsOptional()
  @IsBoolean()
  disponible?: boolean;
}
