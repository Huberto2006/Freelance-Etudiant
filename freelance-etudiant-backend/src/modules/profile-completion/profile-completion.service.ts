import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utilisateur } from '../users/entities/utilisateur.entity';
import { EtudiantProfile } from '../etudiants/entities/etudiant-profile.entity';
import { ClientProfile } from '../clients/entities/client-profile.entity';
import { Role } from '../../common/enums/role.enum';
import { TypeClient } from '../../common/enums/type-client.enum';

/**
 * Etiquettes lisibles des champs obligatoires, groupees par etape du
 * questionnaire. L'ordre definit aussi l'ordre des etapes affichees
 * par le frontend (progression + reprise).
 *
 * IMPORTANT : seuls les champs reellement obligatoires figurent ici.
 * Les liens externes (GitHub, GitLab, LinkedIn, site web, portfolio)
 * restent volontairement optionnels.
 */
const ETAPES_ETUDIANT: {
  etape: string;
  champs: {
    cle: string;
    label: string;
    rempli: (p: EtudiantProfile | undefined, u: Utilisateur) => boolean;
  }[];
}[] = [
  {
    etape: 'identite',
    champs: [
      { cle: 'photoUrl', label: 'photo de profil', rempli: (_p, u) => Boolean(u.photoUrl) },
      { cle: 'ville', label: 'ville', rempli: (p) => Boolean(p?.ville?.trim()) },
      { cle: 'telephone', label: 'telephone', rempli: (p) => Boolean(p?.telephone?.trim()) },
    ],
  },
  {
    etape: 'formation',
    champs: [
      { cle: 'universite', label: 'universite', rempli: (p) => Boolean(p?.universite?.trim()) },
      { cle: 'niveauEtude', label: "niveau d'etude", rempli: (p) => Boolean(p?.niveauEtude?.trim()) },
      { cle: 'filiere', label: 'filiere', rempli: (p) => Boolean(p?.filiere?.trim()) },
      { cle: 'anneeEtude', label: "annee d'etude", rempli: (p) => Boolean(p?.anneeEtude?.trim()) },
    ],
  },
  {
    etape: 'competences',
    champs: [
      { cle: 'competences', label: 'competences', rempli: (p) => (p?.competences?.length ?? 0) > 0 },
      { cle: 'langues', label: 'langues', rempli: (p) => (p?.langues?.length ?? 0) > 0 },
    ],
  },
  {
    etape: 'activite',
    champs: [
      {
        cle: 'tarifHoraire',
        label: 'tarif horaire',
        rempli: (p) => p?.tarifHoraire != null && Number(p.tarifHoraire) > 0,
      },
      { cle: 'disponibilite', label: 'disponibilite', rempli: (p) => p?.disponibilite === true },
      { cle: 'description', label: 'description', rempli: (p) => Boolean(p?.description?.trim()) },
    ],
  },
  // Etape 5 (portfolio, liens externes) : optionnelle, non exigee.
];

const ETAPES_CLIENT: {
  etape: string;
  champs: {
    cle: string;
    label: string;
    rempli: (p: ClientProfile | undefined, u: Utilisateur) => boolean;
  }[];
}[] = [
  {
    etape: 'identite',
    champs: [
      { cle: 'ville', label: 'ville', rempli: (p) => Boolean(p?.ville?.trim()) },
      { cle: 'telephone', label: 'telephone', rempli: (p) => Boolean(p?.telephone?.trim()) },
      {
        cle: 'nomEntreprise',
        label: "nom de l'entreprise",
        rempli: (p) =>
          p?.typeClient !== TypeClient.ENTREPRISE || Boolean(p?.nomEntreprise?.trim()),
      },
    ],
  },
  {
    etape: 'presentation',
    champs: [
      { cle: 'secteurActivite', label: "secteur d'activite", rempli: (p) => Boolean(p?.secteurActivite?.trim()) },
      { cle: 'description', label: 'description', rempli: (p) => Boolean(p?.description?.trim()) },
    ],
  },
  {
    etape: 'projets',
    champs: [
      { cle: 'typesProjets', label: 'types de projets', rempli: (p) => (p?.typesProjets?.length ?? 0) > 0 },
      { cle: 'besoinsFreelance', label: 'besoins freelance', rempli: (p) => (p?.besoinsFreelance?.length ?? 0) > 0 },
      { cle: 'budget', label: 'budget', rempli: (p) => p?.budgetMin != null && p?.budgetMax != null },
    ],
  },
  // Etape 4 (site web, infos professionnelles) : optionnelle.
];

export interface CompletionProfil {
  role: Role;
  complete: boolean;
  progress: number;
  missingFields: string[];
  missingLabels: string[];
  nextStep: string | null;
  etapes: { etape: string; terminee: boolean; total: number; manquants: number }[];
}

@Injectable()
export class ProfileCompletionService {
  constructor(
    @InjectRepository(Utilisateur)
    private readonly utilisateurRepo: Repository<Utilisateur>,
    @InjectRepository(EtudiantProfile)
    private readonly etudiantRepo: Repository<EtudiantProfile>,
    @InjectRepository(ClientProfile)
    private readonly clientRepo: Repository<ClientProfile>,
  ) {}

  /**
   * Calcule l'etat de completion d'un utilisateur a partir des donnees
   * reellement stockees en base (source de verite unique). Le frontend
   * n'a AUCUN pouvoir sur ce calcul : ni localStorage, ni etat React,
   * ni pourcentage envoye dans une requete ne sont utilises.
   */
  async calculer(utilisateurId: string): Promise<CompletionProfil> {
    const utilisateur = await this.utilisateurRepo.findOne({
      where: { id: utilisateurId },
      relations: ['profilEtudiant', 'profilClient'],
    });

    const role = utilisateur?.role;
    if (!utilisateur || role === Role.ADMIN) {
      // Les admins n'ont pas de questionnaire : profil toujours complet.
      return {
        role: role ?? Role.ADMIN,
        complete: true,
        progress: 100,
        missingFields: [],
        missingLabels: [],
        nextStep: null,
        etapes: [],
      };
    }

    const estEtudiant = role === Role.ETUDIANT;
    const definitions = estEtudiant ? ETAPES_ETUDIANT : ETAPES_CLIENT;

    const etapes = definitions.map((etape) => {
      const profil = estEtudiant ? utilisateur.profilEtudiant : utilisateur.profilClient;
      const champsManquants = etape.champs.filter(
        (c) =>
          !c.rempli(
            profil as EtudiantProfile | ClientProfile | undefined,
            utilisateur,
          ),
      );
      return {
        etape: etape.etape,
        terminee: champsManquants.length === 0,
        total: etape.champs.length,
        manquants: champsManquants.length,
        champsManquants: champsManquants.map((c) => c.cle),
        labelsManquants: champsManquants.map((c) => c.label),
      };
    });

    const total = etapes.reduce((somme, e) => somme + e.total, 0);
    const nbManquants = etapes.reduce((somme, e) => somme + e.manquants, 0);
    const complete = nbManquants === 0;

    return {
      role: role as Role,
      complete,
      progress: total === 0 ? 100 : Math.round(((total - nbManquants) / total) * 100),
      missingFields: etapes.flatMap((e) => e.champsManquants),
      missingLabels: etapes.flatMap((e) => e.labelsManquants),
      nextStep: complete ? null : (etapes.find((e) => !e.terminee)?.etape ?? null),
      etapes: etapes.map(({ etape, terminee, total, manquants }) => ({ etape, terminee, total, manquants })),
    };
  }

  /**
   * Met a jour utilisateur.profil_complete a partir du calcul serveur.
   * Appelle apres chaque sauvegarde de questionnaire ; le frontend ne
   * peut jamais forcer cette valeur.
   */
  async synchroniserProfilComplete(utilisateurId: string): Promise<boolean> {
    const resultat = await this.calculer(utilisateurId);
    await this.utilisateurRepo.update(
      { id: utilisateurId },
      { profilComplete: resultat.complete },
    );
    return resultat.complete;
  }
}