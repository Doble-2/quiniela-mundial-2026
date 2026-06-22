"use client";

import { useState, useEffect, useMemo } from "react";

interface TeamEntry {
  team: string;
  pts: number;
  j: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  dg: number;
}

interface GroupStanding {
  group: string;
  teams: TeamEntry[];
}

// Team name mapping from openfootball API names to quiniela names
const TEAM_MAP: Record<string, string> = {
  Mexico: "México",
  "South Africa": "Sudáfrica",
  "South Korea": "Corea del Sur",
  "Czech Republic": "República Checa",
  Canada: "Canadá",
  "Bosnia & Herzegovina": "Bosnia y Herzegovina",
  Qatar: "Catar",
  Switzerland: "Suiza",
  Brazil: "Brasil",
  Morocco: "Marruecos",
  Haiti: "Haití",
  Scotland: "Escocia",
  USA: "Estados Unidos",
  Paraguay: "Paraguay",
  Australia: "Australia",
  Turkey: "Turquía",
  Germany: "Alemania",
  Curaçao: "Curazao",
  "Ivory Coast": "Costa de Marfil",
  Ecuador: "Ecuador",
  Netherlands: "Países Bajos",
  Japan: "Japón",
  Sweden: "Suecia",
  Tunisia: "Túnez",
  Belgium: "Bélgica",
  Egypt: "Egipto",
  Iran: "Irán",
  "New Zealand": "Nueva Zelanda",
  Spain: "España",
  "Cape Verde": "Cabo Verde",
  "Saudi Arabia": "Arabia Saudita",
  Uruguay: "Uruguay",
  France: "Francia",
  Senegal: "Senegal",
  Iraq: "Irak",
  Norway: "Noruega",
  Argentina: "Argentina",
  Algeria: "Argelia",
  Austria: "Austria",
  Jordan: "Jordania",
  Portugal: "Portugal",
  "DR Congo": "RD Congo",
  Uzbekistan: "Uzbekistán",
  Colombia: "Colombia",
  England: "Inglaterra",
  Croatia: "Croacia",
  Ghana: "Ghana",
  Panama: "Panamá",
};

// Reverse map: quiniela name → API name
const REVERSE_TEAM_MAP: Record<string, string> = {};
for (const [apiName, qName] of Object.entries(TEAM_MAP)) {
  REVERSE_TEAM_MAP[qName] = apiName;
}

const GROUP_MAP: Record<string, string[]> = {
  A: ["México", "Sudáfrica", "Corea del Sur", "República Checa"],
  B: ["Canadá", "Bosnia y Herzegovina", "Catar", "Suiza"],
  C: ["Brasil", "Marruecos", "Haití", "Escocia"],
  D: ["Estados Unidos", "Paraguay", "Australia", "Turquía"],
  E: ["Alemania", "Curazao", "Costa de Marfil", "Ecuador"],
  F: ["Países Bajos", "Japón", "Suecia", "Túnez"],
  G: ["Bélgica", "Egipto", "Irán", "Nueva Zelanda"],
  H: ["España", "Cabo Verde", "Arabia Saudita", "Uruguay"],
  I: ["Francia", "Senegal", "Irak", "Noruega"],
  J: ["Argentina", "Argelia", "Austria", "Jordania"],
  K: ["Portugal", "RD Congo", "Uzbekistán", "Colombia"],
  L: ["Inglaterra", "Croacia", "Ghana", "Panamá"],
};

function computeStandings(
  matches: any[],
  groupLetter: string
): TeamEntry[] {
  const teamNames = GROUP_MAP[groupLetter];
  if (!teamNames) return [];

  const stats: Record<string, TeamEntry> = {};
  for (const name of teamNames) {
    stats[name] = {
      team: name,
      pts: 0,
      j: 0,
      g: 0,
      e: 0,
      p: 0,
      gf: 0,
      gc: 0,
      dg: 0,
    };
  }

  for (const m of matches) {
    const homeName = TEAM_MAP[m.team1] || m.team1;
    const awayName = TEAM_MAP[m.team2] || m.team2;

    // Only count matches between teams in this group
    if (!teamNames.includes(homeName) || !teamNames.includes(awayName)) continue;
    if (!m.score?.ft) continue;

    const [homeScore, awayScore] = m.score.ft;

    stats[homeName].j++;
    stats[awayName].j++;
    stats[homeName].gf += homeScore;
    stats[homeName].gc += awayScore;
    stats[awayName].gf += awayScore;
    stats[awayName].gc += homeScore;

    if (homeScore > awayScore) {
      stats[homeName].g++;
      stats[homeName].pts += 3;
      stats[awayName].p++;
    } else if (homeScore < awayScore) {
      stats[awayName].g++;
      stats[awayName].pts += 3;
      stats[homeName].p++;
    } else {
      stats[homeName].e++;
      stats[awayName].e++;
      stats[homeName].pts += 1;
      stats[awayName].pts += 1;
    }
  }

  for (const t of Object.values(stats)) {
    t.dg = t.gf - t.gc;
  }

  return Object.values(stats).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return 0;
  });
}

export default function GruposPage() {
  const [groups, setGroups] = useState<GroupStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const resp = await fetch(
          "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json"
        );
        const data = await resp.json();
        const allMatches = data?.matches || [];

        const groupLetters = Object.keys(GROUP_MAP);
        const computed: GroupStanding[] = groupLetters.map((letter) => ({
          group: letter,
          teams: computeStandings(allMatches, letter),
        }));

        setGroups(computed);
      } catch (e) {
        setError("No se pudieron cargar los datos del torneo");
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-10 w-64 bg-gray-800 rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-48 bg-gray-800/50 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-gray-100">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-600/20 border border-emerald-500/30">
            <span className="text-2xl">📊</span>
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-200 via-teal-400 to-emerald-500 bg-clip-text text-transparent">
              Tabla de Grupos
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Posiciones reales del Mundial 2026
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div
              key={group.group}
              className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden backdrop-blur-sm"
            >
              {/* Group header */}
              <div className="px-4 py-3 border-b border-white/[0.06] bg-gradient-to-r from-emerald-500/5 to-transparent">
                <span className="text-sm font-bold text-emerald-400/90 uppercase tracking-wider">
                  Grupo {group.group}
                </span>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-[24px_1fr_28px_20px_20px_20px_20px_24px_24px_28px] gap-1 px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 font-semibold border-b border-white/[0.03]">
                <span className="text-center">#</span>
                <span>Equipo</span>
                <span className="text-center">Pts</span>
                <span className="text-center">J</span>
                <span className="text-center">G</span>
                <span className="text-center">E</span>
                <span className="text-center">P</span>
                <span className="text-center">GF</span>
                <span className="text-center">GC</span>
                <span className="text-center">DG</span>
              </div>

              {/* Team rows */}
              <div className="divide-y divide-white/[0.03]">
                {group.teams.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-gray-600">
                    No hay partidos registrados aún
                  </div>
                ) : (
                  group.teams.map((team, idx) => {
                    let rowBg = "";
                    let posColor = "";
                    if (idx === 0 || idx === 1) {
                      rowBg = "bg-emerald-500/5";
                      posColor = "text-emerald-400";
                    } else if (idx === 2) {
                      rowBg = "bg-orange-500/5";
                      posColor = "text-orange-400";
                    } else {
                      rowBg = "bg-gray-700/10";
                      posColor = "text-gray-500";
                    }

                    return (
                      <div
                        key={team.team}
                        className={`grid grid-cols-[24px_1fr_28px_20px_20px_20px_20px_24px_24px_28px] gap-1 items-center px-3 py-2 text-xs ${rowBg} hover:bg-white/[0.03] transition-colors`}
                      >
                        <span className={`text-center font-bold ${posColor}`}>
                          {idx + 1}
                        </span>
                        <span className="text-gray-200 font-medium truncate">
                          {team.team}
                        </span>
                        <span className="text-center font-bold text-amber-400">
                          {team.pts}
                        </span>
                        <span className="text-center text-gray-500">
                          {team.j}
                        </span>
                        <span className="text-center text-gray-500">
                          {team.g}
                        </span>
                        <span className="text-center text-gray-500">
                          {team.e}
                        </span>
                        <span className="text-center text-gray-500">
                          {team.p}
                        </span>
                        <span className="text-center text-gray-500">
                          {team.gf}
                        </span>
                        <span className="text-center text-gray-500">
                          {team.gc}
                        </span>
                        <span
                          className={`text-center font-mono ${
                            team.dg > 0
                              ? "text-emerald-400"
                              : team.dg < 0
                              ? "text-red-400"
                              : "text-gray-500"
                          }`}
                        >
                          {team.dg > 0 ? `+${team.dg}` : team.dg}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-gray-500 justify-center">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500/30 border border-emerald-500/50" />{" "}
            Clasificado (1°-2°)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500/30 border border-orange-500/50" />{" "}
            Posible 3°
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gray-700/50 border border-gray-600/50" />{" "}
            Eliminado
          </span>
        </div>
      </div>
    </div>
  );
}
