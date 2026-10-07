import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class OcrFieldDto<T = string | string[] | null> {
  @IsOptional()
  @IsString()
  value?: T extends string[] ? never : string | null;

  @IsOptional()
  @IsIn(['high', 'medium', 'low', 'null'])
  confidence?: 'high' | 'medium' | 'low' | 'null';
}

export class OcrCvExtractionDto {
  @ApiProperty({ required: false, description: 'Texte brut OCR extrait du CV' })
  @IsOptional()
  @IsString()
  rawText?: string;

  @ApiProperty({ type: Object, required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OcrFieldDto)
  fields?: Record<string, OcrFieldDto>;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  warnings?: string[];
}
