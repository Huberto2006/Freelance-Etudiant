import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EtudiantProfile } from './entities/etudiant-profile.entity';
import { EtudiantsService } from './etudiants.service';
import { EtudiantsController } from './etudiants.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EtudiantProfile])],
  providers: [EtudiantsService],
  controllers: [EtudiantsController],
  exports: [EtudiantsService],
})
export class EtudiantsModule {}
