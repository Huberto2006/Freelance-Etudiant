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

describe('verifierSignaturePapi — vecteur de test officiel (docs.papi.mg, securing-notifications)', () => {
  // Valeurs publiees par Papi pour valider une implementation.
  const SECRET_DOC = 'pwhsec_5f1c2b7e9a0d4c3b8e6f1a2d9c7b4e0f3a6d8c1b5e9f2a7d4c0b3e6f9a1d8c2b';
  const BRUT_DOC = '{"paymentReference":"PAPI-TEST-0001","paymentStatus":"SUCCESS","amount":150000}';
  const ENTETE_DOC = 't=1757750400,v1=66c446f11f07c733a8ded2580681d7e0430cc490637479178506fd2a66595d53';
  const req = () => requete(JSON.parse(BRUT_DOC), BRUT_DOC);

  it('accepte exactement l\'en-tete attendu par la documentation', () => {
    expect(() => verifierSignaturePapi(req(), ENTETE_DOC, SECRET_DOC, 1757750400)).not.toThrow();
  });

  it('refuse le meme corps re-serialise (espace ajoute) : le corps BRUT est signe', () => {
    const reserialise = BRUT_DOC.replace(':"SUCCESS"', ': "SUCCESS"');
    expect(() =>
      verifierSignaturePapi(requete(JSON.parse(BRUT_DOC), reserialise), ENTETE_DOC, SECRET_DOC, 1757750400),
    ).toThrow(UnauthorizedException);
  });

  it('refuse le vecteur officiel rejoue apres 300 s (anti-rejeu)', () => {
    expect(() => verifierSignaturePapi(req(), ENTETE_DOC, SECRET_DOC, 1757750400 + 301)).toThrow(
      /expiree/,
    );
  });

  it('refuse le secret sans son prefixe pwhsec_', () => {
    expect(() =>
      verifierSignaturePapi(req(), ENTETE_DOC, SECRET_DOC.replace('pwhsec_', ''), 1757750400),
    ).toThrow(UnauthorizedException);
  });
});
