import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, readdirSync, statSync, unlinkSync } from 'fs';
import { basename, join } from 'path';
import { Not, IsNull, Repository } from 'typeorm';
import { Utilisateur } from '../users/entities/utilisateur.entity';
import { Mission } from '../missions/entities/mission.entity';
import { ServiceOffert } from '../services/entities/service.entity';

/** Delai de grace avant purge : laisse le temps de finir un formulaire. */
const DELAI_GRACE_IMAGES_MS = 24 * 60 * 60 * 1000;
const INTERVALLE_NETTOYAGE_MS = 24 * 60 * 60 * 1000;
const DELAI_PREMIER_NETTOYAGE_MS = 5 * 60 * 1000;

@Injectable()
export class UploadsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UploadsService.name);
  private minuteurPremier?: NodeJS.Timeout;
  private minuteurRecurrent?: NodeJS.Timeout;

  constructor(
    @InjectRepository(Utilisateur)
    private readonly utilisateurRepository: Repository<Utilisateur>,
    @InjectRepository(Mission)
    private readonly missionRepository: Repository<Mission>,
    @InjectRepository(ServiceOffert)
    private readonly serviceRepository: Repository<ServiceOffert>,
  ) {}

  onModuleInit(): void {
    const lancer = () => {
      this.nettoyerImagesOrphelines().catch((error) =>
        this.logger.warn(
          `Nettoyage des images orphelines echoue : ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );
    };
    this.minuteurPremier = setTimeout(lancer, DELAI_PREMIER_NETTOYAGE_MS);
    this.minuteurRecurrent = setInterval(lancer, INTERVALLE_NETTOYAGE_MS);
    this.minuteurPremier.unref();
    this.minuteurRecurrent.unref();
  }

  onModuleDestroy(): void {
    if (this.minuteurPremier) clearTimeout(this.minuteurPremier);
    if (this.minuteurRecurrent) clearInterval(this.minuteurRecurrent);
  }

  /**
   * Supprime de uploads/images les fichiers qui ne sont references par
   * aucune mission (imageUrl) ni aucun service (imagesUrls) et qui datent
   * de plus de 24 h. Seul ce dossier est concerne : il ne sert qu'aux
   * images de missions/services (les documents et photos de profil ont
   * leur propre cycle de vie). Retourne le nombre de fichiers supprimes.
   */
  async nettoyerImagesOrphelines(): Promise<number> {
    const dossier = join(process.cwd(), 'uploads', 'images');
    if (!existsSync(dossier)) return 0;

    const references = new Set<string>();

    const missions = await this.missionRepository.find({
      select: ['id', 'imageUrl'],
      where: { imageUrl: Not(IsNull()) },
    });
    for (const mission of missions) {
      if (mission.imageUrl) references.add(basename(mission.imageUrl));
    }

    const services = await this.serviceRepository.find({
      select: ['id', 'imagesUrls'],
    });
    for (const service of services) {
      for (const url of service.imagesUrls ?? []) {
        references.add(basename(url));
      }
    }

    let supprimes = 0;
    const maintenant = Date.now();
    for (const nom of readdirSync(dossier)) {
      const chemin = join(dossier, nom);
      try {
        const stats = statSync(chemin);
        if (!stats.isFile()) continue;
        if (maintenant - stats.mtimeMs < DELAI_GRACE_IMAGES_MS) continue;
        if (references.has(nom)) continue;
        unlinkSync(chemin);
        supprimes += 1;
      } catch (error) {
        this.logger.warn(
          `Suppression de ${nom} impossible : ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    if (supprimes > 0) {
      this.logger.log(`${supprimes} image(s) orpheline(s) supprimee(s)`);
    }
    return supprimes;
  }

  async saveProfilePhoto(
    utilisateurId: string,
    filename: string,
  ) {
    const utilisateur =
      await this.utilisateurRepository.findOne({
        where: { id: utilisateurId },
      });

    if (!utilisateur) {
      throw new NotFoundException(
        'Utilisateur introuvable',
      );
    }

    const url = `/uploads/profiles/${filename}`;

    // Ancienne photo a remplacer (stockage : sans ce nettoyage, chaque
    // changement de photo laisse l'ancien fichier orphelin sur le disque).
    const anciennePhotoUrl = utilisateur.photoUrl;

    utilisateur.photoUrl = url;

    await this.utilisateurRepository.save(utilisateur);

    // Suppression de l'ancien fichier APRES l'enregistrement reussi.
    // basename() empeche toute remontee de repertoire (path traversal) :
    // seuls les fichiers directement presents dans uploads/profiles sont
    // supprimables. Un echec de suppression est journalise sans faire
    // echouer l'upload (l'ancienne photo orpheline n'est pas critique).
    if (
      anciennePhotoUrl &&
      anciennePhotoUrl !== url &&
      anciennePhotoUrl.startsWith('/uploads/profiles/')
    ) {
      const cheminAncien = join(
        process.cwd(),
        'uploads',
        'profiles',
        basename(anciennePhotoUrl),
      );
      try {
        if (existsSync(cheminAncien)) {
          unlinkSync(cheminAncien);
        }
      } catch (error) {
        this.logger.warn(
          `Suppression de l'ancienne photo impossible (${anciennePhotoUrl}) : ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return {
      message: 'Photo de profil enregistrée avec succès',
      url,
    };
  }

  /**
   * Formate la reponse d'un upload de document generique (piece jointe
   * de message ou de cahier des charges) : conserve le nom original du
   * fichier pour l'affichage/telechargement cote client, meme si le
   * fichier est stocke sous un nom UUID sur le disque.
   */
  formatDocumentResponse(file: Express.Multer.File) {
    return {
      url: `/uploads/documents/${file.filename}`,
      nomFichier: file.originalname,
      tailleOctets: file.size,
    };
  }

  /** Reponse d'un upload d'image de mission ou de service. */
  formatImageResponse(file: Express.Multer.File) {
    return {
      url: `/uploads/images/${file.filename}`,
      nomFichier: file.originalname,
      tailleOctets: file.size,
    };
  }
}
