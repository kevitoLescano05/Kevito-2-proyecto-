/**
 * Open Food Facts Open-Source Connector
 * Queries the world's largest open food and nutrition database.
 * Free, open community database with millions of verified products and barcodes.
 *
 * Repository & API Reference:
 * - https://github.com/openfoodfacts
 * - https://openfoodfacts.github.io/api-documentation/
 */

import { FoodItem, CountryCode } from '../types';
import { auditFoodItem } from './clinicalAuditor';
import { COUNTRY_PROFILES } from '../data/searchSources';

export interface OpenFoodFactsProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  ingredients_text?: string;
  nutriments?: {
    carbohydrates_100g?: number;
    carbohydrates_serving?: number;
    'energy-kcal_100g'?: number;
    'energy-kcal_serving'?: number;
    proteins_100g?: number;
    proteins_serving?: number;
    fat_100g?: number;
    fat_serving?: number;
    fiber_100g?: number;
    fiber_serving?: number;
    sugars_100g?: number;
    sugars_serving?: number;
  };
}

/**
 * Classifies whether protein in product is predominantly animal, plant, or mixed.
 */
function classifyProteins(ingredientsText?: string, productName?: string, totalProtein: number = 0): {
  animalProtein: number;
  plantProtein: number;
} {
  const text = `${productName || ''} ${ingredientsText || ''}`.toLowerCase();

  const hasAnimal = /leche|queso|suero|caseina|huevo|alb[uú]mina|carne|pollo|vacun|bovin|cerdo|grasa vacuna|grasa animal|manteca|pescado|atun|jamon|colageno|chorizo|salchicha|morcilla|embutido|fiambre|salame|bondiola|mortadela/.test(text);
  const hasPlant = /harina|avena|soja|trigo|maiz|arroz|girasol|semilla|chia|sesamo|lino|cacao|coco|mani|legumbre|vegetal|salvado/.test(text);

  if (!hasAnimal && (hasPlant || totalProtein > 0)) {
    // 100% plant
    return { animalProtein: 0, plantProtein: totalProtein };
  }

  if (hasAnimal && !hasPlant) {
    // 100% animal
    return { animalProtein: totalProtein, plantProtein: 0 };
  }

  if (hasAnimal && hasPlant) {
    // Mixed: e.g. biscuit with milk or whey
    // Typically in baked goods, wheat flour accounts for ~70% of protein and milk/egg for ~30%
    const animal = Math.round(totalProtein * 0.35 * 10) / 10;
    const plant = Math.round((totalProtein - animal) * 10) / 10;
    return { animalProtein: animal, plantProtein: plant };
  }

  // Default: if no animal keywords detected, assume plant
  return { animalProtein: 0, plantProtein: totalProtein };
}

function isRelevantToQuery(name: string, brand: string | undefined, query: string): boolean {
  // Strict check: reject Arabic, Cyrillic, Chinese, Hebrew or other non-Latin scripts
  if (/[\u0600-\u06FF\u0400-\u04FF\u4E00-\u9FFF\u0590-\u05FF]/.test(name) || (brand && /[\u0600-\u06FF\u0400-\u04FF\u4E00-\u9FFF\u0590-\u05FF]/.test(brand))) {
    return false;
  }

  const normQ = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const normName = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const normBrand = (brand || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const combined = `${normName} ${normBrand}`;

  const qTokens = normQ.split(/\s+/).filter((t) => t.length > 1);
  if (qTokens.length === 0) return true;

  const matchedTokens = qTokens.filter((t) => combined.includes(t));

  if (qTokens.length >= 2) {
    const firstWordMatched = combined.includes(qTokens[0]);
    if (!firstWordMatched && matchedTokens.length < qTokens.length) {
      return false;
    }
  }

  return matchedTokens.length / qTokens.length >= 0.5;
}

/**
 * Searches Open Food Facts by keyword or barcode.
 */
export async function searchOpenFoodFacts(
  query: string,
  limit: number = 12,
  countryCode: CountryCode = 'AR'
): Promise<FoodItem[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const profile = COUNTRY_PROFILES[countryCode] || COUNTRY_PROFILES.AR;
  const subdomain = profile.openFoodFactsSubdomain || 'world';
  const isBarcode = /^\d{8,14}$/.test(cleanQuery.replace(/\s+/g, ''));
  const userAgent = 'InsulinSmartCalc/1.0 (contact@insulinsmartcalc.app - Open Source Diabetes Tool)';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s strict timeout

    let url: string;
    if (isBarcode) {
      url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanQuery.replace(/\s+/g, ''))}?fields=code,product_name,brands,nutriments,serving_size,ingredients_text`;
    } else {
      url = `https://${subdomain}.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(cleanQuery)}&fields=code,product_name,brands,nutriments,serving_size,ingredients_text&page_size=${limit}`;
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const data = await res.json();
    const rawProducts: OpenFoodFactsProduct[] = isBarcode
      ? (data.product ? [data.product] : [])
      : (data.products || []);

    const items: FoodItem[] = [];

    for (const p of rawProducts) {
      const name = p.product_name || '';
      if (!name) continue;

      const brand = p.brands ? p.brands.split(',')[0].trim() : undefined;

      // When searching by text, strictly enforce that the item is relevant and contains Latin text matching the query
      if (!isBarcode && !isRelevantToQuery(name, brand, cleanQuery)) {
        continue;
      }

      const nut = p.nutriments || {};

      // 1. If product has per-serving information
      const hasServing = nut.carbohydrates_serving !== undefined && nut.carbohydrates_serving !== null;
      if (hasServing) {
        const carbs = Number(nut.carbohydrates_serving) || 0;
        const calories = Number(nut['energy-kcal_serving']) || 0;
        const fat = Number(nut.fat_serving) || 0;
        const fiber = Number(nut.fiber_serving) || 0;
        const totalProtein = Number(nut.proteins_serving) || 0;
        const { animalProtein, plantProtein } = classifyProteins(p.ingredients_text, name, totalProtein);

        let portionName = p.serving_size ? `Porción (${p.serving_size})` : '1 porción';
        let grams = 30;
        if (p.serving_size) {
          const match = p.serving_size.match(/(\d+(?:\.\d+)?)\s*g/i);
          if (match) grams = parseFloat(match[1]);
        }

        const audited = auditFoodItem({
          name: brand ? `${name} (${brand}) [Porción]` : `${name} [Porción]`,
          brand,
          carbsGrams: carbs,
          fiberGrams: fiber,
          totalProteinGrams: totalProtein,
          animalProteinGrams: animalProtein,
          plantProteinGrams: plantProtein,
          fatGrams: fat,
          calories,
          portionName,
          gramsPerPortion: grams,
          source: `Open Food Facts (Rótulo por porción${p.code ? ` - EAN ${p.code}` : ''})`,
        });

        const gi: 'Bajo' | 'Medio' | 'Alto' = audited.carbsGrams > 25 ? 'Medio' : 'Bajo';
        const cg = Math.round((audited.carbsGrams * 0.5) * 10) / 10;
        const absorption: 'Rápida' | 'Lenta' | 'Mixta' = audited.fatGrams > 8 ? 'Lenta' : (audited.carbsGrams > 20 ? 'Mixta' : 'Rápida');

        items.push({
          id: `off-srv-${p.code || Math.random().toString(36).substring(2, 9)}`,
          name: audited.name,
          brand: audited.brand,
          carbsGrams: audited.carbsGrams,
          fiberGrams: audited.fiberGrams,
          animalProteinGrams: audited.animalProteinGrams,
          plantProteinGrams: audited.plantProteinGrams,
          fatGrams: audited.fatGrams,
          calories: audited.calories,
          portionName: audited.portionName,
          gramsPerPortion: audited.gramsPerPortion,
          gi,
          cg,
          absorption,
          isCommercial: true,
          source: audited.source,
        });
      }

      // 2. Also provide 100g option if available
      const has100g = nut.carbohydrates_100g !== undefined && nut.carbohydrates_100g !== null;
      if (has100g || !hasServing) {
        const carbs100 = Number(nut.carbohydrates_100g) || 0;
        const calories100 = Number(nut['energy-kcal_100g']) || 0;
        const fat100 = Number(nut.fat_100g) || 0;
        const fiber100 = Number(nut.fiber_100g) || 0;
        const totalProtein100 = Number(nut.proteins_100g) || 0;
        const { animalProtein, plantProtein } = classifyProteins(p.ingredients_text, name, totalProtein100);

        const audited100 = auditFoodItem({
          name: brand ? `${name} (${brand}) [por 100g]` : `${name} [por 100g]`,
          brand,
          carbsGrams: carbs100,
          fiberGrams: fiber100,
          totalProteinGrams: totalProtein100,
          animalProteinGrams: animalProtein,
          plantProteinGrams: plantProtein,
          fatGrams: fat100,
          calories: calories100,
          portionName: '100 gramos',
          gramsPerPortion: 100,
          source: `Open Food Facts (Valores cada 100g${p.code ? ` - EAN ${p.code}` : ''})`,
        });

        const gi100: 'Bajo' | 'Medio' | 'Alto' = audited100.carbsGrams > 25 ? 'Medio' : 'Bajo';
        const cg100 = Math.round((audited100.carbsGrams * 0.5) * 10) / 10;
        const absorption100: 'Rápida' | 'Lenta' | 'Mixta' = audited100.fatGrams > 8 ? 'Lenta' : (audited100.carbsGrams > 20 ? 'Mixta' : 'Rápida');

        items.push({
          id: `off-100-${p.code || Math.random().toString(36).substring(2, 9)}`,
          name: audited100.name,
          brand: audited100.brand,
          carbsGrams: audited100.carbsGrams,
          fiberGrams: audited100.fiberGrams,
          animalProteinGrams: audited100.animalProteinGrams,
          plantProteinGrams: audited100.plantProteinGrams,
          fatGrams: audited100.fatGrams,
          calories: audited100.calories,
          portionName: audited100.portionName,
          gramsPerPortion: audited100.gramsPerPortion,
          gi: gi100,
          cg: cg100,
          absorption: absorption100,
          isCommercial: true,
          source: audited100.source,
        });
      }
    }

    return items;
  } catch (err) {
    // Graceful fallback if Open Food Facts API is slow or offline
    console.warn('Open Food Facts connector query skipped:', err);
    return [];
  }
}
