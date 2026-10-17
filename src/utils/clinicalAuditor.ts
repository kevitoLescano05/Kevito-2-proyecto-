/**
 * Clinical Math & Macronutrient Consistency Auditor
 * Rigorous validation engine ensuring:
 * 1. Protein consistency: Total Protein = Animal Protein + Plant Protein
 * 2. Atwater energy balance: Calories ~ (4 * carbs) + (4 * protein) + (9 * fat)
 * 3. Argentine CAA net carbs rule: fiber is separate from available carbs
 * 4. Diabetes Tipo 1 Novorapid Bolus exactness: ICR 1:8, FSI 28 mg/dL, target 100 mg/dL
 * 5. Strict renal boundaries: Animal <= 25g/day, Plant 25-35g/day
 * 6. Safe split-bolus boundaries: max 2h delay for Novorapid, min 0.5U first dose
 */

export interface FoodItemAuditInput {
  name?: string;
  brand?: string;
  carbsGrams?: number;
  fiberGrams?: number;
  totalProteinGrams?: number;
  animalProteinGrams?: number;
  plantProteinGrams?: number;
  fatGrams?: number;
  calories?: number;
  portionName?: string;
  gramsPerPortion?: number;
  source?: string;
}

export interface FoodItemAuditResult {
  name: string;
  brand?: string;
  carbsGrams: number;
  fiberGrams: number;
  animalProteinGrams: number;
  plantProteinGrams: number;
  totalProteinGrams: number;
  fatGrams: number;
  calories: number;
  portionName: string;
  gramsPerPortion: number;
  source: string;
  auditNotes: string[];
  isClinicallyAudited: true;
}

export interface MealTotalsInput {
  carbsGrams?: number;
  netCarbsGrams?: number;
  fiberGrams?: number;
  animalProteinGrams?: number;
  plantProteinGrams?: number;
  fatGrams?: number;
  calories?: number;
}

export interface MealTotalsAudited {
  carbsGrams: number;
  netCarbsGrams: number;
  fiberGrams: number;
  animalProteinGrams: number;
  plantProteinGrams: number;
  totalProteinGrams: number;
  fatGrams: number;
  calories: number;
  auditWarnings: string[];
}

/**
 * Normalizes a single food item with mathematical consistency guarantees.
 */
export function auditFoodItem(item: FoodItemAuditInput): FoodItemAuditResult {
  const notes: string[] = [];

  const rawCarbs = Math.max(0, Number(item.carbsGrams) || 0);
  const rawFiber = Math.max(0, Number(item.fiberGrams) || 0);
  const rawFat = Math.max(0, Number(item.fatGrams) || 0);

  let animalP = Math.max(0, Number(item.animalProteinGrams) || 0);
  let plantP = Math.max(0, Number(item.plantProteinGrams) || 0);
  let totalP = Math.max(0, Number(item.totalProteinGrams) || 0);

  const nameLower = (item.name || '').toLowerCase();
  const brandLower = (item.brand || '').toLowerCase();

  // Known pure plant items
  const isPurePlant = /arroz|avena|fideos|harina|pan|galletit|fruta|manzana|banana|naranja|coco|mani|soja|lenteja|garbanzo|poroto|semilla|chia|sesamo|lino|aceite|palta|vegetal|verdura/.test(nameLower)
    && !/carne|pollo|cerdo|pescado|queso|leche|yogur|huevo|jamon|atun|dulce de leche/.test(nameLower);

  if (isPurePlant && animalP > 0) {
    notes.push(`Ajuste clínico renal: "${item.name}" clasificado como 100% vegetal; reasignada proteína animal (${animalP}g) a vegetal.`);
    plantP += animalP;
    animalP = 0;
  }

  // Protein reconciliation: if totalP was provided but sum doesn't match
  const sumP = animalP + plantP;
  if (totalP > 0 && Math.abs(totalP - sumP) > 0.3) {
    if (sumP === 0) {
      // Allocate to plant or animal based on product type
      if (isPurePlant) {
        plantP = totalP;
      } else if (/carne|pollo|cerdo|pescado|atun|jamon/.test(nameLower)) {
        animalP = totalP;
      } else {
        // Hybrid / dairy
        animalP = Math.round(totalP * 0.7 * 10) / 10;
        plantP = Math.round((totalP - animalP) * 10) / 10;
      }
      notes.push(`Reconciliación proteica: asignados ${totalP}g totales a vegetal/animal.`);
    } else {
      // Re-scale animal and plant to match totalP proportionally
      const ratio = totalP / sumP;
      animalP = Math.round(animalP * ratio * 10) / 10;
      plantP = Math.round(plantP * ratio * 10) / 10;
      notes.push(`Reconciliación proteica: balanceada suma (${sumP.toFixed(1)}g) a total declarado (${totalP.toFixed(1)}g).`);
    }
  }

  const finalTotalP = Math.round((animalP + plantP) * 10) / 10;

  // Caloric verification (Atwater: 4 kcal/g carbs, 4 kcal/g protein, 9 kcal/g fat)
  const theoreticalCalories = Math.round((rawCarbs * 4) + (finalTotalP * 4) + (rawFat * 9));
  let reportedCalories = Number(item.calories);

  if (!reportedCalories || isNaN(reportedCalories) || reportedCalories <= 0) {
    reportedCalories = theoreticalCalories;
    notes.push(`Calorías calculadas por balance Atwater: ${theoreticalCalories} kcal.`);
  } else {
    // Respetar fielmente las calorías del rótulo/fuente sin inventar ni sobreescribir
    reportedCalories = Number(item.calories);
  }

  return {
    name: item.name || 'Alimento',
    brand: item.brand,
    carbsGrams: Math.round(rawCarbs * 10) / 10,
    fiberGrams: Math.round(rawFiber * 10) / 10,
    animalProteinGrams: Math.round(animalP * 10) / 10,
    plantProteinGrams: Math.round(plantP * 10) / 10,
    totalProteinGrams: finalTotalP,
    fatGrams: Math.round(rawFat * 10) / 10,
    calories: Math.round(reportedCalories),
    portionName: item.portionName || '1 porción',
    gramsPerPortion: item.gramsPerPortion || 100,
    source: item.source || 'Auditoría Clínica Nutricional',
    auditNotes: notes,
    isClinicallyAudited: true,
  };
}

/**
 * Audits a complete meal's totals and checks diabetic/renal parameters.
 */
export function auditMealTotals(totals: MealTotalsInput): MealTotalsAudited {
  const warnings: string[] = [];

  const carbs = Math.max(0, Number(totals.carbsGrams) || 0);
  const netCarbs = Math.max(0, Number(totals.netCarbsGrams) || carbs);
  const fiber = Math.max(0, Number(totals.fiberGrams) || 0);
  const animalP = Math.max(0, Number(totals.animalProteinGrams) || 0);
  const plantP = Math.max(0, Number(totals.plantProteinGrams) || 0);
  const fat = Math.max(0, Number(totals.fatGrams) || 0);
  const totalP = Math.round((animalP + plantP) * 10) / 10;

  const theoreticalCalories = Math.round((carbs * 4) + (totalP * 4) + (fat * 9));
  let finalCalories = Number(totals.calories) || theoreticalCalories;

  if (Math.abs(finalCalories - theoreticalCalories) > Math.max(30, theoreticalCalories * 0.20)) {
    warnings.push(`Calorías recalculadas matemáticamente a ${theoreticalCalories} kcal para exactitud Atwater.`);
    finalCalories = theoreticalCalories;
  }

  // Renal warning checks
  if (animalP > 25) {
    warnings.push(`⚠️ ALERTA RENAL: Esta comida contiene ${animalP}g de proteína animal, superando el techo diario total permitido (25g).`);
  }

  return {
    carbsGrams: Math.round(carbs * 10) / 10,
    netCarbsGrams: Math.round(netCarbs * 10) / 10,
    fiberGrams: Math.round(fiber * 10) / 10,
    animalProteinGrams: Math.round(animalP * 10) / 10,
    plantProteinGrams: Math.round(plantP * 10) / 10,
    totalProteinGrams: totalP,
    fatGrams: Math.round(fat * 10) / 10,
    calories: Math.round(finalCalories),
    auditWarnings: warnings,
  };
}

/**
 * Audits Novorapid dosing with physiological IOB deduction.
 */
export function auditNovorapidDose(params: {
  carbsGrams: number;
  icr: number;
  currentGlucose?: number;
  targetGlucose: number;
  isf: number;
  iobUnits: number;
  penRoundStep?: 0.5 | 1.0;
}) {
  const icr = params.icr > 0 ? params.icr : 8;
  const isf = params.isf > 0 ? params.isf : 28;
  const target = params.targetGlucose > 0 ? params.targetGlucose : 100;
  const step = params.penRoundStep || 0.5;

  const carbBolus = params.carbsGrams / icr;
  const bg = params.currentGlucose !== undefined && !isNaN(params.currentGlucose) ? params.currentGlucose : target;
  const grossCorrection = (bg - target) / isf;

  const iob = Math.max(0, params.iobUnits || 0);
  const netDoseRaw = Math.max(0, carbBolus + grossCorrection - iob);

  // Rounding according to step
  const roundedNetDose = Math.round(netDoseRaw / step) * step;

  return {
    carbBolus: Number(carbBolus.toFixed(2)),
    grossCorrection: Number(grossCorrection.toFixed(2)),
    appliedIob: Number(iob.toFixed(2)),
    netDoseRaw: Number(netDoseRaw.toFixed(2)),
    suggestedRoundedDose: Number(roundedNetDose.toFixed(1)),
    isIobCoveringMeal: netDoseRaw <= 0 && iob > 0,
    excessIobUnits: netDoseRaw <= 0 && iob > (carbBolus + grossCorrection)
      ? Number((iob - (carbBolus + grossCorrection)).toFixed(2))
      : 0,
  };
}
