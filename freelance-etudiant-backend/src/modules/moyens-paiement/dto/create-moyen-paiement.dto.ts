import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TypeMoyenPaiement,
} from '../enums/type-moyen-paiement.enum';

export class CreateMoyenPaiementDto {
  @ApiProperty({
    enum: TypeMoyenPaiement,
    description:
      "Type de moyen : MVOLA, ORANGE_MONEY, AIRTEL_MONEY ou BANQUE. Pour un compte bancaire, nomBanque devient obligatoire (RG-PAY-005).",
  })
  @IsEnum(TypeMoyenPaiement)
  type!: TypeMoyenPaiement;

  /**
   * Numero Mobile Money (RG-PAY-006 : obligatoire pour un paiement
   * mobile) ou numero de compte bancaire. Le format malgache des
   * numeros Mobile Money est verifie par le service (conditionnel au
   * type, `@ValidateIf` ne pouvant cibler qu'un seul validateur).
   */
  @ApiProperty({ example: '0341234567' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  numero!: string;

  /** RG-PAY-007 : le nom du titulaire est obligatoire. */
  @ApiProperty({ example: 'Nom etudiant' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nomTitulaire!: string;

  @ApiPropertyOptional({ example: 'BNI' })
  @ValidateIf((o) => o.type === TypeMoyenPaiement.BANQUE)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nomBanque?: string;

  @ApiPropertyOptional({ example: 'MVola' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  operateur?: string;

  /** RG-PAY-003/008 : l'unicite du principal est geree par le service. */
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  principal?: boolean;
}
