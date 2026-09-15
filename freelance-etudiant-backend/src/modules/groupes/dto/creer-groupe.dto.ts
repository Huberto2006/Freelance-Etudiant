import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreerGroupeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nom!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  missionId?: string;
}
