"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { MatchData, Prediction, PlayerData, MatchResult, ResultsMap } from '@/lib/types';
import { ALL_MATCHES } from '@/lib/matches';
import { calculatePredictionPoints, getAllResults, saveAllResults } from '@/lib/scoring';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPredictionMatchId(pred: Prediction): string | null {
  const parts = pred.match.split('-');
  if (parts.length !== 2) return null;
  const [home, away] = parts;
  const match = ALL_MATCHES.find(m => m.home === home && m.away === away);
  return match ? match.matchId : null;
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
  const [showSettings, setShowSettings] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  const [resultsFromAPI, setResultsFromAPI] = useState(false);

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
            setResultsFromAPI(true);
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
      <header className="relative overflow-hidden">
        {/* Decorative gradient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500/5 rounded-full blur-3xl" />
          <div className="absolute top-20 left-1/3 w-64 h-64 bg-amber-400/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 pt-8 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Trophy icon */}
              <div className="hidden sm:flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-amber-400/20 to-yellow-600/20 border border-amber-500/30 backdrop-blur-sm">
                <span className="text-2xl">🏆</span>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                  Quiniela Mundial 2026
                </h1>
                <p className="text-gray-400 mt-1 text-sm sm:text-base flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400/60" />
                  {totalPlayed}/{totalGroupMatches} partidos disputados
                  <span className="text-gray-600">·</span>
                  <span className="text-gray-500">{players.length} jugadores</span>
                </p>
              </div>
            </div>

            {/* Settings gear */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`relative flex items-center justify-center w-10 h-10 rounded-xl border transition-all duration-300 ${
                showSettings
                  ? 'border-amber-500/50 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                  : 'border-gray-700/50 bg-gray-800/40 hover:border-gray-600 hover:bg-gray-800/60'
              }`}
              title="Configuración"
            >
              <svg className={`w-5 h-5 transition-transform duration-500 ${showSettings ? 'rotate-90 text-amber-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {/* ── Settings Panel ────────────────────────────────────────────────── */}
          {showSettings && (
            <div className="mt-5 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl shadow-xl animate-fadeIn">
              {!isAuthenticated ? (
                /* ── Password Entry ── */
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="relative flex-1 max-w-xs">
                    <input
                      type="password"
                      placeholder="Clave de administrador"
                      className="w-full px-4 py-2.5 bg-white/[0.06] border border-white/[0.1] rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                      value={passwordInput}
                      onChange={e => { setPasswordInput(e.target.value); setPasswordError(false); }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          if (passwordInput === adminPassword) {
                            setIsAuthenticated(true);
                            setPasswordInput('');
                          } else if (passwordInput === 'Admin2026!') {
                            setAdminPassword(passwordInput);
                            setIsAuthenticated(true);
                            setPasswordInput('');
                          } else {
                            setPasswordError(true);
                          }
                        }
                      }}
                    />
                    {passwordError && (
                      <p className="text-red-400 text-xs mt-1.5 ml-1">❌ Clave incorrecta</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (passwordInput === adminPassword) {
                        setIsAuthenticated(true);
                        setPasswordInput('');
                      } else if (passwordInput === 'Admin2026!') {
                        setAdminPassword(passwordInput);
                        setIsAuthenticated(true);
                        setPasswordInput('');
                      } else {
                        setPasswordError(true);
                      }
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-950 font-semibold text-sm rounded-xl hover:from-amber-400 hover:to-yellow-400 transition-all shadow-lg shadow-amber-500/20"
                  >
                    Acceder
                  </button>
                </div>
              ) : (
                /* ── Authenticated Panel ── */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Sesión iniciada como administrador
                    </div>
                    <button
                      onClick={() => { setIsAuthenticated(false); setShowPasswordChange(false); setPasswordInput(''); }}
                      className="px-3 py-1.5 text-xs bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] text-gray-400 hover:text-gray-200 transition-all"
                    >
                      Cerrar sesión
                    </button>
                  </div>

                  {/* Password change */}
                  <div>
                    <button
                      onClick={() => setShowPasswordChange(!showPasswordChange)}
                      className="text-sm text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5"
                    >
                      <svg className={`w-3.5 h-3.5 transition-transform ${showPasswordChange ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      Cambiar clave de administrador
                    </button>

                    {showPasswordChange && (
                      <div className="mt-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <div className="relative flex-1 max-w-xs">
                          <input
                            type="password"
                            placeholder="Nueva clave"
                            className="w-full px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                            value={newPasswordInput}
                            onChange={e => setNewPasswordInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && newPasswordInput.trim()) {
                                setAdminPassword(newPasswordInput.trim());
                                setNewPasswordInput('');
                                setShowPasswordChange(false);
                              }
                            }}
                          />
                        </div>
                        <button
                          onClick={() => {
                            if (newPasswordInput.trim()) {
                              setAdminPassword(newPasswordInput.trim());
                              setNewPasswordInput('');
                              setShowPasswordChange(false);
                            }
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-amber-500/80 to-yellow-500/80 text-gray-950 font-medium text-xs rounded-xl hover:from-amber-400 hover:to-yellow-400 transition-all"
                        >
                          Guardar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-6xl mx-auto px-4 pb-12">
        {/* Results info bar */}
        {resultsFromAPI && (
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
                        <span className="font-medium text-gray-200 truncate group-hover:text-amber-300 transition-colors text-xs md:text-sm">
                          {player.name}
                        </span>
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

                {/* ── Bottom 3 funny messages (dynamic pool of 40+) ── */}
        {!loading && sortedPlayers.length >= 3 && (
          <div className="mt-6 space-y-2 text-center">
            <p className="text-xs text-gray-600 mb-2 text-center">🏆 Mensajes para la cola de la tabla:</p>
            {(() => {
              const pool = [
                ['🧠', 'Hiciste pron\u00f3sticos o solo le pegaste al teclado?'],
                ['🔮', 'La bola de cristal est\u00e1 en mantenimiento.'],
                ['📉', 'Las acciones suben, tus aciertos bajan. Impresionante.'],
                ['🎯', 'Experto en fallar: especialidad de la casa.'],
                ['🐢', 'Vas lento pero seguro... seguro al \u00faltimo lugar.'],
                ['🦥', 'Tu velocidad de acierto es similar a la de un perezoso.'],
                ['🎪', 'Eres el payaso de la quiniela? Porque esto es un circo.'],
                ['🔍', 'Buscando aciertos como si fueran WMD en Irak.'],
                ['📊', 'Tus estad\u00edsticas: 99% de fe, 1% de acierto.'],
                ['🎲', 'Tiraste un dado para cada resultado, verdad?'],
                ['🥉', 'Bronce en la categor\u00eda \u0022al menos lo intentaste\u0022'],
                ['🔋', 'Se te acab\u00f3 la bater\u00eda despu\u00e9s de acertar UN partido.'],
                ['🎭', 'No eres adivino, eres comediante.'],
                ['⚽', 'Viste alg\u00fan partido o solo pusiste resultados al azar?'],
                ['📚', 'Deber\u00edas leer menos libros de autoayuda y m\u00e1s deportes.'],
                ['🎰', 'Tu estrategia es igual a una tragamonedas.'],
                ['🌧\uFE0F', 'Tus predicciones tienen menos sol que un d\u00eda lluvioso.'],
                ['🧩', 'Te falta una pieza... la que tiene los resultados correctos.'],
                ['🎬', 'Tus pron\u00f3sticos dan miedo... y no es una pel\u00edcula.'],
                ['🥴', 'Le atinaste a todo... todo mal, pero todo.'],
                ['🌀', 'Tus aciertos est\u00e1n en otro plano dimensional.'],
                ['🪄', 'Abracadabra... tus puntos desaparecieron.'],
                ['🧮', 'Hasta calculando mal le pegas m\u00e1s que ahora.'],
                ['🎤', 'Suelta el micr\u00f3fono, suelta la quiniela.'],
                ['📦', 'Tus aciertos nunca llegaron. Sin seguimiento, sin rastro.'],
                ['🚂', 'Descarrilaste desde el primer partido.'],
                ['⚡', 'La \u00fanica corriente que tienes es la que te corre al ver la tabla.'],
                ['🧪', 'Tus pron\u00f3sticos son experimentalmente incorrectos.'],
                ['🎮', 'Ponle easy, esto es modo legendario para ti.'],
                ['🌡\uFE0F', 'Tus aciertos est\u00e1n bajo cero.'],
                ['🚀', 'Despegas... directo al \u00faltimo puesto.'],
                ['📡', 'Buscando se\u00f1al de acierto... sin \u00e9xito.'],
                ['🐌', 'Tu paso en la tabla es m\u00e1s lento que una caracola.'],
                ['🧊', 'Tus puntos est\u00e1n congelados desde la primera jornada.'],
                ['🎨', 'Pintaste la quiniela de colores... l\u00e1stima que todos son rojos.'],
                ['🕳\uFE0F', 'Cavaste un hoyo y te quedaste en el fondo de la tabla.'],
                ['🤷', 'Nobody knows. Y t\u00fa menos.'],
                ['🥇', 'Primero... empezando por abajo.'],
                ['🧭', 'Perdiste el rumbo en el partido inaugural.'],
                ['🎠', 'Esto no es un carrusel pero das vueltas en el mismo puesto.']
              ];
              const shuffled = [...pool].sort(() => Math.random() - 0.5);
              return [0, 1, 2].map(i => {
                const player = sortedPlayers[sortedPlayers.length - 1 - i];
                if (!player) return null;
                const [emoji, msg] = shuffled[i];
                return (
                  <div key={i} className="flex items-center gap-1.5 text-xs md:text-sm text-gray-500 justify-center italic flex-wrap px-2">
                    <span>{emoji}</span>
                    <span className="font-medium text-gray-400">{player.name}:</span>
                    <span className="text-gray-500">\u0022{msg}\u0022</span>
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
