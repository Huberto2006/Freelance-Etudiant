/**
 * Tests de construireLignesConversations (liste des conversations de la
 * messagerie). Lanceur intégré de Node (node --test) : Node 24 retire
 * nativement les types TypeScript du module testé, aucune dépendance requise.
 *
 *   npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { construireLignesConversations } from "../../src/features/messagerie/utils/lignes-conversations.ts";

const moi = { id: "moi", nom: "Moi", role: "etudiant" };
const alice = { id: "alice", nom: "Alice", role: "client", photoUrl: "/uploads/profiles/a.jpg" };
const bob = { id: "bob", nom: "  ", role: "client" };

const t = (cle) => `t:${cle}`;
const apercuMessage = (m) => `apercu:${m.contenu ?? ""}`;
const apercuMessageGroupe = (m, idMoi) => `groupe:${m.contenu}:${idMoi}`;

function message(partiel) {
  return {
    type: "INDIVIDUEL",
    contenu: "bonjour",
    estLu: true,
    estSupprime: false,
    pieceJointeUrl: null,
    ...partiel,
  };
}

function construire(parametres) {
  return construireLignesConversations({
    conversationsIndividuelles: [],
    conversationsGroupes: [],
    utilisateur: moi,
    contactDepuisUrl: null,
    groupeDepuisUrl: null,
    apercuMessage,
    apercuMessageGroupe,
    t,
    ...parametres,
  });
}

test("aucune ligne sans utilisateur connecté", () => {
  assert.deepEqual(construire({ utilisateur: null }), []);
});

test("une seule ligne par contact, construite à partir du premier message reçu", () => {
  const lignes = construire({
    conversationsIndividuelles: [
      message({ expediteurId: "alice", destinataireId: "moi", expediteur: alice, destinataire: moi, contenu: "récent", dateEnvoi: "2026-10-02T10:00:00Z", estLu: false }),
      message({ expediteurId: "moi", destinataireId: "alice", expediteur: moi, destinataire: alice, contenu: "ancien", dateEnvoi: "2026-10-01T10:00:00Z" }),
    ],
  });
  assert.equal(lignes.length, 1);
  const [ligne] = lignes;
  assert.equal(ligne.cle, "alice");
  assert.equal(ligne.type, "INDIVIDUEL");
  assert.equal(ligne.dernierContenu, "apercu:récent");
  assert.equal(ligne.dernierEstMoi, false);
  assert.equal(ligne.photoUrl, "/uploads/profiles/a.jpg");
  assert.equal(ligne.nonLus, 1);
});

test("seuls les messages reçus et non lus comptent comme non lus", () => {
  const lignes = construire({
    conversationsIndividuelles: [
      message({ expediteurId: "alice", destinataireId: "moi", expediteur: alice, destinataire: moi, dateEnvoi: "2026-10-03T10:00:00Z", estLu: false }),
      message({ expediteurId: "alice", destinataireId: "moi", expediteur: alice, destinataire: moi, dateEnvoi: "2026-10-02T10:00:00Z", estLu: false }),
      message({ expediteurId: "moi", destinataireId: "alice", expediteur: moi, destinataire: alice, dateEnvoi: "2026-10-01T10:00:00Z", estLu: false }),
    ],
  });
  assert.equal(lignes[0].nonLus, 2);
});

test("un nom vide est remplacé par le libellé générique", () => {
  const [ligne] = construire({
    conversationsIndividuelles: [
      message({ expediteurId: "bob", destinataireId: "moi", expediteur: bob, destinataire: moi, dateEnvoi: "2026-10-01T10:00:00Z" }),
    ],
  });
  assert.equal(ligne.nom, "t:user");
});

test("le contact demandé par l'URL apparaît même sans message, en fin de liste", () => {
  const lignes = construire({
    conversationsIndividuelles: [
      message({ expediteurId: "alice", destinataireId: "moi", expediteur: alice, destinataire: moi, dateEnvoi: "2026-10-01T10:00:00Z" }),
    ],
    contactDepuisUrl: { id: "nouveau", nom: "Nouveau contact" },
  });
  assert.deepEqual(lignes.map((l) => l.id), ["alice", "nouveau"]);
  assert.equal(lignes[1].dernierContenu, "t:newConversation");
  assert.equal(lignes[1].conversationVide, true);
});

test("le contact de l'URL ne duplique pas une conversation existante", () => {
  const lignes = construire({
    conversationsIndividuelles: [
      message({ expediteurId: "alice", destinataireId: "moi", expediteur: alice, destinataire: moi, dateEnvoi: "2026-10-01T10:00:00Z" }),
    ],
    contactDepuisUrl: { id: "alice", nom: "Alice (URL)" },
  });
  assert.equal(lignes.length, 1);
  assert.equal(lignes[0].nom, "Alice");
});

test("groupes : aperçu du dernier message, non lus et groupe vide", () => {
  const lignes = construire({
    conversationsGroupes: [
      { type: "GROUPE", groupeId: "g1", nom: "Projet", nombreMembres: 3, nonLus: 4,
        dernierMessage: { contenu: "salut", expediteurId: "moi", dateEnvoi: "2026-10-05T10:00:00Z" } },
      { type: "GROUPE", groupeId: "g2", nom: "Vide", nombreMembres: 2, nonLus: 0, dernierMessage: null },
    ],
  });
  const projet = lignes.find((l) => l.id === "g1");
  assert.equal(projet.cle, "groupe-g1");
  assert.equal(projet.dernierContenu, "groupe:salut:moi");
  assert.equal(projet.dernierEstMoi, true);
  assert.equal(projet.nombreMembres, 3);
  assert.equal(projet.nonLus, 4);
  const vide = lignes.find((l) => l.id === "g2");
  assert.equal(vide.dernierContenu, "t:noMessage");
  assert.equal(vide.conversationVide, true);
});

test("le groupe demandé par l'URL est ajouté une seule fois", () => {
  const avecExistant = construire({
    conversationsGroupes: [
      { type: "GROUPE", groupeId: "g1", nom: "Projet", nombreMembres: 3, nonLus: 0, dernierMessage: null },
    ],
    groupeDepuisUrl: { id: "g1", nom: "Projet (URL)" },
  });
  assert.equal(avecExistant.filter((l) => l.id === "g1").length, 1);

  const sansExistant = construire({ groupeDepuisUrl: { id: "g9", nom: "Nouveau groupe", nombreMembres: 5 } });
  assert.equal(sansExistant.length, 1);
  assert.equal(sansExistant[0].nombreMembres, 5);
});

test("tri du plus récent au plus ancien, conversations sans date en dernier", () => {
  const lignes = construire({
    conversationsIndividuelles: [
      message({ expediteurId: "alice", destinataireId: "moi", expediteur: alice, destinataire: moi, dateEnvoi: "2026-10-01T10:00:00Z" }),
    ],
    conversationsGroupes: [
      { type: "GROUPE", groupeId: "g1", nom: "Récent", nombreMembres: 2, nonLus: 0,
        dernierMessage: { contenu: "x", expediteurId: "alice", dateEnvoi: "2026-10-09T10:00:00Z" } },
      { type: "GROUPE", groupeId: "g2", nom: "Sans message", nombreMembres: 2, nonLus: 0, dernierMessage: null },
    ],
  });
  assert.deepEqual(lignes.map((l) => l.id), ["g1", "alice", "g2"]);
});
