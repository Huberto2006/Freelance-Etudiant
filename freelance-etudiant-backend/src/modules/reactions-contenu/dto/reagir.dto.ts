import { IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TypeCibleContenu } from '../../../common/enums/type-cible-contenu.enum';
import { TypeReactionContenu } from '../entities/reaction-contenu.entity';

export class ReagirDto {
  @ApiProperty({ enum: TypeCibleContenu })
  @IsEnum(TypeCibleContenu)
  cibleType: TypeCibleContenu;

  @ApiProperty({ description: "Identifiant de la mission ou du service" })
  @IsUUID()
  cibleId: string;

  @ApiProperty({ enum: TypeReactionContenu })
  @IsEnum(TypeReactionContenu)
  type: TypeReactionContenu;
}
