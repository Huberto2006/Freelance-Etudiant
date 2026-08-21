import { IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MethodePaiement } from '../../../common/enums/statut-transaction.enum';

export class CreerPaiementDto {
  @ApiProperty({ example: 75000 })
  @IsNumber()
  @Min(0)
  montant: number;

  @ApiProperty({ enum: MethodePaiement })
  @IsEnum(MethodePaiement)
  methode: MethodePaiement;

  @ApiProperty({ example: 'MV240815.1234.A56789', description: 'Reference du transfert mobile money' })
  @IsString()
  @IsNotEmpty()
  reference: string;
}
