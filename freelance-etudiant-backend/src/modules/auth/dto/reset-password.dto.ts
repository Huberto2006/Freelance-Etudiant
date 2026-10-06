import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'lanja@emit.mg' })
  @IsEmail()
  @MaxLength(150)
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Jeton recu par email' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  token: string;

  @ApiProperty({ example: 'NouveauMotDePasse123!' })
  @IsString()
  @MinLength(8)
  // bcrypt ignore tout au-dela de 72 octets ; borne aussi le cout de hash.
  @MaxLength(72)
  nouveauMotDePasse: string;
}
