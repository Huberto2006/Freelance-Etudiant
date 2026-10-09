import { AddressInfo } from 'node:net';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CommentairesController } from './commentaires.controller';
import { CommentairesService } from './commentaires.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TypeCibleContenu } from '../../common/enums/type-cible-contenu.enum';

describe('CommentairesController GET /commentaires', () => {
  let app: INestApplication;
  let baseUrl: string;
  const commentairesService = {
    findByCible: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CommentairesController],
      providers: [
        { provide: CommentairesService, useValue: commentairesService },
        { provide: RolesGuard, useValue: { canActivate: () => true } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.listen(0, '127.0.0.1');

    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}/api/v1/commentaires`;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    commentairesService.findByCible.mockClear();
  });

  it('refuse une requete sans filtre au lieu de lister toute la table', async () => {
    const response = await fetch(baseUrl);

    expect(response.status).toBe(400);
    expect(commentairesService.findByCible).not.toHaveBeenCalled();
  });

  it('refuse un type de cible inconnu', async () => {
    const response = await fetch(`${baseUrl}?cibleType=utilisateur&cibleId=018e2b4c-0000-4000-8000-000000000000`);

    expect(response.status).toBe(400);
    expect(commentairesService.findByCible).not.toHaveBeenCalled();
  });

  it('refuse un identifiant de cible mal forme', async () => {
    const response = await fetch(`${baseUrl}?cibleType=mission&cibleId=not-a-uuid`);

    expect(response.status).toBe(400);
    expect(commentairesService.findByCible).not.toHaveBeenCalled();
  });

  it('conserve la lecture publique filtree pour une mission valide', async () => {
    const cibleId = '018e2b4c-0000-4000-8000-000000000000';
    const response = await fetch(
      `${baseUrl}?cibleType=${TypeCibleContenu.MISSION}&cibleId=${cibleId}`,
    );

    expect(response.status).toBe(200);
    expect(commentairesService.findByCible).toHaveBeenCalledWith(
      TypeCibleContenu.MISSION,
      cibleId,
    );
  });
});
