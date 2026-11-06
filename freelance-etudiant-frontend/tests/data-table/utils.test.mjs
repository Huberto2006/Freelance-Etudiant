import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculerPagination,
  ELLIPSE,
  filtrerLignes,
  normaliserTexte,
  plagePages,
  trierLignes,
} from "../../src/components/ui/data-table/utils.ts";

const ids = (n) => Array.from({ length: n }, (_, i) => i);

for (const taille of [10, 20, 30, 50, 100]) {
  test(`pagination ${taille} : chaque ligne apparaît une seule fois, sans saut`, () => {
    const lignes = ids(125);
    const { totalPages } = calculerPagination(125, 1, taille);
    assert.equal(totalPages, Math.ceil(125 / taille));
    const vues = [];
    for (let page = 1; page <= totalPages; page++) {
      const { debut, fin } = calculerPagination(125, page, taille);
      vues.push(...lignes.slice(debut, fin));
    }
    assert.deepEqual(vues, lignes);
  });
}

test("plage affichée : 1 à 10 sur 125, puis 121 à 125 sur la dernière page", () => {
  assert.deepEqual(calculerPagination(125, 1, 10), {
    page: 1, totalPages: 13, debut: 0, fin: 10, total: 125,
  });
  const fin = calculerPagination(125, 13, 10);
  assert.equal(fin.debut + 1, 121);
  assert.equal(fin.fin, 125);
});

test("moins de 10 lignes : une seule page", () => {
  assert.deepEqual(calculerPagination(3, 1, 10), {
    page: 1, totalPages: 1, debut: 0, fin: 3, total: 3,
  });
});

test("page hors limites (lignes retirées) : ramenée à la dernière page", () => {
  assert.equal(calculerPagination(11, 5, 10).page, 2);
  assert.equal(calculerPagination(0, 5, 10).page, 1);
  assert.equal(calculerPagination(11, 0, 10).page, 1);
});

test("numéros de pages : ellipses, jamais plus de 7 éléments, bornes présentes", () => {
  assert.deepEqual(plagePages(1, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(plagePages(1, 20), [1, 2, 3, 4, 5, ELLIPSE, 20]);
  assert.deepEqual(plagePages(10, 20), [1, ELLIPSE, 9, 10, 11, ELLIPSE, 20]);
  assert.deepEqual(plagePages(20, 20), [1, ELLIPSE, 16, 17, 18, 19, 20]);
  for (let total = 1; total <= 40; total++) {
    for (let page = 1; page <= total; page++) {
      const plage = plagePages(page, total);
      assert.ok(plage.length <= 7);
      assert.ok(plage.includes(page), `page ${page}/${total} visible`);
      assert.ok(plage.includes(1) && plage.includes(total));
    }
  }
});

test("recherche : insensible à la casse et aux accents, sur les colonnes indiquées", () => {
  assert.equal(normaliserTexte("  ÉLÉonore "), "eleonore");
  const lignes = [{ nom: "Éléonore", email: "a@x.mg" }, { nom: "Rabe", email: "eleo@y.mg" }];
  assert.equal(filtrerLignes(lignes, "ELEONORE", [(l) => l.nom]).length, 1);
  assert.equal(filtrerLignes(lignes, "eleo", [(l) => l.nom, (l) => l.email]).length, 2);
  assert.equal(filtrerLignes(lignes, "eleo", []).length, 2, "aucune colonne : pas de filtre");
  assert.equal(filtrerLignes(lignes, "   ", [(l) => l.nom]).length, 2);
});

test("tri : nombres et dates par valeur, sans modifier le tableau reçu", () => {
  const nombres = [{ v: 100 }, { v: 9 }, { v: 25 }];
  assert.deepEqual(trierLignes(nombres, (l) => l.v, "asc", "fr").map((l) => l.v), [9, 25, 100]);
  assert.deepEqual(trierLignes(nombres, (l) => l.v, "desc", "fr").map((l) => l.v), [100, 25, 9]);
  assert.deepEqual(nombres.map((l) => l.v), [100, 9, 25]);
  const dates = [{ v: new Date("2026-03-01") }, { v: new Date("2025-12-31") }];
  assert.equal(trierLignes(dates, (l) => l.v, "asc", "fr")[0].v.getFullYear(), 2025);
});

test("tri : texte selon la langue, numéros dans l'ordre naturel", () => {
  const noms = [{ v: "Zo" }, { v: "élise" }, { v: "Abel" }];
  assert.deepEqual(trierLignes(noms, (l) => l.v, "asc", "fr").map((l) => l.v), ["Abel", "élise", "Zo"]);
  const numeros = [{ v: "FAC-10" }, { v: "FAC-9" }];
  assert.equal(trierLignes(numeros, (l) => l.v, "asc", "fr")[0].v, "FAC-9");
});

test("tri : valeurs absentes en fin de liste dans les deux sens", () => {
  const lignes = [{ v: null }, { v: 2 }, { v: undefined }, { v: 1 }];
  assert.deepEqual(trierLignes(lignes, (l) => l.v, "asc", "fr").slice(0, 2).map((l) => l.v), [1, 2]);
  assert.deepEqual(trierLignes(lignes, (l) => l.v, "desc", "fr").slice(0, 2).map((l) => l.v), [2, 1]);
});

test("tri stable : à valeur égale, l'ordre d'origine est conservé", () => {
  const lignes = [{ v: 1, i: "a" }, { v: 1, i: "b" }, { v: 0, i: "c" }];
  assert.deepEqual(trierLignes(lignes, (l) => l.v, "desc", "fr").map((l) => l.i), ["a", "b", "c"]);
});
