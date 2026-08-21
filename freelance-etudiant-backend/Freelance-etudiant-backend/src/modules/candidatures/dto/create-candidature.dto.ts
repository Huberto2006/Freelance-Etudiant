import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCandidatureDto {
  @ApiProperty({ example: 75000 })
  @IsNumber()
  @Min(0)
  prixPropose: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  delaiPropose: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  message?: string;
}
