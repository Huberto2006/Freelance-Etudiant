import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { IsString, MaxLength } from 'class-validator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { UploadsService } from './uploads.service';
import { Public } from '../../common/decorators/public.decorator';
import { join as joinPath } from 'path';
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

/** Limite dediee aux envois de fichiers (disque + bande passante). */
const LIMITE_UPLOAD = { default: { limit: 20, ttl: 60000 } };

class LienDocumentDto {
  @IsString()
  @MaxLength(300)
  url: string;
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
  @Throttle(LIMITE_UPLOAD)
  @Post('profile')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, assurerRepertoire('uploads/profiles'));
        },

        filename: (req, file, cb) => {
          const extension = extname(file.originalname).toLowerCase();
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

    await this.uploadsService.verifierContenu(file);

    return this.uploadsService.saveProfilePhoto(
      user.id,
      file.filename,
    );
  }

  /**
   * Image de mission ou de service : endpoint DEDIE aux images (JPG, PNG,
   * WebP). Avant, le selecteur d'image passait par /uploads/document qui
   * accepte aussi PDF, archives et texte. Les fichiers vont dans
   * uploads/images ; ceux qui ne sont plus references par aucune mission
   * ni service sont purges automatiquement (voir UploadsService).
   */
  @UseGuards(RolesGuard)
  @Roles(Role.ETUDIANT, Role.CLIENT)
  @Throttle(LIMITE_UPLOAD)
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, assurerRepertoire('uploads/images'));
        },

        filename: (req, file, cb) => {
          const extension = extname(file.originalname).toLowerCase();
          cb(null, `${randomUUID()}${extension}`);
        },
      }),

      limits: {
        fileSize: 5 * 1024 * 1024,
      },

      fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

        if (!allowedTypes.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Format non supporté. Utilisez JPG, PNG ou WebP.',
            ),
            false,
          );
        }

        return verifierExtension(
          file,
          ['.jpg', '.jpeg', '.png', '.webp'],
          'Format non supporté. Utilisez JPG, PNG ou WebP.',
          cb,
        );
      },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucune image n’a été envoyée.');
    }

    await this.uploadsService.verifierContenu(file);

    return this.uploadsService.formatImageResponse(file);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ETUDIANT, Role.CLIENT)
  @Throttle(LIMITE_UPLOAD)
  @Post('document')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, assurerRepertoire('uploads/documents'));
        },

        filename: (req, file, cb) => {
          const extension = extname(file.originalname).toLowerCase();
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

    await this.uploadsService.verifierContenu(file);

    return this.uploadsService.formatDocumentResponse(file);
  }

  /**
   * Les documents (livrables, pieces jointes de messages, cahiers des
   * charges) ne sont PLUS servis statiquement. Le client demande ici un
   * lien valable 60 s ; le serveur verifie qu'il est participant de l'objet
   * qui reference le fichier.
   */
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Post('document/lien')
  async lienDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LienDocumentDto,
  ) {
    return this.uploadsService.genererLienDocument(user.id, user.role, dto.url);
  }

  /**
   * Telechargement d'un document avec un ticket signe (pas de Bearer : le
   * lien est ouvert dans un nouvel onglet). Toujours servi en piece jointe,
   * sans sniffing et sans execution possible dans le navigateur.
   */
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get('documents/:nom')
  async telechargerDocument(
    @Param('nom') nom: string,
    @Query('t') ticket: string | undefined,
    @Res() res: Response,
  ) {
    if (!this.uploadsService.verifierTicket(nom, ticket)) {
      throw new NotFoundException('Document introuvable');
    }
    const chemin = this.uploadsService.cheminDocument(nom);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', `attachment; filename="${nom}"`);
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    res.sendFile(joinPath(chemin), { dotfiles: 'deny' });
  }
}