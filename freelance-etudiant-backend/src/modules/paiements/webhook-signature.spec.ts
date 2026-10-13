import * as crypto from 'crypto';
import type { Request } from 'express';
import {
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { verifierSignatureWebhook } from './paiements.controller';

const SECRET = 'secret_webhook_test';

function requete(corps: unknown, brut?: string): Request {
  const texte = brut ?? JSON.stringify(corps);
  return { body: corps, rawBody: Buffer.from(texte) } as unknown as Request;
}
function signer(texte: string, secret = SECRET) {
  return crypto.createHmac('sha256', secret).update(texte).digest('hex');
}

describe('verifierSignatureWebhook', () => {
  const corps = { reference: 'KIANJA-1', status: 'paid' };
  const texte = JSON.stringify(corps);

  it('accepte une signature valide, avec ou sans prefixe sha256=', () => {
    expect(() => verifierSignatureWebhook(requete(corps), signer(texte), SECRET)).not.toThrow();
    expect(() =>
      verifierSignatureWebhook(requete(corps), `sha256=${signer(texte)}`, SECRET),
    ).not.toThrow();
  });

  it('refuse (503) si le secret n\'est pas configure', () => {
    expect(() => verifierSignatureWebhook(requete(corps), signer(texte), undefined)).toThrow(
      ServiceUnavailableException,
    );
  });

  it('refuse (401) une signature absente, fausse, d\'un autre secret ou non hexadecimale', () => {
    const r = requete(corps);
    expect(() => verifierSignatureWebhook(r, undefined, SECRET)).toThrow(UnauthorizedException);
    expect(() => verifierSignatureWebhook(r, 'a'.repeat(64), SECRET)).toThrow(UnauthorizedException);
    expect(() => verifierSignatureWebhook(r, signer(texte, 'autre'), SECRET)).toThrow(
      UnauthorizedException,
    );
    expect(() => verifierSignatureWebhook(r, 'zz-pas-hexa', SECRET)).toThrow(UnauthorizedException);
    expect(() => verifierSignatureWebhook(r, '', SECRET)).toThrow(UnauthorizedException);
  });

  it('refuse un corps modifie apres signature', () => {
    const signature = signer(texte);
    const falsifie = { reference: 'KIANJA-1', status: 'paid', amount: 1 };
    expect(() => verifierSignatureWebhook(requete(falsifie), signature, SECRET)).toThrow(
      UnauthorizedException,
    );
  });

  it('refuse (400) un corps qui n\'est pas un objet, meme correctement signe', () => {
    const tableau = '[1,2]';
    expect(() =>
      verifierSignatureWebhook(requete([1, 2], tableau), signer(tableau), SECRET),
    ).toThrow(BadRequestException);
  });
});
