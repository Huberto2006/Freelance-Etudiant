import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientProfile } from './entities/client-profile.entity';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { ProfileCompletionModule } from '../profile-completion/profile-completion.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClientProfile]),
    ProfileCompletionModule,
  ],
  providers: [ClientsService],
  controllers: [ClientsController],
  exports: [ClientsService],
})
export class ClientsModule {}
