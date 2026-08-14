import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';
import { TypeClient } from '../../../common/enums/type-client.enum';

export class RegisterDto {
  @ApiProperty({ example: 'Lanja Rakoto' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nom: string;

  @ApiProperty({ example: 'lanja@emit.mg' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MotDePasse123!' })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caracteres' })
  @MaxLength(72)
  motDePasse: string;

  @ApiProperty({ enum: Role, example: Role.ETUDIANT })
  @IsEnum(Role, { message: 'Le role doit etre etudiant ou client' })
  @ValidateIf((dto) => dto.role !== Role.ADMIN)
  role: Role.ETUDIANT | Role.CLIENT;

  // Champs optionnels specifiques au profil etudiant
  @ApiProperty({ required: false, example: 'Licence 3' })
  @IsOptional()
  @IsString()
  niveauEtude?: string;

  @ApiProperty({ required: false, example: 'EMIT Fianarantsoa' })
  @IsOptional()
  @IsString()
  universite?: string;

  // Champs optionnels specifiques au profil client
  @ApiProperty({ required: false, enum: TypeClient })
  @IsOptional()
  @IsEnum(TypeClient)
  typeClient?: TypeClient;

  @ApiProperty({ required: false, example: 'CISCO Fianarantsoa' })
  @IsOptional()
  @IsString()
  nomEntreprise?: string;
}
