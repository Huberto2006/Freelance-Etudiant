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
import { existsSync, mkdirSync } from 'fs';
import { UploadsService } from './uploads.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UseGuards } from '@nestjs/common';

/**
 * Garantit l'existence du repertoire de destination avant l'ecriture du
 * fichier par Multer. Sans cela, l'upload echoue avec ENOENT tant que le
 * dossier n'a pas ete cree manuellement sur le serveur.
 */
function assurerRepertoire(destination: string): string {
  if (!existsSync(destination)) {
    mkdirSync(destination, { recursive: true });
  }
  return destination;
}

/**
 * Verifie que l'EXTENSION du fichier correspond a une liste blanche
 * (voir extensionsAutorisees). Le MIME declare par le client est
 * falsifiable : sans controle d'extension, un fichier nomme "x.svg" (ou
 * "x.html") envoye avec le MIME image/png serait stocke tel quel puis
 * servi par express.static avec un Content-Type executant du script dans
 * le navigateur (vecteur XSS). L'extension doit donc elle-meme appartenir
 * a la liste des types de contenu autorises.
 */
function verifierExtension(
  file: { originalname: string },
  extensionsAutorisees: readonly string[],
  message: string,
  cb: (error: Error | null, acceptFile: boolean) => void,
): void {
  const extension = extname(file.originalname).toLowerCase();
  if (!extensionsAutorisees.includes(extension)) {
    return cb(new BadRequestException(message), false);
  }
  cb(null, true);
}

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
          cb(null, assurerRepertoire('uploads/profiles'));
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

        // Le MIME declare ne suffit pas : l'extension doit appartenir au
        // meme ensemble (protection XSS via extension falsifiee).
        return verifierExtension(
          file,
          ['.jpg', '.jpeg', '.png', '.webp'],
          'Format non supporté. Utilisez JPG, PNG ou WebP.',
          cb,
        );
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
          cb(null, assurerRepertoire('uploads/documents'));
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

        // Extension whitelistee en coherence avec les MIME ci-dessus.
        return verifierExtension(
          file,
          [
            '.pdf',
            '.doc',
            '.docx',
            '.xls',
            '.xlsx',
            '.zip',
            '.rar',
            '.jpg',
            '.jpeg',
            '.png',
            '.webp',
            '.txt',
          ],
          'Format non supporté. Utilisez PDF, Word, Excel, une image, une archive ou un fichier texte.',
          cb,
        );
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