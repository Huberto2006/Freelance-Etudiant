import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utilisateur } from './entities/utilisateur.entity';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Utilisateur)
    private readonly utilisateurRepo: Repository<Utilisateur>,
  ) {}

  async findByEmail(email: string): Promise<Utilisateur | null> {
    return this.utilisateurRepo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<Utilisateur | null> {
    return this.utilisateurRepo.findOne({
      where: { id },
      relations: ['profilEtudiant', 'profilClient'],
    });
  }

  async findByIdOrFail(id: string): Promise<Utilisateur> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    return user;
  }

  /**
   * RG7 : l'adresse email doit etre unique dans le systeme.
   */
  async assertEmailDisponible(email: string): Promise<void> {
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('Cette adresse email est deja utilisee');
    }
  }

  async create(data: Partial<Utilisateur>): Promise<Utilisateur> {
    const utilisateur = this.utilisateurRepo.create(data);
    return this.utilisateurRepo.save(utilisateur);
  }

  async save(utilisateur: Utilisateur): Promise<Utilisateur> {
    return this.utilisateurRepo.save(utilisateur);
  }

  async findAll(role?: Role): Promise<Utilisateur[]> {
    return this.utilisateurRepo.find({
      where: role ? { role } : {},
      relations: ['profilEtudiant', 'profilClient'],
      order: { dateInscription: 'DESC' },
    });
  }

  /**
   * Fonctionnalites Admin : activation / suspension / suppression de comptes.
   */
  async setSuspendu(id: string, estSuspendu: boolean): Promise<Utilisateur> {
    const user = await this.findByIdOrFail(id);
    user.estSuspendu = estSuspendu;
    return this.utilisateurRepo.save(user);
  }

  async setActif(id: string, estActif: boolean): Promise<Utilisateur> {
    const user = await this.findByIdOrFail(id);
    user.estActif = estActif;
    return this.utilisateurRepo.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findByIdOrFail(id);
    await this.utilisateurRepo.remove(user);
  }
}
