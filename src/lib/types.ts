export interface MatchData {
  matchId: string;
  home: string;
  away: string;
  date: string;
  time: string;
  stage: 'group' | 'round16' | 'quarter' | 'semi' | 'third' | 'final';
  group?: string;
  round?: number;
}

export interface Prediction {
  match_id: string;
  match: string;
  result: string;
  score: string;
}

export interface GroupWinner {
  group: string;
  winner: string;
}

export interface KnockoutPrediction {
  stage: string;
  match: string;
  result: string;
  qualified: string;
}

export interface PlayerData {
  nombre: string;
  archivo: string;
  predicciones: {
    fase_grupos: Prediction[];
    ganadores_grupo: GroupWinner[];
    eliminatorias: KnockoutPrediction[];
  };
  total_predicciones: number;
}

export interface MatchResult {
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
}

export type ResultsMap = Record<string, MatchResult>;

export interface PlayerScore {
  name: string;
  points: number;
  exactResults: number;
  correctResults: number;
  totalPossible: number;
}
