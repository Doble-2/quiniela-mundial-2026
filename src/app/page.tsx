"use client";

import { useState, useEffect, useCallback } from 'react';
import { MatchData, Prediction, PlayerData, MatchResult, ResultsMap } from '@/lib/types';
import { ALL_MATCHES } from '@/lib/matches';
import { calculatePredictionPoints, getAllResults, saveAllResults } from '@/lib/scoring';

// Build a mapping from prediction match_id ("A1") to the two matchIds ("A1a", "A1b")
// by matching the prediction's `match` field (e.g. "México-Sudáfrica") against match.home-away
function getPredictionMatchId(pred: Prediction): string | null {
  const parts = pred.match.split('-');
  if (parts.length !== 2) return null;
  const [home, away] = parts;
  const match = ALL_MATCHES.find(m => m.home === home && m.away === away);
  return match ? match.matchId : null;
}

// Group predictions by their match_id group (e.g. "A1") so we can pair (a, b) matches
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

    return {
      name: player.nombre,
      points,
      exactResults,
      correctResults,
      totalPossible,
      predictions: player.predicciones.fase_grupos,
    };
  }).sort((a, b) => b.points - a.points);
}

// Get matches grouped by round for the results form
function getGroupedMatches(): { group: string; matches: MatchData[] }[] {
  const groups = new Map<string, MatchData[]>();
  const groupsOrder: string[] = [];

  for (const match of ALL_MATCHES) {
    if (match.stage !== 'group') continue;
    const key = `${match.group} - Ronda ${match.round}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      groupsOrder.push(key);
    }
    groups.get(key)!.push(match);
  }

  return groupsOrder.map(key => ({ group: key, matches: groups.get(key)! }));
}

export default function Home() {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [results, setResults] = useState<ResultsMap>({});
  const [showResultsForm, setShowResultsForm] = useState(false);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // Load imported results (real match scores from API)
      try {
        const importedRes = await fetch('/data/imported-results.json').then(r => r.json());
        if (importedRes?.matchResults) {
          setResults(importedRes.matchResults);
          // Also save to localStorage so admin additions persist
          saveAllResults(importedRes);
        }
      } catch (e) {
        console.log('No imported results file found, using localStorage');
        const saved = getAllResults();
        if (saved.matchResults && Object.keys(saved.matchResults).length > 0) {
          setResults(saved.matchResults);
        }
      }

      // Load player data
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

  const handleResultChange = useCallback((matchId: string, field: 'homeScore' | 'awayScore', value: string) => {
    setResults(prev => {
      const current = prev[matchId] || { homeScore: null, awayScore: null, played: false };
      const numVal = value === '' ? null : parseInt(value, 10);
      const updated = {
        ...current,
        [field]: numVal,
        played: numVal !== null && (field === 'homeScore' ? value !== '' : true),
      };
      const newResults = { ...prev, [matchId]: updated };
      saveAllResults({ matchResults: newResults, groupWinners: {}, knockoutResults: {} });
      return newResults;
    });
  }, []);

  const handleMarkPlayed = useCallback((matchId: string) => {
    setResults(prev => {
      const current = prev[matchId] || { homeScore: null, awayScore: null, played: false };
      const updated = { ...current, played: !current.played };
      const newResults = { ...prev, [matchId]: updated };
      saveAllResults({ matchResults: newResults, groupWinners: {}, knockoutResults: {} });
      return newResults;
    });
  }, []);

  const sortedPlayers = calculateScores(players, results);
  const groupedMatches = getGroupedMatches();

  const totalPlayed = Object.values(results).filter(r => r.played).length;
  const totalGroupMatches = ALL_MATCHES.filter(m => m.stage === 'group').length;

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Quiniela Mundial 2026</h1>
            <p className="text-gray-400 mt-1">
              {totalPlayed}/{totalGroupMatches} partidos ingresados
            </p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-sm"
          >
            ⚙️
          </button>
        </div>
        {showSettings && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg">
            <div className="flex gap-3">
              {isAuthenticated ? (
                <button
                  onClick={() => setShowResultsForm(!showResultsForm)}
                  className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 text-sm"
                >
                  {showResultsForm ? 'Ocultar resultados' : 'Ingresar resultados'}
                </button>
              ) : (
                <div className="flex gap-2 items-center">
                  <input
                    type="password"
                    placeholder="Clave de admin"
                    className="px-3 py-2 bg-gray-700 rounded-lg text-sm w-36"
                    value={passwordInput}
                    onChange={e => { setPasswordInput(e.target.value); setPasswordError(false); }}
                    onKeyDown={e => { if (e.key === 'Enter') {
                      if (passwordInput === adminPassword || adminPassword === '') {
                        setIsAuthenticated(true);
                        setPasswordInput('');
                      } else if (passwordInput === 'admin' || passwordInput === 'Admin2026!') {
                        setAdminPassword(passwordInput);
                        setIsAuthenticated(true);
                        setPasswordInput('');
                      } else {
                        setPasswordError(true);
                      }
                    }}}
                  />
                  <button
                    onClick={() => {
                      if (passwordInput === adminPassword || adminPassword === '') {
                        if (passwordInput === 'admin' || passwordInput === 'Admin2026!' || passwordInput === 'admin2026') {
                          setAdminPassword(passwordInput);
                          setIsAuthenticated(true);
                          setPasswordInput('');
                        } else if (passwordInput === '') {
                          setPasswordError(true);
                        } else if (passwordInput === adminPassword) {
                          setIsAuthenticated(true);
                          setPasswordInput('');
                        } else if (adminPassword === '' && passwordInput.length > 0) {
                          setAdminPassword(passwordInput);
                          setIsAuthenticated(true);
                          setPasswordInput('');
                        } else {
                          setPasswordError(true);
                        }
                      } else {
                        setPasswordError(true);
                      }
                    }}
                    className="px-3 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Acceder
                  </button>
                  {passwordError && (
                    <span className="text-red-400 text-xs">Clave incorrecta</span>
                  )}
                </div>
              )}

              {isAuthenticated && (
                <button
                  onClick={() => { setIsAuthenticated(false); setShowResultsForm(false); }}
                  className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-sm"
                >
                  Cerrar sesión
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Results Input Form */}
      {showResultsForm && (
        <section className="mb-8 bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-semibold mb-4">Resultados de partidos</h2>
          <div className="space-y-6">
            {groupedMatches.map(g => (
              <div key={g.group}>
                <h3 className="text-lg font-medium text-blue-400 mb-2">{g.group}</h3>
                <div className="grid gap-3">
                  {g.matches.map(match => {
                    const result = results[match.matchId] || { homeScore: null, awayScore: null, played: false };
                    const played = result.played;
                    return (
                      <div
                        key={match.matchId}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          played ? 'bg-gray-800' : 'bg-gray-850 bg-opacity-50'
                        }`}
                      >
                        <span className="text-xs text-gray-500 w-12">{match.matchId}</span>
                        <span className={`w-28 text-right ${played ? 'text-white' : 'text-gray-400'}`}>
                          {match.home}
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          className={`w-14 text-center p-1 rounded border ${
                            played
                              ? 'bg-gray-700 border-gray-600 text-white'
                              : 'bg-gray-800 border-gray-700 text-gray-300'
                          }`}
                          placeholder="-"
                          value={result.homeScore !== null ? result.homeScore : ''}
                          onChange={e => handleResultChange(match.matchId, 'homeScore', e.target.value)}
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          className={`w-14 text-center p-1 rounded border ${
                            played
                              ? 'bg-gray-700 border-gray-600 text-white'
                              : 'bg-gray-800 border-gray-700 text-gray-300'
                          }`}
                          placeholder="-"
                          value={result.awayScore !== null ? result.awayScore : ''}
                          onChange={e => handleResultChange(match.matchId, 'awayScore', e.target.value)}
                        />
                        <span className="w-28 text-left text-gray-400">{match.away}</span>
                        <button
                          onClick={() => handleMarkPlayed(match.matchId)}
                          className={`ml-auto px-2 py-1 text-xs rounded ${
                            played
                              ? 'bg-green-700 text-green-200'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          {played ? 'Jugado' : 'Pendiente'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Leaderboard */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Tabla de posiciones</h2>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Cargando jugadores...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-sm uppercase">
                  <th className="pb-3 pr-2">#</th>
                  <th className="pb-3 pr-4">Jugador</th>
                  <th className="pb-3 pr-4 text-center">Pts</th>
                  <th className="pb-3 pr-4 text-center">Exactos (3)</th>
                  <th className="pb-3 pr-4 text-center">Aciertos (1)</th>
                  <th className="pb-3 text-center">Posibles</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((player, idx) => (
                  <>
                    <tr
                      key={player.name}
                      onClick={() => setExpandedPlayer(expandedPlayer === player.name ? null : player.name)}
                      className={`border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors ${
                        expandedPlayer === player.name ? 'bg-gray-800' : ''
                      }`}
                    >
                      <td className="py-3 pr-2 font-bold text-lg">{idx + 1}</td>
                      <td className="py-3 pr-4 font-medium">{player.name}</td>
                      <td className="py-3 pr-4 text-center font-bold text-lg text-yellow-400">
                        {player.points}
                      </td>
                      <td className="py-3 pr-4 text-center text-green-400">{player.exactResults}</td>
                      <td className="py-3 pr-4 text-center text-blue-400">{player.correctResults}</td>
                      <td className="py-3 text-center text-gray-500">{player.totalPossible}</td>
                    </tr>
                    {/* Expanded detail row */}
                    {expandedPlayer === player.name && (
                      <tr key={`${player.name}-detail`}>
                        <td colSpan={6} className="p-0">
                          <PlayerDetail
                            player={player}
                            results={results}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function PlayerDetail({
  player,
  results,
}: {
  player: PlayerWithScore;
  results: ResultsMap;
}) {
  // Group predictions by match_id to show paired matches
  const grouped = groupPredictions(player.predictions);

  // Build ordered list per group
  const groups = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  const rounds = [1, 2, 3];

  return (
    <div className="bg-gray-850 bg-opacity-50 p-4 border-b border-gray-700">
      <h4 className="text-sm font-medium text-gray-300 mb-3">
        Predicciones vs resultados reales
        <span className="text-xs text-gray-500 ml-2">
          (verde = exacto, azul = acertado, sin color = incorrecto/pendiente)
        </span>
      </h4>

      {groups.map(group => (
        <div key={group} className="mb-4">
          <h5 className="text-xs font-semibold text-gray-400 uppercase mb-1">Grupo {group}</h5>
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

              // Determine coloring
              let rowClass = '';
              if (actual?.played && actual.homeScore !== null && actual.awayScore !== null && predScore) {
                const actualStr = `${actual.homeScore}-${actual.awayScore}`;
                const pts = calculatePredictionPoints(predScore.score || '', actualStr);
                if (pts === 3) rowClass = 'bg-green-900 bg-opacity-40';
                else if (pts === 1) rowClass = 'bg-blue-900 bg-opacity-30';
              }

              return (
                <div key={match.matchId} className={`flex items-center gap-2 text-xs py-1 px-2 rounded ${rowClass}`}>
                  <span className="text-gray-600 w-10">{match.matchId}</span>
                  <span className="text-gray-300 w-28 text-right">{match.home}</span>
                  <span className="text-yellow-300 font-mono w-14 text-center">
                    {predScoreStr}
                  </span>
                  <span className="text-gray-500">vs</span>
                  <span className={`font-mono w-14 text-center ${
                    actual?.played ? 'text-white' : 'text-gray-600'
                  }`}>
                    {actual?.played && actual.homeScore !== null
                      ? `${actual.homeScore}-${actual.awayScore}`
                      : '?-?'}
                  </span>
                  <span className="text-gray-400 w-28 text-left">{match.away}</span>
                  {actual?.played && predScore && (
                    <span className={`ml-auto text-xs ${
                      calculatePredictionPoints(predScore.score || '', `${actual.homeScore}-${actual.awayScore}`) === 3
                        ? 'text-green-400'
                        : calculatePredictionPoints(predScore.score || '', `${actual.homeScore}-${actual.awayScore}`) === 1
                        ? 'text-blue-400'
                        : 'text-red-400'
                    }`}>
                      {calculatePredictionPoints(predScore.score || '', `${actual.homeScore}-${actual.awayScore}`)}pts
                    </span>
                  )}
                </div>
              );
            });
          })}
        </div>
      ))}
    </div>
  );
}
