/**
 * FatSecret Argentina Direct Nutrition Service
 * Real-time connector for Argentine commercial foods, official manufacturer labels,
 * and exact portion/unit breakdowns from fatsecret.com.ar.
 */

import { FoodItem, CountryCode } from '../types';
import { COUNTRY_PROFILES } from '../data/searchSources';

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#237;/g, 'í')
    .replace(/&#243;/g, 'ó')
    .replace(/&#225;/g, 'á')
    .replace(/&#233;/g, 'é')
    .replace(/&#250;/g, 'ú')
    .replace(/&#241;/g, 'ñ')
    .replace(/&#193;/g, 'Á')
    .replace(/&#201;/g, 'É')
    .replace(/&#205;/g, 'Í')
    .replace(/&#211;/g, 'Ó')
    .replace(/&#218;/g, 'Ú')
    .replace(/&#209;/g, 'Ñ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isRelevantToQuery(name: string, brand: string, query: string): boolean {
  // Reject Arabic, Cyrillic, Chinese or other non-Latin scripts
  if (/[\u0600-\u06FF\u0400-\u04FF\u4E00-\u9FFF]/.test(name) || /[\u0600-\u06FF\u0400-\u04FF\u4E00-\u9FFF]/.test(brand)) {
    return false;
  }

  const normQ = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const normName = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const normBrand = brand.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const combined = `${normName} ${normBrand}`;

  const qTokens = normQ.split(/\s+/).filter((t) => t.length > 1);
  if (qTokens.length === 0) return true;

  const matchedTokens = qTokens.filter((t) => combined.includes(t));

  // If query is multi-word (e.g. brand + product)
  if (qTokens.length >= 2) {
    // If first word (usually primary brand/subject) is absent and fewer than 75% match, reject
    const firstWordMatched = combined.includes(qTokens[0]);
    if (!firstWordMatched && matchedTokens.length < qTokens.length) {
      return false;
    }
  }

  // Must match at least 50% of query keywords
  return matchedTokens.length / qTokens.length >= 0.5;
}

function classifyProteins(name: string, brand: string, totalProtein: number) {
  const text = `${name} ${brand}`.toLowerCase();
  const isAnimal = /carne|pollo|cerdo|pescado|atun|jamon|huevo|leche|yogur|queso|caseina|suero|ricotta|manteca|parmesano|crema de leche|chorizo|salchicha|morcilla|embutido|bovino|vacuno|res|fiambre|salame|bondiola|mortadela/.test(text);
  const isPurePlant = /galletit|cracker|arroz|avena|fideos|harina|pan|coco|mani|semilla|chia|sesamo|lino|legumbre|soja|lenteja|garbanzo|poroto|vegetal|fruta|jugo|aceite/.test(text);

  if (isPurePlant && !isAnimal) {
    return { animalProteinGrams: 0, plantProteinGrams: totalProtein };
  }
  if (isAnimal && !isPurePlant) {
    return { animalProteinGrams: totalProtein, plantProteinGrams: 0 };
  }
  if (isAnimal && isPurePlant) {
    // Mixed e.g. cookie with milk
    const animal = Math.round(totalProtein * 0.35 * 10) / 10;
    const plant = Math.round((totalProtein - animal) * 10) / 10;
    return { animalProteinGrams: animal, plantProteinGrams: plant };
  }
  // Default to plant
  return { animalProteinGrams: 0, plantProteinGrams: totalProtein };
}

export async function searchFatSecretArgentina(
  query: string,
  limit: number = 12,
  countryCode: CountryCode = 'AR'
): Promise<FoodItem[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const profile = COUNTRY_PROFILES[countryCode] || COUNTRY_PROFILES.AR;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const url = `${profile.fatSecretDomain}?q=${encodeURIComponent(cleanQuery)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': profile.acceptLanguage,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const html = await res.text();
    const regex = /<td class="borderBottom">[\s\S]*?<a class="prominent" href="([^"]+)">([^<]+)<\/a>(?:&nbsp;&nbsp;<a class="brand"[^>]*>\(([^)]+)\)<\/a>)?[\s\S]*?<div class="smallText greyText greyLink">([\s\S]*?)<\/div>/g;

    let match: RegExpExecArray | null;
    const items: FoodItem[] = [];

    while ((match = regex.exec(html)) !== null && items.length < limit * 2) {
      const rawName = decodeHtmlEntities(match[2]);
      const rawBrand = decodeHtmlEntities(match[3] || 'Genérico');
      const desc = decodeHtmlEntities(match[4]);

      // Strict relevance filtering
      if (!isRelevantToQuery(rawName, rawBrand, cleanQuery)) {
        continue;
      }

      // Parse portion
      const portionMatch = desc.match(/^(?:por|per)\s+([^-|]+?)\s*-\s*/i);
      const portionText = portionMatch ? portionMatch[1].trim() : '1 porción';

      let grams = 100;
      const gramsMatch = portionText.match(/(\d+(?:[.,]\d+)?)\s*g/i);
      if (gramsMatch) {
        grams = parseFloat(gramsMatch[1].replace(',', '.'));
      }

      // Parse macros (supports ES/PT/EN labels)
      const calsMatch = desc.match(/(?:Calor[ií]as|Calories):\s*(\d+(?:[.,]\d+)?)\s*kcal/i);
      const fatMatch = desc.match(/(?:Grasa|Gord|Fat):\s*(\d+(?:[.,]\d+)?)\s*g/i);
      const carbsMatch = desc.match(/(?:Carbh|Carbs):\s*(\d+(?:[.,]\d+)?)\s*g/i);
      const protMatch = desc.match(/(?:Prot|Protein):\s*(\d+(?:[.,]\d+)?)\s*g/i);

      const calories = calsMatch ? Math.round(parseFloat(calsMatch[1].replace(',', '.'))) : 0;
      const fat = fatMatch ? Math.round(parseFloat(fatMatch[1].replace(',', '.')) * 10) / 10 : 0;
      const carbs = carbsMatch ? Math.round(parseFloat(carbsMatch[1].replace(',', '.')) * 10) / 10 : 0;
      const protein = protMatch ? Math.round(parseFloat(protMatch[1].replace(',', '.')) * 10) / 10 : 0;

      const { animalProteinGrams, plantProteinGrams } = classifyProteins(rawName, rawBrand, protein);

      const gi: 'Bajo' | 'Medio' | 'Alto' = carbs > 25 ? 'Medio' : 'Bajo';
      const cg = Math.round((carbs * 0.5) * 10) / 10;
      const absorption: 'Rápida' | 'Lenta' | 'Mixta' = fat > 7 ? 'Lenta' : (carbs > 20 ? 'Mixta' : 'Rápida');

      // 1. Primary official portion from FatSecret
      const mainItem: FoodItem = {
        id: `fs-${Math.random().toString(36).substring(2, 9)}`,
        name: rawBrand !== 'Genérico' ? `${rawName} (${rawBrand})` : rawName,
        brand: rawBrand,
        portionName: portionText,
        gramsPerPortion: grams,
        carbsGrams: carbs,
        fatGrams: fat,
        calories,
        totalProteinGrams: protein,
        animalProteinGrams,
        plantProteinGrams,
        gi,
        cg,
        absorption,
        isCommercial: rawBrand !== 'Genérico',
        category: 'Producto Comercial',
        source: `FatSecret ${profile.name} (${profile.flag} Rótulo oficial ${rawBrand})`,
      };
      items.push(mainItem);

      // 2. If portion is structured as "N unidades (Xg)" or "N galletitas (Xg)", also provide exact unit option
      const unitMatch = portionText.match(/^(\d+)\s*(unidades|galletitas|galletas|masitas|crackers|rebanadas|fetas|cucharadas)\s*\(([\d.,]+)\s*g\)/i);
      if (unitMatch) {
        const count = parseInt(unitMatch[1], 10);
        const unitType = unitMatch[2].toLowerCase();
        const totalGrams = parseFloat(unitMatch[3].replace(',', '.'));

        if (count > 1 && totalGrams > 0) {
          const unitGrams = Math.round((totalGrams / count) * 10) / 10;
          const unitCarbs = Math.round((carbs / count) * 10) / 10;
          const unitFat = Math.round((fat / count) * 10) / 10;
          const unitProtein = Math.round((protein / count) * 10) / 10;
          const unitCalories = Math.round(calories / count);

          const singular = unitType === 'unidades' ? 'unidad' : unitType.replace(/es$/, '').replace(/s$/, '');
          const { animalProteinGrams: uAnim, plantProteinGrams: uPlant } = classifyProteins(rawName, rawBrand, unitProtein);

          items.push({
            id: `fs-unit-${Math.random().toString(36).substring(2, 9)}`,
            name: `${rawName} [1 ${singular} (~${unitGrams}g)]`,
            brand: rawBrand,
            portionName: `1 ${singular} (~${unitGrams}g)`,
            gramsPerPortion: unitGrams,
            carbsGrams: unitCarbs,
            fatGrams: unitFat,
            calories: unitCalories,
            totalProteinGrams: unitProtein,
            animalProteinGrams: uAnim,
            plantProteinGrams: uPlant,
            gi,
            cg: Math.round((unitCarbs * 0.5) * 10) / 10,
            absorption,
            isCommercial: rawBrand !== 'Genérico',
            category: 'Producto Comercial',
            source: `FatSecret Argentina (1 unidad oficial / desglosado)`,
          });
        }
      }
    }

    return items.slice(0, limit);
  } catch (err) {
    console.warn('FatSecret Argentina query skipped:', err);
    return [];
  }
}
