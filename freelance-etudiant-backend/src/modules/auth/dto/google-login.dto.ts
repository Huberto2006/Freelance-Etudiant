import { IsJWT, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Jeton d'identite Google (JWT signe) recu par le navigateur. */
export class GoogleIdTokenDto {
  @ApiProperty({ description: "Jeton d'identite Google (credential GIS)" })
  @IsString()
  @IsJWT()
  @MaxLength(4096)
  idToken: string;
}
