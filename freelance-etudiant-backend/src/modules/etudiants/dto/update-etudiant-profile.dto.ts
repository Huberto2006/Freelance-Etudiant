import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

/*
 * Validations transverses des nouveaux champs de profil etudiant.
 * - Toutes les proprietes restent @IsOptional : le questionnaire
 *   enregistre le profil progressivement, champ par champ.
 * - Les URLs sont validees avec require_tld: false pour tolerer les
 *   environnements locaux/dev tout en imposant http(s).
 * - Le telephone accepte les formats internationaux et locaux (+261 34 ...,
 *   034 ..., espaces/tirets toleres).
 */
const TELEPHONE_REGEX = /^\+?[0-9][0-9\s.-]{6,18}[0-9]$/;
const ANNEE_ETUDE_REGEX = /^(L1|L2|L3|M1|M2|D1|D2|D3|[1-7]|1re|2e|3e)$/i;
/*
 * IsUrl avec require_tld:false reste trop tolerant (il accepte une chaine
 * sans protocole). On impose en plus un prefixe http(s) explicite.
 */
const URL_PROTOCOL_REGEX = /^https?:\/\//i;

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

  @ApiProperty({
    required: false,
    description: "URL de la photo de profil de l'étudiant",
    example: "https://example.com/photo.jpg",
  })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiProperty({
    required: false,
    type: [String],
    description: "Liens vers les portfolios de l'étudiant",
    example: [
      "https://monportfolio.com",
      "https://github.com/monprofil",
    ],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  portfolioUrls?: string[];

  // ==========================================================
  // Nouveaux champs (questionnaire profil progressif)
  // ==========================================================

  @ApiProperty({ required: false, example: 'Informatique' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  filiere?: string;

  @ApiProperty({ required: false, example: 'L3', description: "Année d'étude (L1-L3, M1-M2, D1-D3 ou 1-7)" })
  @IsOptional()
  @Matches(ANNEE_ETUDE_REGEX, {
    message: "L'annee d'etude doit etre L1-L3, M1-M2, D1-D3 ou un chiffre de 1 a 7",
  })
  anneeEtude?: string;

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

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialites?: string[];

  @ApiProperty({ required: false, example: 2, description: "Experience en annees" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  experience?: number;

  @ApiProperty({ required: false, example: 'Temps partiel' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  typeFreelance?: string;

  @ApiProperty({ required: false, example: 'disponible' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  statutDisponibilite?: string;

  @ApiProperty({ required: false, example: 15000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tarifMinimum?: number;

  @ApiProperty({ required: false, example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tarifMaximum?: number;

  @ApiProperty({ required: false, example: 'https://github.com/monprofil' })
  @IsOptional()
  @Matches(URL_PROTOCOL_REGEX, {
    message: "L'URL doit commencer par http:// ou https:/",
  })
  @IsUrl({ protocols: ['http', 'https'], require_tld: false }, {
    message: "L'URL GitHub doit etre une URL http(s) valide",
  })
  githubUrl?: string;

  @ApiProperty({ required: false, example: 'https://gitlab.com/monprofil' })
  @IsOptional()
  @Matches(URL_PROTOCOL_REGEX, {
    message: "L'URL doit commencer par http:// ou https:/",
  })
  @IsUrl({ protocols: ['http', 'https'], require_tld: false }, {
    message: "L'URL GitLab doit etre une URL http(s) valide",
  })
  gitlabUrl?: string;

  @ApiProperty({ required: false, example: 'https://linkedin.com/in/monprofil' })
  @IsOptional()
  @Matches(URL_PROTOCOL_REGEX, {
    message: "L'URL doit commencer par http:// ou https:/",
  })
  @IsUrl({ protocols: ['http', 'https'], require_tld: false }, {
    message: "L'URL LinkedIn doit etre une URL http(s) valide",
  })
  linkedinUrl?: string;

  @ApiProperty({ required: false, example: 'https://monsite.mg' })
  @IsOptional()
  @Matches(URL_PROTOCOL_REGEX, {
    message: "L'URL doit commencer par http:// ou https:/",
  })
  @IsUrl({ protocols: ['http', 'https'], require_tld: false }, {
    message: "L'URL du site web doit etre une URL http(s) valide",
  })
  siteWeb?: string;
}