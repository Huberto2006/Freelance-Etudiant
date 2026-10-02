/**
 * Socle HTML commun des emails transactionnels Kianja.
 * Conçu pour un rendu propre, responsive et compatible avec tous les clients email.
 */

export const COULEURS = {
  ocre: '#b8860b',
  ocreClair: '#d4af37',
  encre: '#2b2b28',
  texteSecondaire: '#6b6b66',
  fond: '#faf7f0',
  carte: '#ffffff',
  bordure: '#e8e2d5',
  succes: '#16a34a',
  neutre: '#4b5563',
};

export function enteteEmail(titre: string, badge?: { texte: string; couleurBg: string; couleurTexte: string }): string {
  const badgeHtml = badge
    ? `<span style="display:inline-block;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;background:${badge.couleurBg};color:${badge.couleurTexte};margin-bottom:8px;">${badge.texte}</span>`
    : '';

  return `
    <tr>
      <td style="padding:28px 28px 12px 28px;">
        <p style="margin:0 0 6px 0;font-family:'Courier New',Courier,monospace;font-size:12px;letter-spacing:2px;color:${COULEURS.ocre};text-transform:uppercase;font-weight:bold;">KIANJA</p>
        ${badgeHtml}
        <h1 style="margin:4px 0 0 0;font-family:Georgia,serif;font-size:22px;line-height:1.3;color:${COULEURS.encre};font-weight:700;">${titre}</h1>
      </td>
    </tr>
  `;
}

export function boutonAction(libelle: string, url: string, couleur = COULEURS.ocre): string {
  return `
    <tr>
      <td align="center" style="padding:20px 28px;">
        <a href="${url}"
           target="_blank"
           style="display:inline-block;padding:12px 28px;background:${couleur};color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:bold;letter-spacing:0.3px;">
          ${libelle}
        </a>
      </td>
    </tr>
  `;
}

export function envelopperEmail(corps: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>KIANJA</title>
</head>
<body style="margin:0;padding:0;background:${COULEURS.fond};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COULEURS.fond};padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${COULEURS.carte};border-radius:10px;border:1px solid ${COULEURS.bordure};overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          ${corps}
          <tr>
            <td style="padding:16px 28px 24px 28px;border-top:1px solid #efe9dc;background:#fcfbf8;">
              <p style="margin:0;font-size:12px;color:${COULEURS.texteSecondaire};line-height:1.6;">
                Vous recevez cet email car vous êtes inscrit sur <strong>Kianja</strong>.<br/>
                Plateforme de mise en relation entre étudiants freelances et clients.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
