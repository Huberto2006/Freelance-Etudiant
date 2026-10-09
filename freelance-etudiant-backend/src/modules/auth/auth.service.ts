import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, LessThan, QueryFailedError, Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { RefreshToken } from "./entities/refresh-token.entity";
import { UsersService } from "../users/users.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto, ResetPasswordDto } from "./dto/reset-password.dto";
import {
  VerificationEmailDto,
  RenvoyerVerificationEmailDto,
} from "./dto/verification-email.dto";
import { Role } from "../../common/enums/role.enum";
import { EtudiantProfile } from "../etudiants/entities/etudiant-profile.entity";
import { ClientProfile } from "../clients/entities/client-profile.entity";
import { Utilisateur } from "../users/entities/utilisateur.entity";
import { TypeClient } from "../../common/enums/type-client.enum";
import { JwtPayload } from "./interfaces/authenticated-user.interface";
import { EmailService } from "../email/email.service";
import { AuthProvider } from "../../common/enums/auth-provider.enum";
import {
  GoogleTokenVerifierService,
  IdentiteGoogle,
} from "./google-token-verifier.service";
import { ChoisirRoleDto } from "./dto/choisir-role.dto";
import type { StringValue } from "ms";

const SALT_ROUNDS = 12;
const RESET_PASSWORD_EXPIRE_MINUTES = 60;
/**
 * Hash bcrypt factice (mot de passe aleatoire, jamais utilise ailleurs)
 * compare quand l'email n'existe pas, pour que login() prenne le meme
 * temps qu'un email existant : sans cela, l'absence de hash a comparer
 * ferait echouer plus vite qu'un vrai email + mauvais mot de passe,
 * revelant par le TEMPS de reponse qu'un email n'est pas inscrit (meme
 * categorie de risque que l'enumeration par message d'erreur, RG-AUTH2).
 */
const HASH_FACTICE_TEMPS_CONSTANT =
  "$2b$12$CwTycUXWue0Thq9StjUM0uJ8u8YKqGpDpZ/W5Wm1UEeJwOr2YrLTa";
/**
 * Verification de l'adresse email : duree de validite du jeton envoye par
 * email (le lien ne fonctionne plus au-dela) et delai minimal entre deux
 * renvois (anti-abus).
 */
const VERIFICATION_EMAIL_EXPIRE_HEURES = 24;
const RENVOI_VERIFICATION_DELAI_MS = 60_000;
/** Delai minimal entre deux emails de reinitialisation pour un meme compte. */
const RENVOI_RESET_DELAI_MS = 60_000;

/**
 * Protection anti brute force PAR COMPTE (en plus du throttling par IP) :
 * apres MAX_ECHECS_CONNEXION echecs dans la fenetre, toute tentative sur cet
 * email est refusee pendant BLOCAGE_CONNEXION_MS. Le blocage s'applique a
 * n'importe quel email (existant ou non) : il ne revele rien. Etat en
 * memoire (un seul processus) : utiliser Redis pour plusieurs instances.
 */
const MAX_ECHECS_CONNEXION = 10;
const FENETRE_ECHECS_MS = 15 * 60_000;
const BLOCAGE_CONNEXION_MS = 5 * 60_000;
const TAILLE_MAX_TABLE_ECHECS = 10_000;

/**
 * Tolerance apres rotation : deux onglets peuvent legitimement presenter le
 * meme refresh token a quelques instants d'ecart. Au-dela, la reutilisation
 * d'un jeton revoque est consideree comme un vol.
 */
const GRACE_REUTILISATION_MS = 10_000;

export interface SessionEmise {
  accessToken: string;
  refreshToken: string;
  /** Expiration du refresh token (epoch secondes), pour le cookie. */
  refreshExp?: number;
  /** Indique qu'il s'agit de la première authentification de l'utilisateur. */
  premiereConnexion: boolean;
  utilisateur: { id: string; email: string; role: Role };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly echecsConnexion = new Map<
    string,
    { count: number; premierLe: number; bloqueJusqua: number }
  >();

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly googleVerifier: GoogleTokenVerifierService,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
  ) {}

  // ------------------------------------------------------------------
  // Anti brute force par compte
  // ------------------------------------------------------------------

  private cleEchecs(email: string): string {
    return email.trim().toLowerCase();
  }

  private verifierBlocage(email: string): void {
    const etat = this.echecsConnexion.get(this.cleEchecs(email));
    if (etat && etat.bloqueJusqua > Date.now()) {
      throw new HttpException(
        "Trop de tentatives de connexion. Reessayez dans quelques minutes.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private enregistrerEchec(email: string): void {
    const cle = this.cleEchecs(email);
    const maintenant = Date.now();
    if (this.echecsConnexion.size >= TAILLE_MAX_TABLE_ECHECS) {
      for (const [k, v] of this.echecsConnexion) {
        if (v.bloqueJusqua < maintenant && maintenant - v.premierLe > FENETRE_ECHECS_MS) {
          this.echecsConnexion.delete(k);
        }
      }
    }
    let etat = this.echecsConnexion.get(cle);
    if (!etat || maintenant - etat.premierLe > FENETRE_ECHECS_MS) {
      etat = { count: 0, premierLe: maintenant, bloqueJusqua: 0 };
    }
    etat.count += 1;
    if (etat.count >= MAX_ECHECS_CONNEXION) {
      etat.bloqueJusqua = maintenant + BLOCAGE_CONNEXION_MS;
      etat.count = 0;
      etat.premierLe = maintenant;
    }
    this.echecsConnexion.set(cle, etat);
  }

  private reinitialiserEchecs(email: string): void {
    this.echecsConnexion.delete(this.cleEchecs(email));
  }

  /**
   * Inscription. RG1 : role unique choisi a l'inscription (etudiant ou
   * client ; le role admin ne peut jamais etre auto-attribue ici).
   * RG7 : unicite de l'email verifiee via UsersService.
   */
  async register(dto: RegisterDto) {
    if (dto.role !== Role.ETUDIANT && dto.role !== Role.CLIENT) {
      throw new BadRequestException(
        "Seuls les roles etudiant ou client sont autorises a l'inscription",
      );
    }

    await this.usersService.assertEmailDisponible(dto.email);

    const motDePasseHache = await bcrypt.hash(dto.motDePasse, SALT_ROUNDS);

    const utilisateur = await this.usersService.create({
      nom: dto.nom,
      email: dto.email,
      motDePasse: motDePasseHache,
      role: dto.role,
      // Le compte est cree mais inactif tant que l'adresse email n'est
      // pas confirmee via le lien recu (cf. verifierEmail).
      emailVerifie: false,
    });

    if (dto.role === Role.ETUDIANT) {
      const profil = new EtudiantProfile();
      profil.utilisateurId = utilisateur.id;
      profil.niveauEtude = dto.niveauEtude ?? null;
      profil.universite = dto.universite ?? null;
      profil.competences = [];
      profil.langues = [];
      profil.portfolioUrls = [];
      utilisateur.profilEtudiant = profil;
    } else {
      const profil = new ClientProfile();
      profil.utilisateurId = utilisateur.id;
      profil.typeClient = dto.typeClient ?? TypeClient.PARTICULIER;
      profil.nomEntreprise =
        profil.typeClient === TypeClient.ENTREPRISE
          ? dto.nomEntreprise
          : undefined;
      utilisateur.profilClient = profil;
    }

    const saved = await this.usersService.save(utilisateur);

    /*
     * Verification d'email : aucun JWT n'est delivre a l'inscription. La
     * session ne sera ouverte qu'apres confirmation de l'adresse (lien
     * recu par email) puis connexion classique.
     */
    await this.genererEtEnvoyerVerificationEmail(saved);

    return {
      message:
        "Inscription reussie. Un email de verification a ete envoye a votre adresse pour activer votre compte.",
      email: saved.email,
    };
  }

  async login(dto: LoginDto): Promise<SessionEmise> {
    this.verifierBlocage(dto.email);
    const utilisateur = await this.usersService.findByEmail(dto.email);

    // Defense contre l'enumeration de comptes (OWASP API2 / A07:2021) :
    // le mot de passe est verifie AVANT toute divulgation de l'etat du
    // compte (suspendu, email non verifie). Sans cela, un attaquant sans
    // le bon mot de passe pouvait deja distinguer "email inexistant"
    // ("Identifiants invalides") de "email existant mais suspendu" ou
    // "existant mais non verifie" (messages differents), ce qui permet de
    // reconstituer la liste des emails inscrits sur la plateforme. Un
    // compte inexistant compare quand meme contre un hash bcrypt factice
    // (temps constant) pour qu'un attaquant ne puisse pas non plus
    // distinguer "email inexistant" de "mauvais mot de passe" par le
    // temps de reponse.
    const motDePasseValide = await bcrypt.compare(
      dto.motDePasse,
      utilisateur?.motDePasse ?? HASH_FACTICE_TEMPS_CONSTANT,
    );
    if (!utilisateur || !motDePasseValide) {
      this.enregistrerEchec(dto.email);
      throw new UnauthorizedException("Identifiants invalides");
    }
    this.reinitialiserEchecs(dto.email);

    // A partir d'ici, le mot de passe est confirme correct : reveler
    // l'etat du compte au legitime proprietaire ne cree plus de risque
    // d'enumeration (il connait deja son propre email).
    if (utilisateur.estSuspendu || !utilisateur.estActif) {
      throw new UnauthorizedException("Ce compte est suspendu ou desactive");
    }
    if (!utilisateur.emailVerifie) {
      throw new UnauthorizedException(
        "Votre adresse email n'a pas encore ete verifiee. Consultez votre boite de reception et cliquez sur le lien de verification recu a l'inscription.",
      );
    }
    const premiereConnexion = await this.usersService.marquerPremiereConnexion(
      utilisateur.id,
    );
    return this.emettreSession(
      utilisateur.id,
      utilisateur.email,
      utilisateur.role,
      premiereConnexion,
    );
  }

  // ------------------------------------------------------------------
  // Google Sign-In (jeton d'identite valide cote serveur)
  // ------------------------------------------------------------------

  /**
   * Connexion / creation de compte via Google. Le navigateur ne fournit
   * QUE le jeton d'identite : email, `sub` et nom proviennent de la
   * verification cryptographique du jeton, jamais du corps de la requete.
   *
   * Regles :
   * - `sub` deja connu -> connexion au compte correspondant ;
   * - sinon, email deja utilise par un compte existant -> 409, AUCUN
   *   doublon et AUCUNE liaison automatique (voir lierGoogle pour la
   *   procedure explicite, qui exige d'etre connecte au compte existant) ;
   * - sinon creation d'un compte au role transitoire A_DEFINIR (jamais
   *   admin) : le role est choisi ensuite via choisirRole().
   */
  async loginAvecGoogle(idToken: string): Promise<SessionEmise> {
    const identite = await this.googleVerifier.verifier(idToken);

    let utilisateur = await this.usersService.findByGoogleId(identite.sub);

    if (!utilisateur) {
      const existant = await this.usersService.findByEmailInsensible(
        identite.email,
      );
      if (existant) {
        throw new ConflictException(
          "Un compte Kianja existe deja avec cette adresse email. Connectez-vous avec votre mot de passe, puis liez votre compte Google depuis vos parametres.",
        );
      }
      utilisateur = await this.creerCompteGoogle(identite);
    }

    if (utilisateur.estSuspendu || !utilisateur.estActif) {
      throw new UnauthorizedException("Ce compte est suspendu ou desactive");
    }

    const premiereConnexion = await this.usersService.marquerPremiereConnexion(
      utilisateur.id,
    );
    return this.emettreSession(
      utilisateur.id,
      utilisateur.email,
      utilisateur.role,
      premiereConnexion,
    );
  }

  private async creerCompteGoogle(
    identite: IdentiteGoogle,
  ): Promise<Utilisateur> {
    if (identite.email.length > 150) {
      throw new BadRequestException("Adresse email trop longue");
    }
    // La colonne mot_de_passe est NOT NULL : on y place le hash d'un secret
    // aleatoire que personne ne connait (connexion par mot de passe
    // impossible tant que l'utilisateur n'a pas fait une reinitialisation).
    const motDePasseInutilisable = await bcrypt.hash(
      crypto.randomBytes(48).toString("hex"),
      SALT_ROUNDS,
    );
    try {
      return await this.usersService.create({
        nom: identite.nom,
        email: identite.email,
        motDePasse: motDePasseInutilisable,
        role: Role.A_DEFINIR,
        emailVerifie: true,
        authProvider: AuthProvider.GOOGLE,
        googleId: identite.sub,
      });
    } catch (error) {
      // Deux requetes simultanees pour le meme nouveau compte : la
      // contrainte d'unicite en base a tranche, on reprend le gagnant.
      if (
        error instanceof QueryFailedError &&
        (error as unknown as { code?: string }).code === "23505"
      ) {
        const gagnant = await this.usersService.findByGoogleId(identite.sub);
        if (gagnant) return gagnant;
        throw new ConflictException("Cette adresse email est deja utilisee");
      }
      throw error;
    }
  }

  /**
   * Liaison EXPLICITE d'un compte Google a un compte existant : l'utilisateur
   * est deja authentifie (JWT) sur son compte Kianja et prouve en plus la
   * possession du compte Google. L'email Google doit etre celui du compte.
   */
  async lierGoogle(
    utilisateurId: string,
    idToken: string,
  ): Promise<{ message: string }> {
    const utilisateur = await this.usersService.findByIdOrFail(utilisateurId);
    if (utilisateur.googleId) {
      throw new ConflictException("Un compte Google est deja lie a ce compte");
    }

    const identite = await this.googleVerifier.verifier(idToken);
    if (identite.email !== utilisateur.email.trim().toLowerCase()) {
      throw new BadRequestException(
        "L'adresse email du compte Google doit etre identique a celle de votre compte Kianja.",
      );
    }
    if (await this.usersService.findByGoogleId(identite.sub)) {
      throw new ConflictException(
        "Ce compte Google est deja associe a un compte Kianja",
      );
    }

    utilisateur.googleId = identite.sub;
    try {
      await this.usersService.save(utilisateur);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as unknown as { code?: string }).code === "23505"
      ) {
        throw new ConflictException(
          "Ce compte Google est deja associe a un compte Kianja",
        );
      }
      throw error;
    }
    return { message: "Votre compte Google a ete lie a votre compte Kianja." };
  }

  /**
   * Choix du role par un compte Google tout juste cree (A_DEFINIR). Valide
   * cote serveur (liste blanche etudiant/client), unique et atomique : un
   * compte deja etudiant, client ou admin ne peut jamais etre modifie ici.
   * Le role etant porte par le JWT, une nouvelle session est emise.
   */
  async choisirRole(
    utilisateurId: string,
    dto: ChoisirRoleDto,
  ): Promise<SessionEmise> {
    const ok = await this.usersService.definirRoleInitial(
      utilisateurId,
      dto.role,
    );
    if (!ok) {
      throw new ConflictException("Votre role est deja defini");
    }
    const utilisateur = await this.usersService.findByIdOrFail(utilisateurId);
    return this.emettreSession(
      utilisateur.id,
      utilisateur.email,
      utilisateur.role,
    );
  }

  /**
   * Echange un refresh token contre un nouveau couple (rotation). Le jeton
   * presente est revoque. Un jeton deja revoque (hors tolerance) declenche
   * la revocation de TOUTES les sessions de l'utilisateur.
   */
  async refreshToken(
    refreshToken: string | null | undefined,
  ): Promise<SessionEmise> {
    const refus = () =>
      new UnauthorizedException("Refresh token invalide ou expire");

    if (!refreshToken || typeof refreshToken !== "string") throw refus();

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>("jwt.refreshSecret"),
        algorithms: ["HS256"],
      });
    } catch {
      throw refus();
    }
    if (payload.typ !== "refresh" || !payload.jti || !payload.sub) throw refus();

    const ligne = await this.refreshRepo.findOne({
      where: { id: payload.jti, utilisateurId: payload.sub },
    });
    if (
      !ligne ||
      ligne.tokenHash !== this.empreinte(refreshToken) ||
      ligne.dateExpiration.getTime() < Date.now()
    ) {
      throw refus();
    }

    if (ligne.revoqueLe) {
      if (Date.now() - ligne.revoqueLe.getTime() > GRACE_REUTILISATION_MS) {
        await this.revoquerToutesLesSessions(ligne.utilisateurId);
        this.logger.warn(
          `Reutilisation d'un refresh token revoque (utilisateur ${ligne.utilisateurId}) : toutes les sessions ont ete revoquees`,
        );
      }
      throw refus();
    }

    // Revocation atomique : un seul appel concurrent peut reussir.
    const maj = await this.refreshRepo.update(
      { id: ligne.id, revoqueLe: IsNull() },
      { revoqueLe: new Date() },
    );
    if (!maj.affected) throw refus();

    const utilisateur = await this.usersService.findById(payload.sub);
    if (!utilisateur || utilisateur.estSuspendu || !utilisateur.estActif) {
      throw refus();
    }
    return this.emettreSession(
      utilisateur.id,
      utilisateur.email,
      utilisateur.role,
    );
  }

  /** Deconnexion : revoque le refresh token presente (silencieux si invalide). */
  async logout(refreshToken: string | null | undefined): Promise<void> {
    if (!refreshToken) return;
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>("jwt.refreshSecret"),
        algorithms: ["HS256"],
        ignoreExpiration: true,
      });
      if (payload.typ === "refresh" && payload.jti) {
        await this.refreshRepo.update(
          { id: payload.jti, utilisateurId: payload.sub, revoqueLe: IsNull() },
          { revoqueLe: new Date() },
        );
      }
    } catch {
      /* jeton invalide : rien a revoquer */
    }
  }

  /** Revoque toutes les sessions (changement de mot de passe, vol detecte). */
  async revoquerToutesLesSessions(utilisateurId: string): Promise<void> {
    await this.refreshRepo.update(
      { utilisateurId, revoqueLe: IsNull() },
      { revoqueLe: new Date() },
    );
  }

  private empreinte(jeton: string): string {
    return crypto.createHash("sha256").update(jeton).digest("hex");
  }

  /**
   * Etape 1 de la reinitialisation de mot de passe : genere un jeton a
   * usage unique (valide 1h), stocke son empreinte SHA-256 en base (jamais
   * le jeton en clair) et "envoie" un lien de reinitialisation. Reponse
   * volontairement neutre que l'email existe ou non (anti-enumeration).
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    // Le traitement (lecture/ecriture en base, envoi SMTP) est execute APRES
    // la reponse : sa duree ne depend plus de l'existence du compte, ce qui
    // supprime l'oracle de timing d'enumeration.
    void this.traiterDemandeReset(dto.email).catch((error) =>
      this.logger.error(
        `forgot-password : ${error instanceof Error ? error.message : String(error)}`,
      ),
    );

    return {
      message:
        "Si un compte existe avec cette adresse, un lien de reinitialisation vient d'etre envoye.",
    };
  }

  private async traiterDemandeReset(email: string): Promise<void> {
    const utilisateur = await this.usersService.findByEmail(email);
    if (!utilisateur) return;

    // Anti-spam de la boite du proprietaire du compte.
    if (utilisateur.resetPasswordExpire) {
      const genereLe =
        utilisateur.resetPasswordExpire.getTime() -
        RESET_PASSWORD_EXPIRE_MINUTES * 60 * 1000;
      if (Date.now() - genereLe < RENVOI_RESET_DELAI_MS) return;
    }

    const jeton = crypto.randomBytes(32).toString("hex");
    utilisateur.resetPasswordToken = this.empreinte(jeton);
    utilisateur.resetPasswordExpire = new Date(
      Date.now() + RESET_PASSWORD_EXPIRE_MINUTES * 60 * 1000,
    );
    await this.usersService.save(utilisateur);

    const frontendUrl =
      this.configService.get<string>("app.frontendUrl") ??
      "http://localhost:3001";
    const lien = `${frontendUrl}/reinitialiser-mot-de-passe?token=${jeton}`;

    await this.emailService.envoyerResetPassword(email, {
      nom: utilisateur.nom,
      lien,
      dureeMinutes: RESET_PASSWORD_EXPIRE_MINUTES,
    });
  }

  /**
   * Etape 2 : verifie le jeton (empreinte + expiration) et remplace le mot
   * de passe.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const jetonHache = crypto
      .createHash("sha256")
      .update(dto.token)
      .digest("hex");

    const utilisateur = await this.usersService.findByResetToken(jetonHache);
    if (
      !utilisateur ||
      !utilisateur.resetPasswordExpire ||
      utilisateur.resetPasswordExpire.getTime() < Date.now()
    ) {
      throw new BadRequestException("Lien de reinitialisation invalide ou expire");
    }

    utilisateur.motDePasse = await bcrypt.hash(dto.nouveauMotDePasse, SALT_ROUNDS);
    utilisateur.resetPasswordToken = null;
    utilisateur.resetPasswordExpire = null;
    await this.usersService.save(utilisateur);

    // Un mot de passe reinitialise (compte potentiellement compromis)
    // invalide toutes les sessions existantes.
    await this.revoquerToutesLesSessions(utilisateur.id);
    this.reinitialiserEchecs(utilisateur.email);

    return { message: "Mot de passe reinitialise avec succes" };
  }

  /**
   * Verification de l'adresse email (etape 2 du flux d'inscription) : le
   * frontend transmet le jeton recu dans le lien ; c'est ICI, cote
   * backend, que la validation definitive est faite. Arriver sur la page
   * frontend ne prouve rien et ne marque jamais l'email comme verifie.
   *
   * Le jeton est stocke uniquement sous forme d'empreinte SHA-256, il
   * expire (VERIFICATION_EMAIL_EXPIRE_HEURES) et est invalide (supprime)
   * apres utilisation.
   */
  async verifierEmail(
    dto: VerificationEmailDto,
  ): Promise<{ message: string }> {
    const jetonHache = crypto
      .createHash("sha256")
      .update(dto.token)
      .digest("hex");

    const utilisateur = await this.usersService.findByEmailVerificationToken(
      jetonHache,
    );
    if (!utilisateur) {
      // Jeton inconnu : lien invalide, expire nettoye ou deja utilise
      // (le jeton est supprime de la base apres usage).
      throw new BadRequestException(
        "Lien de verification invalide, expire ou deja utilise",
      );
    }

    if (
      !utilisateur.emailVerificationExpire ||
      utilisateur.emailVerificationExpire.getTime() < Date.now()
    ) {
      // Nettoyage du jeton expire pour eviter les tentatives repetees.
      utilisateur.emailVerificationTokenHash = null;
      utilisateur.emailVerificationExpire = null;
      await this.usersService.save(utilisateur);
      throw new BadRequestException(
        "Lien de verification expire. Demandez un nouvel email de verification depuis la page de connexion.",
      );
    }

    utilisateur.emailVerifie = true;
    utilisateur.emailVerificationTokenHash = null;
    utilisateur.emailVerificationExpire = null;
    await this.usersService.save(utilisateur);

    return {
      message:
        "Votre adresse email a ete verifiee avec succes. Vous pouvez maintenant vous connecter.",
    };
  }

  /**
   * Renvoi de l'email de verification : genere un NOUVEAU jeton (l'ancien
   * est ecrase, donc invalide) et renvoie un VRAI email via le service
   * SMTP existant. Reponse volontairement neutre que le compte existe ou
   * soit deja verifie (anti-enumeration, meme approche que forgotPassword).
   * Un delai minimal entre deux envois limite les abus.
   */
  async renvoyerVerificationEmail(
    dto: RenvoyerVerificationEmailDto,
  ): Promise<{ message: string }> {
    // Reponse IDENTIQUE (statut, message, duree) que le compte existe, soit
    // deja verifie ou que le delai anti-abus soit actif : aucun 429 ne
    // trahit plus l'existence du compte.
    void this.traiterRenvoiVerification(dto.email).catch((error) =>
      this.logger.error(
        `resend-verification : ${error instanceof Error ? error.message : String(error)}`,
      ),
    );

    return {
      message:
        "Si un compte non verifie existe avec cette adresse, un nouvel email de verification vient d'etre envoye.",
    };
  }

  private async traiterRenvoiVerification(email: string): Promise<void> {
    const utilisateur = await this.usersService.findByEmail(email);
    if (!utilisateur || utilisateur.emailVerifie) return;

    // Anti-abus : renvoi trop rapproche ignore silencieusement.
    if (utilisateur.emailVerificationExpire) {
      const genereLe =
        utilisateur.emailVerificationExpire.getTime() -
        VERIFICATION_EMAIL_EXPIRE_HEURES * 60 * 60 * 1000;
      if (Date.now() - genereLe < RENVOI_VERIFICATION_DELAI_MS) return;
    }

    await this.genererEtEnvoyerVerificationEmail(utilisateur);
  }

  /**
   * Genere un jeton de verification aleatoire et temporaire (256 bits
   * d'entropie), ne stocke en base que son empreinte SHA-256 (jamais le
   * jeton en clair), puis envoie l'email de verification. Le lien est
   * construit a partir de FRONTEND_URL (aucune URL frontend en dur).
   * L'echec d'envoi ne bloque jamais l'inscription : l'email est
   * secondaire (convention EmailService).
   */
  private async genererEtEnvoyerVerificationEmail(
    utilisateur: Utilisateur,
  ): Promise<void> {
    const jeton = crypto.randomBytes(32).toString("hex");
    const jetonHache = crypto
      .createHash("sha256")
      .update(jeton)
      .digest("hex");

    utilisateur.emailVerificationTokenHash = jetonHache;
    utilisateur.emailVerificationExpire = new Date(
      Date.now() + VERIFICATION_EMAIL_EXPIRE_HEURES * 60 * 60 * 1000,
    );
    await this.usersService.save(utilisateur);

    const frontendUrl =
      this.configService.get<string>("app.frontendUrl") ??
      "http://localhost:3001";
    const lien = `${frontendUrl}/verification-email?token=${jeton}`;

    // Envoi du VRAI email via le transport SMTP/Nodemailer existant
    // (EmailService). En dev sans SMTP configure, le contenu est
    // journalise en console de facon explicite.
    await this.emailService.envoyerVerificationEmail(utilisateur.email, {
      nom: utilisateur.nom,
      lien,
      dureeHeures: VERIFICATION_EMAIL_EXPIRE_HEURES,
    });
  }

  /**
   * Emet un couple access/refresh. L'access token est court (15 min) et
   * porte typ=access ; le refresh token porte typ=refresh + jti, est signe
   * avec un secret DEDIE et son empreinte est enregistree en base (session
   * revocable, rotation a chaque usage).
   */
  private async emettreSession(
    id: string,
    email: string,
    role: Role,
    premiereConnexion = false,
  ): Promise<SessionEmise> {
    const accessToken = this.jwtService.sign(
      { sub: id, email, role, typ: "access" } satisfies JwtPayload,
      {
        expiresIn: (this.configService.get<string>("jwt.expiresIn") ??
          "15m") as StringValue,
      },
    );

    const jti = crypto.randomUUID();
    const refreshToken = this.jwtService.sign(
      { sub: id, email, role, typ: "refresh", jti } satisfies JwtPayload,
      {
        secret: this.configService.getOrThrow<string>("jwt.refreshSecret"),
        expiresIn: (this.configService.get<string>("jwt.refreshExpiresIn") ??
          "7d") as StringValue,
      },
    );

    const decode = this.jwtService.decode(refreshToken) as { exp?: number } | null;
    const refreshExp = decode?.exp;

    await this.refreshRepo.insert({
      id: jti,
      utilisateurId: id,
      tokenHash: this.empreinte(refreshToken),
      dateExpiration: new Date((refreshExp ?? 0) * 1000),
    });

    // Nettoyage opportuniste des sessions expirees de cet utilisateur.
    await this.refreshRepo.delete({
      utilisateurId: id,
      dateExpiration: LessThan(new Date()),
    });

    return {
      accessToken,
      refreshToken,
      refreshExp,
      premiereConnexion,
      utilisateur: { id, email, role },
    };
  }
}
