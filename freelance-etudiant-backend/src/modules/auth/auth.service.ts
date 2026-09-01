import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { UsersService } from "../users/users.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto, ResetPasswordDto } from "./dto/reset-password.dto";
import { Role } from "../../common/enums/role.enum";
import { EtudiantProfile } from "../etudiants/entities/etudiant-profile.entity";
import { ClientProfile } from "../clients/entities/client-profile.entity";
import { TypeClient } from "../../common/enums/type-client.enum";
import { JwtPayload } from "./interfaces/authenticated-user.interface";
import { EmailService } from "../email/email.service";
import type { StringValue } from "ms";

const SALT_ROUNDS = 12;
const RESET_PASSWORD_EXPIRE_MINUTES = 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

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
    return this.buildAuthResponse(saved.id, saved.email, saved.role);
  }

  async login(dto: LoginDto) {
    const utilisateur = await this.usersService.findByEmail(dto.email);
    if (!utilisateur) {
      throw new UnauthorizedException("Identifiants invalides");
    }
    if (utilisateur.estSuspendu || !utilisateur.estActif) {
      throw new UnauthorizedException("Ce compte est suspendu ou desactive");
    }
    const motDePasseValide = await bcrypt.compare(
      dto.motDePasse,
      utilisateur.motDePasse,
    );
    if (!motDePasseValide) {
      throw new UnauthorizedException("Identifiants invalides");
    }
    return this.buildAuthResponse(
      utilisateur.id,
      utilisateur.email,
      utilisateur.role,
    );
  }

  async refreshToken(refreshToken: string) {
    try {
      // Meme secret que celui utilise pour SIGNER le refresh token dans
      // buildAuthResponse() : un secret dedie (JWT_REFRESH_SECRET) avec
      // repli sur le secret principal s'il n'est pas defini.
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret:
          this.configService.get<string>("jwt.refreshSecret") ??
          this.configService.get<string>("JWT_SECRET"),
      });
      const utilisateur = await this.usersService.findById(payload.sub);
      if (!utilisateur || utilisateur.estSuspendu || !utilisateur.estActif) {
        throw new UnauthorizedException();
      }
      return this.buildAuthResponse(
        utilisateur.id,
        utilisateur.email,
        utilisateur.role,
      );
    } catch {
      throw new UnauthorizedException("Refresh token invalide ou expire");
    }
  }

  /**
   * Etape 1 de la reinitialisation de mot de passe : genere un jeton a
   * usage unique (valide 1h), stocke son empreinte SHA-256 en base (jamais
   * le jeton en clair) et "envoie" un lien de reinitialisation. Reponse
   * volontairement neutre que l'email existe ou non (anti-enumeration).
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const utilisateur = await this.usersService.findByEmail(dto.email);
    if (utilisateur) {
      const jeton = crypto.randomBytes(32).toString("hex");
      const jetonHache = crypto.createHash("sha256").update(jeton).digest("hex");

      utilisateur.resetPasswordToken = jetonHache;
      utilisateur.resetPasswordExpire = new Date(
        Date.now() + RESET_PASSWORD_EXPIRE_MINUTES * 60 * 1000,
      );
      await this.usersService.save(utilisateur);

      const frontendUrl =
        this.configService.get<string>("app.frontendUrl") ??
        "http://localhost:3001";
      const lien = `${frontendUrl}/reinitialiser-mot-de-passe?token=${jeton}`;

      // Envoi du VRAI email via SMTP (Nodemailer). En dev sans SMTP
      // configure, EmailService journalise le contenu en console.
      // L'echec d'envoi ne modifie jamais la reponse : elle doit rester
      // identique que le compte existe ou non (anti-enumeration).
      await this.emailService.envoyerResetPassword(dto.email, {
        nom: utilisateur.nom,
        lien,
        dureeMinutes: RESET_PASSWORD_EXPIRE_MINUTES,
      });
    }

    return {
      message:
        "Si un compte existe avec cette adresse, un lien de reinitialisation vient d'etre envoye.",
    };
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

    return { message: "Mot de passe reinitialise avec succes" };
  }

  private buildAuthResponse(id: string, email: string, role: Role) {
    const payload: JwtPayload = { sub: id, email, role };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: (this.configService.get<string>("JWT_EXPIRES_IN") ??
        "15m") as StringValue,
    });

    /*
     * Correctif : le refresh token doit etre signe avec un secret DEDIE
     * (JWT_REFRESH_SECRET) et non avec le secret du JwtModule. C'est le
     * secret que refreshToken() utilise pour la verification ; signe avec
     * le secret principal, la verification echouait systematiquement.
     * Repli sur le secret principal si le secret dedie est absent.
     */
    const refreshSecret =
      this.configService.get<string>("jwt.refreshSecret") ??
      this.configService.get<string>("JWT_SECRET");

    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: (this.configService.get<string>(
        "JWT_REFRESH_EXPIRES_IN",
      ) ?? "7d") as StringValue,
    });

    return {
      accessToken,
      refreshToken,
      utilisateur: { id, email, role },
    };
  }
}
