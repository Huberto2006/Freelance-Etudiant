import { IsEnum, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CibleSignalement } from '../../../common/enums/statut-signalement.enum';

export class CreateSignalementDto {
  @ApiProperty({ example: 'Contenu inapproprie' })
  @IsString()
  @MaxLength(100)
  motif: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: CibleSignalement })
  @IsEnum(CibleSignalement)
  cibleType: CibleSignalement;

  @ApiProperty({ description: "Identifiant de l'utilisateur, du service ou de la mission signale" })
  @IsUUID()
  cibleId: string;
}

export class TraiterSignalementDto {
  @ApiProperty({ example: 'Compte suspendu suite a verification' })
  @IsString()
  @IsNotEmpty()
  resolution: string;
}
