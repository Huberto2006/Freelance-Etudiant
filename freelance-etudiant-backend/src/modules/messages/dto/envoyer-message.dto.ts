import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnvoyerMessageDto {
  @ApiProperty()
  @IsUUID()
  destinataireId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  contenu: string;

  @ApiProperty({ required: false, description: 'Mission servant de contexte a la conversation' })
  @IsOptional()
  @IsUUID()
  missionId?: string;

  @ApiProperty({ required: false, description: 'URL du fichier joint (retournee par /uploads/document)' })
  @IsOptional()
  @IsString()
  pieceJointeUrl?: string;

  @ApiProperty({ required: false, description: 'Nom original du fichier joint' })
  @IsOptional()
  @IsString()
  pieceJointeNom?: string;
}
