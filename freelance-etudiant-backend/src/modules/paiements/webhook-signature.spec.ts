import * as crypto from 'crypto';
import type { Request } from 'express';
import {
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { verifierSignaturePapi, verifierSignatureWebhook } from './paiements.controller';

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

describe('verifierSignaturePapi (X-Papi-Signature : t=<unix>,v1=<hex>)', () => {
  const SECRET_PAPI = `pwhsec_${'a'.repeat(64)}`;
  const T = 1757750400;
  const corps = { merchantPaymentReference: 'KIANJA-1', paymentStatus: 'SUCCESS' };
  const texte = JSON.stringify(corps);
  const signerPapi = (t: number, brut: string, secret = SECRET_PAPI) =>
    crypto.createHmac('sha256', secret).update(`${t}.${brut}`).digest('hex');
  const entete = (t = T, brut = texte, secret = SECRET_PAPI) =>
    `t=${t},v1=${signerPapi(t, brut, secret)}`;

  it('accepte une signature valide dans la fenetre de 300 s', () => {
    expect(() => verifierSignaturePapi(requete(corps), entete(), SECRET_PAPI, T + 10)).not.toThrow();
    expect(() => verifierSignaturePapi(requete(corps), entete(), SECRET_PAPI, T + 300)).not.toThrow();
  });

  it('refuse (401) un horodatage hors fenetre (rejeu)', () => {
    expect(() => verifierSignaturePapi(requete(corps), entete(), SECRET_PAPI, T + 301)).toThrow(
      UnauthorizedException,
    );
    expect(() => verifierSignaturePapi(requete(corps), entete(), SECRET_PAPI, T - 301)).toThrow(
      UnauthorizedException,
    );
  });

  it('refuse (401) une signature calculee sans l\'horodatage (ancien format)', () => {
    const ancien = `t=${T},v1=${signer(texte, SECRET_PAPI)}`;
    expect(() => verifierSignaturePapi(requete(corps), ancien, SECRET_PAPI, T)).toThrow(
      UnauthorizedException,
    );
  });

  it('refuse (401) si le prefixe pwhsec_ est retire du secret', () => {
    const sansPrefixe = SECRET_PAPI.replace('pwhsec_', '');
    expect(() => verifierSignaturePapi(requete(corps), entete(), sansPrefixe, T)).toThrow(
      UnauthorizedException,
    );
  });

  it('refuse (401) un horodatage modifie, un corps modifie, un en-tete absent ou mal forme', () => {
    const e = entete();
    expect(() =>
      verifierSignaturePapi(requete(corps), e.replace(`t=${T}`, `t=${T + 1}`), SECRET_PAPI, T),
    ).toThrow(UnauthorizedException);
    expect(() =>
      verifierSignaturePapi(requete({ ...corps, paymentStatus: 'FAILED' }), e, SECRET_PAPI, T),
    ).toThrow(UnauthorizedException);
    for (const mauvais of [undefined, '', 'v1=abc', `t=${T}`, `t=${T},v1=zz`, 'sha256=' + 'a'.repeat(64)]) {
      expect(() => verifierSignaturePapi(requete(corps), mauvais, SECRET_PAPI, T)).toThrow(
        UnauthorizedException,
      );
    }
  });

  it('refuse (503) sans secret configure et (400) pour un corps non objet signe', () => {
    expect(() => verifierSignaturePapi(requete(corps), entete(), undefined, T)).toThrow(
      ServiceUnavailableException,
    );
    const tableau = '[1,2]';
    expect(() =>
      verifierSignaturePapi(requete([1, 2], tableau), entete(T, tableau), SECRET_PAPI, T),
    ).toThrow(BadRequestException);
  });
});
