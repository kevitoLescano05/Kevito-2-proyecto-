import { POPULAR_FOODS_DATABASE } from '../data/foodDatabase';
import { FoodItem } from '../types';

// Stop-words to ignore during tokenization to prevent search dilution
const STOP_WORDS = new Set([
  'con', 'de', 'del', 'y', 'e', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'en', 'para', 'por', 'al', 'a', 'o', 'u', 'marca', 'tipo', 'sabor', 'sabores', 'cucharada', 'cucharadas',
  'sopera', 'soperas', 'cucharadita', 'cucharaditas', 'media', 'medio', 'chorrito',
  'taza', 'tazas', 'vaso', 'vasos', 'plato', 'platos', 'pote', 'potes', 'gramos', 'gramo', 'gr', 'g', 'ml'
]);

// Common synonyms and typo normalization dictionary for Argentine/LatAm food terms
const SYNONYMS_AND_TYPOS: Record<string, string> = {
  // Brands & lines
  donina: 'doninas',
  doninas: 'doninas',
  marba: 'marba',
  marbe: 'marbe',
  marbé: 'marbe',
  milkaut: 'milkaut',
  entrenut: 'entrenuts',
  entrenuts: 'entrenuts',
  satur: 'satur',
  'don satur': 'don satur',
  integralia: 'integralia',
  diabest: 'diabest',
  
  // Flavors & ingredients
  coco: 'coco',
  cocos: 'coco',
  chocolate: 'chocolate',
  chocolates: 'chocolate',
  vainilla: 'vainilla',
  frutilla: 'frutilla',
  frutillas: 'frutilla',
  arandano: 'arandano',
  arandanos: 'arandano',
  
  // Variations & lines
  balanceado: 'balance',
  balanceada: 'balance',
  balance: 'balance',
  descremada: 'descremado',
  descremados: 'descremado',
  descremadas: 'descremado',
  desnatada: 'descremado',
  desnatado: 'descremado',
  enteras: 'entero',
  entera: 'entero',
  integrales: 'integral',
  masita: 'masitas',
  masitas: 'masitas',
  galleta: 'galletitas',
  galletas: 'galletitas',
  galletita: 'galletitas',
  yogurth: 'yogur',
  yogurt: 'yogur',
  yoghurt: 'yogur',
  azucar: 'azucar',
  azucares: 'azucar',
  semilla: 'semillas',
  piza: 'pizza',
  pisa: 'pizza',
  pizzas: 'pizza',

  // Common typos & keyboard slips
  nilanesa: 'milanesa',
  milanesas: 'milanesa',
  minanesa: 'milanesa',
  huebo: 'huevo',
  huevos: 'huevo',
  uebo: 'huevo',
  uevos: 'huevo',
  arros: 'arroz',
  aroc: 'arroz',
  fideis: 'fideos',
  fideo: 'fideos',
  fideus: 'fideos',
  tallarin: 'fideos',
  tallarines: 'fideos',
  poyo: 'pollo',
  poloo: 'pollo',
  carne: 'carne',
  karne: 'carne',
  choclo: 'choclo',
  choklo: 'choclo',
  palta: 'palta',
  aguacate: 'palta',
  avena: 'avena',
  abena: 'avena',
  pure: 'pure',
  manzana: 'manzana',
  mansana: 'manzana',
  banana: 'banana',
  platano: 'banana',
  fresa: 'frutilla',
  queso: 'queso',
  keso: 'queso',
};

// Flavors and sub-variants that must match strictly when specified by the user (only sweet cookie/yogurt flavors)
export const SPECIFIC_FLAVORS = [
  'coco', 'vainilla', 'chocolate', 'cacao', 'arandano', 'frutilla',
  'limon', 'naranja', 'chia', 'sesamo', 'lino'
];

// Levenshtein distance for fuzzy matching
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + 1 // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Normalizes text removing accents, punctuation and mapping synonyms/typos
export function normalizeAndCorrectText(text: string): string {
  if (!text) return '';
  const clean = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents (á->a, é->e, etc.)
    .replace(/[^\w\s]/g, ' ')
    .trim();

  const words = clean.split(/\s+/).filter(Boolean);
  const corrected = words.map((w) => SYNONYMS_AND_TYPOS[w] || w);
  return corrected.join(' ');
}

// Extract meaningful search tokens excluding stop words (preserving numbers like 5, 3, etc.)
export function extractSearchTokens(text: string): string[] {
  const normalized = normalizeAndCorrectText(text);
  const rawTokens = normalized.split(/\s+/).filter((t) => t.length > 1 || /\d/.test(t));
  const filtered = rawTokens.filter((t) => !STOP_WORDS.has(t));
  return filtered.length > 0 ? filtered : rawTokens;
}

// Check if two words match with high confidence (exact, prefix >= 3 chars, or small typo)
export function isWordMatch(targetWord: string, searchWord: string): { match: boolean; score: number } {
  if (!targetWord || !searchWord) return { match: false, score: 0 };
  if (targetWord === searchWord) return { match: true, score: 100 };

  // Check synonym dictionary
  if (SYNONYMS_AND_TYPOS[searchWord] === targetWord || SYNONYMS_AND_TYPOS[targetWord] === searchWord) {
    return { match: true, score: 95 };
  }

  // Prefix matching (e.g. "milan" -> "milanesa", "donin" -> "doninas", "yog" -> "yogur")
  if (searchWord.length >= 3 && targetWord.startsWith(searchWord)) {
    return { match: true, score: 85 };
  }

  // Suffix/Plural matching (e.g. "masitas" -> "masita")
  if (searchWord.length >= 4 && targetWord.length >= 4) {
    if (targetWord.startsWith(searchWord.slice(0, -1)) || searchWord.startsWith(targetWord.slice(0, -1))) {
      return { match: true, score: 80 };
    }
  }

  // Fuzzy Levenshtein for longer words (length >= 5) with max 1 edit distance
  if (targetWord.length >= 5 && searchWord.length >= 5) {
    const dist = levenshteinDistance(targetWord, searchWord);
    if (dist <= 1) {
      return { match: true, score: 70 };
    }
  }

  return { match: false, score: 0 };
}

// Smart search for local food database with high-precision scoring
export function matchLocalDatabaseWithFuzzy(query: string, category: string = 'Todos'): FoodItem[] {
  if (!query || !query.trim()) {
    if (category === 'Todos') return POPULAR_FOODS_DATABASE;
    return POPULAR_FOODS_DATABASE.filter(
      (f) => f.category && f.category.toLowerCase().includes(category.toLowerCase())
    );
  }

  const normalizedQ = normalizeAndCorrectText(query);
  const searchTokens = extractSearchTokens(query);

  const basePool = POPULAR_FOODS_DATABASE.filter((f) => {
    if (category === 'Todos') return true;
    return f.category && f.category.toLowerCase().includes(category.toLowerCase());
  });

  const queryHasSinAzucar = normalizedQ.includes('sin azucar') || normalizedQ.includes('0% azucar') || normalizedQ.includes('cero azucar');
  const queryHasLight = normalizedQ.includes('light') || normalizedQ.includes('diet') || normalizedQ.includes('balance');
  const queryHasDescremado = normalizedQ.includes('descremado') || normalizedQ.includes('0%');

  const scored = basePool.map((food) => {
    const normName = normalizeAndCorrectText(food.name);
    const normBrand = normalizeAndCorrectText(food.brand || '');
    const normPortion = normalizeAndCorrectText(food.portionName || '');
    const normCategory = normalizeAndCorrectText(food.category || '');

    const nameWords = normName.split(/\s+/).filter(Boolean);
    const brandWords = normBrand.split(/\s+/).filter(Boolean);
    const otherWords = [...normPortion.split(/\s+/), ...normCategory.split(/\s+/)].filter(Boolean);

    let score = 0;
    let matchedTokensCount = 0;

    // 1. Exact full query matches
    if (normName === normalizedQ) {
      score += 1000;
    } else if (normName.startsWith(normalizedQ)) {
      score += 600;
    } else if (normName.includes(normalizedQ)) {
      score += 450;
    } else if (normBrand && normBrand.includes(normalizedQ)) {
      score += 350;
    }

    // 2. Token by token matching against distinct fields
    for (const token of searchTokens) {
      let bestTokenScore = 0;

      // Name matches (highest priority)
      for (const nw of nameWords) {
        const { match, score: mScore } = isWordMatch(nw, token);
        if (match) {
          bestTokenScore = Math.max(bestTokenScore, mScore * 1.5);
        }
      }

      // Brand matches
      if (bestTokenScore < 100) {
        for (const bw of brandWords) {
          const { match, score: mScore } = isWordMatch(bw, token);
          if (match) {
            bestTokenScore = Math.max(bestTokenScore, mScore * 1.2);
          }
        }
      }

      // Portion and category matches
      if (bestTokenScore < 80) {
        for (const ow of otherWords) {
          const { match, score: mScore } = isWordMatch(ow, token);
          if (match) {
            bestTokenScore = Math.max(bestTokenScore, mScore * 0.6);
          }
        }
      }

      if (bestTokenScore > 0) {
        score += bestTokenScore;
        matchedTokensCount++;
      }
    }

    // 3. Modifier congruence checks (Sin Azúcar / Light / Descremado)
    const foodIsSinAzucar = normName.includes('sin azucar') || normPortion.includes('sin azucar');
    const foodIsLight = normName.includes('light') || normName.includes('balance') || normPortion.includes('light');

    if (queryHasSinAzucar) {
      if (foodIsSinAzucar) score += 150;
      else score -= 80;
    }

    if (queryHasLight) {
      if (foodIsLight) score += 100;
    }

    if (queryHasDescremado) {
      if (normName.includes('descremado') || normPortion.includes('descremado')) score += 100;
      if (normName.includes('entero')) score -= 60;
    }

    // 3.5 Flavor & specific ingredient congruence check
    const queryFlavors = searchTokens.filter(t => SPECIFIC_FLAVORS.includes(t));
    if (queryFlavors.length > 0) {
      const foodHasRequestedFlavor = queryFlavors.some(f => normName.includes(f) || normPortion.includes(f));
      if (foodHasRequestedFlavor) {
        score += 350;
      } else {
        score -= 500;
        const hasConflictingFlavor = SPECIFIC_FLAVORS.some(f => !queryFlavors.includes(f) && (normName.includes(f) || normPortion.includes(f)));
        if (hasConflictingFlavor) {
          score -= 500;
        }
      }
    }

    // 4. Token coverage bonus
    if (searchTokens.length > 0) {
      if (matchedTokensCount === searchTokens.length) {
        score += 300; // All tokens matched!
      } else if (matchedTokensCount >= Math.ceil(searchTokens.length * 0.5)) {
        score += 100;
      }
    }

    return { food, score, matchedTokensCount };
  });

  // Strict filtering: items must match at least 50% of search tokens if multi-word, or at least 1 token if single word
  const minRequiredTokens = searchTokens.length <= 1 ? 1 : Math.ceil(searchTokens.length * 0.5);
  const activeQueryFlavors = searchTokens.filter(t => SPECIFIC_FLAVORS.includes(t));

  return scored
    .filter((item) => {
      if (searchTokens.length === 0) return true;

      // If user explicitly searched for a specific flavor (e.g. 'coco'), reject items that do not contain that flavor
      if (activeQueryFlavors.length > 0) {
        const itemText = (item.food.name + ' ' + (item.food.portionName || '')).toLowerCase();
        const hasFlavor = activeQueryFlavors.some(f => itemText.includes(f));
        if (!hasFlavor) return false;
      }

      return item.score >= 50 && item.matchedTokensCount >= minRequiredTokens;
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.food);
}
