import { echapperHtml, nettoyerSujet, urlHttpSure } from '../../../common/utils/html.util';
import {
  COULEURS,
  boutonAction,
  enteteEmail,
  envelopperEmail,
} from './email-layout';

export interface EmailCandidatureAccepteeData {
  nom?: string;
  titreMission: string;
  lienKianja: string;
}

export function templateCandidatureAcceptee(data: EmailCandidatureAccepteeData) {
  const subject = nettoyerSujet(`Votre candidature a été acceptée — ${data.titreMission}`);

  const salutation = data.nom ? `Bonjour ${data.nom},` : 'Bonjour,';
  const salutationHtml = echapperHtml(salutation);

  const html = envelopperEmail(`
    ${enteteEmail('Candidature acceptée !', {
      texte: 'Acceptée',
      couleurBg: '#dcfce7',
      couleurTexte: '#15803d',
    })}
    <tr>
      <td style="padding:16px 28px 8px 28px;">
        <p style="margin:0 0 16px 0;font-size:15px;color:${COULEURS.encre};line-height:1.6;">
          ${salutationHtml}
        </p>
        <p style="margin:0 0 16px 0;font-size:15px;color:${COULEURS.encre};line-height:1.6;">
          Bonne nouvelle ! Le client a sélectionné votre profil et a <strong>accepté votre candidature</strong> pour la mission suivante :
        </p>
        <div style="background:#faf7f0;border-left:4px solid ${COULEURS.succes};padding:14px 18px;border-radius:4px;margin:20px 0;">
          <p style="margin:0;font-size:16px;font-weight:bold;color:${COULEURS.encre};">
            ${echapperHtml(data.titreMission)}
          </p>
        </div>
        <p style="margin:0 0 8px 0;font-size:14px;color:${COULEURS.texteSecondaire};line-height:1.6;">
          Vous pouvez dès à présent consulter les détails du projet, échanger avec le client et préparer la réalisation de votre mission sur votre espace Kianja.
        </p>
      </td>
    </tr>
    ${boutonAction('Accéder à ma candidature', data.lienKianja, COULEURS.succes)}
    <tr>
      <td style="padding:4px 28px 24px 28px;">
        <p style="margin:0;font-size:12px;color:${COULEURS.texteSecondaire};line-height:1.6;">
          Si le bouton ci-dessus ne fonctionne pas, vous pouvez copier ce lien dans votre navigateur :<br/>
          <a href="${echapperHtml(data.lienKianja)}" style="color:${COULEURS.ocre};word-break:break-all;">${echapperHtml(data.lienKianja)}</a>
        </p>
      </td>
    </tr>
  `);

  const text = `${salutation}

Bonne nouvelle ! Votre candidature pour la mission "${data.titreMission}" a été acceptée par le client.

Vous pouvez accéder aux détails de la mission et échanger avec le client en cliquant sur le lien ci-dessous :
${data.lienKianja}

L'équipe Kianja`;

  return { subject, html, text };
}
