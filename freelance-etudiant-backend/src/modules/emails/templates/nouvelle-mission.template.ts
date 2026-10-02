import {
  COULEURS,
  boutonAction,
  enteteEmail,
  envelopperEmail,
} from './email-layout';

export interface EmailNouvelleMissionData {
  nom?: string;
  titre: string;
  description: string;
  categorie?: string;
  budget: number;
  dateLimite: string;
  lienMission: string;
}

export function formaterMontantAr(montant: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(montant)} Ar`;
}

export function templateNouvelleMission(data: EmailNouvelleMissionData) {
  const subject = `Nouvelle mission disponible — ${data.titre}`;

  const salutation = data.nom ? `Bonjour ${data.nom},` : 'Bonjour,';
  const categorieHtml = data.categorie
    ? `<span style="display:inline-block;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600;background:#f3f4f6;color:${COULEURS.encre};margin-bottom:8px;">${data.categorie}</span>`
    : '';

  const courteDescription =
    data.description.length > 250
      ? `${data.description.slice(0, 247).trim()}...`
      : data.description;

  const html = envelopperEmail(`
    ${enteteEmail('Nouvelle mission pour vous', {
      texte: 'Nouvelle opportunité',
      couleurBg: '#fef3c7',
      couleurTexte: '#92400e',
    })}
    <tr>
      <td style="padding:16px 28px 8px 28px;">
        <p style="margin:0 0 16px 0;font-size:15px;color:${COULEURS.encre};line-height:1.6;">
          ${salutation}
        </p>
        <p style="margin:0 0 16px 0;font-size:15px;color:${COULEURS.encre};line-height:1.6;">
          Une nouvelle mission correspondant à vos compétences et votre profil vient d'être publiée sur Kianja :
        </p>
        <div style="background:#faf7f0;border:1px solid ${COULEURS.bordure};border-radius:8px;padding:18px 20px;margin:20px 0;">
          ${categorieHtml}
          <h2 style="margin:4px 0 10px 0;font-size:17px;color:${COULEURS.encre};font-weight:bold;">
            ${data.titre}
          </h2>
          <p style="margin:0 0 14px 0;font-size:14px;color:${COULEURS.texteSecondaire};line-height:1.6;">
            ${courteDescription}
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e8e2d5;padding-top:12px;margin-top:12px;">
            <tr>
              <td style="font-size:13px;color:${COULEURS.texteSecondaire};">
                <strong>Budget :</strong> <span style="color:${COULEURS.ocre};font-weight:bold;font-size:15px;">${formaterMontantAr(data.budget)}</span>
              </td>
              <td align="right" style="font-size:13px;color:${COULEURS.texteSecondaire};">
                <strong>Date limite :</strong> ${data.dateLimite}
              </td>
            </tr>
          </table>
        </div>
        <p style="margin:0 0 8px 0;font-size:14px;color:${COULEURS.texteSecondaire};line-height:1.6;">
          Ne tardez pas à déposer votre proposition pour maximiser vos chances d'être sélectionné par le client.
        </p>
      </td>
    </tr>
    ${boutonAction('Voir la mission et postuler', data.lienMission, COULEURS.ocre)}
    <tr>
      <td style="padding:4px 28px 24px 28px;">
        <p style="margin:0;font-size:12px;color:${COULEURS.texteSecondaire};line-height:1.6;">
          Lien direct vers la mission :<br/>
          <a href="${data.lienMission}" style="color:${COULEURS.ocre};word-break:break-all;">${data.lienMission}</a>
        </p>
      </td>
    </tr>
  `);

  const text = `${salutation}

Une nouvelle mission vient d'être publiée sur Kianja :
Titre : ${data.titre}
${data.categorie ? `Catégorie : ${data.categorie}\n` : ''}Description : ${courteDescription}
Budget : ${formaterMontantAr(data.budget)}
Date limite : ${data.dateLimite}

Consultez tous les détails et déposez votre candidature ici :
${data.lienMission}

L'équipe Kianja`;

  return { subject, html, text };
}
