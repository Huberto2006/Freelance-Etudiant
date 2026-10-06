import {
  MESSAGE_URL_DOCUMENT_UPLOAD,
  REGEX_URL_DOCUMENT_UPLOAD,
} from '../../../common/utils/upload-url.util';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnvoyerMessageDto {
  @ApiProperty()
  @IsUUID()
  destinataireId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  contenu: string;

  @ApiProperty({ required: false, description: 'Mission servant de contexte a la conversation' })
  @IsOptional()
  @IsUUID()
  missionId?: string;

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
