import {
  MESSAGE_URL_DOCUMENT_UPLOAD,
  REGEX_URL_DOCUMENT_UPLOAD,
} from '../../../common/utils/upload-url.util';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';
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
  @MaxLength(5000)
  contenu: string;

  @ApiProperty({ required: false, description: 'URL du fichier joint (retournee par /uploads/document)' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Matches(REGEX_URL_DOCUMENT_UPLOAD, { message: MESSAGE_URL_DOCUMENT_UPLOAD })
  pieceJointeUrl?: string;

  @ApiProperty({ required: false, description: 'Nom original du fichier joint' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  pieceJointeNom?: string;
}
