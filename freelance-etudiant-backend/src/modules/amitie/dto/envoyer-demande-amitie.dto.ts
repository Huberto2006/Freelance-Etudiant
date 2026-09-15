import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

/**
 * Corps de la requête POST /amities/demandes.
 * Le demandeur est toujours l'utilisateur connecté (jamais dans le body).
 */
export class EnvoyerDemandeAmitieDto {
  @ApiProperty({
    description:
      "Identifiant (utilisateur) de l'étudiant destinataire de la demande d'amitié",
  })
  @IsUUID()
  @IsNotEmpty()
  etudiantId!: string;
}
