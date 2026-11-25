import type { Request } from 'express';

export type TypeAppareil = 'desktop' | 'mobile' | 'tablette' | 'inconnu';

export interface ClientDeviceInfos {
  typeAppareil: TypeAppareil;
  navigateur: string;
  systemeExploitation: string;
  adresseIp: string;
  userAgentBrut?: string;
}

/**
 * Anonymise / protege une adresse IP pour le stockage et l'affichage.
 * Pour IPv4 : remplace le dernier octet par *** (ex. 197.149.230.12 -> 197.149.230.***).
 * Pour IPv6 : conserve les 3 premiers segments et masque le reste (ex. 2001:db8:85a3::***).
 * Localhost : conserve "127.0.0.1 (Local)" ou "::1".
 */
export function anonymiserAdresseIp(ipBrute?: string | null): string {
  if (!ipBrute || typeof ipBrute !== 'string') {
    return 'Inconnue';
  }

  // Nettoyage de l'IP (gestion des prefixes ::ffff: pour les sockets hybrides)
  let ip = ipBrute.trim();
  if (ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }

  // Localhost
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return '127.0.0.***';
  }

  // IPv4 standard (X.X.X.X)
  const morceauxIpv4 = ip.split('.');
  if (morceauxIpv4.length === 4) {
    return `${morceauxIpv4[0]}.${morceauxIpv4[1]}.${morceauxIpv4[2]}.***`;
  }

  // IPv6
  if (ip.includes(':')) {
    const segments = ip.split(':').filter(Boolean);
    const prefixe = segments.slice(0, 3).join(':');
    return prefixe ? `${prefixe}:***` : 'IPv6:***';
  }

  return 'Inconnue';
}

/**
 * Extrait l'adresse IP reelle du client a partir des en-tetes de reverse proxy (Nginx, Traefik, Cloudflare).
 */
export function extraireAdresseIp(req: Request): string {
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  if (typeof cfConnectingIp === 'string' && cfConnectingIp.trim().length > 0) {
    return cfConnectingIp.trim();
  }

  const xForwardedFor = req.headers['x-forwarded-for'];
  if (typeof xForwardedFor === 'string') {
    const premiereIp = xForwardedFor.split(',')[0]?.trim();
    if (premiereIp) return premiereIp;
  } else if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
    const premiereIp = xForwardedFor[0]?.split(',')[0]?.trim();
    if (premiereIp) return premiereIp;
  }

  const xRealIp = req.headers['x-real-ip'];
  if (typeof xRealIp === 'string' && xRealIp.trim().length > 0) {
    return xRealIp.trim();
  }

  return req.socket?.remoteAddress || req.ip || 'Inconnue';
}

/**
 * Detecte le type d'appareil (mobile, tablette, desktop) a partir du User-Agent.
 */
export function detecterTypeAppareil(ua: string): TypeAppareil {
  if (!ua) return 'inconnu';

  // Tablettes
  if (/(ipad|tablet|(android(?!.*mobile))|silk|playbook)/i.test(ua)) {
    return 'tablette';
  }

  // Mobiles
  if (/(mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop)/i.test(ua)) {
    return 'mobile';
  }

  // Desktop
  if (/(windows nt|macintosh|mac os x|linux|x11|cros)/i.test(ua)) {
    return 'desktop';
  }

  return 'inconnu';
}

/**
 * Detecte le navigateur et sa version majeure a partir du User-Agent.
 */
export function detecterNavigateur(ua: string): string {
  if (!ua) return 'Inconnu';

  // Edge
  const matchEdge = ua.match(/edg(?:e)?\/(\d+)/i);
  if (matchEdge) return `Edge ${matchEdge[1]}`;

  // Opera
  const matchOpera = ua.match(/(?:opr|opera)\/(\d+)/i);
  if (matchOpera) return `Opera ${matchOpera[1]}`;

  // Samsung Internet
  const matchSamsung = ua.match(/samsungbrowser\/(\d+)/i);
  if (matchSamsung) return `Samsung Internet ${matchSamsung[1]}`;

  // Chrome (attention : beaucoup d'autres navigateurs incluent "Chrome" dans leur UA)
  const matchChrome = ua.match(/chrome\/(\d+)/i);
  if (matchChrome && !/chromium|edg|opr/i.test(ua)) {
    return `Chrome ${matchChrome[1]}`;
  }

  // Firefox
  const matchFirefox = ua.match(/firefox\/(\d+)/i);
  if (matchFirefox) return `Firefox ${matchFirefox[1]}`;

  // Safari (attention : Chrome/Edge ont Safari dans leur UA)
  const matchSafari = ua.match(/version\/(\d+)(?:\.\d+)*.*safari/i);
  if (matchSafari) return `Safari ${matchSafari[1]}`;

  if (/safari/i.test(ua) && !/chrome|chromium/i.test(ua)) {
    return 'Safari';
  }

  return 'Inconnu';
}

/**
 * Detecte le systeme d'exploitation a partir du User-Agent.
 */
export function detecterSystemeExploitation(ua: string): string {
  if (!ua) return 'Inconnu';

  // Windows
  if (/windows nt 10\.0/i.test(ua)) return 'Windows 10/11';
  if (/windows nt 6\.3/i.test(ua)) return 'Windows 8.1';
  if (/windows nt 6\.2/i.test(ua)) return 'Windows 8';
  if (/windows nt 6\.1/i.test(ua)) return 'Windows 7';
  if (/windows nt/i.test(ua)) return 'Windows';

  // Android
  const matchAndroid = ua.match(/android\s+([\d.]+)/i);
  if (matchAndroid) return `Android ${matchAndroid[1].split('.')[0]}`;
  if (/android/i.test(ua)) return 'Android';

  // iOS (iPhone, iPad)
  const matchIos = ua.match(/(?:iphone|ipad|ipod).*?os\s+([\d_]+)/i);
  if (matchIos) {
    const version = matchIos[1].replace(/_/g, '.').split('.')[0];
    return `iOS ${version}`;
  }

  // macOS
  if (/macintosh|mac os x/i.test(ua)) {
    return 'macOS';
  }

  // Chrome OS
  if (/cros/i.test(ua)) return 'ChromeOS';

  // Linux
  if (/ubuntu/i.test(ua)) return 'Ubuntu Linux';
  if (/fedora/i.test(ua)) return 'Fedora Linux';
  if (/linux/i.test(ua)) return 'Linux';

  return 'Inconnu';
}

/**
 * Analyse une requete Express et retourne les informations completes de l'appareil.
 */
export function extraireInfosClient(req: Request): ClientDeviceInfos {
  const ua = (req.headers['user-agent'] as string) || '';
  const ipBrute = extraireAdresseIp(req);

  return {
    typeAppareil: detecterTypeAppareil(ua),
    navigateur: detecterNavigateur(ua),
    systemeExploitation: detecterSystemeExploitation(ua),
    adresseIp: anonymiserAdresseIp(ipBrute),
    userAgentBrut: ua ? ua.slice(0, 500) : undefined,
  };
}
