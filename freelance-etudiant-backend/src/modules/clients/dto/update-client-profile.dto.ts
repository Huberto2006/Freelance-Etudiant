import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TypeClient } from '../../../common/enums/type-client.enum';

/*
 * Validations transverses des nouveaux champs de profil client.
 * Toutes les proprietes restent @IsOptional : le questionnaire enregistre
 * le profil progressivement, etape par etape (aucune obligation d'envoyer
 * le profil complet en une seule requete).
 */
const TELEPHONE_REGEX = /^\+?[0-9][0-9\s.-]{6,18}[0-9]$/;
// IsUrl avec require_tld:false reste tolerant : on impose en plus un
// prefixe http(s) explicite.
const URL_PROTOCOL_REGEX = /^https?:\/\//i;

export class UpdateClientProfileDto {
  @ApiProperty({ required: false, enum: TypeClient })
  @IsOptional()
  @IsEnum(TypeClient)
  typeClient?: TypeClient;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nomEntreprise?: string;

  // ==========================================================
  // Nouveaux champs (questionnaire profil progressif)
  // ==========================================================

  @ApiProperty({ required: false, example: 'Commerce' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  secteurActivite?: string;

  @ApiProperty({ required: false, example: 'Presentation de mon entreprise...' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ required: false, example: 'Fianarantsoa' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ville?: string;

  @ApiProperty({ required: false, example: '+261 34 12 345 67' })
  @IsOptional()
  @Matches(TELEPHONE_REGEX, {
    message: 'Le numero de telephone est invalide',
  })
  telephone?: string;

  @ApiProperty({ required: false, example: 'https://monsite.mg' })
  @IsOptional()
  @Matches(URL_PROTOCOL_REGEX, {
    message: "L'URL doit commencer par http:// ou https://",
  })
  @IsUrl({ protocols: ['http', 'https'], require_tld: false }, {
    message: "L'URL du site web doit etre une URL http(s) valide",
  })
  siteWeb?: string;

  @ApiProperty({ required: false, example: 100000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMin?: number;

  @ApiProperty({ required: false, example: 500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMax?: number;

  @ApiProperty({ required: false, type: [String], example: ['Site vitrine', 'Application mobile'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  typesProjets?: string[];

  @ApiProperty({ required: false, type: [String], example: ['Developpement web', 'Design'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  besoinsFreelance?: string[];

  @ApiProperty({ required: false, example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  nombreProjets?: number;
}
