export interface ReactionInfo {
  total: number;

  jaiReagi: boolean;
}

export type TypeReactionContenu = "jaime" | "jenaimepas";

export interface InfoReactionsContenu {
  jaime: number;

  jenaimepas: number;

  maReaction: TypeReactionContenu | null;
}
