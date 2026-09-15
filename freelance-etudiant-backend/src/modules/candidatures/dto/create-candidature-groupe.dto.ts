import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCandidatureGroupeDto {
  @ApiProperty({
    description: 'Prix proposé par le groupe',
    example: 150000,
  })
  @IsNumber()
  @Min(0)
  prixPropose!: number;

  @ApiProperty({
    description: 'Délai proposé en jours',
    example: 7,
  })
  @IsNumber()
  @Min(1)
  delaiJours!: number;

  @ApiPropertyOptional({
    description: 'Message accompagnant la candidature',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message?: string;
}
