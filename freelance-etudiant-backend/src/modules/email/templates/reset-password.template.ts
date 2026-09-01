import {
  envelopper,
  entete,
} from './email-base';

export interface EmailResetPassword {
  nom: string;
  lien: string;
  dureeMinutes: number;
}

export function templateResetPassword(data: EmailResetPassword) {
  const subject = 'KIANJA - Reinitialisation de votre mot de passe';

  const html = envelopper(`
    ${entete('Nouveau mot de passe')}
    <tr><td style="padding:16px 24px 8px 24px;">
      <p style="margin:0;font-size:14px;color:#2b2b28;line-height:1.7;">
        Bonjour ${data.nom},<br/><br/>
        Vous avez demande la reinitialisation de votre mot de passe.
        Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
        Ce lien est <strong>valable ${data.dureeMinutes} minutes</strong> et
        ne peut etre utilise qu'une seule fois.
      </p>
    </td></tr>
    <tr><td align="center" style="padding:20px 24px;">
      <a href="${data.lien}"
         style="display:inline-block;padding:12px 28px;background:#b8860b;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:bold;">
        Reinitialiser mon mot de passe
      </a>
    </td></tr>
    <tr><td style="padding:8px 24px 24px 24px;">
      <p style="margin:0;font-size:12px;color:#6b6b66;line-height:1.7;">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
        <span style="word-break:break-all;color:#b8860b;">${data.lien}</span><br/><br/>
        Vous n'etes pas a l'origine de cette demande ? Ignorez cet email :
        votre mot de passe actuel reste actif.
      </p>
    </td></tr>
  `);

  const text = `Bonjour ${data.nom},

Vous avez demande la reinitialisation de votre mot de passe KIANJA.
Ouvrez ce lien (valable ${data.dureeMinutes} minutes, a usage unique) :

${data.lien}

Si vous n'etes pas a l'origine de cette demande, ignorez cet email.
Votre mot de passe actuel reste actif.`;

  return { subject, html, text };
}
