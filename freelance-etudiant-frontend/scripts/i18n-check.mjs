#!/usr/bin/env node
/**
 * Vérifie que messages/fr, messages/mg et messages/en ont exactement les mêmes
 * fichiers et les mêmes clés (le français sert de référence), et qu'aucune
 * valeur n'est vide ni ne laisse un marqueur de travail (TODO, RELIRE).
 * Code de sortie 1 si un écart est trouvé.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..", "messages");
const REF = "fr";
const AUTRES = ["mg", "en"];

function aplatir(obj, prefixe = "") {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? aplatir(v, `${prefixe}${k}.`)
      : [[`${prefixe}${k}`, v]],
  );
}
const fichiers = (l) => readdirSync(join(racine, l)).filter((f) => f.endsWith(".json")).sort();
const lire = (l, f) => Object.fromEntries(aplatir(JSON.parse(readFileSync(join(racine, l, f), "utf8"))));

let erreurs = 0;
const signaler = (m) => { erreurs++; console.error("✗ " + m); };

const refFichiers = fichiers(REF);
let total = 0;
for (const l of AUTRES) {
  const fl = fichiers(l);
  for (const f of refFichiers) if (!fl.includes(f)) signaler(`${l}/${f} : fichier manquant`);
  for (const f of fl) if (!refFichiers.includes(f)) signaler(`${l}/${f} : fichier absent de ${REF}`);
}
for (const f of refFichiers) {
  const ref = lire(REF, f);
  total += Object.keys(ref).length;
  for (const [cle, val] of Object.entries(ref)) {
    if (typeof val === "string" && val.trim() === "") signaler(`${REF}/${f} : valeur vide « ${cle} »`);
  }
  for (const l of AUTRES) {
    if (!fichiers(l).includes(f)) continue;
    const cur = lire(l, f);
    for (const cle of Object.keys(ref)) {
      if (!(cle in cur)) signaler(`${l}/${f} : clé manquante « ${cle} »`);
      else {
        const v = cur[cle];
        if (typeof v === "string" && (v.trim() === "" || /\b(TODO|RELIRE|FIXME)\b/.test(v)))
          signaler(`${l}/${f} : valeur à finaliser « ${cle} »`);
      }
    }
    for (const cle of Object.keys(cur)) if (!(cle in ref)) signaler(`${l}/${f} : clé en trop « ${cle} »`);
  }
}
if (erreurs) { console.error(`\n${erreurs} problème(s).`); process.exit(1); }
console.log(`i18n OK : ${refFichiers.length} fichiers, ${total} clés identiques en fr / mg / en.`);
