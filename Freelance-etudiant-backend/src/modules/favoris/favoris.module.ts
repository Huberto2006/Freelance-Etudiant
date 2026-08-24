import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favori } from './entities/favori.entity';
import { FavorisService } from './favoris.service';
import { FavorisController } from './favoris.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Favori])],
  providers: [FavorisService],
  controllers: [FavorisController],
})
export class FavorisModule {}
