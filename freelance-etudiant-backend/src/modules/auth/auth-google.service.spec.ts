import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthService } from './auth.service';
import { AuthProvider } from '../../common/enums/auth-provider.enum';
import { Role } from '../../common/enums/role.enum';
import { ChoisirRoleDto } from './dto/choisir-role.dto';
import { GoogleIdTokenDto } from './dto/google-login.dto';
import { RegisterDto } from './dto/register.dto';

const IDENTITE = { sub: 'google-sub-1', email: 'lanja@exemple.mg', nom: 'Lanja' };

function utilisateur(surcharges: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    email: 'lanja@exemple.mg',
    role: Role.ETUDIANT,
    estActif: true,
    estSuspendu: false,
    googleId: null,
    ...surcharges,
  };
}

function creer() {
  const users = {
    findByGoogleId: jest.fn(),
    findByEmailInsensible: jest.fn(),
    create: jest.fn(),
    save: jest.fn(async (u) => u),
    findByIdOrFail: jest.fn(),
    marquerPremiereConnexion: jest.fn().mockResolvedValue(true),
    definirRoleInitial: jest.fn(),
  };
  const jwt = {
    sign: jest.fn(() => 'jwt-signe'),
    decode: jest.fn(() => ({ exp: 2_000_000_000 })),
  };
  const config = {
    get: jest.fn(() => undefined),
    getOrThrow: jest.fn(() => 'secret-refresh'),
  };
  const refreshRepo = {
    insert: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    update: jest.fn(),
    findOne: jest.fn(),
  };
  const google = { verifier: jest.fn().mockResolvedValue(IDENTITE) };
  const service = new AuthService(
    users as never,
    jwt as never,
    config as never,
    {} as never,
    google as never,
    refreshRepo as never,
  );
  return { service, users, jwt, refreshRepo, google };
}

describe('AuthService - Google', () => {
  describe('loginAvecGoogle', () => {
    it('connecte le compte deja lie a ce sub, sans rien creer', async () => {
      const { service, users, refreshRepo } = creer();
      users.findByGoogleId.mockResolvedValue(utilisateur({ googleId: 'google-sub-1' }));

      const session = await service.loginAvecGoogle('id-token');

      expect(users.create).not.toHaveBeenCalled();
      expect(users.findByEmailInsensible).not.toHaveBeenCalled();
      expect(session.utilisateur).toEqual({
        id: 'u1',
        email: 'lanja@exemple.mg',
        role: Role.ETUDIANT,
      });
      // Meme mecanisme de session que la connexion classique : refresh
      // token enregistre en base (revocable / rotatif).
      expect(refreshRepo.insert).toHaveBeenCalledTimes(1);
      expect(session.accessToken).toBe('jwt-signe');
    });

    it('cree un compte A_DEFINIR depuis l\'identite VERIFIEE uniquement', async () => {
      const { service, users } = creer();
      users.findByGoogleId.mockResolvedValue(null);
      users.findByEmailInsensible.mockResolvedValue(null);
      // La base applique les valeurs par defaut (est_actif = true, etc.).
      users.create.mockImplementation(async (d) => ({
        id: 'nouveau',
        estActif: true,
        estSuspendu: false,
        ...d,
      }));

      const session = await service.loginAvecGoogle('id-token');

      const donnees = users.create.mock.calls[0][0];
      expect(donnees).toMatchObject({
        email: 'lanja@exemple.mg',
        nom: 'Lanja',
        role: Role.A_DEFINIR,
        emailVerifie: true,
        authProvider: AuthProvider.GOOGLE,
        googleId: 'google-sub-1',
      });
      expect(donnees.role).not.toBe(Role.ADMIN);
      // Mot de passe : hash bcrypt d'un secret aleatoire, jamais utilisable.
      expect(donnees.motDePasse).toMatch(/^\$2[aby]\$/);
      expect(session.utilisateur.role).toBe(Role.A_DEFINIR);
    }, 20_000);

    it('email deja utilise par un compte classique : 409, aucun doublon, aucune liaison', async () => {
      const { service, users } = creer();
      const existant = utilisateur();
      users.findByGoogleId.mockResolvedValue(null);
      users.findByEmailInsensible.mockResolvedValue(existant);

      await expect(service.loginAvecGoogle('id-token')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(users.create).not.toHaveBeenCalled();
      expect(users.save).not.toHaveBeenCalled();
      expect(existant.googleId).toBeNull();
    });

    it('jeton Google invalide : rejet avant tout acces aux comptes', async () => {
      const { service, users, google } = creer();
      google.verifier.mockRejectedValue(new UnauthorizedException('invalide'));

      await expect(service.loginAvecGoogle('x')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(users.findByGoogleId).not.toHaveBeenCalled();
      expect(users.create).not.toHaveBeenCalled();
    });

    it('compte suspendu ou desactive : refuse, aucune session', async () => {
      for (const etat of [{ estSuspendu: true }, { estActif: false }]) {
        const { service, users, refreshRepo } = creer();
        users.findByGoogleId.mockResolvedValue(utilisateur(etat));
        await expect(service.loginAvecGoogle('x')).rejects.toBeInstanceOf(
          UnauthorizedException,
        );
        expect(refreshRepo.insert).not.toHaveBeenCalled();
      }
    });

    it('creation concurrente (unicite en base) : reprend le compte gagnant', async () => {
      const { service, users } = creer();
      users.findByGoogleId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(utilisateur({ googleId: 'google-sub-1' }));
      users.findByEmailInsensible.mockResolvedValue(null);
      users.create.mockRejectedValue(
        Object.assign(new QueryFailedError('INSERT', [], new Error('dup')), {
          code: '23505',
        }),
      );

      const session = await service.loginAvecGoogle('x');
      expect(session.utilisateur.id).toBe('u1');
    }, 20_000);
  });

  describe('lierGoogle (liaison explicite)', () => {
    it('lie le compte quand l\'email Google correspond', async () => {
      const { service, users } = creer();
      const cible = utilisateur();
      users.findByIdOrFail.mockResolvedValue(cible);
      users.findByGoogleId.mockResolvedValue(null);

      await service.lierGoogle('u1', 'id-token');
      expect(cible.googleId).toBe('google-sub-1');
      expect(users.save).toHaveBeenCalledWith(cible);
    });

    it('refuse si l\'email Google differe de celui du compte', async () => {
      const { service, users, google } = creer();
      users.findByIdOrFail.mockResolvedValue(utilisateur());
      google.verifier.mockResolvedValue({ ...IDENTITE, email: 'autre@exemple.mg' });

      await expect(service.lierGoogle('u1', 'x')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(users.save).not.toHaveBeenCalled();
    });

    it('refuse si le compte a deja un Google lie', async () => {
      const { service, users, google } = creer();
      users.findByIdOrFail.mockResolvedValue(utilisateur({ googleId: 'deja' }));
      await expect(service.lierGoogle('u1', 'x')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(google.verifier).not.toHaveBeenCalled();
    });

    it('refuse si ce compte Google appartient a un autre compte Kianja', async () => {
      const { service, users } = creer();
      users.findByIdOrFail.mockResolvedValue(utilisateur());
      users.findByGoogleId.mockResolvedValue(utilisateur({ id: 'u2' }));
      await expect(service.lierGoogle('u1', 'x')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(users.save).not.toHaveBeenCalled();
    });
  });

  describe('choisirRole', () => {
    it('emet une nouvelle session portant le role choisi', async () => {
      const { service, users, jwt } = creer();
      users.definirRoleInitial.mockResolvedValue(true);
      users.findByIdOrFail.mockResolvedValue(utilisateur({ role: Role.CLIENT }));

      const session = await service.choisirRole('u1', { role: Role.CLIENT });
      expect(users.definirRoleInitial).toHaveBeenCalledWith('u1', Role.CLIENT);
      expect(session.utilisateur.role).toBe(Role.CLIENT);
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.CLIENT, typ: 'access' }),
        expect.anything(),
      );
    });

    it('refuse (409) si le role est deja defini : un compte existant ne change jamais de role', async () => {
      const { service, users, refreshRepo } = creer();
      users.definirRoleInitial.mockResolvedValue(false);
      await expect(
        service.choisirRole('u1', { role: Role.CLIENT }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(refreshRepo.insert).not.toHaveBeenCalled();
    });
  });
});

describe('DTO - liste blanche des roles et du jeton', () => {
  it('ChoisirRoleDto refuse admin, a_definir et toute autre valeur', async () => {
    for (const role of ['admin', 'a_definir', 'ADMIN', '', undefined]) {
      const erreurs = await validate(plainToInstance(ChoisirRoleDto, { role }));
      expect(erreurs.length).toBeGreaterThan(0);
    }
    for (const role of ['etudiant', 'client']) {
      expect(await validate(plainToInstance(ChoisirRoleDto, { role }))).toHaveLength(0);
    }
  });

  it('GoogleIdTokenDto refuse un jeton absent, vide ou non JWT', async () => {
    for (const idToken of [undefined, '', 'abc', 12345, 'a'.repeat(5000)]) {
      const erreurs = await validate(plainToInstance(GoogleIdTokenDto, { idToken }));
      expect(erreurs.length).toBeGreaterThan(0);
    }
    const ok = await validate(
      plainToInstance(GoogleIdTokenDto, { idToken: 'aaa.bbb.ccc' }),
    );
    expect(ok).toHaveLength(0);
  });

  it('RegisterDto (existant) refuse toujours le role admin', async () => {
    const erreurs = await validate(
      plainToInstance(RegisterDto, {
        nom: 'X',
        email: 'x@exemple.mg',
        motDePasse: 'MotDePasse123!',
        role: 'admin',
      }),
    );
    expect(erreurs.some((e) => e.property === 'role')).toBe(true);
  });
});
