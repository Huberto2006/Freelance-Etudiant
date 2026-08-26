import { IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TypeCibleFavori } from '../../../common/enums/type-cible-favori.enum';

export class ToggleFavoriDto {
  @ApiProperty({ enum: TypeCibleFavori })
  @IsEnum(TypeCibleFavori)
  cibleType: TypeCibleFavori;

  @ApiProperty({ description: "Identifiant de la mission, du service ou de l'etudiant" })
  @IsUUID()
  cibleId: string;
}
