import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetActifMoyenPaiementClientDto {
  @ApiProperty()
  @IsBoolean()
  actif!: boolean;
}
