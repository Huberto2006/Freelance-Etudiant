import { ApiProperty } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty({ description: 'Identifiant unique de la session (UUID)' })
  id!: string;

  @ApiProperty({
    description: "Type d'appareil détecté",
    enum: ['desktop', 'mobile', 'tablette', 'inconnu'],
  })
  typeAppareil!: string;

  @ApiProperty({ description: 'Navigateur et version majeure' })
  navigateur!: string;

  @ApiProperty({ description: "Système d'exploitation" })
  systemeExploitation!: string;

  @ApiProperty({
    description: 'Adresse IP protégée / anonymisée du client',
    example: '197.149.230.***',
  })
  adresseIp!: string;

  @ApiProperty({ description: 'Date de première connexion' })
  dateCreation!: Date;

  @ApiProperty({ description: 'Date de la dernière activité enregistrée' })
  derniereActivite!: Date;

  @ApiProperty({ description: "Date d'expiration de la session" })
  dateExpiration!: Date;

  @ApiProperty({
    description: 'Indique si cette session correspond à la session actuellement utilisée',
  })
  estActuelle!: boolean;
}
