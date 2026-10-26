/**
 * Socle HTML commun des emails transactionnels KIANJA.
 *
 * Conventions :
 * - HTML inline (compatibilite maximale avec les clients mail).
 * - Aucune donnee sensible dans les templates (jamais de mot de passe,
 *   un lien a usage unique uniquement).
 * - Langue : chaque email est rendu dans la langue du destinataire
 *   (fr par defaut), attribut `lang` du HTML compris.
 */

import {
  choisir,
  formaterMontantAr,
} from '../../../common/i18n/formatage';
import { normaliserLangue } from '../../../common/i18n/langues';
import { BASE_I18N } from './i18n/base.i18n';

const MARQUE = 'KIANJA';

const COULEURS = {
  ocre: '#b8860b',
  encre: '#2b2b28',
  doux: '#6b6b66',
  fond: '#faf7f0',
  carte: '#ffffff',
};

export function entete(titre: string): string {
  return `
  <tr>
    <td style="padding:24px 24px 8px 24px;">
      <p style="margin:0;font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;color:${COULEURS.ocre};text-transform:uppercase;">${MARQUE}</p>
      <h1 style="margin:8px 0 0 0;font-family:Georgia,serif;font-size:22px;color:${COULEURS.encre};">${titre}</h1>
    </td>
  </tr>`;
}

export function envelopper(interior: string, langue?: unknown): string {
  const l = normaliserLangue(langue);
  const textes = choisir(BASE_I18N, l);
  return `<!DOCTYPE html>
<html lang="${l}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${COULEURS.fond};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COULEURS.fond};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${COULEURS.carte};border-radius:10px;border:1px solid #e8e2d5;">
        ${interior}
        <tr>
          <td style="padding:16px 24px 28px 24px;border-top:1px solid #efe9dc;">
            <p style="margin:0;font-size:12px;color:${COULEURS.doux};line-height:1.6;">
              ${textes.piedPage}<br/>
              ${textes.piedPageSecurite}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Montant en Ariary uniquement (jamais de conversion), selon la langue. */
export function formaterArgentEmail(montant: number, langue?: unknown): string {
  return formaterMontantAr(montant, langue);
}
