import { IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreerLivraisonDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fichierUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lienLivrable?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  commentaireLivraison?: string;
}

export class DemanderCorrectionDto {
  @ApiProperty()
  @IsString()
  commentaireCorrection: string;
}
