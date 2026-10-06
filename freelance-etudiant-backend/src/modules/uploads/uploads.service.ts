import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, timingSafeEqual } from 'crypto';
import { existsSync, readdirSync, statSync, unlinkSync } from 'fs';
import { open } from 'fs/promises';
import { basename, extname, join } from 'path';
import { DataSource, Not, IsNull, Repository } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { Utilisateur } from '../users/entities/utilisateur.entity';
import { Mission } from '../missions/entities/mission.entity';
import { ServiceOffert } from '../services/entities/service.entity';

/** Delai de grace avant purge : laisse le temps de finir un formulaire. */
const DELAI_GRACE_IMAGES_MS = 24 * 60 * 60 * 1000;
const INTERVALLE_NETTOYAGE_MS = 24 * 60 * 60 * 1000;
const DELAI_PREMIER_NETTOYAGE_MS = 5 * 60 * 1000;

/** Nom de fichier de document genere par le serveur : <uuid>.<extension>. */
export const REGEX_NOM_DOCUMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{2,5}$/;
/** Duree de validite d'un lien de telechargement de document. */
const DUREE_LIEN_DOCUMENT_S = 60;

/**
 * Signatures binaires (magic bytes) attendues par extension. Le MIME et
 * l'extension declares par le client sont falsifiables : on verifie le
 * contenu reel du fichier ecrit sur le disque.
 */
const SIGNATURES: Record<string, (tete: Buffer) => boolean> = {
  '.jpg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  '.jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  '.png': (b) =>
    b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  '.webp': (b) =>
    b.subarray(0, 4).toString('latin1') === 'RIFF' &&
    b.subarray(8, 12).toString('latin1') === 'WEBP',
  '.pdf': (b) => b.subarray(0, 5).toString('latin1') === '%PDF-',
  '.zip': (b) => b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05),
  '.docx': (b) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03,
  '.xlsx': (b) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03,
  '.rar': (b) => b.subarray(0, 4).toString('latin1') === 'Rar!',
  '.doc': (b) => b.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0])),
  '.xls': (b) => b.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0])),
};

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
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  // ------------------------------------------------------------------
  // Verification du contenu reel des fichiers
  // ------------------------------------------------------------------

  /**
   * Verifie la signature binaire du fichier deja ecrit sur le disque par
   * Multer. En cas d'incoherence avec l'extension, le fichier est supprime
   * et l'upload refuse.
   */
  async verifierContenu(file: Express.Multer.File): Promise<void> {
    const extension = extname(file.originalname).toLowerCase();
    const chemin = file.path;
    let valide = false;

    try {
      const handle = await open(chemin, 'r');
      try {
        const tete = Buffer.alloc(8192);
        const { bytesRead } = await handle.read(tete, 0, tete.length, 0);
        const lu = tete.subarray(0, bytesRead);

        if (extension === '.txt') {
          // Texte brut : aucun octet nul (sinon c'est un binaire deguise).
          valide = bytesRead > 0 && !lu.includes(0x00);
        } else {
          const controle = SIGNATURES[extension];
          valide = Boolean(controle) && bytesRead >= 12 && controle(lu);
        }
      } finally {
        await handle.close();
      }
    } catch {
      valide = false;
    }

    if (!valide) {
      try {
        if (chemin && existsSync(chemin)) unlinkSync(chemin);
      } catch {
        /* suppression best-effort */
      }
      throw new BadRequestException(
        "Le contenu du fichier ne correspond pas a son format declare.",
      );
    }
  }

  // ------------------------------------------------------------------
  // Documents prives : controle d'acces + lien signe de courte duree
  // ------------------------------------------------------------------

  private cleLiens(): string {
    // Cle derivee : jamais le secret JWT brut comme cle HMAC.
    return `${this.configService.getOrThrow<string>('jwt.secret')}:telechargement-document`;
  }

  private signer(nom: string, expiration: number): string {
    return createHmac('sha256', this.cleLiens())
      .update(`${nom}.${expiration}`)
      .digest('hex');
  }

  /** Verifie un ticket "<expiration>.<signature>" pour le fichier `nom`. */
  verifierTicket(nom: string, ticket: string | undefined): boolean {
    if (!ticket || !REGEX_NOM_DOCUMENT.test(nom)) return false;
    const [exp, signature] = ticket.split('.');
    const expiration = Number(exp);
    if (!signature || !Number.isInteger(expiration)) return false;
    if (expiration < Math.floor(Date.now() / 1000)) return false;
    const attendu = Buffer.from(this.signer(nom, expiration), 'hex');
    const recu = Buffer.from(signature, 'hex');
    return attendu.length === recu.length && timingSafeEqual(attendu, recu);
  }

  /**
   * L'utilisateur peut-il lire ce document ? Il doit figurer parmi les
   * participants de l'objet metier qui reference le fichier (message,
   * demande de service, livraison). Un administrateur peut tout lire.
   */
  private async peutLire(
    utilisateurId: string,
    role: Role,
    url: string,
  ): Promise<boolean> {
    if (role === Role.ADMIN) return true;

    const lignes = await this.dataSource.query(
      `
      SELECT 1 AS ok WHERE
        EXISTS (
          SELECT 1 FROM messages m
          WHERE m.piece_jointe_url = $2 AND m.est_supprime = false
            AND (
              m.expediteur_id = $1 OR m.destinataire_id = $1
              OR EXISTS (
                SELECT 1 FROM membres_groupes mg
                WHERE mg.groupe_id = m.groupe_id AND mg.etudiant_id = $1
              )
            )
        )
        OR EXISTS (
          SELECT 1 FROM demandes_service d
          JOIN services s ON s.id = d.service_id
          WHERE d.piece_jointe_url = $2
            AND (d.client_id = $1 OR s.etudiant_id = $1)
        )
        OR EXISTS (
          SELECT 1 FROM livraisons l
          JOIN candidatures c ON c.id = l.candidature_id
          JOIN missions mi ON mi.id = c.mission_id
          WHERE (l.fichier_url = $2 OR l.pieces_jointes @> $3::jsonb)
            AND (
              c.etudiant_id = $1 OR mi.client_id = $1
              OR EXISTS (
                SELECT 1 FROM membres_groupes mg2
                WHERE mg2.groupe_id = c.groupe_id AND mg2.etudiant_id = $1
              )
            )
        )
      `,
      [utilisateurId, url, JSON.stringify([{ url }])],
    );
    return lignes.length > 0;
  }

  /**
   * Emet un lien de telechargement valable DUREE_LIEN_DOCUMENT_S secondes
   * pour un document, apres controle d'acces. Le lien est relatif a la base
   * de l'API (/api/v1).
   */
  async genererLienDocument(
    utilisateurId: string,
    role: Role,
    urlStockee: string,
  ): Promise<{ url: string; expireDans: number }> {
    const chemin = urlStockee.startsWith('/') ? urlStockee : `/${urlStockee}`;
    const nom = chemin.replace(/^\/uploads\/documents\//, '');
    if (!chemin.startsWith('/uploads/documents/') || !REGEX_NOM_DOCUMENT.test(nom)) {
      throw new BadRequestException('Document invalide');
    }
    if (!(await this.peutLire(utilisateurId, role, `/uploads/documents/${nom}`))) {
      throw new ForbiddenException("Vous n'avez pas acces a ce document");
    }
    const expiration = Math.floor(Date.now() / 1000) + DUREE_LIEN_DOCUMENT_S;
    const prefixe = (this.configService.get<string>('app.apiPrefix') || 'api/v1').replace(/^\/+|\/+$/g, '');
    return {
      // Chemin complet (prefixe API inclus) : le telechargement est une
      // route du contrôleur, plus un fichier statique.
      url: `/${prefixe}/uploads/documents/${nom}?t=${expiration}.${this.signer(nom, expiration)}`,
      expireDans: DUREE_LIEN_DOCUMENT_S,
    };
  }

  /** Chemin disque d'un document (nom deja valide par REGEX_NOM_DOCUMENT). */
  cheminDocument(nom: string): string {
    if (!REGEX_NOM_DOCUMENT.test(nom)) {
      throw new NotFoundException('Document introuvable');
    }
    const chemin = join(process.cwd(), 'uploads', 'documents', nom);
    if (!existsSync(chemin)) {
      throw new NotFoundException('Document introuvable');
    }
    return chemin;
  }

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
