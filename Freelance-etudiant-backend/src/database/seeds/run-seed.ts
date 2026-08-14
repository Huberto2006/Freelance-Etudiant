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
 * Rejoue le scenario du chapitre 4 du cahier des charges : Lanja (etudiante
 * UI/UX Designer) et un client publiant une mission Next.js/NestJS/PostgreSQL.
 * Usage : npm run seed
 */
async function runSeed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const etudiantRepo = app.get(getRepositoryToken(EtudiantProfile));
  const clientRepo = app.get(getRepositoryToken(ClientProfile));
  const serviceRepo = app.get(getRepositoryToken(ServiceOffert));
  const missionRepo = app.get(getRepositoryToken(Mission));

  const motDePasseHache = await bcrypt.hash('MotDePasse123!', 12);

  // --- Administrateur ---
  const adminExistant = await usersService.findByEmail('admin@emit.mg');
  if (!adminExistant) {
    await usersService.create({
      nom: 'Administrateur EMIT',
      email: 'admin@emit.mg',
      motDePasse: motDePasseHache,
      role: Role.ADMIN,
    });
    console.log('Admin cree : admin@emit.mg / MotDePasse123!');
  }

  // --- Etudiante Lanja (UI/UX Designer) ---
  let lanja = await usersService.findByEmail('lanja@emit.mg');
  if (!lanja) {
    lanja = await usersService.create({
      nom: 'Lanja Rakoto',
      email: 'lanja@emit.mg',
      motDePasse: motDePasseHache,
      role: Role.ETUDIANT,
    });
    const profil = etudiantRepo.create({
      utilisateurId: lanja.id,
      niveauEtude: 'Licence 3',
      universite: 'EMIT Fianarantsoa',
      competences: ['Figma', 'Photoshop', 'UX Research', 'Next.js', 'NestJS', 'PostgreSQL'],
      langues: ['Malagasy', 'Francais', 'Anglais'],
      tarifHoraire: 15000,
      disponibilite: true,
      description: 'UI/UX Designer passionnee, 12 projets realises.',
      portfolioUrls: [],
    });
    await etudiantRepo.save(profil);

    const service = serviceRepo.create({
      titre: "Creation d'une maquette Figma pour application mobile",
      description: 'Maquette complete UI/UX sur Figma, livrable en 5 jours.',
      categorie: 'Design',
      prix: 80000,
      delai: 5,
      competences: ['Figma', 'UI/UX'],
      imagesUrls: [],
      etudiantId: lanja.id,
    });
    await serviceRepo.save(service);
    console.log('Etudiante cree : lanja@emit.mg / MotDePasse123!');
  }

  // --- Client ---
  let client = await usersService.findByEmail('client@exemple.mg');
  if (!client) {
    client = await usersService.create({
      nom: 'CISCO Fianarantsoa',
      email: 'client@exemple.mg',
      motDePasse: motDePasseHache,
      role: Role.CLIENT,
    });
    const profilClient = clientRepo.create({
      utilisateurId: client.id,
      typeClient: TypeClient.ENTREPRISE,
      nomEntreprise: 'CISCO Fianarantsoa',
    });
    await clientRepo.save(profilClient);

    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() + 30);

    const mission = missionRepo.create({
      titre: "Developpement d'une plateforme de gestion scolaire",
      description:
        'Recherche etudiant(e) maitrisant Next.js, NestJS et PostgreSQL pour developper un module complet.',
      budget: 1500000,
      dateLimite,
      categorie: 'Developpement',
      competencesRequises: ['Next.js', 'NestJS', 'PostgreSQL'],
      clientId: client.id,
    });
    await missionRepo.save(mission);
    console.log('Client cree : client@exemple.mg / MotDePasse123!');
  }

  console.log('Seed termine.');
  await app.close();
}

runSeed().catch((error) => {
  console.error('Erreur lors du seed :', error);
  process.exit(1);
});
