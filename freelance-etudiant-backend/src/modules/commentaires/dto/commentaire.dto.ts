import { IsEnum, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TypeCibleContenu } from '../../../common/enums/type-cible-contenu.enum';

export class CreerCommentaireDto {
  @ApiProperty({ example: 'Super mission, hâte de candidater !' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  contenu: string;

  @ApiProperty({ enum: TypeCibleContenu })
  @IsEnum(TypeCibleContenu)
  cibleType: TypeCibleContenu;

  @ApiProperty({ description: "Identifiant de la mission ou du service" })
  @IsUUID()
  cibleId: string;
}

export class ModifierCommentaireDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  contenu: string;
}
