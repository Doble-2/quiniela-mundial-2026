import { NextResponse } from 'next/server';

const TEAM_MAP: Record<string, string> = {
  'Mexico': 'México', 'South Africa': 'Sudáfrica', 'South Korea': 'Corea del Sur',
  'Czech Republic': 'República Checa', 'Canada': 'Canadá', 'Bosnia & Herzegovina': 'Bosnia y Herzegovina',
  'Qatar': 'Catar', 'Switzerland': 'Suiza', 'Brazil': 'Brasil', 'Morocco': 'Marruecos',
  'Haiti': 'Haití', 'Scotland': 'Escocia', 'USA': 'Estados Unidos', 'Paraguay': 'Paraguay',
  'Australia': 'Australia', 'Turkey': 'Turquía', 'Germany': 'Alemania', 'Curaçao': 'Curazao',
  'Ivory Coast': 'Costa de Marfil', 'Ecuador': 'Ecuador', 'Netherlands': 'Países Bajos',
  'Japan': 'Japón', 'Sweden': 'Suecia', 'Tunisia': 'Túnez', 'Belgium': 'Bélgica',
  'Egypt': 'Egipto', 'Iran': 'Irán', 'New Zealand': 'Nueva Zelanda', 'Spain': 'España',
  'Cape Verde': 'Cabo Verde', 'Saudi Arabia': 'Arabia Saudita', 'Uruguay': 'Uruguay',
  'France': 'Francia', 'Senegal': 'Senegal', 'Iraq': 'Irak', 'Norway': 'Noruega',
  'Argentina': 'Argentina', 'Algeria': 'Argelia', 'Austria': 'Austria', 'Jordan': 'Jordania',
  'Portugal': 'Portugal', 'DR Congo': 'RD Congo', 'Uzbekistan': 'Uzbekistán',
  'Colombia': 'Colombia', 'England': 'Inglaterra', 'Croatia': 'Croacia',
  'Ghana': 'Ghana', 'Panama': 'Panamá',
};

export async function GET() {
  try {
    const resp = await fetch(
      'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json?_t=' + Date.now(),
      { cache: 'no-store' }
    );

    if (!resp.ok) {
      // Fallback: read local file
      const fs = await import('fs/promises');
      const localData = await fs.readFile(process.cwd() + '/public/data/worldcup-results.json', 'utf8');
      const parsed = JSON.parse(localData);
      return NextResponse.json(convertResults(parsed));
    }

    const rawData = await resp.json();
    const result = convertResults(rawData);
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (e) {
    // Final fallback to local file
    try {
      const fs = await import('fs/promises');
      const localData = await fs.readFile(process.cwd() + '/public/data/worldcup-results.json', 'utf8');
      const parsed = JSON.parse(localData);
      return NextResponse.json(convertResults(parsed));
    } catch {
      return NextResponse.json({ matchResults: {} });
    }
  }
}

function convertResults(rawData: any) {
  const matchResults: Record<string, { homeScore: number; awayScore: number; played: boolean }> = {};

  const ALL_MATCHES = [
    { id: 'A1a', home: 'México', away: 'Sudáfrica' }, { id: 'A1b', home: 'Corea del Sur', away: 'República Checa' },
    { id: 'A2a', home: 'República Checa', away: 'Sudáfrica' }, { id: 'A2b', home: 'México', away: 'Corea del Sur' },
    { id: 'A3a', home: 'República Checa', away: 'México' }, { id: 'A3b', home: 'Sudáfrica', away: 'Corea del Sur' },
    { id: 'B1a', home: 'Canadá', away: 'Bosnia y Herzegovina' }, { id: 'B1b', home: 'Catar', away: 'Suiza' },
    { id: 'B2a', home: 'Suiza', away: 'Bosnia y Herzegovina' }, { id: 'B2b', home: 'Canadá', away: 'Catar' },
    { id: 'B3a', home: 'Suiza', away: 'Canadá' }, { id: 'B3b', home: 'Bosnia y Herzegovina', away: 'Catar' },
    { id: 'C1a', home: 'Brasil', away: 'Marruecos' }, { id: 'C1b', home: 'Haití', away: 'Escocia' },
    { id: 'C2a', home: 'Escocia', away: 'Marruecos' }, { id: 'C2b', home: 'Brasil', away: 'Haití' },
    { id: 'C3a', home: 'Escocia', away: 'Brasil' }, { id: 'C3b', home: 'Marruecos', away: 'Haití' },
    { id: 'D1a', home: 'Estados Unidos', away: 'Paraguay' }, { id: 'D1b', home: 'Australia', away: 'Turquía' },
    { id: 'D2a', home: 'Estados Unidos', away: 'Australia' }, { id: 'D2b', home: 'Turquía', away: 'Paraguay' },
    { id: 'D3a', home: 'Turquía', away: 'Estados Unidos' }, { id: 'D3b', home: 'Paraguay', away: 'Australia' },
    { id: 'E1a', home: 'Alemania', away: 'Curazao' }, { id: 'E1b', home: 'Costa de Marfil', away: 'Ecuador' },
    { id: 'E2a', home: 'Alemania', away: 'Costa de Marfil' }, { id: 'E2b', home: 'Ecuador', away: 'Curazao' },
    { id: 'E3a', home: 'Curazao', away: 'Costa de Marfil' }, { id: 'E3b', home: 'Ecuador', away: 'Alemania' },
    { id: 'F1a', home: 'Países Bajos', away: 'Japón' }, { id: 'F1b', home: 'Suecia', away: 'Túnez' },
    { id: 'F2a', home: 'Países Bajos', away: 'Suecia' }, { id: 'F2b', home: 'Túnez', away: 'Japón' },
    { id: 'F3a', home: 'Japón', away: 'Suecia' }, { id: 'F3b', home: 'Túnez', away: 'Países Bajos' },
    { id: 'G1a', home: 'Bélgica', away: 'Egipto' }, { id: 'G1b', home: 'Irán', away: 'Nueva Zelanda' },
    { id: 'G2a', home: 'Bélgica', away: 'Irán' }, { id: 'G2b', home: 'Nueva Zelanda', away: 'Egipto' },
    { id: 'G3a', home: 'Egipto', away: 'Irán' }, { id: 'G3b', home: 'Nueva Zelanda', away: 'Bélgica' },
    { id: 'H1a', home: 'España', away: 'Cabo Verde' }, { id: 'H1b', home: 'Arabia Saudita', away: 'Uruguay' },
    { id: 'H2a', home: 'España', away: 'Arabia Saudita' }, { id: 'H2b', home: 'Uruguay', away: 'Cabo Verde' },
    { id: 'H3a', home: 'Cabo Verde', away: 'Arabia Saudita' }, { id: 'H3b', home: 'Uruguay', away: 'España' },
    { id: 'I1a', home: 'Francia', away: 'Senegal' }, { id: 'I1b', home: 'Irak', away: 'Noruega' },
    { id: 'I2a', home: 'Francia', away: 'Irak' }, { id: 'I2b', home: 'Noruega', away: 'Senegal' },
    { id: 'I3a', home: 'Noruega', away: 'Francia' }, { id: 'I3b', home: 'Senegal', away: 'Irak' },
    { id: 'J1a', home: 'Argentina', away: 'Argelia' }, { id: 'J1b', home: 'Austria', away: 'Jordania' },
    { id: 'J2a', home: 'Argentina', away: 'Austria' }, { id: 'J2b', home: 'Jordania', away: 'Argelia' },
    { id: 'J3a', home: 'Argelia', away: 'Austria' }, { id: 'J3b', home: 'Jordania', away: 'Argentina' },
    { id: 'K1a', home: 'Portugal', away: 'RD Congo' }, { id: 'K1b', home: 'Uzbekistán', away: 'Colombia' },
    { id: 'K2a', home: 'Portugal', away: 'Uzbekistán' }, { id: 'K2b', home: 'Colombia', away: 'RD Congo' },
    { id: 'K3a', home: 'Colombia', away: 'Portugal' }, { id: 'K3b', home: 'RD Congo', away: 'Uzbekistán' },
    { id: 'L1a', home: 'Inglaterra', away: 'Croacia' }, { id: 'L1b', home: 'Ghana', away: 'Panamá' },
    { id: 'L2a', home: 'Inglaterra', away: 'Ghana' }, { id: 'L2b', home: 'Panamá', away: 'Croacia' },
    { id: 'L3a', home: 'Panamá', away: 'Inglaterra' }, { id: 'L3b', home: 'Croacia', away: 'Ghana' },
  ];

  if (!rawData?.matches) return { matchResults };

  for (const m of rawData.matches) {
    if (!m.score?.ft) continue;
    const home = TEAM_MAP[m.team1] || m.team1;
    const away = TEAM_MAP[m.team2] || m.team2;
    const matchEntry = ALL_MATCHES.find(x => x.home === home && x.away === away);
    if (matchEntry) {
      matchResults[matchEntry.id] = {
        homeScore: m.score.ft[0],
        awayScore: m.score.ft[1],
        played: true,
      };
    }
  }

  return { matchResults };
}
