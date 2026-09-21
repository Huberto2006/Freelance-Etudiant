import { PartialType } from '@nestjs/swagger';
import { CreateMoyenPaiementDto } from './create-moyen-paiement.dto';

/**
 * Mise a jour partielle d'un moyen de paiement (tous les champs du DTO
 * de creation deviennent optionnels, y compris le type). Le service
 * re-valide l'etat FINAL fusionne : RG-PAY-005 (nomBanque requis pour
 * une banque), RG-PAY-006 (format malgache pour un numero Mobile
 * Money) et RG-PAY-003/008 (unicite du principal, cascade automatique).
 */
export class UpdateMoyenPaiementDto extends PartialType(
  CreateMoyenPaiementDto,
) {}
