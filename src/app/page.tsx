"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { MatchData, Prediction, PlayerData, MatchResult, ResultsMap } from '@/lib/types';
import { ALL_MATCHES } from '@/lib/matches';
import { calculatePredictionPoints, getAllResults, saveAllResults } from '@/lib/scoring';
import { PerformanceChart, CHART_COLORS } from '@/lib/charts';
import { PLAYER_SLUG_MAP } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPredictionMatchId(pred: Prediction): string | null {
  const parts = pred.match.split('-');
  if (parts.length !== 2) return null;
  const [home, away] = parts;
  const match = ALL_MATCHES.find(m => m.home === home && m.away === away);
  return match ? match.matchId : null;
}

// ── Per-Matchday Points Calculation ───────────────────────────────────────────

interface MatchdayPoints {
  matchday: string;
  points: Record<string, number>;
}

function calculatePerMatchdayPoints(
  players: PlayerWithScore[],
  results: ResultsMap
): MatchdayPoints[] {
  // Group matches by round (1, 2, 3 for group stage)
  const roundLabels: Record<number, string> = {
    1: 'Jornada 1',
    2: 'Jornada 2',
    3: 'Jornada 3',
  };

  // For each player, calculate points per match
  const matchPoints: Record<string, Record<string, number>> = {};

  for (const player of players) {
    matchPoints[player.name] = {};
    for (const pred of player.predictions) {
      const matchId = getPredictionMatchId(pred);
      if (!matchId) continue;

      const match = ALL_MATCHES.find((m) => m.matchId === matchId);
      if (!match || match.stage !== 'group' || !match.round) continue;

      const roundLabel = roundLabels[match.round] || `Ronda ${match.round}`;
      const actualResult = results[matchId];

      if (
        actualResult?.played &&
        actualResult.homeScore !== null &&
        actualResult.awayScore !== null &&
        pred?.score
      ) {
        const actualScore = `${actualResult.homeScore}-${actualResult.awayScore}`;
        const pts = calculatePredictionPoints(pred.score, actualScore);
        matchPoints[player.name][roundLabel] =
          (matchPoints[player.name][roundLabel] || 0) + pts;
      } else {
        matchPoints[player.name][roundLabel] =
          matchPoints[player.name][roundLabel] || 0;
      }
    }
  }

  // Build result array in order
  const roundOrder = ['Jornada 1', 'Jornada 2', 'Jornada 3'];
  return roundOrder.map((label) => {
    const values: Record<string, number> = {};
    for (const player of players) {
      values[player.name] = matchPoints[player.name]?.[label] ?? 0;
    }
    return { matchday: label, points: values };
  });
}

function groupPredictions(predictions: Prediction[]): Map<string, Prediction[]> {
  const grouped = new Map<string, Prediction[]>();
  for (const pred of predictions) {
    const key = pred.match_id;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(pred);
  }
  return grouped;
}

interface PlayerWithScore {
  name: string;
  points: number;
  exactResults: number;
  correctResults: number;
  totalPossible: number;
  accuracy: number;
  predictions: Prediction[];
}

function calculateScores(players: PlayerData[], results: ResultsMap): PlayerWithScore[] {
  return players.map(player => {
    let points = 0;
    let exactResults = 0;
    let correctResults = 0;
    let totalPossible = 0;

    for (const pred of player.predicciones.fase_grupos) {
      const matchId = getPredictionMatchId(pred);
      if (!matchId) continue;

      const actualResult = results[matchId];
      if (actualResult?.played && actualResult.homeScore !== null && actualResult.awayScore !== null) {
        totalPossible++;
        const actualScore = `${actualResult.homeScore}-${actualResult.awayScore}`;
        const predScore = pred.score || '';
        const pts = calculatePredictionPoints(predScore, actualScore);
        points += pts;
        if (pts === 3) exactResults++;
        else if (pts === 1) correctResults++;
      }
    }

    const accuracy = totalPossible > 0 ? Math.round(((exactResults + correctResults) / totalPossible) * 100) : 0;
    return {
      name: player.nombre,
      points,
      exactResults,
      correctResults,
      totalPossible,
      accuracy,
      predictions: player.predicciones.fase_grupos,
    };
  }).sort((a, b) => b.points - a.points);
}

// ── Animated Counter ──────────────────────────────────────────────────────────

function AnimatedNumber({ value, className = '' }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevValue = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const start = prevValue.current;
    prevValue.current = value;
    const diff = value - start;
    if (diff === 0) return;
    const duration = 400;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = Math.round(start + diff * eased);
      el.textContent = String(current);
      if (progress < 1) requestAnimationFrame(animate);
      else el.textContent = String(value);
    };
    requestAnimationFrame(animate);
  }, [value]);

  return <span ref={ref} className={className}>{value}</span>;
}

// ── Medal / Position Helper ───────────────────────────────────────────────────

function PositionBadge({ pos }: { pos: number }) {
  if (pos === 0) return <span className="text-lg">🥇</span>;
  if (pos === 1) return <span className="text-lg">🥈</span>;
  if (pos === 2) return <span className="text-lg">🥉</span>;
  return <span className="text-sm font-bold text-gray-500 w-6 inline-block text-center">{pos + 1}</span>;
}

// ── Skeleton Loader ───────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-4 px-4 animate-pulse">
      <div className="w-8 h-6 bg-gray-700 rounded" />
      <div className="w-32 h-5 bg-gray-700 rounded" />
      <div className="ml-auto w-10 h-6 bg-gray-700 rounded" />
      <div className="w-8 h-5 bg-gray-700 rounded" />
      <div className="w-8 h-5 bg-gray-700 rounded" />
      <div className="w-8 h-5 bg-gray-700 rounded" />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Home() {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [results, setResults] = useState<ResultsMap>({});
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);


  // ── Load Data ────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      async function fetchResults() {
        const TEAM_MAP: Record<string, string> = {
          "Mexico": "México", "South Africa": "Sudáfrica", "South Korea": "Corea del Sur",
          "Czech Republic": "República Checa", "Canada": "Canadá", "Bosnia & Herzegovina": "Bosnia y Herzegovina",
          "Qatar": "Catar", "Switzerland": "Suiza", "Brazil": "Brasil", "Morocco": "Marruecos",
          "Haiti": "Haití", "Scotland": "Escocia", "USA": "Estados Unidos", "Paraguay": "Paraguay",
          "Australia": "Australia", "Turkey": "Turquía", "Germany": "Alemania", "Curaçao": "Curazao",
          "Ivory Coast": "Costa de Marfil", "Ecuador": "Ecuador", "Netherlands": "Países Bajos",
          "Japan": "Japón", "Sweden": "Suecia", "Tunisia": "Túnez", "Belgium": "Bélgica",
          "Egypt": "Egipto", "Iran": "Irán", "New Zealand": "Nueva Zelanda", "Spain": "España",
          "Cape Verde": "Cabo Verde", "Saudi Arabia": "Arabia Saudita", "Uruguay": "Uruguay",
          "France": "Francia", "Senegal": "Senegal", "Iraq": "Irak", "Norway": "Noruega",
          "Argentina": "Argentina", "Algeria": "Argelia", "Austria": "Austria", "Jordan": "Jordania",
          "Portugal": "Portugal", "DR Congo": "RD Congo", "Uzbekistan": "Uzbekistán",
          "Colombia": "Colombia", "England": "Inglaterra", "Croatia": "Croacia",
          "Ghana": "Ghana", "Panama": "Panamá"
        };

        try {
          const resp = await fetch('https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json');
          const rawData = await resp.json();
          const matchResults: ResultsMap = {};

          if (rawData?.matches) {
            for (const m of rawData.matches) {
              if (!m.score?.ft) continue;
              const home = TEAM_MAP[m.team1] || m.team1;
              const away = TEAM_MAP[m.team2] || m.team2;
              const matchEntry = ALL_MATCHES.find(x => x.home === home && x.away === away);
              if (matchEntry) {
                matchResults[matchEntry.matchId] = {
                  homeScore: m.score.ft[0],
                  awayScore: m.score.ft[1],
                  played: true
                };
              }
            }
          }

          if (Object.keys(matchResults).length > 0) {
            setResults(matchResults);
            saveAllResults({ matchResults, groupWinners: {}, knockoutResults: {} });
            
            return;
          }
        } catch (e) {
          console.log('Could not fetch from openfootball, trying local file');
        }

        // Fallback: try local imported results
        try {
          const importedRes = await fetch('/data/imported-results.json').then(r => r.json());
          if (importedRes?.matchResults) {
            setResults(importedRes.matchResults);
            saveAllResults(importedRes);
            return;
          }
        } catch (e) {}

        // Last resort: localStorage
        const saved = getAllResults();
        if (saved.matchResults && Object.keys(saved.matchResults).length > 0) {
          setResults(saved.matchResults);
        }
      }

      await fetchResults();

      const playerFiles = [
        'alejandro', 'alexander', 'alexandito', 'ana_maria_mogollom',
        'angel', 'daniel', 'daniela', 'dayana',
        'edixon', 'gerardo', 'jenny', 'jose_d',
        'josu', 'juan_j', 'melquis', 'oscar_caceres',
        'smith', 'wilian_alexa', 'zhaid'
      ];

      try {
        const data = await Promise.all(
          playerFiles.map(name =>
            fetch(`/data/${name}.json`).then(r => r.json() as Promise<PlayerData>)
          )
        );
        setPlayers(data);
      } catch (err) {
        console.error('Error loading player data:', err);
      }
      setLoading(false);
    }

    loadData();
  }, []);

  const sortedPlayers = calculateScores(players, results);

  const totalPlayed = Object.values(results).filter(r => r.played).length;
  const totalGroupMatches = ALL_MATCHES.filter(m => m.stage === 'group').length;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-gray-100">
            {/* Hero / Header */}
      <header className="mb-6">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
            Quiniela Mundial 2026
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base flex items-center gap-2 justify-center">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400/60" />
            {totalPlayed}/{totalGroupMatches} partidos disputados
            <span className="text-gray-600">·</span>
            <span className="text-gray-500">{players.length} jugadores</span>
          </p>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-6xl mx-auto px-4 pb-12">
        {/* Results info bar */}
        {false && (
          <div className="mb-6 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center gap-2 text-sm text-emerald-400">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Resultados cargados automáticamente desde datos del torneo
          </div>
        )}

        {/* ── Leaderboard ── */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-200 flex items-center gap-2">
              Tabla de Posiciones
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
          </div>

          {loading ? (
            /* ── Skeleton Loader ── */
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : sortedPlayers.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-5xl mb-4 block">📋</span>
              <p className="text-gray-500 text-lg">No hay datos de jugadores disponibles</p>
              <p className="text-gray-600 text-sm mt-1">Verifica que los archivos de datos estén cargados</p>
            </div>
          ) : (
            /* ── Leaderboard Table ── */
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden backdrop-blur-sm">
              {/* Table Header */}
              {/* Desktop Header */}
              <div className="hidden md:grid grid-cols-[48px_1fr_70px_70px_70px_70px_55px] gap-2 px-5 py-3 border-b border-white/[0.06] text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <span>#</span>
                <span>Jugador</span>
                <span className="text-center">Pts</span>
                <span className="text-center">Exactos</span>
                <span className="text-center">Aciertos</span>
                <span className="text-center">Posibles</span>
                <span className="text-center">%</span>
              </div>

              <div className="divide-y divide-white/[0.04]">
                {sortedPlayers.map((player, idx) => (
                  <div key={player.name}>
                    {/* Player Row */}
                    <button
                      onClick={() => setExpandedPlayer(expandedPlayer === player.name ? null : player.name)}
                      className="w-full grid grid-cols-[32px_1fr_45px_36px_36px] md:grid-cols-[48px_1fr_70px_70px_70px_70px_55px] gap-1 md:gap-2 items-center px-2 md:px-5 py-3 hover:bg-white/[0.04] transition-all text-left group"
                    >
                      {/* Position */}
                      <div className="flex items-center justify-center">
                        <PositionBadge pos={idx} />
                      </div>

                      {/* Name + expand indicator */}
                      <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                        <Link
                          href={`/jugador/${PLAYER_SLUG_MAP[player.name] || player.name.toLowerCase()}`}
                          className="font-medium text-gray-200 truncate group-hover:text-amber-300 transition-colors text-xs md:text-sm hover:text-amber-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {player.name}
                        </Link>
                        <svg
                          className={`w-3 h-3 text-gray-600 shrink-0 transition-transform duration-300 md:block ${
                            expandedPlayer === player.name ? 'rotate-180 text-amber-400/60' : ''
                          }`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      {/* Points - prominent */}
                      <div className="text-center">
                        <AnimatedNumber
                          value={player.points}
                          className="text-sm md:text-xl font-extrabold text-amber-400"
                        />
                        {/* Mobile mini stats row below points */}
                        <div className="flex gap-0.5 justify-center text-[9px] md:hidden text-gray-500 mt-0.5">
                          <span className="text-emerald-500/80">{player.exactResults}E</span>
                          <span className="text-blue-400/80">{player.correctResults}A</span>
                        </div>
                      </div>

                      {/* Mobile-only: accuracy % */}
                      <div className="md:hidden text-center">
                        <span className={`text-[10px] font-mono ${
                          player.accuracy >= 60 ? 'text-amber-400' : player.accuracy >= 30 ? 'text-gray-400' : 'text-red-400'
                        }`}>
                          {player.accuracy}%
                        </span>
                      </div>

                      {/* Mobile-only: total possible */}
                      <div className="md:hidden text-center">
                        <span className="text-[10px] text-gray-600">{player.totalPossible}</span>
                      </div>

                      {/* Desktop columns (hidden on mobile) */}
                      <div className="hidden md:block text-center">
                        <span className="text-sm font-semibold text-emerald-400">{player.exactResults}</span>
                      </div>
                      <div className="hidden md:block text-center">
                        <span className="text-sm font-semibold text-blue-400">{player.correctResults}</span>
                      </div>
                      <div className="hidden md:block text-center">
                        <span className="text-sm text-gray-500">{player.totalPossible}</span>
                      </div>
                      <div className="hidden md:block text-center">
                        <span className={`text-sm font-mono ${
                          player.accuracy >= 60 ? 'text-amber-400' : player.accuracy >= 30 ? 'text-gray-400' : 'text-red-400'
                        }`}>
                          {player.accuracy}%
                        </span>
                      </div>
                    </button>

                    {/* ── Expanded Player Detail ── */}
                    {expandedPlayer === player.name && (
                      <PlayerDetail
                        player={player}
                        results={results}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

                {/* ── Global Performance Chart ── */}
        {!loading && sortedPlayers.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-200 flex items-center gap-2">
                📈 Rendimiento por jornada
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
            </div>
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3 md:p-5 backdrop-blur-sm">
              {(() => {
                const top5 = sortedPlayers.slice(0, 5);
                const mdPoints = calculatePerMatchdayPoints(top5, results);
                const chartData = mdPoints.map((md) => ({
                  label: md.matchday,
                  values: md.points,
                }));
                return (
                  <PerformanceChart
                    data={chartData}
                    players={top5.map((p) => p.name)}
                    type="line"
                    height={250}
                    width={600}
                    cumulative={true}
                  />
                );
              })()}
            </div>
          </section>
        )}

        {/* ── Non-cumulative points per matchday ── */}
        {!loading && sortedPlayers.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-200 flex items-center gap-2">
                📊 Puntos por jornada
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
            </div>
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3 md:p-5 backdrop-blur-sm">
              {(() => {
                const top5 = sortedPlayers.slice(0, 5);
                const mdPoints = calculatePerMatchdayPoints(top5, results);
                const chartData = mdPoints.map((md) => ({
                  label: md.matchday,
                  values: md.points,
                }));
                return (
                  <PerformanceChart
                    data={chartData}
                    players={top5.map((p) => p.name)}
                    type="bar"
                    height={220}
                    width={600}
                    cumulative={false}
                  />
                );
              })()}
            </div>
          </section>
        )}

        {/* ── Accuracy % per player ── */}
        {!loading && sortedPlayers.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-200 flex items-center gap-2">
                🎯 Precisión general
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
            </div>
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3 md:p-5 backdrop-blur-sm">
              {(() => {
                const top10 = sortedPlayers.slice(0, 10);
                const accData = [{
                  label: '% Acierto',
                  values: Object.fromEntries(top10.map(p => [p.name, p.accuracy]))
                }];
                return (
                  <PerformanceChart
                    data={accData}
                    players={top10.map((p) => p.name)}
                    type="bar"
                    height={220}
                    width={600}
                    cumulative={false}
                  />
                );
              })()}
            </div>
          </section>
        )}

        {/* ── Bottom 3 funny messages (dynamic pool of 40+) ── */}
        {!loading && sortedPlayers.length >= 3 && (
          <div className="mt-6 space-y-2 text-center">
            <p className="text-xs text-gray-600 mb-2 text-center">🏆 Mensajes para la cola de la tabla:</p>
            {(() => {
              const pool = [
                ['🧠', 'Tus puntos están en oferta: 2x1 en la parte baja de la tabla.'],
                ['🔮', 'Tus estadísticas son perfectas si buscas el anti-record.'],
                ['📉', 'La tabla te quiere... abajo del todo.'],
                ['🎯', 'La bola de cristal est\u00e1 en mantenimiento.'],
                ['🐢', 'Tus aciertos se pueden contar con los dedos de un manco.'],
                ['🦥', 'Tus resultados: tan predecibles como impredecibles.'],
                ['🎪', 'Tus estad\u00edsticas: 99% de fe, 1% de acierto.'],
                ['🔍', 'La quiniela es un viaje, no un destino. El tuyo va hacia abajo.'],
                ['📊', 'Hasta calculando mal le pegas m\u00e1s que ahora.'],
                ['🎲', 'Los números no mienten, pero tú los ignoraste olímpicamente.'],
                ['🥉', 'Le pegaste a la pared más veces que al marcador.'],
                ['🔋', 'Deberías invertir en una brújula, perdiste el norte desde el inicio.'],
                ['🎭', 'Si esto fuera póker, ya estarías vendiendo el reloj.'],
                ['⚽', 'No eres adivino, eres una app de pronósticos con bugs.'],
                ['📚', 'No importa cuánto te esfuerces, siempre hay un fondo de tabla con tu nombre.'],
                ['🎰', 'Tus predicciones son tan útiles como un paraguas en el desierto.'],
                ['🌧\uFE0F', 'Quien mucho abarca, poco acierta. Aplica.'],
                ['🧩', 'La quiniela no es para todos... y tú eres la prueba.'],
                ['🎬', 'Tu nombre debería estar en el Libro Guinness de los peores pronósticos.'],
                ['🥴', 'Cavaste un hoyo y te quedaste en el fondo de la tabla.'],
                ['🌀', 'Si tus pronósticos fueran acciones, ya estarías en bancarrota.'],
                ['🪄', 'Abracadabra... tus puntos desaparecieron.'],
                ['🧮', 'Te falta una pieza... la que tiene los resultados correctos.'],
                ['🎤', 'Si la quiniela diera puntos por esfuerzo, serías líder. Pero no da.'],
                ['📦', 'Hiciste pron\u00f3sticos o solo le pegaste al teclado?'],
                ['🚂', 'Si la quiniela fuera examen, ya te hubieran expulsado.'],
                ['⚡', 'Tus aciertos duran menos que un chocolate al sol.'],
                ['🧪', 'Vas lento pero seguro... seguro al \u00faltimo lugar.'],
                ['🎮', 'El único marcador que acertaste fue el de tu teléfono al cargar.'],
                ['🌡\uFE0F', 'Bronce en la categor\u00eda "al menos lo intentaste"'],
                ['🚀', 'Tus números: muchos ceros, poca emoción.'],
                ['📡', 'Le atinaste a todo... excepto al resultado correcto.'],
                ['🐌', 'Expertos dicen que tus predicciones son 100% impredecibles.'],
                ['🧊', 'No sabemos si eres malo o la quiniela te tiene manía.'],
                ['🎨', 'Tu estrategia es igual a una tragamonedas.'],
                ['🕳\uFE0F', 'La única tabla que lideras es la de la negación.'],
                ['🤷', 'Tus pron\u00f3sticos dan miedo... y no es una pel\u00edcula.'],
                ['🥇', 'Perdiste el rumbo en el partido inaugural.'],
                ['🧭', 'Experto en fallar: especialidad de la casa.'],
                ['🎠', 'Tus predicciones viajan en la misma dirección pero en autobuses distintos.'],
                ['🧠', 'Si la quiniela fuera un examen, estarías reprobado con honores.'],
                ['🔮', 'Pronosticaste mejor el clima del 2027 que estos partidos.'],
                ['📉', 'Tus datos no mienten: cero aciertos, cien por ciento fe.'],
                ['🎯', 'Tus aciertos y yo tenemos algo en común: ninguno existe.'],
                ['🐢', 'El único que te supera es el azar.'],
                ['🦥', 'Tus predicciones son como Wi-Fi en la montaña: no hay señal.'],
                ['🎪', 'Los marcadores te evitan. Literalmente.'],
                ['🔍', 'Te esforzaste tanto que lograste lo imposible: fallar todo.'],
                ['📊', 'Sigue intentando, la próxima será. Spoiler: no será.'],
                ['🎲', 'No eres el mejor, pero definitivamente eres el más presente en el último lugar.'],
                ['🥉', 'Tus predicciones tienen menos sol que un d\u00eda lluvioso.'],
                ['🔋', 'No es fácil estar donde estás. Se necesita talento para fallar tanto.'],
                ['🎭', 'No eres adivino, eres comediante.'],
                ['⚽', 'Despegas... directo al \u00faltimo puesto.'],
                ['📚', 'Buscando se\u00f1al de acierto... sin \u00e9xito.'],
                ['🎰', 'Tus predicciones tienen fecha de vencimiento: nunca.'],
                ['🌧\uFE0F', 'El único partido que ganaste fue el de no rendirte. Y aún así perdiste.'],
                ['🧩', 'Tiraste un dado para cada resultado, verdad?'],
                ['🎬', 'Buscando aciertos como si fueran WMD en Irak.'],
                ['🥴', '¿Eres tú o es la quiniela la que está mal? Spoiler: eres tú.'],
                ['🌀', 'Tus puntos son como las estrellas: se cuentan con los dedos de una mano.'],
                ['🪄', 'Tus predicciones tienen copyright: © Todas mal reservadas.'],
                ['🧮', 'Pusiste más empeño que resultados.'],
                ['🎤', 'Le atinaste a todo... todo mal, pero todo.'],
                ['📦', 'Esto no es una quiniela, es una tesis sobre la incertidumbre y tú eres el autor.'],
                ['🚂', 'Tus aciertos nunca llegaron. Sin seguimiento, sin rastro.'],
                ['⚡', 'Esto no es un carrusel pero das vueltas en el mismo puesto.'],
                ['🧪', 'La \u00fanica corriente que tienes es la que te corre al ver la tabla.'],
                ['🎮', 'Primero... empezando por abajo.'],
                ['🌡\uFE0F', 'Los astros no estaban alineados... ni los marcadores.'],
                ['🚀', 'Viste alg\u00fan partido o solo pusiste resultados al azar?'],
                ['📡', 'Si el éxito fuera suerte, estarías en el sótano igual.'],
                ['🐌', 'Los resultados te ignoran salvajemente.'],
                ['🧊', 'La FIFA te debe una disculpa por no consultarte antes de los partidos.'],
                ['🎨', 'Tus puntos son un número de la suerte... para los demás.'],
                ['🕳\uFE0F', 'Campeón en participación, novato en resultado.'],
                ['🤷', 'Después de esta quiniela, considera mejor el bingo.'],
                ['🥇', 'Lograste lo que pocos: hacer que todos se sientan mejor con su quiniela.'],
                ['🧭', 'Tu marca personal: cero aciertos, cien por ciento actitud.'],
                ['🎠', 'Tus predicciones son lo único más frío que la cerveza de aquí.'],
                ['🧠', 'Para la próxima, tira una moneda. Te irá mejor.'],
                ['🔮', 'Tus pronósticos son como las profecías de una bola 8 mágica: random.'],
                ['📉', 'Las acciones suben, tus aciertos bajan. Impresionante.'],
                ['🎯', 'Ponle easy, esto es modo legendario para ti.'],
                ['🐢', 'La quiniela no es tu fuerte. Pero el humor sí. ¡Gracias por participar!'],
                ['🦥', 'Acertaste menos partidos que programas de TV cancelados.'],
                ['🎪', 'Tus puntos est\u00e1n congelados desde la primera jornada.'],
                ['🔍', 'Deber\u00edas leer menos libros de autoayuda y m\u00e1s deportes.'],
                ['📊', 'Hasta tu equipo favorito te falló, y ni eso te salió bien.'],
                ['🎲', 'Si esta fuera una carrera, estarías descalificado por salir en reversa.'],
                ['🥉', 'Los números hablan... y están diciendo que te sientes.'],
                ['🔋', 'Tus aciertos est\u00e1n bajo cero.'],
                ['🎭', 'Tus aciertos caben en un tweet y sobran caracteres.'],
                ['⚽', 'Tus predicciones son el antídoto de la precisión.'],
                ['📚', 'Se te acab\u00f3 la bater\u00eda despu\u00e9s de acertar UN partido.'],
                ['🎰', 'Suelta el micr\u00f3fono, suelta la quiniela.'],
                ['🌧\uFE0F', 'La mala noticia: último lugar. La buena: es memorable.'],
                ['🧩', 'La quiniela te necesita... en el último puesto.'],
                ['🎬', 'Te sugerimos cambiar de hobby. ¿Has intentado coleccionar sellos?'],
                ['🥴', 'Hasta el VAR se quedó sin palabras con tus pronósticos.'],
                ['🌀', 'Eres el payaso de la quiniela? Porque esto es un circo.'],
                ['🪄', 'Pintaste la quiniela de colores... l\u00e1stima que todos son rojos.'],
                ['🧮', 'Tu velocidad de acierto es similar a la de un perezoso.'],
                ['🎤', 'Tus aciertos est\u00e1n en otro plano dimensional.'],
                ['📦', 'Nobody knows. Y t\u00fa menos.'],
                ['🚂', 'Descarrilaste desde el primer partido.'],
                ['⚡', '¡Increíble! Lograste acertar menos que un reloj parado (y da la hora bien dos veces al día).'],
                ['🧪', 'Podríamos hacer una encuesta y perderías también.'],
                ['🎮', 'Tus pron\u00f3sticos son experimentalmente incorrectos.'],
                ['🌡\uFE0F', 'La consistencia es clave... y tú eres consistentemente último.'],
                ['🚀', 'Tus predicciones tienen menos sentido que un mapa de la luna.'],
                ['📡', 'Le atinaste a la misma cantidad que yo, y yo no llené la quiniela.'],
                ['🐌', '¿Sabías que tus pronósticos se usan en escuelas como ejemplo de lo que NO hacer?'],
                ['🧊', 'Messi metió más goles que tú puntos. Y Messi a veces no juega.'],
                ['🎨', 'Bienvenido al club de los que intentaron y fallaron con estilo.'],
                ['🕳\uFE0F', 'Tus aciertos son como los unicornios: todos hablan de ellos, nadie los ve.'],
                ['🤷', 'Hasta un oráculo te gana, y los oráculos no existen.'],
                ['🥇', 'Tu paso en la tabla es m\u00e1s lento que una caracola.']
              ];;
              const shuffled = [...pool].sort(() => Math.random() - 0.5);
              return [0, 1, 2].map(i => {
                const player = sortedPlayers[sortedPlayers.length - 1 - i];
                if (!player) return null;
                const [emoji, msg] = shuffled[i];
                return (
                  <div key={i} className="flex items-center gap-1.5 text-xs md:text-sm text-gray-500 justify-center italic flex-wrap px-2">
                    <span>{emoji}</span>
                    <span className="font-medium text-gray-400">{player.name}:</span>
                    <span className="text-gray-500">“{msg}”</span>
                    <span className="text-[10px] md:text-xs text-gray-600">({player.points}pts, {player.accuracy}%)</span>
                  </div>
                );
              });
            })()}
          </div>
        )}


        {/* ── Key ── */}
        {!loading && sortedPlayers.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-gray-500 justify-center">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500/30 border border-emerald-500/50" /> Exacto (3 pts)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500/30 border border-blue-500/50" /> Acertado (1 pt)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-gray-700/50 border border-gray-600/50" /> Pendiente / Sin resultado
            </span>
          </div>
        )}
      </main>
    </div>
  );
}

// ── PlayerDetail Component ────────────────────────────────────────────────────

function PlayerDetail({
  player,
  results,
}: {
  player: PlayerWithScore;
  results: ResultsMap;
}) {
  const grouped = groupPredictions(player.predictions);

  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const rounds = [1, 2, 3];

  return (
    <div className="bg-gradient-to-b from-white/[0.04] to-transparent border-t border-white/[0.04] overflow-hidden animate-slideDown">
      <div className="p-4 md:p-5">
        {/* Stats summary bar */}
        <div className="flex flex-wrap items-center gap-4 md:gap-6 mb-4 text-xs">
          <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/15">
            <span className="text-emerald-400 font-bold">{player.exactResults}</span>
            <span className="text-gray-400">exactos</span>
          </div>
          <div className="flex items-center gap-1.5 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/15">
            <span className="text-blue-400 font-bold">{player.correctResults}</span>
            <span className="text-gray-400">aciertos</span>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-700/20 px-3 py-1.5 rounded-lg border border-white/[0.06]">
            <span className="text-gray-300 font-bold">{player.totalPossible}</span>
            <span className="text-gray-500">con resultado</span>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/15">
            <span className={player.accuracy >= 60 ? 'text-amber-400 font-bold' : player.accuracy >= 30 ? 'text-gray-300 font-bold' : 'text-red-400 font-bold'}>{player.accuracy}%</span>
            <span className="text-gray-400">aciertos</span>
          </div>
        </div>

        {/* Player performance mini chart */}
        {(() => {
          const singlePlayerData = calculatePerMatchdayPoints([player], results);
          const chartData = singlePlayerData.map((md) => ({
            label: md.matchday,
            values: md.points,
          }));
          return (
            <div className="mb-4 rounded-xl bg-white/[0.02] border border-white/[0.05] p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                  Rendimiento
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-white/5 to-transparent" />
              </div>
              <PerformanceChart
                data={chartData}
                players={[player.name]}
                type="bar"
                height={140}
                width={400}
                cumulative={false}
              />
            </div>
          );
        })()}

        {/* Predictions grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {groups.map(group => (
            <div key={group} className="rounded-xl bg-white/[0.02] border border-white/[0.05] overflow-hidden">
              <div className="px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-transparent border-b border-white/[0.05]">
                <span className="text-xs font-bold text-amber-400/80 uppercase tracking-wider">Grupo {group}</span>
              </div>
              <div className="p-2 space-y-1">
                {rounds.map(round => {
                  const matchA = ALL_MATCHES.find(m => m.matchId === `${group}${round}a`);
                  const matchB = ALL_MATCHES.find(m => m.matchId === `${group}${round}b`);

                  return [matchA, matchB].filter(Boolean).map(match => {
                    if (!match) return null;
                    const actual = results[match.matchId];
                    const predScore = player.predictions.find(
                      p => p.match === `${match.home}-${match.away}`
                    );
                    const predScoreStr = predScore?.score || '?';

                    let rowBg = '';
                    let statusIndicator = '';
                    let pts = 0;
                    if (actual?.played && actual.homeScore !== null && actual.awayScore !== null && predScore?.score) {
                      const actualStr = `${actual.homeScore}-${actual.awayScore}`;
                      pts = calculatePredictionPoints(predScore.score, actualStr);
                      if (pts === 3) {
                        rowBg = 'bg-emerald-500/10 border-emerald-500/20';
                        statusIndicator = '🟢';
                      } else if (pts === 1) {
                        rowBg = 'bg-blue-500/10 border-blue-500/20';
                        statusIndicator = '🔵';
                      } else {
                        rowBg = 'bg-red-500/5 border-red-500/10';
                        statusIndicator = '⭕';
                      }
                    } else if (actual?.played) {
                      rowBg = 'bg-gray-700/20 border-gray-600/20';
                    }

                    return (
                      <div
                        key={match.matchId}
                        className={`flex items-center gap-1.5 text-xs py-1.5 px-2 rounded-lg border ${rowBg || 'border-transparent'}`}
                      >
                        {/* Status dot */}
                        <span className="text-[10px] w-4 text-center shrink-0">{statusIndicator || '○'}</span>

                        {/* Home */}
                        <span className="text-gray-400 w-[72px] text-right truncate shrink-0" title={match.home}>
                          {match.home}
                        </span>

                        {/* Prediction */}
                        <span className={`font-mono font-bold w-10 text-center shrink-0 ${
                          pts === 3 ? 'text-emerald-400' : pts === 1 ? 'text-blue-400' : 'text-gray-400'
                        }`}>
                          {predScoreStr}
                        </span>

                        <span className="text-gray-600 shrink-0">:</span>

                        {/* Actual */}
                        <span className={`font-mono font-bold w-10 text-center shrink-0 ${
                          actual?.played ? 'text-white' : 'text-gray-600'
                        }`}>
                          {actual?.played && actual.homeScore !== null
                            ? `${actual.homeScore}-${actual.awayScore}`
                            : '?-?'}
                        </span>

                        {/* Away */}
                        <span className="text-gray-400 w-[72px] truncate shrink-0" title={match.away}>
                          {match.away}
                        </span>
                      </div>
                    );
                  });
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
