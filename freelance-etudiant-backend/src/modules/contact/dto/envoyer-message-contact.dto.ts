import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnvoyerMessageContactDto {
  @ApiProperty({ example: 'Lanja Rakoto' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nom: string;

  @ApiProperty({ example: 'lanja@exemple.mg' })
  @IsEmail()
  @MaxLength(150)
  email: string;

  @ApiProperty({ example: 'Question sur un paiement' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  sujet: string;

  @ApiProperty({ minLength: 10, maxLength: 3000 })
  @IsString()
  @MinLength(10, {
    message: 'Le message doit contenir au moins 10 caracteres',
  })
  @MaxLength(3000)
  message: string;

  /**
   * Champ piege (honeypot) : invisible pour un humain, rempli par les
   * robots. Quand il est renseigne, le message est ignore sans erreur.
   */
  @ApiProperty({ required: false, description: 'Doit rester vide' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  siteWeb?: string;
}
