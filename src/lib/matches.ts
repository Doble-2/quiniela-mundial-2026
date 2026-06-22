import { MatchData } from './types';

export const ALL_MATCHES: MatchData[] = [
  // === GROUP A ===
  { matchId: 'A1a', home: 'México', away: 'Sudáfrica', date: '2026-06-11', time: '14:00', stage: 'group', group: 'A', round: 1 },
  { matchId: 'A1b', home: 'Corea del Sur', away: 'República Checa', date: '2026-06-11', time: '21:00', stage: 'group', group: 'A', round: 1 },
  { matchId: 'A2a', home: 'República Checa', away: 'Sudáfrica', date: '2026-06-18', time: '11:00', stage: 'group', group: 'A', round: 2 },
  { matchId: 'A2b', home: 'México', away: 'Corea del Sur', date: '2026-06-18', time: '20:00', stage: 'group', group: 'A', round: 2 },
  { matchId: 'A3a', home: 'República Checa', away: 'México', date: '2026-06-24', time: '20:00', stage: 'group', group: 'A', round: 3 },
  { matchId: 'A3b', home: 'Sudáfrica', away: 'Corea del Sur', date: '2026-06-24', time: '20:00', stage: 'group', group: 'A', round: 3 },

  // === GROUP B ===
  { matchId: 'B1a', home: 'Canadá', away: 'Bosnia y Herzegovina', date: '2026-06-12', time: '14:00', stage: 'group', group: 'B', round: 1 },
  { matchId: 'B1b', home: 'Catar', away: 'Suiza', date: '2026-06-12', time: '17:00', stage: 'group', group: 'B', round: 1 },
  { matchId: 'B2a', home: 'Suiza', away: 'Bosnia y Herzegovina', date: '2026-06-18', time: '14:00', stage: 'group', group: 'B', round: 2 },
  { matchId: 'B2b', home: 'Canadá', away: 'Catar', date: '2026-06-18', time: '17:00', stage: 'group', group: 'B', round: 2 },
  { matchId: 'B3a', home: 'Suiza', away: 'Canadá', date: '2026-06-24', time: '14:00', stage: 'group', group: 'B', round: 3 },
  { matchId: 'B3b', home: 'Bosnia y Herzegovina', away: 'Catar', date: '2026-06-24', time: '14:00', stage: 'group', group: 'B', round: 3 },

  // === GROUP C ===
  { matchId: 'C1a', home: 'Brasil', away: 'Marruecos', date: '2026-06-12', time: '20:00', stage: 'group', group: 'C', round: 1 },
  { matchId: 'C1b', home: 'Haití', away: 'Escocia', date: '2026-06-12', time: '23:00', stage: 'group', group: 'C', round: 1 },
  { matchId: 'C2a', home: 'Escocia', away: 'Marruecos', date: '2026-06-19', time: '17:00', stage: 'group', group: 'C', round: 2 },
  { matchId: 'C2b', home: 'Brasil', away: 'Haití', date: '2026-06-19', time: '19:30', stage: 'group', group: 'C', round: 2 },
  { matchId: 'C3a', home: 'Escocia', away: 'Brasil', date: '2026-06-24', time: '17:00', stage: 'group', group: 'C', round: 3 },
  { matchId: 'C3b', home: 'Marruecos', away: 'Haití', date: '2026-06-24', time: '17:00', stage: 'group', group: 'C', round: 3 },

  // === GROUP D ===
  { matchId: 'D1a', home: 'Estados Unidos', away: 'Paraguay', date: '2026-06-13', time: '17:00', stage: 'group', group: 'D', round: 1 },
  { matchId: 'D1b', home: 'Australia', away: 'Turquía', date: '2026-06-13', time: '23:00', stage: 'group', group: 'D', round: 1 },
  { matchId: 'D2a', home: 'Estados Unidos', away: 'Australia', date: '2026-06-19', time: '14:00', stage: 'group', group: 'D', round: 2 },
  { matchId: 'D2b', home: 'Turquía', away: 'Paraguay', date: '2026-06-19', time: '22:00', stage: 'group', group: 'D', round: 2 },
  { matchId: 'D3a', home: 'Turquía', away: 'Estados Unidos', date: '2026-06-25', time: '21:00', stage: 'group', group: 'D', round: 3 },
  { matchId: 'D3b', home: 'Paraguay', away: 'Australia', date: '2026-06-25', time: '21:00', stage: 'group', group: 'D', round: 3 },

  // === GROUP E ===
  { matchId: 'E1a', home: 'Alemania', away: 'Curazao', date: '2026-06-14', time: '12:00', stage: 'group', group: 'E', round: 1 },
  { matchId: 'E1b', home: 'Costa de Marfil', away: 'Ecuador', date: '2026-06-14', time: '18:00', stage: 'group', group: 'E', round: 1 },
  { matchId: 'E2a', home: 'Alemania', away: 'Costa de Marfil', date: '2026-06-20', time: '15:00', stage: 'group', group: 'E', round: 2 },
  { matchId: 'E2b', home: 'Ecuador', away: 'Curazao', date: '2026-06-20', time: '19:00', stage: 'group', group: 'E', round: 2 },
  { matchId: 'E3a', home: 'Curazao', away: 'Costa de Marfil', date: '2026-06-25', time: '15:00', stage: 'group', group: 'E', round: 3 },
  { matchId: 'E3b', home: 'Ecuador', away: 'Alemania', date: '2026-06-25', time: '15:00', stage: 'group', group: 'E', round: 3 },

  // === GROUP F ===
  { matchId: 'F1a', home: 'Países Bajos', away: 'Japón', date: '2026-06-14', time: '15:00', stage: 'group', group: 'F', round: 1 },
  { matchId: 'F1b', home: 'Suecia', away: 'Túnez', date: '2026-06-14', time: '21:00', stage: 'group', group: 'F', round: 1 },
  { matchId: 'F2a', home: 'Países Bajos', away: 'Suecia', date: '2026-06-20', time: '12:00', stage: 'group', group: 'F', round: 2 },
  { matchId: 'F2b', home: 'Túnez', away: 'Japón', date: '2026-06-20', time: '23:00', stage: 'group', group: 'F', round: 2 },
  { matchId: 'F3a', home: 'Japón', away: 'Suecia', date: '2026-06-25', time: '18:00', stage: 'group', group: 'F', round: 3 },
  { matchId: 'F3b', home: 'Túnez', away: 'Países Bajos', date: '2026-06-25', time: '18:00', stage: 'group', group: 'F', round: 3 },

  // === GROUP G ===
  { matchId: 'G1a', home: 'Bélgica', away: 'Egipto', date: '2026-06-13', time: '14:00', stage: 'group', group: 'G', round: 1 },
  { matchId: 'G1b', home: 'Irán', away: 'Nueva Zelanda', date: '2026-06-13', time: '20:00', stage: 'group', group: 'G', round: 1 },
  { matchId: 'G2a', home: 'Bélgica', away: 'Irán', date: '2026-06-19', time: '23:00', stage: 'group', group: 'G', round: 2 },
  { matchId: 'G2b', home: 'Nueva Zelanda', away: 'Egipto', date: '2026-06-19', time: '23:00', stage: 'group', group: 'G', round: 2 },
  { matchId: 'G3a', home: 'Egipto', away: 'Irán', date: '2026-06-25', time: '21:00', stage: 'group', group: 'G', round: 3 },
  { matchId: 'G3b', home: 'Nueva Zelanda', away: 'Bélgica', date: '2026-06-25', time: '21:00', stage: 'group', group: 'G', round: 3 },

  // === GROUP H ===
  { matchId: 'H1a', home: 'España', away: 'Cabo Verde', date: '2026-06-11', time: '17:00', stage: 'group', group: 'H', round: 1 },
  { matchId: 'H1b', home: 'Arabia Saudita', away: 'Uruguay', date: '2026-06-11', time: '20:00', stage: 'group', group: 'H', round: 1 },
  { matchId: 'H2a', home: 'España', away: 'Arabia Saudita', date: '2026-06-18', time: '14:00', stage: 'group', group: 'H', round: 2 },
  { matchId: 'H2b', home: 'Uruguay', away: 'Cabo Verde', date: '2026-06-18', time: '14:00', stage: 'group', group: 'H', round: 2 },
  { matchId: 'H3a', home: 'Cabo Verde', away: 'Arabia Saudita', date: '2026-06-24', time: '20:00', stage: 'group', group: 'H', round: 3 },
  { matchId: 'H3b', home: 'Uruguay', away: 'España', date: '2026-06-24', time: '20:00', stage: 'group', group: 'H', round: 3 },

  // === GROUP I ===
  { matchId: 'I1a', home: 'Francia', away: 'Senegal', date: '2026-06-12', time: '17:00', stage: 'group', group: 'I', round: 1 },
  { matchId: 'I1b', home: 'Irak', away: 'Noruega', date: '2026-06-12', time: '20:00', stage: 'group', group: 'I', round: 1 },
  { matchId: 'I2a', home: 'Francia', away: 'Irak', date: '2026-06-20', time: '15:00', stage: 'group', group: 'I', round: 2 },
  { matchId: 'I2b', home: 'Noruega', away: 'Senegal', date: '2026-06-20', time: '19:00', stage: 'group', group: 'I', round: 2 },
  { matchId: 'I3a', home: 'Noruega', away: 'Francia', date: '2026-06-25', time: '15:00', stage: 'group', group: 'I', round: 3 },
  { matchId: 'I3b', home: 'Senegal', away: 'Irak', date: '2026-06-25', time: '15:00', stage: 'group', group: 'I', round: 3 },

  // === GROUP J ===
  { matchId: 'J1a', home: 'Argentina', away: 'Argelia', date: '2026-06-13', time: '23:00', stage: 'group', group: 'J', round: 1 },
  { matchId: 'J1b', home: 'Austria', away: 'Jordania', date: '2026-06-13', time: '23:00', stage: 'group', group: 'J', round: 1 },
  { matchId: 'J2a', home: 'Argentina', away: 'Austria', date: '2026-06-20', time: '23:00', stage: 'group', group: 'J', round: 2 },
  { matchId: 'J2b', home: 'Jordania', away: 'Argelia', date: '2026-06-20', time: '23:00', stage: 'group', group: 'J', round: 2 },
  { matchId: 'J3a', home: 'Argelia', away: 'Austria', date: '2026-06-25', time: '18:00', stage: 'group', group: 'J', round: 3 },
  { matchId: 'J3b', home: 'Jordania', away: 'Argentina', date: '2026-06-25', time: '18:00', stage: 'group', group: 'J', round: 3 },

  // === GROUP K ===
  { matchId: 'K1a', home: 'Portugal', away: 'RD Congo', date: '2026-06-14', time: '23:00', stage: 'group', group: 'K', round: 1 },
  { matchId: 'K1b', home: 'Uzbekistán', away: 'Colombia', date: '2026-06-14', time: '23:00', stage: 'group', group: 'K', round: 1 },
  { matchId: 'K2a', home: 'Portugal', away: 'Uzbekistán', date: '2026-06-20', time: '23:00', stage: 'group', group: 'K', round: 2 },
  { matchId: 'K2b', home: 'Colombia', away: 'RD Congo', date: '2026-06-20', time: '23:00', stage: 'group', group: 'K', round: 2 },
  { matchId: 'K3a', home: 'Colombia', away: 'Portugal', date: '2026-06-25', time: '18:00', stage: 'group', group: 'K', round: 3 },
  { matchId: 'K3b', home: 'RD Congo', away: 'Uzbekistán', date: '2026-06-25', time: '18:00', stage: 'group', group: 'K', round: 3 },

  // === GROUP L ===
  { matchId: 'L1a', home: 'Inglaterra', away: 'Croacia', date: '2026-06-14', time: '20:00', stage: 'group', group: 'L', round: 1 },
  { matchId: 'L1b', home: 'Ghana', away: 'Panamá', date: '2026-06-14', time: '20:00', stage: 'group', group: 'L', round: 1 },
  { matchId: 'L2a', home: 'Inglaterra', away: 'Ghana', date: '2026-06-20', time: '23:00', stage: 'group', group: 'L', round: 2 },
  { matchId: 'L2b', home: 'Panamá', away: 'Croacia', date: '2026-06-20', time: '23:00', stage: 'group', group: 'L', round: 2 },
  { matchId: 'L3a', home: 'Panamá', away: 'Inglaterra', date: '2026-06-25', time: '18:00', stage: 'group', group: 'L', round: 3 },
  { matchId: 'L3b', home: 'Croacia', away: 'Ghana', date: '2026-06-25', time: '18:00', stage: 'group', group: 'L', round: 3 },
];
