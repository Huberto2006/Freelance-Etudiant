import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MethodePaiement } from '../../../common/enums/statut-transaction.enum';

export class CreerPaiementDto {
  /**
   * SOURCE DE VERITE FINANCIERE : le montant reel facture est TOUJOURS
   * `candidature.prixPropose`, recalcule cote backend depuis la candidature
   * acceptee. Ce champ n'est plus utilise pour fixer le montant : s'il est
   * fourni, il doit correspondre au prix convenu (sinon 400) ; s'il est
   * absent, le backend utilise le prix convenu. Le frontend ne peut donc
   * jamais declarer un montant superieur ou inferieur au prix accepte.
   */
  @ApiPropertyOptional({
    example: 75000,
    description:
      'Optionnel. Doit correspondre au prix convenu (candidature.prixPropose). Le montant reel applique est recalcule par le backend.',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  montant?: number;

  @ApiProperty({
    enum: MethodePaiement,
    description:
      'mvola = paiement en ligne reel (via l\'API MVola). virement = declaration manuelle d\'un transfert hors plateforme, verifiee par un administrateur. orange_money / airtel_money : indisponible (pas d\'API self-service pour Madagascar).',
  })
  @IsEnum(MethodePaiement)
  methode!: MethodePaiement;

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
   * Moyen de paiement de l'ETUDIANT beneficiaire (optionnel) : les
   * coordonnees sont copiees en snapshot dans la transaction au moment
   * de la creation. Le backend verifie que le moyen appartient bien a
   * l'etudiant de la candidature et qu'il est actif.
   */
  @ApiPropertyOptional({
    example: '018e2b4c-...',
    description:
      "Identifiant du moyen de paiement de l'etudiant beneficiaire (MVola / Orange Money / Airtel Money / compte bancaire). Verifie cote backend : propriete + actif.",
  })
  @IsOptional()
  @IsUUID()
  moyenPaiementId?: string;

  /**
   * Numero MVola du payeur. Obligatoire pour le paiement en ligne SAUF
   * si `moyenPaiementClientId` est fourni (le numero est alors repris
   * du moyen de paiement enregistre) : le backend refuse la requete si
   * ni l'un ni l'autre n'est present pour une transaction MVola (voir
   * PaiementsService.creer, RG-PAY-012).
   */
  @ApiPropertyOptional({
    example: '0341234567',
    description:
      'Numero MVola du payeur (paiement mvola uniquement). Optionnel si moyenPaiementClientId est fourni.',
  })
  @ValidateIf(
    (o) => o.methode === MethodePaiement.MVOLA && !o.moyenPaiementClientId,
  )
  @IsString()
  @Matches(/^0(34|32|33)\d{7}$/, {
    message: 'Le numero MVola doit etre au format 034XXXXXXX (ou 032/033)',
  })
  telephoneDebite?: string;

  /**
   * Moyen de paiement CLIENT enregistre a utiliser (RG-PAY-012) : si
   * fourni, son numero remplace `telephoneDebite`. Le backend verifie
   * qu'il appartient bien au client authentifie et qu'il est actif.
   */
  @ApiPropertyOptional({
    example: '018e2b4c-...',
    description:
      "Identifiant d'un moyen de paiement du client, enregistre via /moyens-paiement-client. Si absent et qu'aucun telephoneDebite n'est fourni, le moyen principal du client est utilise automatiquement.",
  })
  @IsOptional()
  @IsUUID()
  moyenPaiementClientId?: string;
}
