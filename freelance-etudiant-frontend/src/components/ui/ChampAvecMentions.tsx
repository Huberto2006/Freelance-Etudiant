"use client";

import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";

import type { SuggestionMention } from "@/lib/types";

import { Textarea } from "@/components/ui/Field";

/**
 * Delai (ms) entre la derniere frappe et l'appel backend de recherche :
 * evite une requete par caractere tape.
 */
const DELAI_RECHERCHE_MS = 250;

/**
 * Zone du texte actuellement en cours de mention :
 * - debut   : position du "@" ;
 * - fin     : position du curseur (fin de la requete saisie) ;
 * - requete : texte tape apres le "@".
 */
interface ZoneMention {
  debut: number;

  fin: number;

  requete: string;
}

/**
 * Detecte si le curseur se trouve dans une zone "@..." :
 * le texte avant le curseur doit contenir un @ precede d'un debut de
 * ligne, d'un espace ou d'une parenthese, suivi du texte de la requete.
 * La requete s'arrete si elle se termine par un espace (la mention est
 * alors consideree comme terminee).
 */
function detecterZoneMention(
  texte: string,
  positionCurseur: number,
): ZoneMention | null {
  const avantCurseur = texte.slice(0, positionCurseur);
  const match = avantCurseur.match(/(?:^|[\s(])@([^\n@]{1,60})$/u);

  if (!match) return null;

  const requete = match[1];
  const debut = avantCurseur.length - requete.length - 1;

  // Un espace en fin de requete clot la mention ("@Jean " -> terminee).
  if (/\s$/u.test(requete)) return null;

  return { debut, fin: avantCurseur.length, requete };
}

/**
 * Champ de commentaire avec autocompletion @mention.
 *
 * Drop-in du <Textarea> standard : le composant reste un simple champ
 * controle (value/onChange) et ajoute, par-dessus, la liste des
 * suggestions correspondant au texte tape apres @.
 *
 * Comportement :
 * - "@je" -> recherche backend (debounce 250 ms, limite de resultats) ;
 * - fleches Haut/Bas pour naviguer, Entree ou Tab pour selectionner,
 *   Echap pour fermer ;
 * - clic/tap sur une suggestion ;
 * - la mention est inseree a la position du curseur ("@Jean Rakoto "),
 *   ce qui fonctionne aussi au milieu d'un texte existant ;
 * - quand aucune suggestion n'est affichee, Entree se comporte comme
 *   avant (delegation a `onEnter`, qui declenche l'envoi du formulaire).
 */
export function ChampAvecMentions({
  value,
  onChange,
  onEnter,
  placeholder,
  disabled,
  rows = 2,
  id,
  name,
}: {
  value: string;

  onChange: (valeur: string) => void;

  /**
   * Appelle quand Entree est pressee SANS suggestion affichee (envoi du
   * commentaire). Recoit l'evenement clavier d'origine.
   */
  onEnter?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;

  placeholder?: string;

  disabled?: boolean;

  rows?: number;

  id?: string;

  name?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /** Zone @ en cours (null = pas de suggestion a afficher). */
  const [zone, setZone] = useState<ZoneMention | null>(null);

  const [suggestions, setSuggestions] = useState<SuggestionMention[]>([]);

  const [indiceActif, setIndiceActif] = useState(0);

  /** Position du curseur a restaurer apres insertion d'une mention. */
  const curseurEnAttenteRef = useRef<number | null>(null);

  /**
   * Zone masquee manuellement (Echap) : cle "debut:requete". Tant que le
   * curseur reste dans la meme zone, la liste ne se rouvre pas toute
   * seule (le keyup qui suit Echap sinon la reouvrirait).
   */
  const zoneMasqueeRef = useRef<string | null>(null);

  const suggestionsOuvertes = zone !== null && suggestions.length > 0;

  /**
   * Applique la detection de zone et met a jour l'etat. Toute fermeture
   * de zone (fin de mention, Echap...) efface aussi les suggestions :
   * l'effet de recherche n'a ainsi JAMAIS besoin d'appeler setState
   * de facon synchrone (regle react-hooks/set-state-in-effect).
   */
  function appliquerDetection(texte: string, position: number) {
    const detectee = detecterZoneMention(texte, position);

    if (!detectee) {
      setZone(null);
      setSuggestions([]);
      zoneMasqueeRef.current = null;
      return;
    }

    const cle = `${detectee.debut}:${detectee.requete}`;
    if (zoneMasqueeRef.current === cle) {
      setZone(null);
      setSuggestions([]);
      return;
    }

    zoneMasqueeRef.current = null;
    setZone(detectee);
  }


  /**
   * Recherche backend des suggestions (debounce) : une seule requete
   * apres la derniere frappe, jamais la liste complete des utilisateurs.
   *
   * Les setState ne sont appeles que dans les callbacks asynchrones
   * (reponse du backend) : jamais de facon synchrone dans l'effet.
   */
  useEffect(() => {
    if (!zone) return;

    const requete = zone.requete.trim();
    if (!requete) return;

    let actif = true;

    const timer = setTimeout(() => {
      api
        .get<SuggestionMention[]>(
          `/commentaires/mentions-suggestions?q=${encodeURIComponent(requete)}`,
        )
        .then((resultats) => {
          if (actif) {
            setSuggestions(resultats);
            setIndiceActif(0);
          }
        })
        .catch(() => {
          if (actif) {
            setSuggestions([]);
          }
        });
    }, DELAI_RECHERCHE_MS);

    return () => {
      actif = false;
      clearTimeout(timer);
    };
  }, [zone]);

  /**
   * Restaure la position du curseur apres l'insertion d'une mention
   * (le state React `value` n'est mis a jour qu'au prochain rendu).
   */
  useEffect(() => {
    if (curseurEnAttenteRef.current === null) return;
    if (!textareaRef.current) return;

    const position = curseurEnAttenteRef.current;
    curseurEnAttenteRef.current = null;

    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(position, position);
  }, [value]);

  /**
   * Insere proprement la mention a la place du fragment "@requete" :
   * le nom selectionne remplace le texte partiel, suivi d'un espace,
   * et le curseur est replace juste apres.
   */
  function selectionnerMention(suggestion: SuggestionMention) {
    if (!zone) return;

    const insertion = `@${suggestion.nom} `;
    const nouveauTexte =
      value.slice(0, zone.debut) + insertion + value.slice(zone.fin);

    curseurEnAttenteRef.current = zone.debut + insertion.length;

    onChange(nouveauTexte);
    setZone(null);
    setSuggestions([]);
    zoneMasqueeRef.current = null;
  }


  function gererChangement(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const nouveauTexte = e.target.value;
    const position = e.target.selectionStart ?? nouveauTexte.length;

    onChange(nouveauTexte);
    appliquerDetection(nouveauTexte, position);
  }

  /**
   * Re-evalue la zone apres chaque deplacement du curseur (clic, fleches
   * quand aucune suggestion n'est affichee, fin/Debut...).
   */
  function gererDeplacementCurseur() {
    if (disabled) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    appliquerDetection(textarea.value, textarea.selectionStart ?? 0);
  }

  function gererTouche(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (suggestionsOuvertes) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndiceActif((i) => (i + 1) % suggestions.length);
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndiceActif(
          (i) => (i - 1 + suggestions.length) % suggestions.length,
        );
        return;
      }

      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const active = suggestions[indiceActif];
        if (active) {
          selectionnerMention(active);
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        if (zone) {
          zoneMasqueeRef.current = `${zone.debut}:${zone.requete}`;
        }
        setZone(null);
        setSuggestions([]);
        return;
      }

      // Autres touches : laisser passer (la saisie continue met a jour
      // la requete via onChange).
      return;
    }

    // Aucune suggestion affichee : Entree seule delegue au parent (envoi
    // du commentaire) ; Maj+Entree reste un saut de ligne natif.
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing &&
      onEnter
    ) {
      onEnter(e);
    }
  }


  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        id={id}
        name={name}
        rows={rows}
        value={value}
        onChange={gererChangement}
        onKeyDown={gererTouche}
        onKeyUp={gererDeplacementCurseur}
        onClick={gererDeplacementCurseur}
        onBlur={() => {
          setZone(null);
          setSuggestions([]);
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />

      {suggestionsOuvertes && (
        <ul
          role="listbox"
          aria-label="Suggestions d'utilisateurs à identifier"
          className="
            absolute left-0 top-full z-20 mt-1 max-h-56 w-full max-w-md
            overflow-y-auto rounded-lg border border-ink/20 bg-paper-light
            py-1 shadow-lg
          "
        >
          {suggestions.map((suggestion, index) => {
            const estActif = index === indiceActif;

            return (
              <li
                key={suggestion.id}
                role="option"
                aria-selected={estActif}
                onMouseDown={(e) => {
                  /**
                   * preventDefault : le textarea garde le focus (la
                   * selection ne perd jamais la position du curseur).
                   */
                  e.preventDefault();
                  selectionnerMention(suggestion);
                }}
                onMouseEnter={() => setIndiceActif(index)}
                className={`
                  flex cursor-pointer flex-col gap-0.5 px-3 py-2 text-sm
                  transition-colors
                  ${estActif ? "bg-ocre/10" : "hover:bg-ink/5"}
                `}
              >
                <span className="font-medium text-ink">
                  {suggestion.nom}
                </span>

                {suggestion.sousTitre && (
                  <span className="text-xs text-ink-soft">
                    {suggestion.sousTitre}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

