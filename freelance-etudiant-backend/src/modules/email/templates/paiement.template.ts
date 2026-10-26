import { echapperHtml, nettoyerSujet } from '../../../common/utils/html.util';
import { choisir } from '../../../common/i18n/formatage';
import { normaliserLangue, type Langue } from '../../../common/i18n/langues';
import { entete, envelopper, formaterArgentEmail } from './email-base';
import { PAIEMENT_I18N, type TypePaiementEmail } from './i18n/paiement.i18n';

export interface EmailPaiement {
  nom: string;
  titreMission: string;
  montant: number;
  reference: string;
  /** Langue du destinataire (fr par defaut). */
  langue?: Langue;
}

function rendrePaiement(type: TypePaiementEmail, data: EmailPaiement) {
  const langue = normaliserLangue(data.langue);
  const textes = choisir(PAIEMENT_I18N, langue);
  const t = textes.evenements[type];
  const montant = formaterArgentEmail(data.montant, langue);

  const subject = nettoyerSujet(t.sujet(data.titreMission));

  const html = envelopper(
    `
    ${entete(t.titre)}
    <tr><td style="padding:16px 24px;">
      <p style="margin:0;font-size:14px;color:#2b2b28;line-height:1.7;">
        ${echapperHtml(textes.bonjour(data.nom))}<br/><br/>
        ${t.corps({
          montant: `<strong style="color:#b8860b;">${echapperHtml(montant)}</strong>`,
          mission: `<strong>"${echapperHtml(data.titreMission)}"</strong>`,
          reference: echapperHtml(data.reference),
        })}
      </p>
    </td></tr>
    <tr><td style="padding:0 24px 16px 24px;">
      <p style="margin:0;font-size:12px;color:#6b6b66;line-height:1.7;">
        ${textes.securite}
      </p>
    </td></tr>
  `,
    langue,
  );

  const text = `${textes.bonjour(data.nom)}

${t.corps({
  montant,
  mission: `"${data.titreMission}"`,
  reference: data.reference,
})}

${textes.securite}`;

  return { subject, html, text };
}

export function templatePaiementInitie(data: EmailPaiement) {
  return rendrePaiement('initie', data);
}

export function templatePaiementConfirme(data: EmailPaiement) {
  return rendrePaiement('confirme', data);
}

export function templatePaiementLibere(data: EmailPaiement) {
  return rendrePaiement('libere', data);
}
