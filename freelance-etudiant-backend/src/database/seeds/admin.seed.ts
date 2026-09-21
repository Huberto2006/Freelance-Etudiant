import * as bcrypt from 'bcrypt';
import { Role } from '../../common/enums/role.enum';
import { UsersService } from '../../modules/users/users.service';

const BCRYPT_ROUNDS = 12;

export interface AdminSeedResult {
  email: string;
  created: boolean;
}

/**
 * Crée le compte administrateur configuré ou le remet dans un état utilisable.
 * Cette opération est idempotente et peut être exécutée à chaque démarrage.
 */
export async function seedAdmin(
  usersService: UsersService,
): Promise<AdminSeedResult> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email) {
    throw new Error('ADMIN_EMAIL est requis pour créer le compte admin.');
  }

  if (!password || password.length < 12) {
    throw new Error(
      'ADMIN_PASSWORD est requis et doit contenir au moins 12 caractères.',
    );
  }

  const motDePasseHache = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const adminExistant = await usersService.findByEmail(email);

  if (!adminExistant) {
    await usersService.create({
      nom: 'Administrateur Kianja',
      email,
      motDePasse: motDePasseHache,
      role: Role.ADMIN,
      emailVerifie: true,
      estActif: true,
      estSuspendu: false,
    });

    return { email, created: true };
  }

  adminExistant.motDePasse = motDePasseHache;
  adminExistant.role = Role.ADMIN;
  adminExistant.emailVerifie = true;
  adminExistant.estActif = true;
  adminExistant.estSuspendu = false;
  await usersService.save(adminExistant);

  return { email, created: false };
}
