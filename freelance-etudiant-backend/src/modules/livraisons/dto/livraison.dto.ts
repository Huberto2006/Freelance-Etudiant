import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Piece jointe d'une livraison "Fichiers". L'URL est celle retournee par
 * POST /uploads/document (chemin relatif, ex. /uploads/documents/xxx.zip) :
 * le fichier est deja stocke par le module Uploads, ici on ne fait que
 * rattacher ses metadonnees a la livraison.
 */
export class PieceJointeLivraisonDto {
  @ApiProperty({ example: '/uploads/documents/abc123.zip' })
  @IsString()
  @MaxLength(500)
  url: string;

  @ApiProperty({ example: 'projet-final.zip' })
  @IsString()
  @MaxLength(255)
  nom: string;

  @ApiProperty({ required: false, example: 1048576 })
  @IsOptional()
  @IsInt()
  @Min(0)
  tailleOctets?: number;
}

export class CreerLivraisonDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  fichierUrl?: string;

  @ApiProperty({
    required: false,
    description:
      'URL du depot (GitHub/GitLab) du livrable. Doit etre une URL http(s) valide.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^https?:\/\/[^\s]+$/i, {
    message: 'Le lien du livrable doit être une URL valide.',
  })
  lienLivrable?: string;

  @ApiProperty({ required: false, enum: ['github', 'gitlab'] })
  @IsOptional()
  @IsString()
  @Matches(/^(github|gitlab)$/i, {
    message: 'La plateforme doit être GitHub ou GitLab.',
  })
  plateforme?: 'github' | 'gitlab';

  @ApiProperty({ required: false, example: 'main' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  branche?: string;

  @ApiProperty({
    required: false,
    type: [PieceJointeLivraisonDto],
    description:
      'Pieces jointes d une livraison par fichiers (retours de POST /uploads/document).',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: 'Maximum 10 pièces jointes par livraison.' })
  @ValidateNested({ each: true })
  @Type(() => PieceJointeLivraisonDto)
  piecesJointes?: PieceJointeLivraisonDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  commentaireLivraison?: string;
}

export class DemanderCorrectionDto {
  @ApiProperty()
  @IsString()
  commentaireCorrection: string;
}
