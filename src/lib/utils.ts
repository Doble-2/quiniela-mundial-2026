// Name-to-slug mapping based on actual player data filenames
export const PLAYER_SLUG_MAP: Record<string, string> = {
  "Alejandro": "alejandro",
  "Alexander": "alexander",
  "Alexandito": "alexandito",
  "Ana Maria Mogollom": "ana_maria_mogollom",
  "Angel": "angel",
  "Daniel": "daniel",
  "Daniela": "daniela",
  "Dayana": "dayana",
  "Edixon": "edixon",
  "Gerardo": "gerardo",
  "Jenny": "jenny",
  "Jose D": "jose_d",
  "Josué": "josu",
  "Juan J": "juan_j",
  "Melquis": "melquis",
  "Oscar Caceres": "oscar_caceres",
  "Smith": "smith",
  "Wilian Alexa": "wilian_alexa",
  "Zhaid": "zhaid",
};

/**
 * Reverse map: slug → display name
 */
export const SLUG_TO_NAME: Record<string, string> = {};
for (const [name, slug] of Object.entries(PLAYER_SLUG_MAP)) {
  SLUG_TO_NAME[slug] = name;
}


/**
 * Converts a match time string (e.g. "13:00 UTC-6") to Venezuela Time (VET, UTC-4).
 * Returns the converted time as a string "HH:MM" or the original if parsing fails.
 */
export function convertToVET(timeStr: string): string {
  if (!timeStr) return '';
  
  // Try to parse "HH:MM UTC[+/-]H" or "HH:MM UTC[+/-]HH" format
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*UTC([+-])(\d{1,2})$/);
  if (!match) return timeStr; // can't parse, return as-is
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const sign = match[3] === '+' ? 1 : -1;
  const utcOffset = parseInt(match[4], 10) * sign;
  
  // Convert to hours from UTC-0
  // UTC-6 means the local time is 6 hours BEHIND UTC
  // To get UTC time: local_hours + (-utc_offset) ... wait
  // If time is "13:00 UTC-6", that means local (stadium) time is UTC-6
  // UTC time = 13:00 + 6 = 19:00 UTC
  // VET time = 19:00 - 4 = 15:00
  // Formula: VET = hours + (-utcOffset) - (-4)
  // Actually: hours + (utcOffset * -1) - (-4)
  
  // UTC time
  let utcHours = hours + (sign === -1 ? utcOffset : 0);
  // Wait, let me redo this:
  // If time is "13:00 UTC-6", that means local = UTC-6
  // UTC = local + 6 = 13 + 6 = 19
  // VET = UTC - 4 = 19 - 4 = 15
  // So: VET = hours + offset_abs - 4 (when sign is -)
  // And: VET = hours - offset_abs - 4 (when sign is +)
  
  if (sign === -1) {
    utcHours = hours + utcOffset; // e.g., 13 + 6 = 19
  } else {
    utcHours = hours - utcOffset; // e.g., 15 - 5 = 10
  }
  
  let vetHours = utcHours - 4; // VET is UTC-4
  if (vetHours < 0) vetHours += 24;
  if (vetHours >= 24) vetHours -= 24;
  
  return String(vetHours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
}
