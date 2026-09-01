import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MethodePaiement } from '../../../common/enums/statut-transaction.enum';

export class CreerPaiementDto {
  @ApiProperty({ example: 75000 })
  @IsNumber()
  @Min(1)
  montant: number;

  @ApiProperty({
    enum: MethodePaiement,
    description:
      'mvola = paiement en ligne reel (via l\'API MVola). virement = declaration manuelle d\'un transfert hors plateforme, verifiee par un administrateur. orange_money / airtel_money : indisponible (pas d\'API self-service pour Madagascar).',
  })
  @IsEnum(MethodePaiement)
  methode: MethodePaiement;

  /**
   * Reference du transfert : obligatoire pour une declaration manuelle
   * (virement), generee par le backend pour MVola.
   */
  @ApiPropertyOptional({
    example: 'MV240815.1234.A56789',
    description: 'Reference du transfert (virement uniquement)',
  })
  @ValidateIf((o) => o.methode === MethodePaiement.VIREMENT)
  @IsString()
  @IsNotEmpty()
  reference?: string;

  /**
   * Numero MVola du payeur : obligatoire pour le paiement en ligne
   * (le debit sera demande sur ce numero via l'API MVola).
   */
  @ApiPropertyOptional({
    example: '0341234567',
    description: 'Numero MVola du payeur (paiement mvola uniquement)',
  })
  @ValidateIf((o) => o.methode === MethodePaiement.MVOLA)
  @IsString()
  @Matches(/^0(34|32|33)\d{7}$/, {
    message: 'Le numero MVola doit etre au format 034XXXXXXX (ou 032/033)',
  })
  telephoneDebite?: string;
}
