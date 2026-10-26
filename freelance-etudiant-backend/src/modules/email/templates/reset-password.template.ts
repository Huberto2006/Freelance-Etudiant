import { echapperHtml } from '../../../common/utils/html.util';
import { choisir } from '../../../common/i18n/formatage';
import { normaliserLangue, type Langue } from '../../../common/i18n/langues';
import { entete, envelopper } from './email-base';
import { RESET_PASSWORD_I18N } from './i18n/reset-password.i18n';

export interface EmailResetPassword {
  nom: string;
  lien: string;
  dureeMinutes: number;
  /** Langue du destinataire (fr par defaut). */
  langue?: Langue;
}

export function templateResetPassword(data: EmailResetPassword) {
  const langue = normaliserLangue(data.langue);
  const t = choisir(RESET_PASSWORD_I18N, langue);
  const validite = t.validite(data.dureeMinutes);
  const subject = t.sujet;

  const html = envelopper(
    `
    ${entete(t.titre)}
    <tr><td style="padding:16px 24px 8px 24px;">
      <p style="margin:0;font-size:14px;color:#2b2b28;line-height:1.7;">
        ${echapperHtml(t.bonjour(data.nom))}<br/><br/>
        ${t.intro({ validite: `<strong>${echapperHtml(validite)}</strong>` })}
      </p>
    </td></tr>
    <tr><td align="center" style="padding:20px 24px;">
      <a href="${echapperHtml(data.lien)}"
         style="display:inline-block;padding:12px 28px;background:#b8860b;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:bold;">
        ${t.bouton}
      </a>
    </td></tr>
    <tr><td style="padding:8px 24px 24px 24px;">
      <p style="margin:0;font-size:12px;color:#6b6b66;line-height:1.7;">
        ${t.lienSecours}<br/>
        <span style="word-break:break-all;color:#b8860b;">${echapperHtml(data.lien)}</span><br/><br/>
        ${t.ignorer}<br/>
        ${t.securite}
      </p>
    </td></tr>
  `,
    langue,
  );

  const text = `${t.bonjour(data.nom)}

${t.texteAmorce({ validite })}

${data.lien}

${t.ignorer}
${t.securite}`;

  return { subject, html, text };
}
