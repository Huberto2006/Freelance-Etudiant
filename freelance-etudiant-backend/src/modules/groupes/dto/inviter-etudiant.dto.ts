import {
  IsNotEmpty,
  IsUUID,
} from 'class-validator';

export class InviterEtudiantDto {
  @IsUUID()
  @IsNotEmpty()
  etudiantId!: string;
}