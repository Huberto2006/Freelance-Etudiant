import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Corps de POST /auth/verify-email : le jeton recu dans le lien de
 * l'email de verification (jamais son empreinte, jamais un JWT).
 */
export class VerificationEmailDto {
  @ApiProperty({
    example: '9f2c1a4e8b7d...',
    description: 'Jeton de verification recu dans le lien de l\'email',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

/**
 * Corps de POST /auth/resend-verification : uniquement l'adresse email
 * declaree a l'inscription (pas d'authentification, le compte n'est pas
 * encore utilisable).
 */
export class RenvoyerVerificationEmailDto {
  @ApiProperty({ example: 'lanja@emit.mg' })
  @IsEmail()
  email!: string;
}