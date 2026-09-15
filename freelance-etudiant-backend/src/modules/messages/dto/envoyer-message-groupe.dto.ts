import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Envoi d'un message a un groupe.
 *
 * Le groupeId vient du parametre de route
 * (POST /messages/groupes/:groupeId) et volontairement PAS du body.
 * L'expediteur est l'utilisateur authentifie.
 */
export class EnvoyerMessageGroupeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  contenu: string;

  @ApiProperty({ required: false, description: 'URL du fichier joint (retournee par /uploads/document)' })
  @IsOptional()
  @IsString()
  pieceJointeUrl?: string;

  @ApiProperty({ required: false, description: 'Nom original du fichier joint' })
  @IsOptional()
  @IsString()
  pieceJointeNom?: string;
}
