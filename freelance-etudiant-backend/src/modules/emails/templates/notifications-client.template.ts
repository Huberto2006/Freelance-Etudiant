import { echapperHtml, nettoyerSujet, urlHttpSure } from '../../../common/utils/html.util';
import {
  boutonAction,
  COULEURS,
  enteteEmail,
  envelopperEmail,
} from './email-layout';

interface NotificationClientData {
  nomClient?: string;
  titre: string;
  nomEtudiant: string;
  date: Date | string;
  lienKianja: string;
}

export type EmailNouvelleCandidatureClientData = NotificationClientData;
export type EmailNouvelleLivraisonClientData = NotificationClientData;
export type EmailDemandeServiceAccepteeClientData = NotificationClientData;

function formaterDate(date: Date | string): string {
  const valeur = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(valeur.getTime())) {
    return String(date);
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Indian/Antananarivo',
  }).format(valeur);
}

function creerEmailClient(
  data: NotificationClientData,
  evenement: string,
  sujet: string,
  message: string,
  libelleBouton: string,
) {
  const date = formaterDate(data.date);
  const salutation = data.nomClient
    ? `Bonjour ${data.nomClient},`
    : 'Bonjour,';
  const url = urlHttpSure(data.lienKianja);
  const safeUrl = echapperHtml(url);

  const html = envelopperEmail(`
    ${enteteEmail(evenement, {
      texte: 'Information',
      couleurBg: '#fef3c7',
      couleurTexte: '#92400e',
    })}
    <tr>
      <td style="padding:16px 28px 8px 28px;">
        <p style="margin:0 0 16px 0;font-size:15px;color:${COULEURS.encre};line-height:1.6;">
          ${echapperHtml(salutation)}
        </p>
        <p style="margin:0 0 16px 0;font-size:15px;color:${COULEURS.encre};line-height:1.6;">
          ${message}
        </p>
        <div style="background:#faf7f0;border:1px solid ${COULEURS.bordure};border-radius:8px;padding:18px 20px;margin:20px 0;">
          <p style="margin:0 0 12px 0;font-size:16px;font-weight:bold;color:${COULEURS.encre};">
            ${echapperHtml(data.titre)}
          </p>
          <p style="margin:0 0 8px 0;font-size:14px;color:${COULEURS.texteSecondaire};">
            <strong>Étudiant :</strong> ${echapperHtml(data.nomEtudiant)}
          </p>
          <p style="margin:0;font-size:14px;color:${COULEURS.texteSecondaire};">
            <strong>Date :</strong> ${echapperHtml(date)}
          </p>
        </div>
        <p style="margin:0 0 8px 0;font-size:14px;color:${COULEURS.texteSecondaire};line-height:1.6;">
          Vous pouvez consulter les détails depuis votre espace Kianja.
        </p>
      </td>
    </tr>
    ${boutonAction(libelleBouton, data.lienKianja)}
    <tr>
      <td style="padding:4px 28px 24px 28px;">
        <p style="margin:0;font-size:12px;color:${COULEURS.texteSecondaire};line-height:1.6;">
          Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
          <a href="${safeUrl}" style="color:${COULEURS.ocre};word-break:break-all;">${safeUrl}</a>
        </p>
      </td>
    </tr>
  `);

  const text = `${salutation}

${message.replace(/<[^>]*>/g, '')}

${data.titre}
Étudiant : ${data.nomEtudiant}
Date : ${date}

Consultez les détails depuis votre espace Kianja :
${url}

L'équipe Kianja`;

  return { subject: nettoyerSujet(sujet), html, text };
}

export function templateNouvelleCandidatureClient(
  data: EmailNouvelleCandidatureClientData,
) {
  return creerEmailClient(
    data,
    'Nouvelle candidature',
    'Kianja — Nouvelle candidature pour votre mission',
    `Un étudiant vient de candidater à votre mission.`,
    'Consulter la candidature',
  );
}

export function templateNouvelleLivraisonClient(
  data: EmailNouvelleLivraisonClientData,
) {
  return creerEmailClient(
    data,
    'Nouvelle livraison disponible',
    'Kianja — Nouvelle livraison à consulter',
    `Une nouvelle livraison est disponible pour votre mission.`,
    'Consulter la livraison',
  );
}

export function templateDemandeServiceAccepteeClient(
  data: EmailDemandeServiceAccepteeClientData,
) {
  return creerEmailClient(
    data,
    'Demande de service acceptée',
    'Kianja — Votre demande de service a été acceptée',
    `L'étudiant a accepté votre demande de service.`,
    'Consulter la demande',
  );
}
