import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EtudiantProfile } from './entities/etudiant-profile.entity';
import { EtudiantsService } from './etudiants.service';
import { EtudiantsController } from './etudiants.controller';
import { ProfileCompletionModule } from '../profile-completion/profile-completion.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EtudiantProfile]),
    ProfileCompletionModule,
  ],
  providers: [EtudiantsService],
  controllers: [EtudiantsController],
  exports: [EtudiantsService],
})
export class EtudiantsModule {}
