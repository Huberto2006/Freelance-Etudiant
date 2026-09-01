import {
  entete,
  envelopper,
  formaterArgentEmail,
} from './email-base';

export interface EmailPaiement {
  nom: string;
  titreMission: string;
  montant: number;
  reference: string;
}

export function templatePaiementInitie(data: EmailPaiement) {
  const subject = `KIANJA - Paiement declare pour "${data.titreMission}"`;

  const html = envelopper(`
    ${entete('Paiement declare')}
    <tr><td style="padding:16px 24px;">
      <p style="margin:0;font-size:14px;color:#2b2b28;line-height:1.7;">
        Bonjour ${data.nom},<br/><br/>
        Le client a declare un paiement de
        <strong style="color:#b8860b;">${formaterArgentEmail(data.montant)}</strong>
        pour la mission <strong>"${data.titreMission}"</strong>
        (ref. ${data.reference}).
        Il sera verifie par la plateforme avant le debut du travail.
      </p>
    </td></tr>
  `);

  const text = `Bonjour ${data.nom},

Le client a declare un paiement de ${formaterArgentEmail(data.montant)} pour la mission "${data.titreMission}" (ref. ${data.reference}).
Il sera verifie par la plateforme avant le debut du travail.`;

  return { subject, html, text };
}

export function templatePaiementConfirme(data: EmailPaiement) {
  const subject = `KIANJA - Paiement confirme pour "${data.titreMission}"`;

  const html = envelopper(`
    ${entete('Paiement confirme')}
    <tr><td style="padding:16px 24px;">
      <p style="margin:0;font-size:14px;color:#2b2b28;line-height:1.7;">
        Bonjour ${data.nom},<br/><br/>
        Le paiement de
        <strong style="color:#b8860b;">${formaterArgentEmail(data.montant)}</strong>
        pour la mission <strong>"${data.titreMission}"</strong>
        (ref. ${data.reference}) a ete verifie et confirme par la plateforme.
      </p>
    </td></tr>
  `);

  const text = `Bonjour ${data.nom},

Le paiement de ${formaterArgentEmail(data.montant)} pour la mission "${data.titreMission}" (ref. ${data.reference}) a ete verifie et confirme par la plateforme.`;

  return { subject, html, text };
}

export function templatePaiementLibere(data: EmailPaiement) {
  const subject = `KIANJA - Fonds liberes pour "${data.titreMission}"`;

  const html = envelopper(`
    ${entete('Fonds liberes')}
    <tr><td style="padding:16px 24px;">
      <p style="margin:0;font-size:14px;color:#2b2b28;line-height:1.7;">
        Bonjour ${data.nom},<br/><br/>
        Les fonds de
        <strong style="color:#b8860b;">${formaterArgentEmail(data.montant)}</strong>
        pour la mission <strong>"${data.titreMission}"</strong>
        (ref. ${data.reference}) vous sont dus : la livraison a ete validee
        par le client et le paiement a ete libere.
      </p>
    </td></tr>
  `);

  const text = `Bonjour ${data.nom},

Les fonds de ${formaterArgentEmail(data.montant)} pour la mission "${data.titreMission}" (ref. ${data.reference}) vous sont dus : la livraison a ete validee et le paiement a ete libere.`;

  return { subject, html, text };
}
