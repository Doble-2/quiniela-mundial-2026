"use client";

import { useState, useEffect, useMemo } from "react";
import { ALL_MATCHES } from "@/lib/matches";
import { ResultsMap } from "@/lib/types";
import { convertToVET } from "@/lib/utils";

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d}/${m}`;
}

function getGroupFromMatchId(matchId: string): string {
  const match = ALL_MATCHES.find((m) => m.matchId === matchId);
  return match?.group || "";
}

function getMatchdayLabel(matchId: string): string {
  const match = ALL_MATCHES.find((m) => m.matchId === matchId);
  if (!match || !match.round) return "";
  const labels: Record<number, string> = {
    1: "Jornada 1",
    2: "Jornada 2",
    3: "Jornada 3",
  };
  return labels[match.round] || `Ronda ${match.round}`;
}

export default function CalendarioPage() {
  const [results, setResults] = useState<ResultsMap>({});
  const [loading, setLoading] = useState(true);
  const [playerFiles, setPlayerFiles] = useState<string[]>([]);
  const [matchTimes, setMatchTimes] = useState<Record<string, { time: string; date: string; localTime: string }>>({});

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

  useEffect(() => {
    async function load() {
      try {
        // Fetch match times from openfootball
        let fetchedTimes: Record<string, { time: string; date: string; localTime: string }> = {};
        try {
          const ofResp = await fetch('https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json');
          const ofData = await ofResp.json();
          if (ofData?.matches) {
            for (const m of ofData.matches) {
              if (!m.score?.ft) continue;
              const home = TEAM_MAP[m.team1] || m.team1;
              const away = TEAM_MAP[m.team2] || m.team2;
              const matchEntry = ALL_MATCHES.find(x => x.home === home && x.away === away);
              if (matchEntry) {
                const vetTime = convertToVET(m.time || '');
                fetchedTimes[matchEntry.matchId] = {
                  time: m.time || '',
                  date: m.date || '',
                  localTime: vetTime ? `${m.date} ${vetTime} VET` : `${m.date}`
                };
              }
            }
          }
        } catch (e) {
          console.log('Could not fetch match times from openfootball');
        }
        setMatchTimes(fetchedTimes);

        const [resultsRes] = await Promise.all([
          fetch("/data/imported-results.json")
            .then((r) => r.json())
            .then((d) => d.matchResults as ResultsMap)
            .catch(() => ({}) as ResultsMap),
        ]);

        setResults(resultsRes);

        // Load player data to count predictions per match
        const playerNames = [
          "alejandro", "alexander", "alexandito", "ana_maria_mogollom",
          "angel", "daniel", "daniela", "dayana",
          "edixon", "gerardo", "jenny", "jose_d",
          "josu", "juan_j", "melquis", "oscar_caceres",
          "smith", "wilian_alexa", "zhaid",
        ];
        setPlayerFiles(playerNames);
      } catch (e) {
        console.error("Error loading calendar data:", e);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Count correct predictions per match
  const matchStats = useMemo(() => {
    const stats: Record<string, { correct: number; exact: number; total: number }> = {};

    const matchIdByTeams: Record<string, string> = {};
    for (const match of ALL_MATCHES) {
      matchIdByTeams[`${match.home}-${match.away}`] = match.matchId;
    }

    for (const match of ALL_MATCHES) {
      stats[match.matchId] = { correct: 0, exact: 0, total: 0 };
    }

    return stats;
  }, []);

  // Group matches by matchday
  const matchesByMatchday = useMemo(() => {
    const groupMatches = ALL_MATCHES.filter((m) => m.stage === "group");
    const grouped: Record<string, typeof groupMatches> = {};

    for (const match of groupMatches) {
      const label = getMatchdayLabel(match.matchId);
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(match);
    }

    return grouped;
  }, []);

  // Matchday order
  const matchdayOrder = ["Jornada 1", "Jornada 2", "Jornada 3"];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-10 w-64 bg-gray-800 rounded-lg" />
            <div className="h-48 bg-gray-800/50 rounded-2xl" />
            <div className="h-48 bg-gray-800/50 rounded-2xl" />
            <div className="h-48 bg-gray-800/50 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-gray-100">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400/20 to-blue-600/20 border border-sky-500/30">
            <span className="text-2xl">📅</span>
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-sky-200 via-blue-400 to-sky-500 bg-clip-text text-transparent">
              Calendario
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Todos los partidos del Mundial 2026
            </p>
          </div>
        </div>

        {matchdayOrder.map((matchday) => {
          const matches = matchesByMatchday[matchday];
          if (!matches || matches.length === 0) return null;

          return (
            <section key={matchday} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sky-500/20 to-transparent" />
                <h2 className="text-lg font-bold text-gray-200">{matchday}</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sky-500/20 to-transparent" />
              </div>

              <div className="space-y-2">
                {matches.map((match) => {
                  const actual = results[match.matchId];
                  const hasResult =
                    actual?.played &&
                    actual.homeScore !== null &&
                    actual.awayScore !== null;

                  const groupLabel = getGroupFromMatchId(match.matchId);

                  return (
                    <div
                      key={match.matchId}
                      className={`rounded-xl border backdrop-blur-sm transition-all hover:bg-white/[0.04] ${
                        hasResult
                          ? "bg-white/[0.03] border-white/[0.08]"
                          : "bg-white/[0.02] border-white/[0.04] opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        {/* Date column */}
                        <div className="hidden sm:flex flex-col items-center w-16 shrink-0">
                          <span className="text-[10px] uppercase tracking-wide text-gray-500">
                            {new Date(
                              ...(match.date.split("-").map(Number) as [number, number, number])
                            )
                              .toLocaleDateString("es-MX", { month: "short" })
                              .replace(".", "")}
                          </span>
                          <span className="text-lg font-bold text-gray-300 leading-tight">
                            {match.date.split("-")[2]}
                          </span>
                        </div>

                        <div className="flex sm:hidden flex-col items-center w-12 shrink-0">
                          <span className="text-[10px] text-gray-500">
                            {formatDateShort(match.date)}
                          </span>
                        </div>

                        {/* Group badge */}
                        <div className="hidden sm:flex shrink-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/70 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
                            {groupLabel}
                          </span>
                        </div>

                        {/* VET time badge */}
                        {matchTimes[match.matchId] && (
                          <div className="hidden md:flex shrink-0">
                            <span className="text-[10px] font-mono text-gray-600 bg-gray-800/60 px-1.5 py-0.5 rounded border border-gray-700/30">
                              {matchTimes[match.matchId].localTime}
                            </span>
                          </div>
                        )}

                        {/* Match info */}
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          <span
                            className={`text-sm font-medium truncate text-right flex-1 ${
                              hasResult ? "text-gray-200" : "text-gray-400"
                            }`}
                          >
                            {match.home}
                          </span>

                          {/* Score */}
                          <div
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg shrink-0 ${
                              hasResult
                                ? "bg-white/[0.06] border border-white/[0.1]"
                                : "bg-white/[0.03] border border-white/[0.06]"
                            }`}
                          >
                            <span
                              className={`font-mono font-bold text-sm min-w-[24px] text-center ${
                                hasResult ? "text-white" : "text-gray-500"
                              }`}
                            >
                              {hasResult ? actual!.homeScore : "—"}
                            </span>
                            <span className="text-gray-600 text-xs">:</span>
                            <span
                              className={`font-mono font-bold text-sm min-w-[24px] text-center ${
                                hasResult ? "text-white" : "text-gray-500"
                              }`}
                            >
                              {hasResult ? actual!.awayScore : "—"}
                            </span>
                          </div>

                          <span
                            className={`text-sm font-medium truncate flex-1 ${
                              hasResult ? "text-gray-200" : "text-gray-400"
                            }`}
                          >
                            {match.away}
                          </span>
                        </div>

                        {/* Player prediction count (simple) */}
                        <div className="hidden sm:flex items-center gap-1 shrink-0 text-xs text-gray-500">
                          <svg className="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128c.889.086 1.794.07 2.625-.372M23 10a10 10 0 01-4.51 8.355M10 10.5A2.5 2.5 0 117.5 8 2.5 2.5 0 0110 10.5zM7.5 8v3" />
                          </svg>
                          <span>{playerFiles.length} jugs.</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Key */}
        <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-gray-500 justify-center">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-white/[0.06] border border-white/[0.1]" />{" "}
            Jugado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-white/[0.02] border border-white/[0.04]" />{" "}
            Pendiente / Próximo
          </span>
        </div>
      </div>
    </div>
  );
}
