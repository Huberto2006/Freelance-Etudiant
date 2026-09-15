import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../app.module';
import { UsersService } from '../../modules/users/users.service';
import { Role } from '../../common/enums/role.enum';
import { TypeClient } from '../../common/enums/type-client.enum';
import { EtudiantProfile } from '../../modules/etudiants/entities/etudiant-profile.entity';
import { ClientProfile } from '../../modules/clients/entities/client-profile.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ServiceOffert } from '../../modules/services/entities/service.entity';
import { Mission } from '../../modules/missions/entities/mission.entity';

/**
 * Seed de démonstration Kianja.
 *
 * Comptes créés/réinitialisés :
 *
 * Admin :
 *   admin@kianja.mg / MotDePasse123!
 *
 * Étudiante :
 *   lanja@emit.mg / MotDePasse123!
 *
 * Client :
 *   client@exemple.mg / MotDePasse123!
 *
 * Les mots de passe sont toujours stockés sous forme de hash bcrypt.
 *
 * Usage :
 *   npm run seed
 */
async function runSeed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const usersService = app.get(UsersService);
  const etudiantRepo = app.get(getRepositoryToken(EtudiantProfile));
  const clientRepo = app.get(getRepositoryToken(ClientProfile));
  const serviceRepo = app.get(getRepositoryToken(ServiceOffert));
  const missionRepo = app.get(getRepositoryToken(Mission));

  // ============================================================
  // MOT DE PASSE COMMUN DU SEED
  // ============================================================

  const motDePasse = 'MotDePasse123!';

  // Le mot de passe en clair n'est jamais enregistré en base.
  const motDePasseHache = await bcrypt.hash(motDePasse, 12);

  // ============================================================
  // ADMINISTRATEUR
  // ============================================================

  const adminExistant = await usersService.findByEmail('admin@kianja.mg');

  if (!adminExistant) {
    await usersService.create({
      nom: 'Administrateur EMIT',
      email: 'admin@kianja.mg',
      motDePasse: motDePasseHache,
      role: Role.ADMIN,
      emailVerifie: true,
      estActif: true,
      estSuspendu: false,
    });

    console.log('Admin créé : admin@kianja.mg / MotDePasse123!');
  } else {
    // L'utilisateur existe déjà.
    // On réinitialise son mot de passe avec bcrypt.
    adminExistant.motDePasse = motDePasseHache;

    adminExistant.role = Role.ADMIN;
    adminExistant.emailVerifie = true;
    adminExistant.estActif = true;
    adminExistant.estSuspendu = false;

    await usersService.save(adminExistant);

    console.log(
      'Admin existant mis à jour : mot de passe bcrypt + compte actif.',
    );
  }

  // ============================================================
  // ÉTUDIANTE LANJA
  // ============================================================

  let lanja = await usersService.findByEmail('lanja@emit.mg');

  if (!lanja) {
    // Création du compte avec le hash bcrypt.
    lanja = await usersService.create({
      nom: 'Lanja Rakoto',
      email: 'lanja@emit.mg',
      motDePasse: motDePasseHache,
      role: Role.ETUDIANT,
      emailVerifie: true,
      estActif: true,
      estSuspendu: false,
    });

    console.log('Étudiante créée : lanja@emit.mg / MotDePasse123!');
  } else {
    // Le compte existe déjà.
    // On réinitialise son mot de passe avec le hash bcrypt.
    lanja.motDePasse = motDePasseHache;

    lanja.role = Role.ETUDIANT;
    lanja.emailVerifie = true;
    lanja.estActif = true;
    lanja.estSuspendu = false;

    await usersService.save(lanja);

    console.log(
      'Étudiante existante mise à jour : mot de passe bcrypt + compte actif.',
    );
  }

  // ============================================================
  // PROFIL ÉTUDIANTE
  // ============================================================

  const profilEtudiantExistant = await etudiantRepo.findOne({
    where: {
      utilisateurId: lanja.id,
    },
  });

  if (!profilEtudiantExistant) {
    const profil = etudiantRepo.create({
      utilisateurId: lanja.id,
      niveauEtude: 'Licence 3',
      universite: 'EMIT Fianarantsoa',
      competences: [
        'Figma',
        'Photoshop',
        'UX Research',
        'Next.js',
        'NestJS',
        'PostgreSQL',
      ],
      langues: ['Malagasy', 'Francais', 'Anglais'],
      tarifHoraire: 15000,
      disponibilite: true,
      description: 'UI/UX Designer passionnée, 12 projets réalisés.',
      portfolioUrls: [],
    });

    await etudiantRepo.save(profil);

    console.log('Profil étudiant créé pour Lanja.');
  }

  // ============================================================
  // SERVICE DE LANJA
  // ============================================================

  const serviceExistant = await serviceRepo.findOne({
    where: {
      etudiantId: lanja.id,
    },
  });

  if (!serviceExistant) {
    const service = serviceRepo.create({
      titre: "Création d'une maquette Figma pour application mobile",
      description:
        'Maquette complète UI/UX sur Figma, livrable en 5 jours.',
      categorie: 'Design',
      prix: 80000,
      delai: 5,
      competences: ['Figma', 'UI/UX'],
      imagesUrls: [],
      etudiantId: lanja.id,
    });

    await serviceRepo.save(service);

    console.log('Service de Lanja créé.');
  }

  // ============================================================
  // CLIENT
  // ============================================================

  let client = await usersService.findByEmail('client@exemple.mg');

  if (!client) {
    // Création du compte avec le hash bcrypt.
    client = await usersService.create({
      nom: 'CISCO Fianarantsoa',
      email: 'client@exemple.mg',
      motDePasse: motDePasseHache,
      role: Role.CLIENT,
      emailVerifie: true,
      estActif: true,
      estSuspendu: false,
    });

    console.log('Client créé : client@exemple.mg / MotDePasse123!');
  } else {
    // Le compte existe déjà.
    // On réinitialise son mot de passe avec bcrypt.
    client.motDePasse = motDePasseHache;

    client.role = Role.CLIENT;
    client.emailVerifie = true;
    client.estActif = true;
    client.estSuspendu = false;

    await usersService.save(client);

    console.log(
      'Client existant mis à jour : mot de passe bcrypt + compte actif.',
    );
  }

  // ============================================================
  // PROFIL CLIENT
  // ============================================================

  const profilClientExistant = await clientRepo.findOne({
    where: {
      utilisateurId: client.id,
    },
  });

  if (!profilClientExistant) {
    const profilClient = clientRepo.create({
      utilisateurId: client.id,
      typeClient: TypeClient.ENTREPRISE,
      nomEntreprise: 'CISCO Fianarantsoa',
    });

    await clientRepo.save(profilClient);

    console.log('Profil client créé.');
  }

  // ============================================================
  // MISSION DU CLIENT
  // ============================================================

  const missionExistante = await missionRepo.findOne({
    where: {
      clientId: client.id,
    },
  });

  if (!missionExistante) {
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() + 30);

    const mission = missionRepo.create({
      titre: "Développement d'une plateforme de gestion scolaire",
      description:
        'Recherche étudiant(e) maîtrisant Next.js, NestJS et PostgreSQL pour développer un module complet.',
      budget: 1500000,
      dateLimite,
      categorie: 'Développement',
      competencesRequises: ['Next.js', 'NestJS', 'PostgreSQL'],
      clientId: client.id,
    });

    await missionRepo.save(mission);

    console.log('Mission du client créée.');
  }

  // ============================================================
  // FIN
  // ============================================================

  console.log('');
  console.log('========================================');
  console.log('Seed terminé.');
  console.log('========================================');
  console.log('');
  console.log('Comptes de démonstration :');
  console.log('');
  console.log('ADMIN');
  console.log('  admin@kianja.mg');
  console.log('  MotDePasse123!');
  console.log('');
  console.log('ÉTUDIANTE');
  console.log('  lanja@emit.mg');
  console.log('  MotDePasse123!');
  console.log('');
  console.log('CLIENT');
  console.log('  client@exemple.mg');
  console.log('  MotDePasse123!');
  console.log('');

  await app.close();
}

runSeed().catch((error) => {
  console.error('Erreur lors du seed :', error);
  process.exit(1);
});