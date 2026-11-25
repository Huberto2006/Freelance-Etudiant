import { echapperHtml } from '../../../common/utils/html.util';
import { normaliserLangue, type Langue } from '../../../common/i18n/langues';
import { entete, envelopper } from './email-base';

export interface EmailNouvelleConnexion {
  nom: string;
  typeAppareil: string;
  navigateur: string;
  systemeExploitation: string;
  adresseIp: string;
  dateConnexion: Date;
  lienSessions: string;
  langue?: Langue;
}

export function templateNouvelleConnexion(data: EmailNouvelleConnexion) {
  const langue = normaliserLangue(data.langue);
  const dateFormatee = data.dateConnexion.toLocaleString('fr-FR', {
    timeZone: 'Indian/Antananarivo',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const subject =
    langue === 'mg'
      ? 'Fampandrenesana momba ny fidirana vaovao (Kianja)'
      : langue === 'en'
        ? 'Security alert: New login to your account (Kianja)'
        : 'Alerte sécurité : Nouvelle connexion à votre compte (Kianja)';

  const titre =
    langue === 'mg'
      ? 'Fidirana vaovao voamarika'
      : langue === 'en'
        ? 'New login detected'
        : 'Nouvelle connexion détectée';

  const html = envelopper(
    `
    ${entete(titre)}
    <tr><td style="padding:16px 24px 8px 24px;">
      <p style="margin:0;font-size:14px;color:#2b2b28;line-height:1.7;">
        Bonjour <strong>${echapperHtml(data.nom)}</strong>,<br/><br/>
        Une nouvelle session vient d'être ouverte sur votre compte Kianja. Les informations d'appareil et de navigateur sont indicatives.
      </p>
    </td></tr>
    <tr><td style="padding:8px 24px;">
      <table role="presentation" width="100%" cellpadding="8" cellspacing="0" style="background:#fdfbf7;border:1px solid #e8e2d5;border-radius:6px;font-size:13px;color:#2b2b28;">
        <tr>
          <td style="width:140px;color:#6b6b66;font-weight:bold;">Navigateur & OS :</td>
          <td>${echapperHtml(data.navigateur)} sur ${echapperHtml(data.systemeExploitation)}</td>
        </tr>
        <tr>
          <td style="color:#6b6b66;font-weight:bold;">Type d'appareil :</td>
          <td style="text-transform:capitalize;">${echapperHtml(data.typeAppareil)}</td>
        </tr>
        <tr>
          <td style="color:#6b6b66;font-weight:bold;">Adresse IP :</td>
          <td>${echapperHtml(data.adresseIp)}</td>
        </tr>
        <tr>
          <td style="color:#6b6b66;font-weight:bold;">Date et heure :</td>
          <td>${echapperHtml(dateFormatee)} (heure de Madagascar)</td>
        </tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:20px 24px;">
      <a href="${echapperHtml(data.lienSessions)}"
         style="display:inline-block;padding:12px 28px;background:#b8860b;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:bold;">
        Gérer mes sessions actives
      </a>
    </td></tr>
    <tr><td style="padding:8px 24px 24px 24px;">
      <p style="margin:0;font-size:12px;color:#6b6b66;line-height:1.7;">
        Si vous êtes à l'origine de cette connexion, aucune action n'est requise.<br/>
        <strong>Si ce n'est pas vous</strong>, déconnectez immédiatement cet appareil depuis vos paramètres de sécurité et changez votre mot de passe sans attendre.
      </p>
    </td></tr>
  `,
    langue,
  );

  const text = `Bonjour ${data.nom},

Une nouvelle session a votre compte Kianja vient d'etre ouverte :
- Appareil : ${data.navigateur} sur ${data.systemeExploitation} (${data.typeAppareil})
- Adresse IP : ${data.adresseIp}
- Date : ${dateFormatee}

Si ce n'est pas vous, deconnectez immediatement cet appareil depuis :
${data.lienSessions}`;

  return { subject, html, text };
}
