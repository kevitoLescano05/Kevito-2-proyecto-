import { DailyMealLogItem } from '../types';

/**
 * Calculates dynamic Carbs on Board (COB) based on OpenAPS/AndroidAPS concepts.
 * Extends absorption time based on fats and proteins (Warsaw method principles).
 */
export function calculateDynamicCOB(
  meals: DailyMealLogItem[],
  currentTimeMs: number = Date.now()
): number {
  if (!meals || !Array.isArray(meals) || meals.length === 0) return 0;

  let totalCob = 0;

  meals.forEach((meal) => {
    if (!meal) return;

    let mealTimeMs = 0;
    if (meal.timestamp) {
      mealTimeMs = new Date(meal.timestamp).getTime();
    } else if (meal.date && meal.time) {
      mealTimeMs = new Date(`${meal.date}T${meal.time}:00`).getTime();
    }

    if (!mealTimeMs || isNaN(mealTimeMs)) return;
    if (currentTimeMs < mealTimeMs) return; // Future meal? Skip.

    const elapsedHours = (currentTimeMs - mealTimeMs) / 3600000;
    if (isNaN(elapsedHours) || elapsedHours < 0) return;
    
    // Ignore meals older than 8 hours (maximum reasonable digestion window)
    if (elapsedHours > 8) return;

    // Default fast-carb absorption time (min 2 hours, standard 3 hours)
    let absorptionDurationHours = 3.0;

    // Adjust for Fat & Protein (Warsaw / FPU logic)
    // 1 FPU = 100 kcal from Fat/Protein = extends digestion
    const fat = Number(meal.fatGrams) || 0;
    const protein = (Number(meal.animalProteinGrams) || 0) + (Number(meal.plantProteinGrams) || 0);
    const kcalFromFatPro = (fat * 9) + (protein * 4);
    
    // For every 100 kcal of fat/protein, add 1 hour of absorption, cap at +5 hours (max 8h total)
    const delayHours = Math.min(5, kcalFromFatPro / 100);
    absorptionDurationHours += delayHours;

    if (elapsedHours >= absorptionDurationHours) {
      return; // Fully absorbed
    }

    const remainingRatio = Math.max(0, Math.min(1, 1 - (elapsedHours / absorptionDurationHours)));
    
    const carbsGrams = Number(meal.carbsGrams) || 0;
    const activeCarbs = carbsGrams * remainingRatio;
    
    if (!isNaN(activeCarbs) && activeCarbs > 0) {
      totalCob += activeCarbs;
    }
  });

  return Math.max(0, isNaN(totalCob) ? 0 : Math.round(totalCob * 10) / 10);
}
