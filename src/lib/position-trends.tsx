import { Prediction, PlayerData, ResultsMap } from '@/lib/types';
import { ALL_MATCHES } from '@/lib/matches';
import { calculatePredictionPoints } from '@/lib/scoring';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlayerWithScore {
  name: string;
  points: number;
  exactResults: number;
  correctResults: number;
  totalPossible: number;
  accuracy: number;
  predictions: Prediction[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getPredictionMatchId(pred: Prediction): string | null {
  const parts = pred.match.split('-');
  if (parts.length !== 2) return null;
  const [home, away] = parts;
  const match = ALL_MATCHES.find(m => m.home === home && m.away === away);
  return match ? match.matchId : null;
}

// ── Position Trend Sparkline ──────────────────────────────────────────────────

export function PositionSparkline({
  positions,
  size = 'sm',
  showLabel = false,
}: {
  positions: number[];
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}) {
  if (!positions || positions.length < 2) return null;

  const dims = { sm: { w: 36, h: 16 }, md: { w: 60, h: 28 }, lg: { w: 180, h: 48 } };
  const { w, h } = dims[size];
  const numPlayers = 12; // approximate for label

  const max = Math.max(...positions);
  const min = Math.min(...positions);
  const range = Math.max(max - min, 1);
  const pad = size === 'lg' ? 5 : 2;
  const plotH = h - pad * 2;

  const points = positions
    .map((pos, i) => {
      const x = pad + (i / Math.max(positions.length - 1, 1)) * (w - pad * 2);
      const y = pad + ((pos - min) / range) * plotH;
      return `${x},${y}`;
    })
    .join(' ');

  const first = positions[0];
  const last = positions[positions.length - 1];
  const improving = last < first;
  const declining = last > first;
  const color = improving ? '#10b981' : declining ? '#ef4444' : '#6b7280';

  const lastX = pad + (w - pad * 2);
  const lastY = pad + ((last - min) / range) * plotH;

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="shrink-0 opacity-70"
        aria-label={`Puestos: ${positions.map(p => p + 1).join(' → ')}`}
      >
        {/* grid lines for lg */}
        {size === 'lg' &&
          [min, max].map((p, i) => {
            const gy = pad + ((p - min) / range) * plotH;
            return (
              <line
                key={i}
                x1={pad}
                y1={gy}
                x2={w - pad}
                y2={gy}
                stroke="#ffffff"
                strokeWidth="0.3"
                strokeOpacity="0.1"
                strokeDasharray="2 2"
              />
            );
          })}

        {/* line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={size === 'lg' ? 2 : 1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* endpoint dot */}
        <circle cx={lastX} cy={lastY} r={size === 'lg' ? 3 : 1.5} fill={color} />

        {/* start dot for lg */}
        {size === 'lg' && (
          <>
            <circle
              cx={pad}
              cy={pad + ((first - min) / range) * plotH}
              r={3}
              fill={color}
              fillOpacity={0.5}
            />
            <text x={pad - 2} y={h - 2} textAnchor="start" fontSize="6" fill="#6b7280">
              Inicio
            </text>
            <text x={lastX + 2} y={h - 2} textAnchor="end" fontSize="6" fill={color}>
              #{last + 1}
            </text>
          </>
        )}
      </svg>

      {showLabel && (
        <span
          className={`text-[10px] font-medium ${improving ? 'text-emerald-400' : declining ? 'text-red-400' : 'text-gray-500'}`}
        >
          {improving ? `↗ #${last + 1}` : declining ? `↘ #${last + 1}` : `→ #${last + 1}`}
        </span>
      )}
    </div>
  );
}

// ── Position Trend Calculation ────────────────────────────────────────────────

export function calculatePositionTrends(
  results: ResultsMap,
  sortedPlayers: PlayerWithScore[]
): Record<string, number[]> {
  const trends: Record<string, number[]> = {};
  for (const player of sortedPlayers) {
    trends[player.name] = [];
  }

  const playedMatches = ALL_MATCHES
    .filter(m => m.stage === 'group' && results[m.matchId]?.played)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  if (playedMatches.length < 2) return trends;

  const playerPoints: Record<string, Record<string, number>> = {};
  for (const player of sortedPlayers) {
    playerPoints[player.name] = {};
    for (const pred of player.predictions) {
      const matchId = getPredictionMatchId(pred);
      if (!matchId) continue;
      const r = results[matchId];
      if (!r?.played || !pred?.score) continue;
      const actualScore = `${r.homeScore}-${r.awayScore}`;
      playerPoints[player.name][matchId] = calculatePredictionPoints(pred.score, actualScore);
    }
  }

  const cumulative: Record<string, number> = {};
  for (const player of sortedPlayers) {
    cumulative[player.name] = 0;
  }

  for (let mi = 0; mi < playedMatches.length; mi++) {
    const matchId = playedMatches[mi].matchId;

    for (const player of sortedPlayers) {
      cumulative[player.name] += playerPoints[player.name]?.[matchId] || 0;
    }

    if (mi === 0 || mi === playedMatches.length - 1 || mi % 5 === 0) {
      const ranked = [...sortedPlayers].sort((a, b) => (cumulative[b.name] || 0) - (cumulative[a.name] || 0));
      for (let ri = 0; ri < ranked.length; ri++) {
        const name = ranked[ri].name;
        if (!trends[name]) trends[name] = [];
        trends[name].push(ri);
      }
    }
  }

  return trends;
}

// ── Server-side: calculate from raw player data ───────────────────────────────

export function calculatePositionTrendsFromData(
  players: PlayerData[],
  results: ResultsMap
): Record<string, number[]> {
  const teams: PlayerWithScore[] = players.map(p => ({
    name: p.nombre,
    points: 0,
    exactResults: 0,
    correctResults: 0,
    totalPossible: 0,
    accuracy: 0,
    predictions: (p.predicciones?.fase_grupos || []) as Prediction[],
  }));

  // Compute scores
  for (const player of teams) {
    let totalPts = 0;
    let exact = 0;
    let correct = 0;
    let possible = 0;

    for (const pred of player.predictions) {
      const matchId = getPredictionMatchId(pred);
      if (!matchId) continue;
      const r = results[matchId];
      if (r?.played && r.homeScore !== null && r.awayScore !== null && pred.score) {
        possible++;
        const actualScore = `${r.homeScore}-${r.awayScore}`;
        const pts = calculatePredictionPoints(pred.score, actualScore);
        totalPts += pts;
        if (pts === 3) exact++;
        else if (pts === 1) correct++;
      }
    }

    player.points = totalPts;
    player.exactResults = exact;
    player.correctResults = correct;
    player.totalPossible = possible;
    player.accuracy = possible > 0 ? Math.round(((exact + correct) / possible) * 100) : 0;
  }

  // Sort by points
  const sorted = [...teams].sort((a, b) => b.points - a.points);
  return calculatePositionTrends(results, teams);
}
