import {
  envelopper,
  entete,
} from './email-base';

export interface EmailVerification {
  nom: string;
  lien: string;
  dureeHeures: number;
}

export function templateVerificationEmail(data: EmailVerification) {
  const subject = 'KIANJA - Verifiez votre adresse email';

  const html = envelopper(`
    ${entete('Verification de votre adresse email')}
    <tr><td style="padding:16px 24px 8px 24px;">
      <p style="margin:0;font-size:14px;color:#2b2b28;line-height:1.7;">
        Bonjour ${data.nom},<br/><br/>
        Bienvenue sur KIANJA ! Pour activer votre compte, confirmez votre
        adresse email en cliquant sur le bouton ci-dessous.
        Ce lien est <strong>valable ${data.dureeHeures} heures</strong> et ne
        peut etre utilise qu'une seule fois.
      </p>
    </td></tr>
    <tr><td align="center" style="padding:20px 24px;">
      <a href="${data.lien}"
         style="display:inline-block;padding:12px 28px;background:#b8860b;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:bold;">
        Verifier mon adresse email
      </a>
    </td></tr>
    <tr><td style="padding:8px 24px 24px 24px;">
      <p style="margin:0;font-size:12px;color:#6b6b66;line-height:1.7;">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
        <span style="word-break:break-all;color:#b8860b;">${data.lien}</span><br/><br/>
        Vous n'etes pas a l'origine de cette inscription ? Ignorez cet email :
        aucun compte ne sera active.
      </p>
    </td></tr>
  `);

  const text = `Bonjour ${data.nom},

Bienvenue sur KIANJA ! Pour activer votre compte, verifiez votre adresse email en ouvrant ce lien (valable ${data.dureeHeures} heures, a usage unique) :

${data.lien}

Si vous n'etes pas a l'origine de cette inscription, ignorez cet email : aucun compte ne sera active.`;

  return { subject, html, text };
}