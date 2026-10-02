import {
  COULEURS,
  boutonAction,
  enteteEmail,
  envelopperEmail,
} from './email-layout';

export interface EmailCandidatureRefuseeData {
  nom?: string;
  titreMission: string;
  lienKianja: string;
}

export function templateCandidatureRefusee(data: EmailCandidatureRefuseeData) {
  const subject = `Mise à jour de votre candidature — ${data.titreMission}`;

  const salutation = data.nom ? `Bonjour ${data.nom},` : 'Bonjour,';

  const html = envelopperEmail(`
    ${enteteEmail('Mise à jour de candidature', {
      texte: 'Information',
      couleurBg: '#f3f4f6',
      couleurTexte: '#4b5563',
    })}
    <tr>
      <td style="padding:16px 28px 8px 28px;">
        <p style="margin:0 0 16px 0;font-size:15px;color:${COULEURS.encre};line-height:1.6;">
          ${salutation}
        </p>
        <p style="margin:0 0 16px 0;font-size:15px;color:${COULEURS.encre};line-height:1.6;">
          Nous vous informons que votre candidature pour la mission suivante n'a pas été retenue par le client :
        </p>
        <div style="background:#faf7f0;border-left:4px solid ${COULEURS.neutre};padding:14px 18px;border-radius:4px;margin:20px 0;">
          <p style="margin:0;font-size:16px;font-weight:bold;color:${COULEURS.encre};">
            ${data.titreMission}
          </p>
        </div>
        <p style="margin:0 0 16px 0;font-size:14px;color:${COULEURS.texteSecondaire};line-height:1.6;">
          Le choix des candidats dépend de critères spécifiques et le nombre de places est limité. De nombreuses autres opportunités correspondant à votre profil sont régulièrement publiées sur la plateforme.
        </p>
        <p style="margin:0 0 8px 0;font-size:14px;color:${COULEURS.texteSecondaire};line-height:1.6;">
          Nous vous encourageons vivement à continuer à postuler aux missions disponibles.
        </p>
      </td>
    </tr>
    ${boutonAction("Découvrir d'autres missions", data.lienKianja, COULEURS.ocre)}
    <tr>
      <td style="padding:4px 28px 24px 28px;">
        <p style="margin:0;font-size:12px;color:${COULEURS.texteSecondaire};line-height:1.6;">
          Lien vers la plateforme :<br/>
          <a href="${data.lienKianja}" style="color:${COULEURS.ocre};word-break:break-all;">${data.lienKianja}</a>
        </p>
      </td>
    </tr>
  `);

  const text = `${salutation}

Nous vous informons que votre candidature pour la mission "${data.titreMission}" n'a pas été retenue par le client.

De nouvelles opportunités correspondant à vos compétences sont régulièrement publiées sur Kianja. N'hésitez pas à consulter les offres en cours :
${data.lienKianja}

L'équipe Kianja`;

  return { subject, html, text };
}
