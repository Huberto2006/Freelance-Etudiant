import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favori } from './entities/favori.entity';
import { FavorisService } from './favoris.service';
import { FavorisController } from './favoris.controller';
import { CiblesModule } from '../cibles/cibles.module';

@Module({
  imports: [TypeOrmModule.forFeature([Favori]), CiblesModule],
  providers: [FavorisService],
  controllers: [FavorisController],
})
export class FavorisModule {}
