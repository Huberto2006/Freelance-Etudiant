import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  REGEX_NUMERO_MOBILE,
  TYPES_MOBILE_MONEY,
  TypeMoyenPaiement,
} from '../../moyens-paiement/enums/type-moyen-paiement.enum';

export class CreateMoyenPaiementClientDto {
  @ApiProperty({
    enum: TYPES_MOBILE_MONEY,
    example: TypeMoyenPaiement.MVOLA,
    description: 'Mobile Money uniquement (aucun prélèvement bancaire automatique possible).',
  })
  @IsIn(TYPES_MOBILE_MONEY, {
    message: "Seuls les moyens Mobile Money sont acceptés côté client (MVola, Orange Money, Airtel Money).",
  })
  type!: TypeMoyenPaiement;

  @ApiProperty({ example: '0341234567' })
  @IsString()
  @MaxLength(50)
  @Matches(REGEX_NUMERO_MOBILE, {
    message: 'Le numéro Mobile Money doit être au format malgache : 10 chiffres commençant par 03 (ex. 0341234567)',
  })
  numero!: string;

  @ApiProperty({ example: 'Rakoto Jean' })
  @IsString()
  @MaxLength(150)
  nomTitulaire!: string;

  @ApiPropertyOptional({ example: 'MVola' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  operateur?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  principal?: boolean;
}
