import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favori } from './entities/favori.entity';
import { FavorisService } from './favoris.service';
import { FavorisController } from './favoris.controller';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [TypeOrmModule.forFeature([Favori]), CommonModule],
  providers: [FavorisService],
  controllers: [FavorisController],
})
export class FavorisModule {}
