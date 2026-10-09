import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class ChoisirRoleDto {
  @ApiProperty({ enum: [Role.ETUDIANT, Role.CLIENT], example: Role.ETUDIANT })
  // Liste blanche stricte : jamais admin, jamais a_definir.
  @IsIn([Role.ETUDIANT, Role.CLIENT], {
    message: 'Le role doit etre etudiant ou client',
  })
  role: Role.ETUDIANT | Role.CLIENT;
}
