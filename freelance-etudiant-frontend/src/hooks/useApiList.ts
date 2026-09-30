"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";

/**
 * Centralise le trio chargement / erreur / données répété (avant ce hook)
 * dans une dizaine de pages du tableau de bord, chacune avec sa propre
 * variante du même `useEffect` + `try/catch (error instanceof ApiError)`
 * (parfois même sans état d'erreur du tout, comme c'était le cas pour la
 * page Favoris). Une correction (message par défaut, annulation propre
 * à la navigation...) profite ainsi à toutes les pages qui l'utilisent
 * au lieu de devoir être répétée manuellement dans chacune.
 *
 * `loader` peut être un simple `() => api.get("/favoris")`, ou une
 * fonction composée (plusieurs appels, agrégation) comme dans la page
 * Favoris — le hook ne présuppose pas une seule requête GET.
 *
 * Usage :
 *   const { donnees, chargement, erreur, recharger } =
 *     useApiList(() => api.get<Mission[]>("/missions/me/mes-missions"));
 */
export function useApiList<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [donnees, setDonnees] = useState<T | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  // Evite d'ecrire dans le state si la page a change avant la fin de la
  // requete (dependances modifiees, composant demonte) : seul le dernier
  // appel lance est autorise a ecrire son resultat.
  const requeteEnCours = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const charger = useCallback(() => {
    const id = ++requeteEnCours.current;
    setChargement(true);
    setErreur(null);
    return loaderRef.current()
      .then((resultat) => {
        if (requeteEnCours.current === id) setDonnees(resultat);
      })
      .catch((error) => {
        if (requeteEnCours.current === id) {
          setErreur(
            error instanceof ApiError
              ? error.message
              : "Impossible de charger les données. Réessayez.",
          );
        }
      })
      .finally(() => {
        if (requeteEnCours.current === id) setChargement(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charger]);

  return { donnees, setDonnees, chargement, erreur, setErreur, recharger: charger };
}
