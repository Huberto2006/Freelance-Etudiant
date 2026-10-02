import { PartialType } from '@nestjs/swagger';
import { CreateMoyenPaiementClientDto } from './create-moyen-paiement-client.dto';

export class UpdateMoyenPaiementClientDto extends PartialType(
  CreateMoyenPaiementClientDto,
) {}
