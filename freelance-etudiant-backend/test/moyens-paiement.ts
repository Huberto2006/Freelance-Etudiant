/**
 * ============================================================
 * TESTS DES REGLES METIER "MOYENS DE PAIEMENT" (Kianja, RG-PAY)
 * ============================================================
 *
 * Aucun framework de test n'est configure dans ce projet : ce script
 * autonome (ts-node) instancie les services reels avec des dependances
 * simulees (repositories/services en memoire) et execute les scenarios
 * exiges :
 *   - CRUD des moyens de paiement ;
 *   - securite (RG-PAY-002/009 : un etudiant ne touche pas a ceux d'un
 *     autre ; le client non proprietaire ne voit jamais les coordonnees) ;
 *   - principal (RG-PAY-003/008 : unicite, cascade, inactif refuse) ;
 *   - paiement (RG-PAY-004/010 : inactif inutilisable, snapshot
 *     conserve apres modification du moyen, autorisation par
 *     livraison validee).
 *
 * Execution :
 *   npx ts-node -r tsconfig-paths/register test/moyens-paiement.ts
 */
// reflect-metadata doit etre charge avant les entites/services :
// leurs decorateurs (@Entity, @Injectable, colonnes TypeORM)
// s'appuient sur les metadonnees Reflect.
import 'reflect-metadata';

import { QueryFailedError, Repository } from 'typeorm';

import { MoyenPaiement } from '../src/modules/moyens-paiement/entities/moyen-paiement.entity';
import { Transaction } from '../src/modules/paiements/entities/transaction.entity';
import { Livraison } from '../src/modules/livraisons/entities/livraison.entity';
import { Candidature } from '../src/modules/candidatures/entities/candidature.entity';
import { Mission } from '../src/modules/missions/entities/mission.entity';

import { MoyensPaiementService } from '../src/modules/moyens-paiement/moyens-paiement.service';
import { PaiementsService } from '../src/modules/paiements/paiements.service';
import { CandidaturesService } from '../src/modules/candidatures/candidatures.service';
import { MissionsService } from '../src/modules/missions/missions.service';
import { CreateMoyenPaiementDto } from '../src/modules/moyens-paiement/dto/create-moyen-paiement.dto';
import { UpdateMoyenPaiementDto } from '../src/modules/moyens-paiement/dto/update-moyen-paiement.dto';
import { CreerPaiementDto } from '../src/modules/paiements/dto/creer-paiement.dto';
import { DataSource } from 'typeorm';

import { TypeMoyenPaiement } from '../src/modules/moyens-paiement/enums/type-moyen-paiement.enum';
import { StatutLivraison } from '../src/common/enums/statut-livraison.enum';
import { MethodePaiement } from '../src/common/enums/statut-transaction.enum';

// Dependances simulees : "import type" est efface a la compilation,
// aucune vraie classe (SMTP, MVola) n'est chargee.
import type { NotificationsService } from '../src/modules/notifications/notifications.service';
import type { EmailService } from '../src/modules/email/email.service';
import type { UsersService } from '../src/modules/users/users.service';
import type { MvolaService } from '../src/modules/paiements/mvola.service';

// ============================================================
// OUTILS
// ============================================================

let echecs = 0;
let reussites = 0;

function verifier(nom: string, condition: boolean, detail?: string): void {
  if (condition) {
    reussites++;
    console.log(`  [OK] ${nom}`);
  } else {
    echecs++;
    console.error(`  [ECHEC] ${nom}${detail ? ' — ' + detail : ''}`);
  }
}

async function attendreErreur(
  nom: string,
  promesse: Promise<unknown>,
  statutAttendu: number,
  messageAttendu?: string,
): Promise<void> {
  try {
    await (await promesse);
    verifier(nom, false, 'aucune erreur levee alors qu un refus etait attendu');
  } catch (erreur) {
    const statut =
      typeof (erreur as { getStatus?: () => number }).getStatus === 'function'
        ? (erreur as { getStatus: () => number }).getStatus()
        : undefined;
    const message = (erreur as Error).message ?? '';
    verifier(
      nom,
      statut === statutAttendu,
      `statut recu ${statut}, message "${message}"`,
    );
    if (messageAttendu) {
      verifier(
        `${nom} (message metier)`,
        message.includes(messageAttendu),
        `message recu : "${message}"`,
      );
    }
  }
}

/** Fabrique une erreur "foreign key violation" comme le driver pg. */
function erreurFk(): QueryFailedError {
  const erreur = new QueryFailedError(
    'DELETE FROM moyens_paiement',
    [],
    new Error('violates foreign key constraint'),
  );
  (erreur as unknown as { code: string }).code = '23503';
  return erreur;
}
