import { SetMetadata } from '@nestjs/common';

export const TURNSTILE_ACTIONS_KEY = 'turnstile_actions';

/**
 * Declare la ou les actions Turnstile acceptees par une route (valeur du
 * parametre `action` du widget cote frontend). Une action ne peut pas etre
 * rejouee sur une autre route : un jeton obtenu sur le formulaire de contact
 * est refuse sur la connexion (controle effectif quand le controle de
 * contexte est actif, cf. turnstile.config.ts).
 */
export const TurnstileActions = (...actions: string[]) =>
  SetMetadata(TURNSTILE_ACTIONS_KEY, actions);
