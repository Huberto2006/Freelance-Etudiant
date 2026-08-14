import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEvaluationDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1, { message: 'RG6 : la note doit etre comprise entre 1 et 5' })
  @Max(5, { message: 'RG6 : la note doit etre comprise entre 1 et 5' })
  note: number;

  @ApiProperty({ required: false, example: 'Tres bon travail et livraison rapide' })
  @IsOptional()
  @IsString()
  commentaire?: string;
}
