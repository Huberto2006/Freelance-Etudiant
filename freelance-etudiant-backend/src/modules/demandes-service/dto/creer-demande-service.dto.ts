import { IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreerDemandeServiceDto {
  @ApiProperty({
    example:
      "Nous avons besoin d'un site vitrine de 5 pages (accueil, a propos, services, portfolio, contact), responsive, avec un formulaire de contact relie par email...",
    description: 'Cahier des charges : contexte, livrables attendus, contraintes du projet',
  })
  @IsString()
  @MinLength(20, {
    message: 'Merci de detailler votre besoin (20 caracteres minimum)',
  })
  cahierDesCharges: string;

  @ApiProperty({
    required: false,
    example: 250000,
    description: "Budget propose (par defaut : prix affiche du service)",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetPropose?: number;

  @ApiProperty({
    required: false,
    example: 10,
    description: "Delai souhaite en jours (par defaut : delai affiche du service)",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  delaiSouhaite?: number;

  @ApiProperty({ required: false, description: 'URL du fichier joint (retournee par /uploads/document)' })
  @IsOptional()
  @IsString()
  pieceJointeUrl?: string;

  @ApiProperty({ required: false, description: 'Nom original du fichier joint' })
  @IsOptional()
  @IsString()
  pieceJointeNom?: string;
}
