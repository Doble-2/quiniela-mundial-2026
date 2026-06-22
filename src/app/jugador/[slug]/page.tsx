"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PlayerData, ResultsMap } from "@/lib/types";
import { ALL_MATCHES } from "@/lib/matches";
import { calculatePredictionPoints } from "@/lib/scoring";
import { PerformanceChart, CHART_COLORS } from "@/lib/charts";
import { SLUG_TO_NAME } from "@/lib/utils";
import { PositionSparkline } from "@/lib/position-trends";

function getMatchIdByTeams(home: string, away: string): string | null {
  const match = ALL_MATCHES.find((m) => m.home === home && m.away === away);
  return match ? match.matchId : null;
}

function groupPredictions(predictions: { match_id: string; match: string; result: string; score: string }[]) {
  const grouped: Record<string, typeof predictions> = {};
  for (const pred of predictions) {
    const group = pred.match_id.replace(/[0-9]/g, "");
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(pred);
  }
  return grouped;
}

export default function PlayerDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [results, setResults] = useState<ResultsMap>({});
  const [loading, setLoading] = useState(true);
  const [positionTrends, setPositionTrends] = useState<Record<string, number[]>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [playerData, resultsData, trendsData] = await Promise.all([
          fetch(`/data/${slug}.json`).then((r) => {
            if (!r.ok) throw new Error("Jugador no encontrado");
            return r.json() as Promise<PlayerData>;
          }),
          fetch("/data/imported-results.json")
            .then((r) => r.json())
            .then((d) => d.matchResults as ResultsMap)
            .catch(() => ({}) as ResultsMap),
          fetch("/api/position-trends")
            .then((r) => r.json())
            .then((d) => d.trends as Record<string, number[]>)
            .catch(() => ({}) as Record<string, number[]>),
        ]);
        setPlayer(playerData);
        setResults(resultsData);
        setPositionTrends(trendsData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al cargar datos");
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  // Calculate scores
  const playerStats = useMemo(() => {
    if (!player || !results) return null;

    let points = 0;
    let exactResults = 0;
    let correctResults = 0;
    let totalPossible = 0;

    const groupPreds = player.predicciones.fase_grupos || [];

    for (const pred of groupPreds) {
      const matchId = getMatchIdByTeams(
        pred.match.split("-")[0],
        pred.match.split("-")[1]
      );
      if (!matchId) continue;

      const actual = results[matchId];
      if (actual?.played && actual.homeScore !== null && actual.awayScore !== null) {
        totalPossible++;
        const actualScore = `${actual.homeScore}-${actual.awayScore}`;
        const predScore = pred.score || "";
        const pts = calculatePredictionPoints(predScore, actualScore);
        points += pts;
        if (pts === 3) exactResults++;
        else if (pts === 1) correctResults++;
      }
    }

    const accuracy =
      totalPossible > 0
        ? Math.round(((exactResults + correctResults) / totalPossible) * 100)
        : 0;

    return { points, exactResults, correctResults, totalPossible, accuracy };
  }, [player, results]);

  // Per-matchday points for chart
  const matchdayPoints = useMemo(() => {
    if (!player || !results || !playerStats) return [];

    const roundLabels: Record<number, string> = {
      1: "Jornada 1",
      2: "Jornada 2",
      3: "Jornada 3",
    };

    const byRound: Record<string, number> = {
      "Jornada 1": 0,
      "Jornada 2": 0,
      "Jornada 3": 0,
    };

    for (const pred of player.predicciones.fase_grupos || []) {
      const matchId = getMatchIdByTeams(
        pred.match.split("-")[0],
        pred.match.split("-")[1]
      );
      if (!matchId) continue;

      const match = ALL_MATCHES.find((m) => m.matchId === matchId);
      if (!match?.round) continue;

      const label = roundLabels[match.round] || `Ronda ${match.round}`;
      const actual = results[matchId];
      if (actual?.played && actual.homeScore !== null && actual.awayScore !== null) {
        const actualScore = `${actual.homeScore}-${actual.awayScore}`;
        const predScore = pred.score || "";
        byRound[label] =
          (byRound[label] || 0) + calculatePredictionPoints(predScore, actualScore);
      }
    }

    // Cumulative
    let cumSum = 0;
    const roundOrder = ["Jornada 1", "Jornada 2", "Jornada 3"];
    return roundOrder.map((label) => {
      cumSum += byRound[label] || 0;
      return {
        label,
        values: { [player.nombre]: cumSum },
      };
    });
  }, [player, results, playerStats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-10 w-48 bg-gray-800 rounded-lg" />
            <div className="h-8 w-64 bg-gray-800 rounded-lg" />
            <div className="h-6 w-96 bg-gray-800 rounded-lg" />
            <div className="h-64 bg-gray-800/50 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <span className="text-5xl block mb-4">😕</span>
          <h1 className="text-2xl font-bold text-gray-300 mb-2">
            Jugador no encontrado
          </h1>
          <p className="text-gray-500 mb-6">{error || "El jugador solicitado no existe"}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl hover:bg-amber-500/20 transition-all text-sm font-medium"
          >
            ← Volver a la quiniela
          </Link>
        </div>
      </div>
    );
  }

  const groupedPreds = groupPredictions(player.predicciones.fase_grupos || []);
  const groupLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  const roundNames = ["Jornada 1", "Jornada 2", "Jornada 3"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-gray-100">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-amber-400 transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Volver a la quiniela
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-yellow-600/20 border border-amber-500/30 flex items-center justify-center text-2xl">
            👤
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              {player.nombre}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-400 text-sm">
                {playerStats?.points || 0} puntos • {playerStats?.accuracy || 0}% precisión
              </span>
              <PositionSparkline
                positions={positionTrends[player.nombre] || []}
                size="sm"
                showLabel
              />
            </div>
          </div>
        </div>

        {/* Stats bar */}
        {playerStats && (
          <div className="flex flex-wrap gap-3 mb-8">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-2xl font-extrabold text-amber-400">{playerStats.points}</span>
              <span className="text-xs text-gray-400">Puntos</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-lg font-bold text-emerald-400">{playerStats.exactResults}</span>
              <span className="text-xs text-gray-400">Exactos</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <span className="text-lg font-bold text-blue-400">{playerStats.correctResults}</span>
              <span className="text-xs text-gray-400">Aciertos</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-700/20 border border-white/[0.06]">
              <span className="text-lg font-bold text-gray-300">{playerStats.totalPossible}</span>
              <span className="text-xs text-gray-500">Con resultado</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <span className={`text-lg font-bold ${
                playerStats.accuracy >= 60 ? "text-violet-400" : playerStats.accuracy >= 30 ? "text-gray-300" : "text-red-400"
              }`}>
                {playerStats.accuracy}%
              </span>
              <span className="text-xs text-gray-400">Precisión</span>
            </div>
          </div>
        )}

        {/* Mini performance chart */}
        {matchdayPoints.length > 0 && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 md:p-5 mb-8 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-gray-300 uppercase tracking-wider">
                📈 Rendimiento acumulado por jornada
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-white/5 to-transparent" />
            </div>
            <PerformanceChart
              data={matchdayPoints}
              players={[player.nombre]}
              type="line"
              height={200}
              width={600}
              cumulative={true}
            />
          </div>
        )}

        {/* Position history chart */}
        {positionTrends[player.nombre]?.length > 1 && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 md:p-5 mb-8 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-gray-300 uppercase tracking-wider">
                🏔 Evolución de posición
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-white/5 to-transparent" />
            </div>
            <PositionSparkline
              positions={positionTrends[player.nombre] || []}
              size="lg"
            />
          </div>
        )}

        {/* Full predictions table */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden backdrop-blur-sm">
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <h2 className="text-lg font-bold text-gray-200">
              Todas las predicciones
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {player.predicciones.fase_grupos.length} predicciones de fase de grupos
            </p>
          </div>

          <div className="p-2 sm:p-4 space-y-3">
            {groupLetters.map((group) => {
              const groupPreds = groupedPreds[group] || [];
              if (groupPreds.length === 0) return null;

              return (
                <div
                  key={group}
                  className="rounded-xl bg-white/[0.02] border border-white/[0.05] overflow-hidden"
                >
                  <div className="px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-transparent border-b border-white/[0.05]">
                    <span className="text-xs font-bold text-amber-400/80 uppercase tracking-wider">
                      Grupo {group}
                    </span>
                  </div>

                  {/* Table for desktop */}
                  <div className="hidden md:block">
                    <div className="grid grid-cols-[1fr_80px_40px_80px_1fr_80px] gap-2 px-4 py-2 text-[10px] uppercase tracking-wider text-gray-500 font-semibold border-b border-white/[0.03]">
                      <span>Partido</span>
                      <span className="text-center">Predicción</span>
                      <span></span>
                      <span className="text-center">Resultado</span>
                      <span></span>
                      <span className="text-center">Puntos</span>
                    </div>
                    {groupPreds.map((pred, idx) => {
                      const [home, away] = pred.match.split("-");
                      const matchId = getMatchIdByTeams(home, away);
                      const match = matchId
                        ? ALL_MATCHES.find((m) => m.matchId === matchId)
                        : null;
                      const actual = matchId ? results[matchId] : null;

                      let pts = 0;
                      let rowBg = "";
                      let ptsLabel = "—";
                      let ptsColor = "text-gray-600";

                      if (
                        actual?.played &&
                        actual.homeScore !== null &&
                        actual.awayScore !== null &&
                        pred.score
                      ) {
                        const actualScore = `${actual.homeScore}-${actual.awayScore}`;
                        pts = calculatePredictionPoints(pred.score, actualScore);
                        if (pts === 3) {
                          rowBg = "bg-emerald-500/5";
                          ptsLabel = "3";
                          ptsColor = "text-emerald-400 font-bold";
                        } else if (pts === 1) {
                          rowBg = "bg-blue-500/5";
                          ptsLabel = "1";
                          ptsColor = "text-blue-400 font-bold";
                        } else {
                          rowBg = "bg-red-500/5";
                          ptsLabel = "0";
                          ptsColor = "text-red-400";
                        }
                      }

                      return (
                        <div
                          key={idx}
                          className={`grid grid-cols-[1fr_80px_40px_80px_1fr_80px] gap-2 items-center px-4 py-2.5 text-xs ${rowBg} hover:bg-white/[0.03] transition-colors`}
                        >
                          <span className="text-gray-300 font-medium truncate" title={match?.date || ""}>
                            {home}
                          </span>
                          <span className={`font-mono font-bold text-center ${pts === 0 && actual?.played ? "text-red-400" : pts >= 1 ? "" : "text-amber-400/80"}`}>
                            {pred.score || "?"}
                          </span>
                          <span className="text-gray-600 text-center font-mono">:</span>
                          <span className={`font-mono font-bold text-center ${
                            actual?.played ? "text-white" : "text-gray-600"
                          }`}>
                            {actual?.played && actual.homeScore !== null
                              ? `${actual.homeScore}-${actual.awayScore}`
                              : "?-?"}
                          </span>
                          <span className="text-gray-300 font-medium truncate">{away}</span>
                          <span className={`text-center font-mono ${ptsColor}`}>{ptsLabel}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Mobile view */}
                  <div className="md:hidden space-y-1 p-2">
                    {groupPreds.map((pred, idx) => {
                      const [home, away] = pred.match.split("-");
                      const matchId = getMatchIdByTeams(home, away);
                      const actual = matchId ? results[matchId] : null;

                      let pts = 0;
                      let rowBg = "";
                      let ptsLabel = "—";

                      if (
                        actual?.played &&
                        actual.homeScore !== null &&
                        actual.awayScore !== null &&
                        pred.score
                      ) {
                        const actualScore = `${actual.homeScore}-${actual.awayScore}`;
                        pts = calculatePredictionPoints(pred.score, actualScore);
                        if (pts === 3) {
                          rowBg = "border-l-emerald-500/40 bg-emerald-500/5";
                          ptsLabel = "3 pts";
                        } else if (pts === 1) {
                          rowBg = "border-l-blue-500/40 bg-blue-500/5";
                          ptsLabel = "1 pt";
                        } else {
                          rowBg = "border-l-red-500/30 bg-red-500/5";
                          ptsLabel = "0 pts";
                        }
                      } else {
                        rowBg = "border-l-gray-700/30";
                      }

                      return (
                        <div
                          key={idx}
                          className={`flex items-center gap-2 text-xs py-1.5 px-3 border-l-2 rounded-r-lg ${rowBg}`}
                        >
                          <span className="text-gray-400 w-20 text-right truncate shrink-0">{home}</span>
                          <span className={`font-mono font-bold w-9 text-center ${
                            pts === 3 ? "text-emerald-400" : pts === 1 ? "text-blue-400" : actual?.played ? "text-red-400" : "text-amber-400/80"
                          }`}>
                            {pred.score || "?"}
                          </span>
                          <span className="text-gray-600">—</span>
                          <span className={`font-mono font-bold w-9 text-center ${actual?.played ? "text-white" : "text-gray-600"}`}>
                            {actual?.played && actual.homeScore !== null
                              ? `${actual.homeScore}-${actual.awayScore}`
                              : "?-?"}
                          </span>
                          <span className="text-gray-400 w-16 truncate shrink-0">{away}</span>
                          <span className={`ml-auto font-mono ${
                            pts === 3 ? "text-emerald-400 font-bold" : pts === 1 ? "text-blue-400 font-bold" : actual?.played ? "text-red-400" : "text-gray-600"
                          }`}>
                            {ptsLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-gray-500 justify-center">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500/30 border border-emerald-500/50" />{" "}
            Exacto (3 pts)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500/30 border border-blue-500/50" />{" "}
            Acertado (1 pt)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/30 border border-red-500/50" />{" "}
            Incorrecto (0 pts)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gray-700/50 border border-gray-600/50" />{" "}
            Pendiente
          </span>
        </div>
      </div>
    </div>
  );
}
