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
}
