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
