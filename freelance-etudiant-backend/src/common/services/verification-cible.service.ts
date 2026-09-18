import { Injectable, NotFoundException } from '@nestjs/common';

import { MissionsService } from '../../modules/missions/missions.service';
import { ServicesService } from '../../modules/services/services.service';
import { UsersService } from '../../modules/users/users.service';

import { TypeCibleContenu } from '../enums/type-cible-contenu.enum';
import { TypeCibleFavori } from '../enums/type-cible-favori.enum';
import { Role } from '../enums/role.enum';

/**
 * Union des types de cibles polymorphes du systeme :
 * - commentaires / reactions de contenu -> TypeCibleContenu (mission, service) ;
 * - favoris -> TypeCibleFavori (mission, service, etudiant).
 */
export type TypeCible = TypeCibleContenu | TypeCibleFavori;

/**
 * RG-068 — Integrite des cibles polymorphes.
 *
 * Les commentaires, reactions de contenu et favoris stockent un couple
 * (cible_type, cible_id) sans cle etrangere directe (impossible proprement
 * avec une cible polymorphe). Ce service centralise la verification
 * applicative :
 *   - la cible existe reellement (mission, service ou etudiant) ;
 *   - le type est autorise ;
 *   - les exceptions HTTP du projet (404) sont utilisees.
 *
 * Il est appele AVANT toute ecriture (creation, mise a jour de type de
 * reaction). Le retrait d'un enregistrement (favori retire, reaction
 * basculee) reste TOUJOURS possible meme si la cible a disparu entre-temps,
 * afin de ne jamais pieger des enregistrements orphelins dans la base.
 */
@Injectable()
export class VerificationCibleService {
  constructor(
    private readonly missionsService: MissionsService,
    private readonly servicesService: ServicesService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Garantit que (cibleType, cibleId) designe une cible existante du type
   * indique. Leve une NotFoundException (404) sinon.
   */
  async assertCibleExistante(
    cibleType: TypeCible,
    cibleId: string,
  ): Promise<void> {
    switch (cibleType) {
      case TypeCibleContenu.MISSION:
      case TypeCibleFavori.MISSION: {
        // MissionsService.findOne leve deja une 404 si la mission
        // n'existe pas.
        await this.missionsService.findOne(cibleId);
        return;
      }

      case TypeCibleContenu.SERVICE:
      case TypeCibleFavori.SERVICE: {
        await this.servicesService.findOne(cibleId);
        return;
      }

      case TypeCibleFavori.ETUDIANT: {
        const utilisateur =
          await this.usersService.findByIdOrFail(cibleId);

        // Un favori de type "etudiant" doit designer un compte etudiant
        // (page publique /etudiants/:id) : on refuse client/admin.
        if (utilisateur.role !== Role.ETUDIANT) {
          throw new NotFoundException(
            'Cible introuvable : cet utilisateur n\'est pas un etudiant.',
          );
        }
        return;
      }

      default:
        throw new NotFoundException(
          'Type de cible non supporte.',
        );
    }
  }
}
