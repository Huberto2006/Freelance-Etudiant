import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { UploadsService } from './uploads.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UseGuards } from '@nestjs/common';

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly uploadsService: UploadsService,
  ) {}

  @UseGuards(RolesGuard)
  @Roles(Role.ETUDIANT, Role.CLIENT)
  @Post('profile')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, 'uploads/profiles');
        },

        filename: (req, file, cb) => {
          const extension = extname(file.originalname);
          const filename = `${randomUUID()}${extension}`;

          cb(null, filename);
        },
      }),

      limits: {
        fileSize: 5 * 1024 * 1024,
      },

      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
        ];

        if (!allowedTypes.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Format non supporté. Utilisez JPG, PNG ou WebP.',
            ),
            false,
          );
        }

        cb(null, true);
      },
    }),
  )
  async uploadProfile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Aucune image n’a été envoyée.',
      );
    }

    return this.uploadsService.saveProfilePhoto(
      user.id,
      file.filename,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ETUDIANT, Role.CLIENT)
  @Post('document')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, 'uploads/documents');
        },

        filename: (req, file, cb) => {
          const extension = extname(file.originalname);
          const filename = `${randomUUID()}${extension}`;

          cb(null, filename);
        },
      }),

      limits: {
        fileSize: 15 * 1024 * 1024,
      },

      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/zip',
          'application/x-zip-compressed',
          'application/x-rar-compressed',
          'image/jpeg',
          'image/png',
          'image/webp',
          'text/plain',
        ];

        if (!allowedTypes.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Format non supporté. Utilisez PDF, Word, Excel, une image, une archive ou un fichier texte.',
            ),
            false,
          );
        }

        cb(null, true);
      },
    }),
  )
  async uploadDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier n’a été envoyé.');
    }

    return this.uploadsService.formatDocumentResponse(file);
  }
}