import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { createWorker } from 'tesseract.js';
import { extname } from 'path';

export type OcrConfidence = 'high' | 'medium' | 'low' | 'null';

export type OcrFieldValue<T> = {
  value: T | null;
  confidence: OcrConfidence;
};

export type OcrCvExtractionResult = {
  rawText: string;
  fields: {
    nom?: OcrFieldValue<string>;
    email?: OcrFieldValue<string>;
    telephone?: OcrFieldValue<string>;
    universite?: OcrFieldValue<string>;
    filiere?: OcrFieldValue<string>;
    anneeEtude?: OcrFieldValue<string>;
    ville?: OcrFieldValue<string>;
    description?: OcrFieldValue<string>;
    competences?: OcrFieldValue<string[]>;
    langues?: OcrFieldValue<string[]>;
    githubUrl?: OcrFieldValue<string>;
    linkedinUrl?: OcrFieldValue<string>;
    siteWeb?: OcrFieldValue<string>;
    portfolioUrls?: OcrFieldValue<string[]>;
  };
  warnings: string[];
};

@Injectable()
export class CvImportService {
  async analyserCv(file: Express.Multer.File): Promise<OcrCvExtractionResult> {
    if (!file) {
      throw new BadRequestException('Aucun fichier CV n’a été envoyé.');
    }

    const extension = extname(file.originalname || '').toLowerCase();
    const mime = file.mimetype?.toLowerCase() || '';
    const isPdf = mime === 'application/pdf' || extension === '.pdf';
    const isImage = ['.png', '.jpg', '.jpeg', '.webp'].includes(extension) ||
      ['image/png', 'image/jpeg', 'image/webp'].includes(mime);

    if (!isPdf && !isImage) {
      throw new BadRequestException(
        'Format non supporté. Envoyez un CV au format PDF, JPG, PNG ou WebP.',
      );
    }

    const rawText = await this.extraireTexte(file, isPdf, isImage);
    const normalized = this.normaliserTexte(rawText);

    const fields: OcrCvExtractionResult['fields'] = {
      nom: this.toField(this.extraireNom(normalized), this.confidenceFromValue(normalized, this.extraireNom(normalized))),
      email: this.toField(this.extraireEmail(normalized), 'high'),
      telephone: this.toField(this.extraireTelephone(normalized), 'medium'),
      universite: this.toField(this.extraireUniversite(normalized), this.confidenceFromValue(normalized, this.extraireUniversite(normalized))),
      filiere: this.toField(this.extraireFiliere(normalized), this.confidenceFromValue(normalized, this.extraireFiliere(normalized))),
      anneeEtude: this.toField(this.extraireAnneeEtude(normalized), this.confidenceFromValue(normalized, this.extraireAnneeEtude(normalized))),
      ville: this.toField(this.extraireVille(normalized), this.confidenceFromValue(normalized, this.extraireVille(normalized))),
      description: this.toField(this.extraireDescription(normalized), this.confidenceFromValue(normalized, this.extraireDescription(normalized))),
      competences: this.toField(this.extraireCompetences(normalized), 'medium'),
      langues: this.toField(this.extraireLangues(normalized), 'medium'),
      githubUrl: this.toField(this.extraireUrl(normalized, ['github.com', 'gitlab.com']), 'medium'),
      linkedinUrl: this.toField(this.extraireUrl(normalized, ['linkedin.com']), 'medium'),
      siteWeb: this.toField(this.extraireSiteWeb(normalized), 'medium'),
      portfolioUrls: this.toField(this.extrairePortfolioUrls(normalized), 'medium'),
    };

    const warnings = this.calculerWarnings(fields);

    return {
      rawText: normalized,
      fields,
      warnings,
    };
  }

  private async extraireTexte(
    file: Express.Multer.File,
    isPdf: boolean,
    isImage: boolean,
  ): Promise<string> {
    if (isPdf) {
      return this.extraireTextePdf(file.buffer);
    }
    if (isImage) {
      return this.extraireTexteImage(file.buffer);
    }
    return '';
  }

  private async extraireTextePdf(buffer: Buffer): Promise<string> {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    const pages: string[] = [];

    for (let index = 1; index <= pdf.numPages; index += 1) {
      const page = await pdf.getPage(index);
      const contenu = await page.getTextContent();
      const textePage = contenu.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (textePage) pages.push(textePage);
    }

    return pages.join('\n');
  }

  private async extraireTexteImage(buffer: Buffer): Promise<string> {
    const worker = await createWorker('eng+fra', 1, {
      logger: () => undefined,
    });

    try {
      const { data } = await worker.recognize(buffer);
      return data.text ?? '';
    } finally {
      await worker.terminate();
    }
  }

  private normaliserTexte(texte: string): string {
    return texte
      .replace(/\r/g, '\n')
      .replace(/[\t ]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  private toField<T>(value: T | null, confidence: OcrConfidence): OcrFieldValue<T> {
    return { value, confidence };
  }

  private confidenceFromValue<T>(texte: string, value: T | null): OcrConfidence {
    if (!value || !texte.trim()) return 'null';
    const normalized = texte.toLowerCase();
    if (typeof value === 'string') {
      const valeur = (value as string).toLowerCase();
      if (normalized.includes(valeur.slice(0, Math.min(8, valeur.length)))) {
        return 'high';
      }
    }
    return 'medium';
  }

  private extraireNom(texte: string): string | null {
    const patterns = [
      /(?:^|\n)([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þa-zà-öø-ÿ' .-]{2,60})(?:\n|\s{2,})/,
      /(?:Nom\s*[:.-]?\s*)([A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-Þa-zà-öø-ÿ' .-]{2,60})/i,
      /([A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-Þa-zà-öø-ÿ' .-]{2,60})\s*\n\s*(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?\d)/i,
    ];

    for (const pattern of patterns) {
      const match = texte.match(pattern);
      if (match?.[1]) {
        const nom = match[1].trim();
        if (!/\b(?:cv|curriculum|resume|profile|portfolio)\b/i.test(nom)) {
          return nom;
        }
      }
    }

    return null;
  }

  private extraireEmail(texte: string): string | null {
    const match = texte.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return match ? match[0].trim() : null;
  }

  private extraireTelephone(texte: string): string | null {
    const matches = [
      /\+?[0-9]{1,3}[\s.-]?(?:\(?[0-9]{2,4}\)?[\s.-]?){2,4}[0-9]{2,4}/g,
      /(?:tel|phone|mobile|portable)\s*[:.-]?\s*(\+?[0-9][0-9\s.-]{8,20}[0-9])/gi,
    ];

    for (const pattern of matches) {
      const all = [...texte.matchAll(pattern)];
      for (const match of all) {
        const valeur = (match[1] ?? match[0]).replace(/\s+/g, ' ').trim();
        if (valeur.length >= 9 && !/\d{4}-\d{2}-\d{2}/.test(valeur)) {
          return valeur;
        }
      }
    }

    return null;
  }

  private extraireUniversite(texte: string): string | null {
    const patterns = [
      /(?:universite|université|institut|école|faculté|faculty|school)\s*(?:de|d'|du)?\s*[:.-]?\s*([A-ZÀ-ÖØ-Þa-zà-öø-ÿ0-9' .,-]{3,120})/gi,
      /([A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-Þa-zà-öø-ÿ' .,-]{3,120})\s*(?:campus|faculté|université|universite|institute)/gi,
    ];

    for (const pattern of patterns) {
      const match = texte.match(pattern);
      if (match?.[0]) {
        const valeur = match[0].replace(/^(?:universite|université|institut|école|faculté|faculty|school)\s*(?:de|d'|du)?\s*[:.-]?\s*/i, '').trim();
        if (valeur && !/^\d+$/.test(valeur)) return valeur.replace(/[\n\s]{2,}/g, ' ').trim();
      }
    }

    return null;
  }

  private extraireFiliere(texte: string): string | null {
    const patterns = [
      /(?:filiere|major|domaine|spécialité|specialite|formation)\s*[:.-]?\s*([A-ZÀ-ÖØ-Þa-zà-öø-ÿ0-9' .,-]{2,80})/gi,
      /(?:informatique|gestion|marketing|commerce|réseaux|network|design|finance|cybersécurité|cybersecurite|data|developpement)/gi,
    ];

    for (const pattern of patterns) {
      const match = texte.match(pattern);
      if (match?.[0]) {
        const valeur = match[0].replace(/^(?:filiere|major|domaine|spécialité|specialite|formation)\s*[:.-]?\s*/i, '').trim();
        if (valeur) return valeur;
      }
    }

    return null;
  }

  private extraireAnneeEtude(texte: string): string | null {
    const patterns = [
      /\b(L[1-3]|M[1-2]|D[1-3]|1re|2e|3e|[1-7])\b/i,
      /(?:annee|year|niveau)\s*(?:d'etude|of study|study)\s*[:.-]?\s*(L[1-3]|M[1-2]|D[1-3]|1re|2e|3e|[1-7])/i,
    ];

    for (const pattern of patterns) {
      const match = texte.match(pattern);
      if (match?.[1]) return match[1].trim();
    }

    return null;
  }

  private extraireVille(texte: string): string | null {
    const patterns = [
      /(?:ville|city|localisation|adresse)\s*[:.-]?\s*([A-ZÀ-ÖØ-Þa-zà-öø-ÿ' .,-]{2,80})/gi,
      /\b(?:Antananarivo|Antsirabe|Toamasina|Mahajanga|Fianarantsoa|Toliara|Diego|Nosy|Madagascar|Paris|Lyon|Marseille|Cotonou|Abidjan|Yaoundé|Dakar|Rabat)\b/gi,
    ];

    for (const pattern of patterns) {
      const match = texte.match(pattern);
      if (match?.[0]) {
        const valeur = match[0].replace(/^(?:ville|city|localisation|adresse)\s*[:.-]?\s*/i, '').trim();
        if (valeur && !/^(?:cv|resume|curriculum)$/i.test(valeur)) return valeur;
      }
    }

    return null;
  }

  private extraireDescription(texte: string): string | null {
    const lignes = texte
      .split(/\n+/)
      .map((ligne) => ligne.trim())
      .filter((ligne) => ligne.length > 30 && !/^https?:\/\//i.test(ligne))
      .filter((ligne) => !/(email|telephone|tel|portable|mobile|linkedin|github|portfolio|skills|compétences|langues|experience|formation|education|adresse|ville)/i.test(ligne));

    if (!lignes.length) return null;
    return lignes.slice(0, 3).join(' ');
  }

  private extraireCompetences(texte: string): string[] {
    const motsCles = [
      'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'NestJS', 'Python', 'Java', 'C#', '.NET',
      'SQL', 'PostgreSQL', 'MongoDB', 'MySQL', 'Docker', 'Kubernetes', 'Git', 'GitHub', 'AWS', 'Azure',
      'UI/UX', 'Design', 'Figma', 'PHP', 'Laravel', 'Symfony', 'Angular', 'Vue', 'Express', 'GraphQL', 'Firebase',
      'Machine Learning', 'AI', 'Data', 'Power BI', 'Excel', 'Illustrator', 'Photoshop', 'Communication', 'SEO',
    ];
    const decompte = new Set<string>();

    for (const mot of motsCles) {
      if (new RegExp(mot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(texte)) {
        decompte.add(mot);
      }
    }

    return [...decompte];
  }

  private extraireLangues(texte: string): string[] {
    const langues = ['Français', 'Anglais', 'Espagnol', 'Allemand', 'Arabe', 'Malagasy'];
    return langues.filter((langue) => new RegExp(langue, 'i').test(texte));
  }

  private extraireUrl(texte: string, domains: string[]): string | null {
    const urls = [...texte.matchAll(/https?:\/\/[^\s)]+/gi)].map((match) => match[0]);
    const url = urls.find((value) => domains.some((domain) => value.toLowerCase().includes(domain.toLowerCase())));
    return url ?? null;
  }

  private extraireSiteWeb(texte: string): string | null {
    const urls = [...texte.matchAll(/https?:\/\/[^\s)]+/gi)].map((match) => match[0]);
    const url = urls.find((value) => !/linkedin\.com|github\.com|gitlab\.com/i.test(value));
    return url ?? null;
  }

  private extrairePortfolioUrls(texte: string): string[] {
    const urls = [...texte.matchAll(/https?:\/\/[^\s)]+/gi)].map((match) => match[0]);
    return [...new Set(urls.filter((url) => !/linkedin\.com|github\.com|gitlab\.com/i.test(url)))];
  }

  private calculerWarnings(fields: OcrCvExtractionResult['fields']): string[] {
    const warnings: string[] = [];
    if (!fields.email?.value && !fields.telephone?.value) {
      warnings.push('Aucune information de contact fiable n’a été détectée.');
    }
    if (!fields.universite?.value && !fields.filiere?.value) {
      warnings.push('La formation ou l’établissement n’a pas pu être confirmé avec certitude.');
    }
    if (!fields.competences?.value?.length) {
      warnings.push('Les compétences n’ont pas été reconnues automatiquement.');
    }
    return warnings;
  }
}
