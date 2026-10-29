import { useEffect, useState } from "react";

/**
 * Champ texte « live » : la saisie est immédiate localement, mais la
 * valeur n'est transmise au parent qu'après une courte pause (évite un
 * appel réseau à chaque frappe). Se resynchronise si la valeur externe
 * change (réinitialisation, navigation URL).
 */
export function useSaisieDifferee(
  externe: string,
  valider: (valeur: string) => void,
  delai = 350,
) {
  const [local, setLocal] = useState(externe);
  const [precedent, setPrecedent] = useState(externe);

  if (externe !== precedent) {
    setPrecedent(externe);
    setLocal(externe);
  }

  useEffect(() => {
    if (local === externe) return;
    const minuteur = window.setTimeout(() => valider(local), delai);
    return () => window.clearTimeout(minuteur);
  }, [local, externe, valider, delai]);

  return [local, setLocal] as const;
}
