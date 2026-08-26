import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TypeClient } from '../../../common/enums/type-client.enum';

export class UpdateClientProfileDto {
  @ApiProperty({ required: false, enum: TypeClient })
  @IsOptional()
  @IsEnum(TypeClient)
  typeClient?: TypeClient;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nomEntreprise?: string;
}
