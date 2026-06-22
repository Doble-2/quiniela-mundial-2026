import { MatchResult, Prediction } from './types';
import { ALL_MATCHES as MATCHES } from './matches';

export function getMatchResult(prediction: string): { result: string; score: string } {
  const parts = prediction.split('|');
  if (parts.length === 2) return { result: parts[0], score: parts[1] };
  return { result: '', score: prediction };
}

export function calculatePredictionPoints(predScore: string, actualScore: string): number {
  if (!predScore || !actualScore) return 0;
  const [predH, predA] = predScore.split('-').map(Number);
  const [actualH, actualA] = actualScore.split('-').map(Number);
  if (isNaN(predH) || isNaN(predA) || isNaN(actualH) || isNaN(actualA)) return 0;

  const predResult = predH > predA ? '1' : predH < predA ? '2' : 'X';
  const actualResult = actualH > actualA ? '1' : actualH < actualA ? '2' : 'X';

  if (predResult === actualResult) {
    if (predH === actualH && predA === actualA) return 3; // Exact score
    return 1; // Correct winner/draw but not exact
  }
  return 0;
}

export function getMatchIdByTeams(home: string, away: string): string | undefined {
  const match = MATCHES.find(
    m => m.home === home && m.away === away
  );
  return match?.matchId;
}

export function getGroupAndRound(matchId: string): { group?: string; round?: number } {
  const match = MATCHES.find(m => m.matchId === matchId);
  return match ? { group: match.group, round: match.round } : {};
}

export function calculatePlayerPoints(
  predictions: Prediction[],
  results: Record<string, MatchResult>,
  groupWinners: { group: string; winner: string }[],
  groupWinnerResults: Record<string, string>,
  knockoutPreds: { stage: string; match: string; result: string; qualified: string }[],
  knockoutResults: Record<string, { home: string; away: string; homeScore: number; awayScore: number }>
): { points: number; exactResults: number; correctResults: number; totalPossible: number } {
  let points = 0;
  let exactResults = 0;
  let correctResults = 0;
  let totalPossible = 0;

  // Group stage predictions
  for (const pred of predictions) {
    const result = getMatchResult(`${pred.result}|${pred.score}`);
    const matchKey = `${pred.match_id}`;
    
    const match = MATCHES.find(m => m.matchId === matchKey);
    if (!match) continue;

    const actualResult = results[matchKey];
    if (actualResult?.played && actualResult.homeScore !== null && actualResult.awayScore !== null) {
      totalPossible++;
      const actualScore = `${actualResult.homeScore}-${actualResult.awayScore}`;
      const pts = calculatePredictionPoints(result.score, actualScore);
      points += pts;
      if (pts === 3) exactResults++;
      else if (pts === 1) correctResults++;
    }
  }

  // Group winner predictions
  for (const gw of groupWinners) {
    const actualWinner = groupWinnerResults[gw.group];
    if (actualWinner) {
      totalPossible++;
      if (gw.winner === actualWinner) {
        points += 3;
        exactResults++;
      }
    }
  }

  // Knockout predictions
  for (const kp of knockoutPreds) {
    const stageKey = `${kp.stage}-${kp.match}`;
    const koResult = knockoutResults[stageKey];
    if (koResult) {
      totalPossible++;
      const actualScore = `${koResult.homeScore}-${koResult.awayScore}`;
      const pts = calculatePredictionPoints(kp.result, actualScore);
      points += pts;
      if (pts === 3) exactResults++;
      else if (pts === 1) correctResults++;
    }
  }

  return { points, exactResults, correctResults, totalPossible };
}

export function getAllResults(): { 
  matchResults: Record<string, MatchResult>; 
  groupWinners: Record<string, string>;
  knockoutResults: Record<string, { home: string; away: string; homeScore: number; awayScore: number }>;
} {
  if (typeof window === 'undefined') {
    return { matchResults: {}, groupWinners: {}, knockoutResults: {} };
  }
  try {
    const stored = localStorage.getItem('quiniela-results');
    if (stored) return JSON.parse(stored);
  } catch {}
  return { matchResults: {}, groupWinners: {}, knockoutResults: {} };
}

export function saveAllResults(data: {
  matchResults: Record<string, MatchResult>;
  groupWinners: Record<string, string>;
  knockoutResults: Record<string, { home: string; away: string; homeScore: number; awayScore: number }>;
}) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('quiniela-results', JSON.stringify(data));
  }
}
