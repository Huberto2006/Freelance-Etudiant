export const NIVEAUX_ETUDE = ["L1", "L2", "L3", "M1", "M2", "D1", "D2", "D3"];

export const TYPES_FREELANCE = [
  "Temps partiel",
  "Temps plein",
  "Mission ponctuelle",
  "Stage",
];

export const STATUTS_DISPONIBILITE = [
  "disponible",
  "occupe",
  "en_mission",
  "indisponible",
];

export const CLES_TYPE_FREELANCE: Record<string, string> = {
  "Temps partiel": "partTime",
  "Temps plein": "fullTime",
  "Mission ponctuelle": "oneOff",
  Stage: "internship",
};
