import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LANGUES_SUPPORTEES, Langue } from '../../../common/i18n/langues';

export class ModifierLangueDto {
  @ApiProperty({ enum: LANGUES_SUPPORTEES, example: 'mg' })
  @IsIn(LANGUES_SUPPORTEES, { message: 'La langue doit etre fr, mg ou en' })
  langue: Langue;
}
