import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/** Corps de PATCH /moyens-paiement/:id/actif. */
export class DefinirActifDto {
  @ApiProperty({
    example: false,
    description:
      "false = desactiver le moyen (RG-PAY-004 : il ne pourra plus servir a un nouveau paiement) ; true = reactiver.",
  })
  @IsBoolean()
  actif!: boolean;
}
