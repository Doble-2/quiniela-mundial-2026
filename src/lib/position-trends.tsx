'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Prediction, PlayerData, ResultsMap } from '@/lib/types';
import { ALL_MATCHES } from '@/lib/matches';
import { calculatePredictionPoints } from '@/lib/scoring';
import { CHART_COLORS } from '@/lib/charts';

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

// ── Position Race Chart (multi-player) ────────────────────────────────────────

interface RaceChartProps {
  trends: Record<string, number[]>;
  playerNames: string[];
  height?: number;
}

export function PositionRaceChart({ trends, playerNames, height = 380 }: RaceChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [animated, setAnimated] = useState(false);
  const [tooltip, setTooltip] = useState<{ player: string; pos: number; matchIdx: number; x: number; y: number } | null>(null);

  // Filter to players that have trend data
  const players = playerNames.filter(n => trends[n]?.length > 1);

  useEffect(() => { setAnimated(true); }, []);

  if (players.length < 2) {
    return <p className="text-sm text-gray-500 text-center py-6">No hay suficientes datos para la carrera de posiciones.</p>;
  }

  // Chart dimensions
  const margin = { top: 20, right: 20, bottom: 30, left: 28 };
  const w = 600;
  const h = height;
  const plotW = w - margin.left - margin.right;
  const plotH = h - margin.top - margin.bottom;

  // Max snapshots
  const maxSnaps = Math.max(...players.map(n => trends[n].length));
  const numPlayers = players.length;
  const maxPos = numPlayers - 1; // 0-indexed max position

  const scaleX = (i: number) => margin.left + (i / Math.max(maxSnaps - 1, 1)) * plotW;
  const scaleY = (pos: number) => margin.top + (pos / Math.max(maxPos, 1)) * plotH;

  // Y-axis ticks
  const yTicks = [0, Math.floor(numPlayers / 3), Math.floor(2 * numPlayers / 3), numPlayers - 1];

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Find closest snapshot for mouse X
    const snapIdx = Math.round(((mx - margin.left) / plotW) * (maxSnaps - 1));
    const clampedIdx = Math.max(0, Math.min(maxSnaps - 1, snapIdx));

    // Find closest player by Y
    let closestPlayer = '';
    let closestDist = Infinity;
    let closestPos = 0;
    for (const name of players) {
      const positions = trends[name];
      if (!positions || clampedIdx >= positions.length) continue;
      const pos = positions[clampedIdx];
      const y = scaleY(pos);
      const dist = Math.abs(my - y);
      if (dist < closestDist) {
        closestDist = dist;
        closestPlayer = name;
        closestPos = pos;
      }
    }

    if (closestPlayer && closestDist < 50) {
      setTooltip({
        player: closestPlayer,
        pos: closestPos,
        matchIdx: clampedIdx,
        x: mx,
        y: scaleY(closestPos),
      });
    } else {
      setTooltip(null);
    }
  }, [players, trends, margin.left, plotW, maxSnaps, numPlayers]);

  return (
    <div className="relative" onMouseLeave={() => setTooltip(null)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-auto"
        onMouseMove={handleMouseMove}
      >
        {/* Grid lines */}
        {yTicks.map(p => (
          <g key={`grid-${p}`}>
            <line
              x1={margin.left}
              y1={scaleY(p)}
              x2={w - margin.right}
              y2={scaleY(p)}
              stroke="#ffffff"
              strokeWidth="0.5"
              strokeOpacity="0.08"
              strokeDasharray="4 4"
            />
            <text
              x={margin.left - 6}
              y={scaleY(p) + 4}
              textAnchor="end"
              fontSize="10"
              fill="#6b7280"
            >
              #{p + 1}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {[0, Math.floor(maxSnaps / 3), Math.floor(2 * maxSnaps / 3), maxSnaps - 1].map(i => (
          <text
            key={`xlabel-${i}`}
            x={scaleX(i)}
            y={h - 6}
            textAnchor="middle"
            fontSize="9"
            fill="#6b7280"
          >
            {i === 0 ? 'Inicio' : `Partido ${i * 5}`}
          </text>
        ))}

        {/* Player lines */}
        {players.map((name, pi) => {
          const positions = trends[name];
          if (!positions || positions.length < 2) return null;

          const color = CHART_COLORS[pi % CHART_COLORS.length];
          const points = positions
            .map((pos, i) => `${scaleX(i)},${scaleY(pos)}`)
            .join(' ');
          const last = positions[positions.length - 1];
          const lastX = scaleX(positions.length - 1);
          const lastY = scaleY(last);

          return (
            <g key={name}>
              <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeOpacity={animated ? 0.85 : 0}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transition: 'stroke-opacity 0.6s ease-in',
                }}
              />
              {/* End dot with label */}
              <circle
                cx={lastX}
                cy={lastY}
                r="4"
                fill={color}
                stroke="#1a1a2e"
                strokeWidth="1.5"
                opacity={animated ? 1 : 0}
                style={{ transition: 'opacity 0.6s ease-in' }}
              />
              <text
                x={lastX + 6}
                y={lastY + 4}
                fontSize="9"
                fontWeight="bold"
                fill={color}
                opacity={animated ? 1 : 0}
                style={{ transition: 'opacity 0.6s ease-in' }}
              >
                {name.split(' ')[0]}
              </text>
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <line
              x1={margin.left}
              y1={tooltip.y}
              x2={w - margin.right}
              y2={tooltip.y}
              stroke={CHART_COLORS[players.indexOf(tooltip.player) % CHART_COLORS.length]}
              strokeWidth="1"
              strokeOpacity="0.3"
            />
            <circle cx={scaleX(tooltip.matchIdx)} cy={tooltip.y} r="5" fill="#1a1a2e" stroke={CHART_COLORS[players.indexOf(tooltip.player) % CHART_COLORS.length]} strokeWidth="2" />
            <rect
              x={tooltip.x > w / 2 ? tooltip.x - 120 : tooltip.x + 12}
              y={tooltip.y - 16}
              width="110"
              height="32"
              rx="6"
              fill="#1a1a2e"
              stroke={CHART_COLORS[players.indexOf(tooltip.player) % CHART_COLORS.length]}
              strokeWidth="1"
              strokeOpacity="0.5"
            />
            <text
              x={tooltip.x > w / 2 ? tooltip.x - 10 : tooltip.x + 18}
              y={tooltip.y}
              textAnchor={tooltip.x > w / 2 ? 'end' : 'start'}
              fontSize="10"
              fill="#e5e7eb"
            >
              <tspan x={tooltip.x > w / 2 ? tooltip.x - 10 : tooltip.x + 18} dy="-2" fontWeight="bold">
                {tooltip.player}
              </tspan>
              <tspan x={tooltip.x > w / 2 ? tooltip.x - 10 : tooltip.x + 18} dy="14" fill="#9ca3af">
                Puesto #{tooltip.pos + 1}
              </tspan>
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
