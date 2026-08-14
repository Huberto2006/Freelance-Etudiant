import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '../../common/enums/role.enum';
import { EtudiantProfile } from '../etudiants/entities/etudiant-profile.entity';
import { ClientProfile } from '../clients/entities/client-profile.entity';
import { TypeClient } from '../../common/enums/type-client.enum';
import { JwtPayload } from './interfaces/authenticated-user.interface';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Inscription. RG1 : role unique choisi a l'inscription (etudiant ou
   * client ; le role admin ne peut jamais etre auto-attribue ici).
   * RG7 : unicite de l'email verifiee via UsersService.
   */
  async register(dto: RegisterDto) {
    if (dto.role !== Role.ETUDIANT && dto.role !== Role.CLIENT) {
      throw new BadRequestException(
        'Seuls les roles etudiant ou client sont autorises a l\'inscription',
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
      profil.niveauEtude = dto.niveauEtude;
      profil.universite = dto.universite;
      profil.competences = [];
      profil.langues = [];
      profil.portfolioUrls = [];
      utilisateur.profilEtudiant = profil;
    } else {
      const profil = new ClientProfile();
      profil.utilisateurId = utilisateur.id;
      profil.typeClient = dto.typeClient ?? TypeClient.PARTICULIER;
      profil.nomEntreprise =
        profil.typeClient === TypeClient.ENTREPRISE ? dto.nomEntreprise : undefined;
      utilisateur.profilClient = profil;
    }

    const saved = await this.usersService.save(utilisateur);
    return this.buildAuthResponse(saved.id, saved.email, saved.role);
  }

  async login(dto: LoginDto) {
    const utilisateur = await this.usersService.findByEmail(dto.email);
    if (!utilisateur) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    if (utilisateur.estSuspendu || !utilisateur.estActif) {
      throw new UnauthorizedException('Ce compte est suspendu ou desactive');
    }
    const motDePasseValide = await bcrypt.compare(
      dto.motDePasse,
      utilisateur.motDePasse,
    );
    if (!motDePasseValide) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    return this.buildAuthResponse(utilisateur.id, utilisateur.email, utilisateur.role);
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
      const utilisateur = await this.usersService.findById(payload.sub);
      if (!utilisateur || utilisateur.estSuspendu || !utilisateur.estActif) {
        throw new UnauthorizedException();
      }
      return this.buildAuthResponse(utilisateur.id, utilisateur.email, utilisateur.role);
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expire');
    }
  }

  private buildAuthResponse(id: string, email: string, role: Role) {
    const payload: JwtPayload = { sub: id, email, role };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.expiresIn'),
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
    });
    return {
      accessToken,
      refreshToken,
      utilisateur: { id, email, role },
    };
  }
}
