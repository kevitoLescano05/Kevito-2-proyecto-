import {
  BolusRecord,
  GlucoseTrend,
  PendingSplitBolus,
  AntiStackingRecommendation,
  EatingSequencingMode,
  SecondDoseSensorCheckResult,
  IPortAdvanceState,
  DailyWorkoutState,
  RapidInsulinBrand,
  MealTimeSlot,
  UserSettings,
  FixedMealDosesConfig,
  CorrectionScaleBracket,
  TissueConsistencyType,
  ZoneTissueCompositionConfig,
} from '../types';
import { calculateOpenApsIOB, generateOpenApsChartData, NOVORAPID_PEAK_MINUTES } from './openapsIob';

export { calculateOpenApsIOB, generateOpenApsChartData, NOVORAPID_PEAK_MINUTES } from './openapsIob';

export const DEFAULT_FIXED_MEAL_DOSES: FixedMealDosesConfig = {
  breakfastUnits: 3,
  lunchUnits: 5,
  snackUnits: 3,
  dinnerUnits: 4,
  extraUnits: 0,
};

export const DEFAULT_CORRECTION_SCALE: CorrectionScaleBracket[] = [
  { id: 'scale-1', minGlucose: 150, maxGlucose: 180, units: 1 },
  { id: 'scale-2', minGlucose: 181, maxGlucose: 220, units: 2 },
  { id: 'scale-3', minGlucose: 221, maxGlucose: 260, units: 3 },
  { id: 'scale-4', minGlucose: 261, maxGlucose: 300, units: 4 },
  { id: 'scale-5', minGlucose: 301, maxGlucose: 600, units: 5 },
];

export function getFixedDoseForMealSlot(
  fixedDoses: FixedMealDosesConfig | undefined,
  slot: MealTimeSlot | 'correction_only'
): number {
  if (slot === 'correction_only') return 0;
  const cfg = fixedDoses || DEFAULT_FIXED_MEAL_DOSES;
  switch (slot) {
    case 'breakfast':
      return Math.max(0, Number(cfg.breakfastUnits) || 0);
    case 'lunch':
      return Math.max(0, Number(cfg.lunchUnits) || 0);
    case 'snack':
      return Math.max(0, Number(cfg.snackUnits) || 0);
    case 'dinner':
      return Math.max(0, Number(cfg.dinnerUnits) || 0);
    default:
      return 0;
  }
}

export function calculateSlidingScaleCorrection(
  glucoseMgDl: number,
  scale?: CorrectionScaleBracket[]
): {
  units: number;
  matchedBracket: CorrectionScaleBracket | null;
} {
  if (!glucoseMgDl || glucoseMgDl <= 0) {
    return { units: 0, matchedBracket: null };
  }
  const activeScale = (scale && scale.length > 0 ? scale : DEFAULT_CORRECTION_SCALE)
    .slice()
    .sort((a, b) => a.minGlucose - b.minGlucose);

  for (const bracket of activeScale) {
    if (glucoseMgDl >= bracket.minGlucose && glucoseMgDl <= bracket.maxGlucose) {
      return { units: Math.max(0, Number(bracket.units) || 0), matchedBracket: bracket };
    }
  }

  // Si la glucosa supera el tope del escalón más alto, usar el escalón más alto
  const highest = activeScale[activeScale.length - 1];
  if (highest && glucoseMgDl > highest.maxGlucose) {
    return { units: Math.max(0, Number(highest.units) || 0), matchedBracket: highest };
  }

  return { units: 0, matchedBracket: null };
}

export interface RapidInsulinInfo {
  id: RapidInsulinBrand;
  name: string;
  shortName: string;
  speedCategory: 'standard_rapid' | 'ultra_rapid' | 'regular_human';
  onsetMinutesText: string;
  preBolusWaitAdjustmentMinutes: number; // ej. -8 min para Fiasp/Lyumjev, +15 min para Regular
  description: string;
}

export const RAPID_INSULIN_CATALOG: RapidInsulinInfo[] = [
  {
    id: 'novorapid',
    name: 'NovoRapid / NovoLog (Insulina Aspart)',
    shortName: 'NovoRapid',
    speedCategory: 'standard_rapid',
    onsetMinutesText: '10 a 15 min',
    preBolusWaitAdjustmentMinutes: 0,
    description: 'Análogo rápido estándar. Suele requerir 10-15 min de espera antes de comer con glucemia estable.',
  },
  {
    id: 'humalog',
    name: 'Humalog (Insulina Lispro)',
    shortName: 'Humalog',
    speedCategory: 'standard_rapid',
    onsetMinutesText: '10 a 15 min',
    preBolusWaitAdjustmentMinutes: 0,
    description: 'Análogo rápido estándar. Inicio de acción en 10-15 min y pico entre 60-90 min.',
  },
  {
    id: 'apidra',
    name: 'Apidra (Insulina Glulisina)',
    shortName: 'Apidra',
    speedCategory: 'standard_rapid',
    onsetMinutesText: '10 a 15 min',
    preBolusWaitAdjustmentMinutes: 0,
    description: 'Análogo rápido estándar. Inicio de acción en 10-15 min.',
  },
  {
    id: 'fiasp',
    name: 'Fiasp (Aspart Ultra-Rápida)',
    shortName: 'Fiasp (Ultra-rápida)',
    speedCategory: 'ultra_rapid',
    onsetMinutesText: '2 a 5 min',
    preBolusWaitAdjustmentMinutes: -8,
    description: 'Ultra-rápida con vitamina B3 (niacinamida). Empieza a actuar en sangre en 2 a 5 min: requiere esperar mucho menos (0 a 5 min) para no tener hipoglucemia al comer.',
  },
  {
    id: 'lyumjev',
    name: 'Lyumjev (Lispro Ultra-Rápida)',
    shortName: 'Lyumjev (Ultra-rápida)',
    speedCategory: 'ultra_rapid',
    onsetMinutesText: '2 a 5 min',
    preBolusWaitAdjustmentMinutes: -8,
    description: 'Ultra-rápida con treprostinil. Entra a la sangre en 2 a 5 min; se aplica al empezar a comer o pocos minutos antes.',
  },
  {
    id: 'regular',
    name: 'Insulina Humana Regular / Cristalina',
    shortName: 'Insulina Regular',
    speedCategory: 'regular_human',
    onsetMinutesText: '30 min',
    preBolusWaitAdjustmentMinutes: 15,
    description: 'Insulina rápida humana tradicional. Tarda ~30 min en iniciar acción y requiere mayor anticipación.',
  },
];

export function getRapidInsulinInfo(brand?: RapidInsulinBrand): RapidInsulinInfo {
  return RAPID_INSULIN_CATALOG.find((b) => b.id === (brand || 'novorapid')) || RAPID_INSULIN_CATALOG[0];
}

export function getCurrentMealTimeSlot(date: Date = new Date()): MealTimeSlot {
  const mins = date.getHours() * 60 + date.getMinutes();
  if (mins >= 5 * 60 && mins < 11 * 60 + 30) return 'breakfast'; // 05:00 - 11:29
  if (mins >= 11 * 60 + 30 && mins < 15 * 60 + 30) return 'lunch'; // 11:30 - 15:29
  if (mins >= 15 * 60 + 30 && mins < 19 * 60 + 30) return 'snack'; // 15:30 - 19:29
  return 'dinner'; // 19:30 - 04:59
}

export const MEAL_SLOT_LABELS: Record<MealTimeSlot, { name: string; emoji: string; hours: string }> = {
  breakfast: { name: 'Desayuno', emoji: '🌅', hours: '05:00 - 11:30' },
  lunch: { name: 'Almuerzo', emoji: '☀️', hours: '11:30 - 15:30' },
  snack: { name: 'Merienda', emoji: '🧉', hours: '15:30 - 19:30' },
  dinner: { name: 'Cena', emoji: '🌙', hours: '19:30 - 05:00' },
};

export function getEffectiveIcrForMealSlot(
  settings: UserSettings,
  slotOverride?: MealTimeSlot
): {
  effectiveIcr: number;
  activeSlot: MealTimeSlot;
  isUsingTimeSlotRatio: boolean;
} {
  const activeSlot = slotOverride || getCurrentMealTimeSlot();
  if (!settings.enableMealTimeRatios || !settings.mealTimeRatios) {
    return {
      effectiveIcr: settings.icr || 8,
      activeSlot,
      isUsingTimeSlotRatio: false,
    };
  }
  const map: Record<MealTimeSlot, number> = {
    breakfast: settings.mealTimeRatios.breakfastIcr || settings.icr,
    lunch: settings.mealTimeRatios.lunchIcr || settings.icr,
    snack: settings.mealTimeRatios.snackIcr || settings.icr,
    dinner: settings.mealTimeRatios.dinnerIcr || settings.icr,
  };
  return {
    effectiveIcr: map[activeSlot] > 0 ? map[activeSlot] : settings.icr,
    activeSlot,
    isUsingTimeSlotRatio: true,
  };
}

export interface HypoRescuePlan {
  isSevereHypo: boolean; // < 54 mg/dL
  baseFastCarbsGrams: number;
  extraCarbsForIobGrams: number;
  extraCarbsForTrendGrams: number;
  totalFastCarbsRecommended: number;
  explanation: string;
  practicalOptions: {
    emoji: string;
    label: string;
    portionDetail: string;
  }[];
}

/**
 * Calcula cuántos gramos exactos de carbohidratos rápidos (azúcar pura, jugo, glucosa)
 * requiere tomar una persona en hipoglucemia (<70 mg/dL o <80 mg/dL bajando) según:
 * 1. Su peso corporal (~0.3 g/kg en hipo estándar).
 * 2. Qué tan baja está la glucosa (<54 mg/dL vs 54-69 mg/dL).
 * 3. Cuánta Insulina Activa (IOB) tiene trabajando en sangre ahora mismo.
 * 4. La flecha de tendencia del sensor.
 */
export function calculateHypoRescuePlan(
  currentGlucose: number,
  trendArrow: GlucoseTrend,
  iobUnits: number,
  weightKg: number = 65,
  icr: number = 10
): HypoRescuePlan {
  const isSevereHypo = currentGlucose > 0 && currentGlucose < 54;
  const safeWeight = weightKg > 20 ? weightKg : 65;

  // Base según peso (~0.25 - 0.3 g/kg), acotado entre 12g y 20g (o 20g-25g si es <54 mg/dL)
  let baseFastCarbsGrams = isSevereHypo
    ? Math.max(20, Math.min(25, Math.round(safeWeight * 0.35)))
    : Math.max(12, Math.min(18, Math.round(safeWeight * 0.25)));

  // Si hay Insulina Activa (IOB) trabajando, cubrir una fracción segura (ej. 50% del IOB activo) para que no vuelva a caer a los 20 min
  const safeIcr = icr > 2 ? icr : 10;
  const extraCarbsForIobGrams =
    iobUnits >= 0.4 ? Math.min(25, Math.round(iobUnits * safeIcr * 0.5)) : 0;

  // Si la flecha cae rápido (⬇️) o cae (↘️)
  const extraCarbsForTrendGrams =
    trendArrow === 'falling_fast' ? 8 : trendArrow === 'falling' ? 4 : 0;

  const rawTotal = baseFastCarbsGrams + extraCarbsForIobGrams + extraCarbsForTrendGrams;
  // Redondear a número entero práctico (máximo 40g de una sola vez para evitar rebote)
  const totalFastCarbsRecommended = Math.min(40, Math.max(12, Math.round(rawTotal)));

  const sugarPackets = Math.max(2, Math.round(totalFastCarbsRecommended / 5)); // 1 sobre o cucharadita colmada = ~5g
  const juiceMl = Math.round((totalFastCarbsRecommended / 10) * 100); // Jugo o gaseosa común = ~10g cada 100ml
  const honeySpoons = Math.max(1, Math.round(totalFastCarbsRecommended / 12)); // 1 cucharada sopera de miel = ~12-15g

  const parts: string[] = [`${baseFastCarbsGrams}g base por tu glucemia (${currentGlucose} mg/dL)`];
  if (extraCarbsForIobGrams > 0) {
    parts.push(`+${extraCarbsForIobGrams}g porque tenés ${iobUnits.toFixed(1)} U de insulina activa bajándote`);
  }
  if (extraCarbsForTrendGrams > 0) {
    parts.push(`+${extraCarbsForTrendGrams}g por la flecha en descenso`);
  }

  return {
    isSevereHypo,
    baseFastCarbsGrams,
    extraCarbsForIobGrams,
    extraCarbsForTrendGrams,
    totalFastCarbsRecommended,
    explanation: parts.join(' '),
    practicalOptions: [
      {
        emoji: '🍬',
        label: 'Azúcar común en agua',
        portionDetail: `${sugarPackets} sobrecitos o cucharaditas (${totalFastCarbsRecommended}g HC)`,
      },
      {
        emoji: '🧃',
        label: 'Jugo de fruta o Gaseosa común (NO light)',
        portionDetail: `${juiceMl} ml (aprox. ${juiceMl >= 180 ? '1 vaso lleno' : '3/4 de vaso'})`,
      },
      {
        emoji: '🍯',
        label: 'Miel o Jarabe / Glucosa líquida',
        portionDetail: `${honeySpoons} ${honeySpoons === 1 ? 'cucharada sopera' : 'cucharadas soperas'}`,
      },
    ],
  };
}

export interface IPortSiteBioProfile {
  siteName: string;
  subSiteLabel: string;
  shortZoneButtonLabel: string;
  tissueDescription: string;
  peakDelayOffsetMinutes: number; // Retraso del pico vs abdomen bajo de referencia
  preBolusOffsetMinutes: number;  // Ajuste total en tiempo de anticipación antes del 1er bocado (zona + desgaste cánula si aplica)
  zoneOnlyPreBolusMinutes: number; // Ajuste exclusivo por zona anatómica
  dayWearWearinessMinutes: number; // Retraso por días de uso de cánula (0 en pluma manual)
  effectiveDayOfWear: number;
  clinicalBadge: string;
  absorptionRateTone: 'fast' | 'normal' | 'slow' | 'mixed';
  tissueConsistency: TissueConsistencyType;
  tissueConsistencyLabel: string;
}

export const INJECTION_SITE_QUICK_OPTIONS: {
  subSite: IPortAdvanceState['subSite'];
  site: IPortAdvanceState['site'];
  shortLabel: string;
  emoji: string;
  zoneWaitOffsetText: string;
}[] = [
  {
    subSite: 'abdomen_lower_fat',
    site: 'abdomen',
    shortLabel: 'Abdomen Bajo (Grasa)',
    emoji: '🟢',
    zoneWaitOffsetText: 'Base (0 min extra)',
  },
  {
    subSite: 'abdomen_upper_lean',
    site: 'abdomen',
    shortLabel: 'Abdomen Alto (Magro)',
    emoji: '⚡',
    zoneWaitOffsetText: 'Rápida (-3 min)',
  },
  {
    subSite: 'arm_standard',
    site: 'arm',
    shortLabel: 'Brazo (Tríceps)',
    emoji: '💪',
    zoneWaitOffsetText: '+5 min espera',
  },
  {
    subSite: 'thigh_inner_soft',
    site: 'thigh',
    shortLabel: 'Muslo Interno',
    emoji: '🦵',
    zoneWaitOffsetText: '+6 min espera',
  },
  {
    subSite: 'thigh_anterior_firm',
    site: 'thigh',
    shortLabel: 'Muslo Frontal',
    emoji: '🦵',
    zoneWaitOffsetText: '+10 min espera',
  },
  {
    subSite: 'thigh_lateral_firm',
    site: 'thigh',
    shortLabel: 'Muslo Lateral',
    emoji: '🦵',
    zoneWaitOffsetText: '+10 min espera',
  },
  {
    subSite: 'glute_standard',
    site: 'glute',
    shortLabel: 'Glúteo / Cadera',
    emoji: '🍑',
    zoneWaitOffsetText: '+12 min espera',
  },
];

/**
 * Obtiene la consistencia tisular de una zona anatómica específica según la configuración del usuario.
 * Respeta la fisiología: personas con más tejido adiposo vs personas atléticas/magras con fascia cercana.
 */
export function getZoneTissueConsistency(
  site: 'abdomen' | 'thigh' | 'arm' | 'glute',
  zoneConfig?: ZoneTissueCompositionConfig,
  iPortState?: IPortAdvanceState
): TissueConsistencyType {
  if (iPortState?.tissueConsistency) {
    return iPortState.tissueConsistency;
  }
  if (zoneConfig && zoneConfig[site]) {
    return zoneConfig[site]!;
  }
  // Valores fisiológicos por defecto si no están configurados
  if (site === 'glute') return 'adipose';
  return 'neutral';
}

/**
 * Obtiene el perfil farmacocinético de la zona de aplicación para:
 * - Pluma / Lapicera manual ('manual_pen'): considera únicamente la velocidad de absorción de la zona elegida en el momento (sin desgaste de cánula).
 * - Puerto i-Port Advance ('iport'): considera la zona + el día de uso del puerto + consistencia de tejido.
 * - Bomba de Insulina ('pump'): considera la zona del set de infusión + el día de uso de la cánula de bomba + consistencia de tejido.
 */
export function getIPortPharmacokineticProfile(
  iPort?: IPortAdvanceState,
  insulinMode: 'manual_pen' | 'iport' | 'pump' = 'iport',
  pumpDayOfWear?: number,
  zoneTissueConfig?: ZoneTissueCompositionConfig
): IPortSiteBioProfile {
  const currentSite: 'abdomen' | 'thigh' | 'arm' | 'glute' = iPort?.site || 'abdomen';
  const consistency: TissueConsistencyType = getZoneTissueConsistency(
    currentSite,
    zoneTissueConfig,
    iPort
  );

  const consistencyLabel =
    consistency === 'adipose'
      ? 'Tejido Adiposo / Acolchado'
      : consistency === 'lean_athletic'
      ? 'Tejido Magro / Atlético (Fascia/Músculo)'
      : 'Tejido Subcutáneo Neutro';

  // Moduladores farmacocinéticos según consistencia tisular (Fundamento ISPAD / ADA / Frid et al.):
  // - 'adipose': mayor cojinete graso, absorción más amortiguada (+2 min pre-bolo o 0 según zona).
  // - 'lean_athletic': menor capa grasa (<5mm), alta vascularización capilar perimuscular (-3 a -4 min pre-bolo).
  // - 'neutral': estándar.
  const tissuePreBolusDelta =
    consistency === 'lean_athletic' ? -3 : consistency === 'adipose' ? 2 : 0;
  const tissuePeakDelta =
    consistency === 'lean_athletic' ? -5 : consistency === 'adipose' ? 5 : 0;

  if (!iPort) {
    return {
      siteName: 'Abdomen',
      subSiteLabel: 'Abdomen Bajo / Flanco (Grasa subcutánea)',
      shortZoneButtonLabel: 'Abdomen Bajo',
      tissueDescription: `Tejido ${consistencyLabel.toLowerCase()}, absorción predecible y uniforme.`,
      peakDelayOffsetMinutes: 0 + tissuePeakDelta,
      preBolusOffsetMinutes: Math.max(-5, 0 + tissuePreBolusDelta),
      zoneOnlyPreBolusMinutes: 0 + tissuePreBolusDelta,
      dayWearWearinessMinutes: 0,
      effectiveDayOfWear: 1,
      clinicalBadge: consistency === 'lean_athletic' ? 'Abdomen (Atlético / Rápido)' : 'Abdomen (Estándar)',
      absorptionRateTone: consistency === 'lean_athletic' ? 'fast' : 'normal',
      tissueConsistency: consistency,
      tissueConsistencyLabel: consistencyLabel,
    };
  }

  const isCannulaDevice = insulinMode === 'iport' || insulinMode === 'pump';
  const effectiveDay = isCannulaDevice
    ? insulinMode === 'pump'
      ? pumpDayOfWear || iPort.dayOfWear || 1
      : iPort.dayOfWear || 1
    : 1;

  // En puerto o bomba, los días 3 y 4+ suman resistencia tisular local en la cánula
  const dayPeakOffset = isCannulaDevice ? (effectiveDay >= 4 ? 10 : effectiveDay === 3 ? 5 : 0) : 0;
  const dayPreBolusExtra = isCannulaDevice ? (effectiveDay >= 4 ? 8 : effectiveDay === 3 ? 4 : 0) : 0;

  switch (iPort.subSite) {
    case 'abdomen_upper_lean': {
      const baseZonePreBolus = -3;
      const basePeak = -5;
      const totalPreBolus = baseZonePreBolus + (consistency === 'adipose' ? 3 : consistency === 'lean_athletic' ? -2 : 0) + dayPreBolusExtra;
      const totalPeak = basePeak + (consistency === 'adipose' ? 5 : consistency === 'lean_athletic' ? -3 : 0) + dayPeakOffset;
      const isFast = totalPreBolus <= 0;
      return {
        siteName: 'Abdomen',
        subSiteLabel: consistency === 'adipose' 
          ? 'Abdomen Alto / Centro (Con tejido adiposo)' 
          : 'Abdomen Alto / Centro (Zona Magra / Músculo)',
        shortZoneButtonLabel: 'Abdomen Alto',
        tissueDescription: consistency === 'adipose'
          ? 'Zona con buen cojinete graso. Absorción regular sin aceleración excesiva.'
          : 'Tejido magro con proximidad a fascia muscular. Absorción inicial rápida pero sensible.',
        peakDelayOffsetMinutes: totalPeak,
        preBolusOffsetMinutes: totalPreBolus,
        zoneOnlyPreBolusMinutes: baseZonePreBolus + (consistency === 'adipose' ? 3 : consistency === 'lean_athletic' ? -2 : 0),
        dayWearWearinessMinutes: dayPeakOffset,
        effectiveDayOfWear: effectiveDay,
        clinicalBadge: consistency === 'adipose' ? 'Abdomen Alto (Acolchado)' : 'Abdomen Magro / Fascia',
        absorptionRateTone: isFast ? 'fast' : 'normal',
        tissueConsistency: consistency,
        tissueConsistencyLabel: consistencyLabel,
      };
    }

    case 'thigh_inner_soft': {
      const baseZonePreBolus = 6;
      const basePeak = 15;
      const totalPreBolus = baseZonePreBolus + tissuePreBolusDelta + dayPreBolusExtra;
      const totalPeak = basePeak + tissuePeakDelta + dayPeakOffset;
      return {
        siteName: 'Muslo / Pierna',
        subSiteLabel: 'Cara Interna del Muslo (Blanda / Adiposa)',
        shortZoneButtonLabel: 'Muslo Interno',
        tissueDescription: 'Zona blanda con buen cojinete adiposo. Absorción más regular que en cuádriceps.',
        peakDelayOffsetMinutes: totalPeak,
        preBolusOffsetMinutes: totalPreBolus,
        zoneOnlyPreBolusMinutes: baseZonePreBolus + tissuePreBolusDelta,
        dayWearWearinessMinutes: dayPeakOffset,
        effectiveDayOfWear: effectiveDay,
        clinicalBadge: 'Muslo Interno (Moderada)',
        absorptionRateTone: 'normal',
        tissueConsistency: consistency,
        tissueConsistencyLabel: consistencyLabel,
      };
    }

    case 'thigh_anterior_firm': {
      // Si la persona tiene muslos magros / atléticos (ej. futbolista/corredor/ciclista), la irrigación en cuádriceps acelera la absorción respecto al muslo graso
      const athleticThighAdjustment = consistency === 'lean_athletic' ? -4 : consistency === 'adipose' ? 2 : 0;
      const baseZonePreBolus = 10 + athleticThighAdjustment;
      const basePeak = 25 + (consistency === 'lean_athletic' ? -8 : 0);
      const totalPreBolus = baseZonePreBolus + dayPreBolusExtra;
      const totalPeak = basePeak + dayPeakOffset;
      return {
        siteName: 'Muslo / Pierna',
        subSiteLabel: consistency === 'lean_athletic'
          ? 'Cara Delantera del Muslo (Cuádriceps Atlético / Muscular)'
          : 'Cara Delantera del Muslo (Cuádriceps Firme)',
        shortZoneButtonLabel: 'Muslo Frontal',
        tissueDescription: consistency === 'lean_athletic'
          ? 'Cuádriceps desarrollado y magro. Alta densidad capilar; absorción más activa especialmente con movimiento.'
          : 'Frente del muslo sobre músculo cuádriceps. Absorción lenta en reposo; se acelera si caminas.',
        peakDelayOffsetMinutes: totalPeak,
        preBolusOffsetMinutes: totalPreBolus,
        zoneOnlyPreBolusMinutes: baseZonePreBolus,
        dayWearWearinessMinutes: dayPeakOffset,
        effectiveDayOfWear: effectiveDay,
        clinicalBadge: consistency === 'lean_athletic' ? 'Muslo Frontal (Atlético)' : 'Muslo Frontal (Lenta / Dinámica)',
        absorptionRateTone: consistency === 'lean_athletic' ? 'normal' : 'slow',
        tissueConsistency: consistency,
        tissueConsistencyLabel: consistencyLabel,
      };
    }

    case 'thigh_lateral_firm': {
      const athleticThighAdjustment = consistency === 'lean_athletic' ? -3 : 0;
      const baseZonePreBolus = 10 + athleticThighAdjustment;
      const basePeak = 25 + (consistency === 'lean_athletic' ? -5 : 0);
      const totalPreBolus = baseZonePreBolus + dayPreBolusExtra;
      const totalPeak = basePeak + dayPeakOffset;
      return {
        siteName: 'Muslo / Pierna',
        subSiteLabel: 'Costado Lateral del Muslo (Fascia Lata Firme)',
        shortZoneButtonLabel: 'Muslo Lateral',
        tissueDescription: 'Cara externa del muslo, tejido firme. Absorción lenta y sostenida.',
        peakDelayOffsetMinutes: totalPeak,
        preBolusOffsetMinutes: totalPreBolus,
        zoneOnlyPreBolusMinutes: baseZonePreBolus,
        dayWearWearinessMinutes: dayPeakOffset,
        effectiveDayOfWear: effectiveDay,
        clinicalBadge: 'Muslo Lateral (Lenta)',
        absorptionRateTone: 'slow',
        tissueConsistency: consistency,
        tissueConsistencyLabel: consistencyLabel,
      };
    }

    case 'arm_standard': {
      const athleticArmAdjustment = consistency === 'lean_athletic' ? -2 : consistency === 'adipose' ? 1 : 0;
      const baseZonePreBolus = 5 + athleticArmAdjustment;
      const basePeak = 10 + (consistency === 'lean_athletic' ? -3 : 0);
      const totalPreBolus = baseZonePreBolus + dayPreBolusExtra;
      const totalPeak = basePeak + dayPeakOffset;
      return {
        siteName: 'Brazo',
        subSiteLabel: consistency === 'lean_athletic'
          ? 'Brazo (Tríceps Magro / Definido)'
          : 'Brazo (Tríceps / Cara Posterior)',
        shortZoneButtonLabel: 'Brazo (Tríceps)',
        tissueDescription: consistency === 'lean_athletic'
          ? 'Brazo con bajo porcentaje graso. Absorción rápida-intermedia.'
          : 'Velocidad intermedia entre abdomen y pierna.',
        peakDelayOffsetMinutes: totalPeak,
        preBolusOffsetMinutes: totalPreBolus,
        zoneOnlyPreBolusMinutes: baseZonePreBolus,
        dayWearWearinessMinutes: dayPeakOffset,
        effectiveDayOfWear: effectiveDay,
        clinicalBadge: consistency === 'lean_athletic' ? 'Brazo Magro (Ágil)' : 'Brazo (Intermedia)',
        absorptionRateTone: 'normal',
        tissueConsistency: consistency,
        tissueConsistencyLabel: consistencyLabel,
      };
    }

    case 'glute_standard': {
      const baseZonePreBolus = 12 + (consistency === 'lean_athletic' ? -3 : 0);
      const basePeak = 30 + (consistency === 'lean_athletic' ? -5 : 0);
      const totalPreBolus = baseZonePreBolus + dayPreBolusExtra;
      const totalPeak = basePeak + dayPeakOffset;
      return {
        siteName: 'Glúteo',
        subSiteLabel: 'Cuadrante Superior Externo',
        shortZoneButtonLabel: 'Glúteo / Cadera',
        tissueDescription: 'Tejido adiposo profundo, absorción lenta y plana.',
        peakDelayOffsetMinutes: totalPeak,
        preBolusOffsetMinutes: totalPreBolus,
        zoneOnlyPreBolusMinutes: baseZonePreBolus,
        dayWearWearinessMinutes: dayPeakOffset,
        effectiveDayOfWear: effectiveDay,
        clinicalBadge: 'Glúteo (Muy Lenta)',
        absorptionRateTone: 'slow',
        tissueConsistency: consistency,
        tissueConsistencyLabel: consistencyLabel,
      };
    }

    case 'abdomen_lower_fat':
    default: {
      const baseZonePreBolus = 0 + (consistency === 'lean_athletic' ? -2 : 0);
      const basePeak = 0 + (consistency === 'lean_athletic' ? -4 : 0);
      const totalPreBolus = baseZonePreBolus + dayPreBolusExtra;
      const totalPeak = basePeak + dayPeakOffset;
      return {
        siteName: 'Abdomen',
        subSiteLabel: consistency === 'lean_athletic'
          ? 'Abdomen Bajo / Flanco (Magro / Definido)'
          : 'Abdomen Bajo / Flanco (Grasa subcutánea)',
        shortZoneButtonLabel: 'Abdomen Bajo',
        tissueDescription: consistency === 'lean_athletic'
          ? 'Abdomen con grasa mínima. Absorción rápida y uniforme.'
          : 'Tejido adiposo óptimo, absorción predecible y uniforme.',
        peakDelayOffsetMinutes: totalPeak,
        preBolusOffsetMinutes: totalPreBolus,
        zoneOnlyPreBolusMinutes: baseZonePreBolus,
        dayWearWearinessMinutes: dayPeakOffset,
        effectiveDayOfWear: effectiveDay,
        clinicalBadge:
          isCannulaDevice && effectiveDay >= 4
            ? `Abdomen Bajo (Día ${effectiveDay} - Cánula Madura)`
            : consistency === 'lean_athletic'
            ? 'Abdomen (Atlético / Rápido)'
            : 'Abdomen Bajo (Estándar Óptimo)',
        absorptionRateTone: consistency === 'lean_athletic' ? 'fast' : 'normal',
        tissueConsistency: consistency,
        tissueConsistencyLabel: consistencyLabel,
      };
    }
  }
}

/**
 * Calculates current Active Insulin (IOB - Insulin On Board)
 * using the validated OpenAPS / Nightscout (oref0) bi-exponential algorithm for Novorapid.
 */
export function calculateIOB(
  bolusRecords: BolusRecord[],
  diaHours: number = 4.0,
  nowMs: number = Date.now()
): {
  totalIOB: number;
  currentActivityUnitsPerHour?: number;
  breakdown: {
    record: BolusRecord;
    remaining: number;
    elapsedHours: number;
    elapsedMinutes?: number;
    decayFraction?: number;
    activityUnitsPerHour?: number;
  }[];
} {
  const result = calculateOpenApsIOB(bolusRecords, diaHours, nowMs, NOVORAPID_PEAK_MINUTES);
  return {
    totalIOB: result.totalIOB,
    currentActivityUnitsPerHour: result.currentActivityUnitsPerHour,
    breakdown: result.breakdown.map(b => ({
      record: b.record,
      remaining: b.remaining,
      elapsedHours: b.elapsedHours,
      elapsedMinutes: b.elapsedMinutes,
      decayFraction: b.decayFraction,
      activityUnitsPerHour: b.activityUnitsPerHour,
    })),
  };
}

/**
 * Generates data points for an IOB decay graph over the next 4 hours
 * using the OpenAPS biexponential engine.
 */
export function generateIOBChartData(
  bolusRecords: BolusRecord[],
  diaHours: number = 4.0,
  nowMs: number = Date.now()
) {
  return generateOpenApsChartData(bolusRecords, diaHours, nowMs, NOVORAPID_PEAK_MINUTES);
}

/**
 * Calculates Carbohydrate Bolus
 */
export function calculateCarbBolus(carbsGrams: number, icr: number): number {
  if (!icr || icr <= 0 || !carbsGrams || carbsGrams <= 0) return 0;
  return carbsGrams / icr;
}

/**
 * Calculates Correction Bolus based on blood glucose and target
 */
export function calculateCorrectionBolus(
  currentGlucose: number,
  targetGlucose: number,
  isf: number
): number {
  if (!isf || isf <= 0 || !currentGlucose) return 0;
  const diff = currentGlucose - targetGlucose;
  return diff / isf;
}

/**
 * Rounds a dose to the pen step (0.5 U, 1.0 U, or 0.1 U)
 */
export function roundDose(dose: number, step: 0.5 | 1.0 | 0.1 = 0.5): number {
  if (dose <= 0) return 0;
  return Math.round(dose / step) * step;
}

export interface ProjectedGlucoseCalculation {
  currentGlucose: number;
  targetGlucose: number;
  iobUnits: number;
  isf: number;
  icr: number;
  carbsGrams: number;
  carbBolusUnits: number;
  trendArrow?: GlucoseTrend;
  trendGlucoseOffset: number;
  trendAdjustedGlucose: number;
  rawCorrectionUnits: number;
  // Descenso esperado en mg/dL por la insulina activa (IOB * ISF)
  iobGlucoseDrop: number;
  // A cuánto le puede bajar la glucosa con la insulina activa si no comiera nada
  projectedGlucoseWithoutFood: number;
  // Corrección bruta hacia el objetivo considerando la flecha del sensor
  grossCorrectionUnits: number;
  // Insulina activa sobrante tras corregir la glucosa actual hacia 100 mg/dL
  surplusIobAfterCorrection: number;
  // Gramos de carbohidratos cubiertos por el IOB residual
  carbsCoveredBySurplusIob: number;
  // Dosis neta calculada exactamente: carbBolus + grossCorrectionUnits - IOB
  netBolusRaw: number;
  // Dosis sugerida redondeada (mínimo 0 U)
  suggestedDose: number;
  // Si el IOB supera la comida y corrección
  isIobExcess: boolean;
  excessIobUnits: number;
  // Carbohidratos extra de rescate para no descender de 100 mg/dL si IOB sobra
  rescueCarbsNeededGrams: number;
  // Glucosa proyectada postprandial al absorberse la dosis y comida
  projectedFinalGlucose: number;
  clinicalExplanation: string;
}

/**
 * Realiza el cálculo fisiológico de proyección de glucosa con insulina activa (IOB)
 * y flecha de tendencia del sensor (FreeStyle Libre 2).
 * 
 * Reglas clínicas cardinales:
 * 1. Si el usuario activa "Restar Insulina Activa (IOB)", se descuenta el 100% de la insulina activa (IOB).
 * 2. Si la glucosa desciende (flecha ↘️ o ⬇️), se ajusta la proyección y se reduce la dosis para evitar hipoglucemias severas.
 * 3. Si el IOB activo cubre o supera los carbohidratos de la comida, la dosis sugerida DEBE ser 0 U.
 */
export function calculateProjectedGlucoseAndNetBolus(params: {
  currentGlucose: number;
  targetGlucose: number;
  iobUnits: number;
  isf: number;
  icr: number;
  carbsGrams: number;
  trendArrow?: GlucoseTrend;
  cobGrams?: number;
  roundStep?: 0.5 | 1.0 | 0.1;
  deductIob?: boolean;
}): ProjectedGlucoseCalculation {
  const {
    currentGlucose,
    targetGlucose,
    iobUnits,
    isf,
    icr,
    carbsGrams,
    trendArrow = 'flat',
    cobGrams = 0,
    roundStep = 0.5,
    deductIob = true,
  } = params;

  // Modulación por flecha de tendencia continua (Guía clínica Aleppo / Endocrine Society CGM):
  let trendGlucoseOffset = 0;
  if (trendArrow === 'falling_fast') {
    trendGlucoseOffset = -50;
  } else if (trendArrow === 'falling') {
    trendGlucoseOffset = -25;
  } else if (trendArrow === 'rising') {
    trendGlucoseOffset = +25;
  } else if (trendArrow === 'rising_fast') {
    trendGlucoseOffset = +50;
  }

  const trendAdjustedGlucose = Math.max(20, Math.round((currentGlucose + trendGlucoseOffset) * 10) / 10);
  const carbBolusUnits = calculateCarbBolus(carbsGrams, icr);
  const rawCorrectionUnits = calculateCorrectionBolus(currentGlucose, targetGlucose, isf);
  const grossCorrectionUnits = calculateCorrectionBolus(trendAdjustedGlucose, targetGlucose, isf);

  // Insulina activa a descontar:
  // Cuando deductIob es true, se descuenta directamente el IOB real circulante del usuario.
  const iobToDeduct = deductIob ? Math.max(0, iobUnits) : 0;
  
  // Descenso real en mg/dL que producirá la insulina activa en sangre:
  const iobGlucoseDrop = Math.round(iobUnits * isf * 10) / 10;
  const projectedGlucoseWithoutFood = Math.round((currentGlucose - iobGlucoseDrop) * 10) / 10;

  // Dosis neta exacta requerida para llegar a targetGlucose (100 mg/dL):
  // Dosis neta = Bolus_HC + Corrección_Glucosa (con tendencia) - IOB_Descontado
  const netBolusRaw = carbBolusUnits + grossCorrectionUnits - iobToDeduct;
  const suggestedDose = netBolusRaw > 0 ? roundDose(netBolusRaw, roundStep) : 0;

  // Análisis de cobertura de IOB sobre la comida:
  // Si grossCorrectionUnits es positivo, parte del IOB corrige la glucemia.
  // Si es negativo (glucosa baja o flecha cayendo), todo el IOB + el déficit amortizan los HC.
  const iobUsedForCorrection = Math.max(0, grossCorrectionUnits);
  const surplusIobAfterCorrection = Math.max(0, Math.round((iobToDeduct - iobUsedForCorrection) * 100) / 100);
  const carbsCoveredBySurplusIob = Math.round(surplusIobAfterCorrection * icr * 10) / 10;

  const isIobExcess = netBolusRaw <= 0;
  const excessIobUnits = isIobExcess ? Math.round(Math.abs(netBolusRaw) * 100) / 100 : 0;
  const rescueCarbsNeededGrams = isIobExcess && (trendAdjustedGlucose < 85 || trendArrow === 'falling' || trendArrow === 'falling_fast') && excessIobUnits > 0.5
    ? Math.round(excessIobUnits * icr * 10) / 10
    : 0;

  // Proyección final de glucosa postprandial
  let projectedFinalGlucose = targetGlucose;
  if (isIobExcess) {
    projectedFinalGlucose = Math.round((targetGlucose - excessIobUnits * isf) * 10) / 10;
  } else if (suggestedDose !== netBolusRaw) {
    const roundingDiff = suggestedDose - netBolusRaw;
    projectedFinalGlucose = Math.round((targetGlucose - roundingDiff * isf) * 10) / 10;
  }

  let clinicalExplanation = '';
  if (iobToDeduct > 0) {
    if (isIobExcess) {
      clinicalExplanation = `🛡️ ALERTA DE HIPOGLUCEMIA EVITADA: Tu insulina activa (${iobUnits.toFixed(2)} U) descendería tu glucosa en -${iobGlucoseDrop} mg/dL (proyectando ${projectedGlucoseWithoutFood} mg/dL sin comida). Los ${carbsGrams.toFixed(1)}g HC (${carbBolusUnits.toFixed(2)} U) son menores que tu IOB + corrección: sobran ${excessIobUnits.toFixed(2)} U activas. Dosis recomendada: 0 U.`;
    } else {
      clinicalExplanation = `Tu insulina activa (${iobUnits.toFixed(2)} U) reducirá tu glucosa en -${iobGlucoseDrop} mg/dL (hasta ${projectedGlucoseWithoutFood} mg/dL sin comida). Quedan ${surplusIobAfterCorrection.toFixed(2)} U activas que amortizan ${carbsCoveredBySurplusIob}g de HC de esta comida. Por ello, la dosis se reduce a ${suggestedDose} U para terminar en ${targetGlucose} mg/dL.`;
    }
  } else {
    clinicalExplanation = `Sin deducción de IOB. Dosis requerida de ${suggestedDose} U (${carbBolusUnits.toFixed(2)} U por comida + ${grossCorrectionUnits >= 0 ? '+' : ''}${grossCorrectionUnits.toFixed(2)} U de corrección).`;
  }

  return {
    currentGlucose,
    targetGlucose,
    iobUnits: iobToDeduct,
    isf,
    icr,
    carbsGrams,
    carbBolusUnits: Math.round(carbBolusUnits * 100) / 100,
    trendArrow,
    trendGlucoseOffset,
    trendAdjustedGlucose,
    rawCorrectionUnits: Math.round(rawCorrectionUnits * 100) / 100,
    iobGlucoseDrop,
    projectedGlucoseWithoutFood,
    grossCorrectionUnits: Math.round(grossCorrectionUnits * 100) / 100,
    surplusIobAfterCorrection,
    carbsCoveredBySurplusIob,
    netBolusRaw: Math.round(netBolusRaw * 100) / 100,
    suggestedDose,
    isIobExcess,
    excessIobUnits,
    rescueCarbsNeededGrams,
    projectedFinalGlucose,
    clinicalExplanation,
  };
}

export interface PreBolusTimingAdvice {
  trend: GlucoseTrend;
  trendSymbol: string;
  trendLabel: string;
  timingMinutesText: string;
  injectionTimingType: 'post_meal' | 'immediate' | 'pre_short' | 'pre_standard' | 'pre_extended';
  suggestedWaitMinutes?: number;
  clinicalAdvice: string;
  trendCorrectionUnits: number;
  alertTone: 'rose' | 'amber' | 'emerald' | 'cyan';
  sequencingMode?: EatingSequencingMode;
  sequencingLabel?: string;
  sequencingAdvice?: string;
  iPortNote?: string;
  iPortProfile?: IPortSiteBioProfile;
}

/**
 * Obtiene los minutos recomendados de espera para la 1ª dosis cuando es diferida / post-prandial
 */
export function getFirstDoseWaitMinutes(
  glucose: number,
  trend?: GlucoseTrend,
  sequencing?: EatingSequencingMode,
  timingText?: string
): number {
  if (timingText) {
    if (timingText.includes('20-30') || timingText.includes('20 a 30')) return 25;
    if (timingText.includes('15-20') || timingText.includes('15 a 20')) return 20;
    if (timingText.includes('10-15') || timingText.includes('10 a 15')) return 15;
    const match = timingText.match(/(\d+)\s*(?:a\s*\d+\s*)?min/i);
    if (match && parseInt(match[1], 10) > 0) return parseInt(match[1], 10);
  }
  if (glucose < 70 || trend === 'falling_fast') return 25;
  if (glucose < 85 || trend === 'falling') return 20;
  return 0;
}

/**
 * Helper to format fractional delay hours into clear human text:
 * 0.75 -> "45 min"
 * 1.0  -> "1 h 00 min"
 * 1.25 -> "1 h 15 min"
 * 1.5  -> "1 h 30 min"
 * 2.0  -> "2 h 00 min"
 * 2.5  -> "2 h 30 min"
 */
export function formatDelayHoursToText(hours: number): string {
  const totalMins = Math.round(hours * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h 00 min`;
  return `${h} h ${m.toString().padStart(2, '0')} min`;
}

/**
 * Calculates physiological Pre-Bolus Timing based on FreeStyle Libre 2 Plus sensor trend arrows,
 * current glucose, and the specific eating sequence / food combination mode:
 * 1. veggies_first: Eating fiber/vegetables/protein/fat first and carbs last (e.g. salad before pizza).
 *    Delays starch entrance by 30-50 min. Pre-bolusing 20m before causes severe hypoglycemia!
 * 2. mixed: Combined/spread together (e.g. peanut butter spread on toast, creamy sauce on pasta).
 *    Fat wraps starch and dampens initial spike. Inject with 1st bite or mid-meal.
 * 3. standard: Carbs direct or simultaneous.
 */
function calculateRawPreBolusTimingAdvice(
  glucose: number,
  trend: GlucoseTrend = 'flat',
  targetGlucose: number = 100,
  sequencing: EatingSequencingMode = 'standard',
  fatGrams: number = 0,
  fiberGrams: number = 0
): PreBolusTimingAdvice {
  const bg = glucose || targetGlucose;

  // 0. REGLA CLÍNICA CARDINAL: Glucemia baja o hipoglucemia franca (< 85 mg/dL, y especialmente < 70 mg/dL)
  // En diabetes tipo 1, inyectarse antes o en el 1er bocado cuando la glucosa está en 69 mg/dL es un grave error que induce hipoglucemia severa.
  // La dosis DEBE ser post-prandial diferida (20 a 30 min después de empezar a comer) para permitir que los primeros carbohidratos levanten la glucosa de forma segura sin disparar un rebote.
  if (bg < 70 || (bg < 85 && (trend === 'falling' || trend === 'falling_fast'))) {
    return {
      trend,
      trendSymbol: trend === 'falling_fast' ? '⬇️' : trend === 'falling' ? '↘️' : '➡️',
      trendLabel: `Hipoglucemia / Glucosa baja (${bg} mg/dL)`,
      timingMinutesText: 'A los 20-30 min de empezar a comer (Post-prandial diferido)',
      injectionTimingType: 'post_meal',
      suggestedWaitMinutes: 25,
      clinicalAdvice: `¡ALERTA DE SEGURIDAD! Tu glucemia está en ${bg} mg/dL (hipoglucemia/baja). NO te inyectes antes de comer ni en el primer bocado. Come primero tu plato y aplica la 1ª dosis entre 20 y 30 minutos DESPUÉS de haber empezado a comer, comprobando en tu FreeStyle Libre que la glucosa haya remontado a >85-90 mg/dL. Esto evita que caigas en una hipo severa y frena a tiempo el pico para no dispararte a >200 mg/dL.`,
      trendCorrectionUnits: trend === 'falling_fast' ? -1.0 : -0.5,
      alertTone: 'rose',
      sequencingMode: sequencing,
      sequencingLabel: sequencing === 'veggies_first' ? '🥗 Fibra primero, HC al final' : sequencing === 'mixed' ? '🥜 Mezclados / Untados a la vez' : '🥖 Carbohidratos directos',
      sequencingAdvice: 'Glucemia baja inicial: inyección diferida a los 20-30 min post-ingesta.',
    };
  }

  if (bg >= 70 && bg < 85) {
    return {
      trend,
      trendSymbol: trend === 'falling' ? '↘️' : '➡️',
      trendLabel: `Glucosa cercana al límite bajo (${bg} mg/dL)`,
      timingMinutesText: 'A los 15-20 min de empezar a comer (Post-prandial diferido)',
      injectionTimingType: 'post_meal',
      suggestedWaitMinutes: 20,
      clinicalAdvice: `Glucemia en ${bg} mg/dL (cercana al límite inferior de 80 mg/dL). No te inyectes antes de comer. Come primero y aplica la 1ª dosis entre 15 y 20 minutos después de empezar, confirmando en el sensor que la glucemia esté estable o subiendo.`,
      trendCorrectionUnits: 0,
      alertTone: 'amber',
      sequencingMode: sequencing,
      sequencingLabel: sequencing === 'veggies_first' ? '🥗 Fibra primero, HC al final' : sequencing === 'mixed' ? '🥜 Mezclados / Untados a la vez' : '🥖 Carbohidratos directos',
      sequencingAdvice: 'Glucemia en zona límite: retrasar la aplicación a mitad de la comida o 15-20 min post-prandial.',
    };
  }

  // 1. SECUENCIA NUTRICIONAL: Fibra / Ensalada / Proteína / Grasa PRIMERO, y Carbohidratos al final
  // Ej: Comer ensalada abundante antes de la pizza o verduras antes del arroz.
  if (sequencing === 'veggies_first') {
    if (bg > 160 || trend === 'rising_fast') {
      return {
        trend,
        trendSymbol: trend === 'rising_fast' ? '⬆️' : '↗️',
        trendLabel: 'Glucosa alta + Fibra primero',
        timingMinutesText: 'Al empezar la ensalada / entrada (0 min)',
        injectionTimingType: 'immediate',
        clinicalAdvice: `Glucemia previa elevada (${bg} mg/dL). Inyectarte al dar el primer bocado a la ensalada permite que la corrección baje tu glucosa, mientras que la fibra de la entrada amortigua el impacto de los carbohidratos que comerás después.`,
        trendCorrectionUnits: trend === 'rising_fast' ? 1.0 : 0.5,
        alertTone: 'amber',
        sequencingMode: 'veggies_first',
        sequencingLabel: '🥗 Fibra primero, HC al final',
        sequencingAdvice: 'La corrección actúa durante la ensalada y frena el pico tardío de los carbohidratos.',
      };
    }
    return {
      trend,
      trendSymbol: trend === 'rising' ? '↗️' : '➡️',
      trendLabel: 'Secuencia Fisiológica (Fibra antes de HC)',
      timingMinutesText: 'A mitad de comida o al dar el 1er bocado al carbohidrato (pizza/arroz)',
      injectionTimingType: 'immediate',
      clinicalAdvice: `¡Secuenciación Nutricional Inteligente! Como comes la ensalada/fibra primero, los carbohidratos no se absorberán hasta pasados 30-40 minutos. Si te inyectas 20 min antes de la ensalada, la Novorapid hará pico en sangre mientras solo comes verduras. Inyéctate recién al pasar al plato con carbohidratos.`,
      trendCorrectionUnits: trend === 'rising' ? 0.5 : 0,
      alertTone: 'emerald',
      sequencingMode: 'veggies_first',
      sequencingLabel: '🥗 Fibra primero, HC al final',
      sequencingAdvice: 'Evita pre-bolo temprano. Sincroniza la Novorapid con el plato principal de carbohidratos.',
    };
  }

  // 2. ALIMENTOS MEZCLADOS / UNTADOS A LA VEZ (ej. Pan con pasta de maní, salsa con fideos)
  if (sequencing === 'mixed') {
    if (bg > 150 || trend === 'rising_fast') {
      return {
        trend,
        trendSymbol: trend === 'rising_fast' ? '⬆️' : '↗️',
        trendLabel: 'Glucosa alta + Alimentos mezclados',
        timingMinutesText: '10 a 15 minutos antes de comer',
        injectionTimingType: 'pre_short',
        clinicalAdvice: `Glucemia previa en ${bg} mg/dL. Aplica con 10-15 min de margen para corregir el nivel alto; los lípidos de la mezcla impedirán que el carbohidrato provoque un pico abrupto posterior.`,
        trendCorrectionUnits: trend === 'rising_fast' ? 1.0 : 0.5,
        alertTone: 'amber',
        sequencingMode: 'mixed',
        sequencingLabel: '🥜 Mezclados / Untados a la vez',
        sequencingAdvice: 'Pre-bolo acotado para corregir glucosa alta sin sobrelapar con la digestión lenta.',
      };
    }
    return {
      trend,
      trendSymbol: trend === 'rising' ? '↗️' : '➡️',
      trendLabel: 'Alimento Combinado / Untado con Grasa',
      timingMinutesText: 'Justo con el 1er bocado (0 min) o primeros 5 min',
      injectionTimingType: 'immediate',
      clinicalAdvice: `Alimento untado o mezclado (ej. pan con pasta de maní). Los lípidos ralentizan el vaciado gástrico de los carbohidratos para que se liberen de a poco. Inyéctate al dar el primer bocado; NO te inyectes 20 min antes porque la Novorapid actuaría antes de que comience la absorción.`,
      trendCorrectionUnits: trend === 'rising' ? 0.5 : 0,
      alertTone: 'emerald',
      sequencingMode: 'mixed',
      sequencingLabel: '🥜 Mezclados / Untados a la vez',
      sequencingAdvice: 'Inyección sincrónica con el primer bocado para evitar hipoglucemia temprana.',
    };
  }

  // 3. ESTÁNDAR / CONSUMO DIRECTO O SIMULTÁNEO
  switch (trend) {
    case 'falling_fast': // ⬇️
      return {
        trend,
        trendSymbol: '⬇️',
        trendLabel: 'Bajando rápidamente (> 2 mg/dL/min)',
        timingMinutesText: 'A los 20-30 min de empezar a comer (Post-prandial diferido)',
        injectionTimingType: 'post_meal',
        clinicalAdvice: '¡ALERTA DE HIPOGLUCEMIA! Tu glucosa desciende a gran velocidad. NUNCA te inyectes antes de comer. Espera a ingerir carbohidratos y confirma en tu FreeStyle Libre que la flecha se enderece o comience a subir antes de aplicar la Novorapid.',
        trendCorrectionUnits: -1.0,
        alertTone: 'rose',
        sequencingMode: 'standard',
        sequencingLabel: '🥖 Carbohidratos directos',
      };

    case 'falling': // ↘️
      return {
        trend,
        trendSymbol: '↘️',
        trendLabel: 'Bajando lentamente (1 a 2 mg/dL/min)',
        timingMinutesText: 'A los 10-15 min de terminar de comer (Post-prandial)',
        injectionTimingType: 'post_meal',
        clinicalAdvice: 'Tendencia en descenso. No te inyectes antes de comer. Come primero y aplica la dosis 10-15 minutos después de terminar, confirmando que la flecha se estabilice.',
        trendCorrectionUnits: -0.5,
        alertTone: 'amber',
        sequencingMode: 'standard',
        sequencingLabel: '🥖 Carbohidratos directos',
      };

    case 'rising': // ↗️
      return {
        trend,
        trendSymbol: '↗️',
        trendLabel: 'Subiendo lentamente (1 a 2 mg/dL/min)',
        timingMinutesText: '15 a 20 minutos antes de comer',
        injectionTimingType: 'pre_short',
        clinicalAdvice: 'La glucosa ya tiene inercia ascendente. Aplicar el bolo con 15-20 min de anticipación frena la subida antes de que los carbohidratos provoquen un pico superior a 160-180 mg/dL.',
        trendCorrectionUnits: 0.5,
        alertTone: 'amber',
        sequencingMode: 'standard',
        sequencingLabel: '🥖 Carbohidratos directos',
      };

    case 'rising_fast': // ⬆️
      return {
        trend,
        trendSymbol: '⬆️',
        trendLabel: 'Subiendo rápidamente (> 2 mg/dL/min)',
        timingMinutesText: '20 a 25 minutos antes de comer',
        injectionTimingType: 'pre_extended',
        clinicalAdvice: 'Fuerte inercia ascendente. Administra la dosis con 20-25 min de anticipación para que la Novorapid comience su curva activa y espera a notar que la flecha se desvíe hacia la horizontal antes de ingerir carbohidratos rápidos.',
        trendCorrectionUnits: 1.0,
        alertTone: 'rose',
        sequencingMode: 'standard',
        sequencingLabel: '🥖 Carbohidratos directos',
      };

    case 'flat': // ➡️
    default:
      return {
        trend: 'flat',
        trendSymbol: '➡️',
        trendLabel: 'Estable (en rango)',
        timingMinutesText: '10 a 15 minutos antes de comer',
        injectionTimingType: 'pre_standard',
        clinicalAdvice: `Glucemia óptima (${bg} mg/dL) y flecha horizontal. El intervalo estándar de 10-15 min de Novorapid hace coincidir el pico de insulina con el vaciamiento gástrico.`,
        trendCorrectionUnits: 0,
        alertTone: 'emerald',
        sequencingMode: 'standard',
        sequencingLabel: '🥖 Carbohidratos directos',
      };
  }
}

export function getPreBolusTimingAdvice(
  glucose: number,
  trend: GlucoseTrend = 'flat',
  targetGlucose: number = 100,
  sequencing: EatingSequencingMode = 'standard',
  fatGrams: number = 0,
  fiberGrams: number = 0,
  iPort?: IPortAdvanceState,
  workout?: DailyWorkoutState,
  insulinMode: 'manual_pen' | 'iport' | 'pump' = 'iport',
  pumpDayOfWear?: number,
  zoneTissueConfig?: ZoneTissueCompositionConfig
): PreBolusTimingAdvice {
  const bg = glucose || targetGlucose;
  const iPortProfile = iPort
    ? getIPortPharmacokineticProfile(iPort, insulinMode, pumpDayOfWear, zoneTissueConfig)
    : undefined;
  const rawAdvice = calculateRawPreBolusTimingAdvice(bg, trend, targetGlucose, sequencing, fatGrams, fiberGrams);

  if (!iPortProfile || !iPort) {
    return rawAdvice;
  }

  const methodLabel =
    insulinMode === 'manual_pen'
      ? `Pinchazo manual en ${iPortProfile.siteName} (${iPortProfile.subSiteLabel})`
      : insulinMode === 'pump'
      ? `Set de Bomba en ${iPortProfile.siteName} (${iPortProfile.subSiteLabel}, Día ${iPortProfile.effectiveDayOfWear})`
      : `Puerto i-Port en ${iPortProfile.siteName} (${iPortProfile.subSiteLabel}, Día ${iPortProfile.effectiveDayOfWear})`;

  // Si la recomendación era inyección diferida (post-meal) por hipoglucemia o glucosa límite, respetamos la seguridad cardinal
  if (rawAdvice.injectionTimingType === 'post_meal') {
    return {
      ...rawAdvice,
      iPortProfile,
      iPortNote: `${methodLabel}: Por seguridad ante glucemia baja, se mantiene la indicación de comer primero y aplicar después.`,
    };
  }

  // Modulación del timing de pre-bolo según la farmacocinética del sitio de aplicación (y día de cánula si usa puerto o bomba)
  let offset = iPortProfile.preBolusOffsetMinutes;
  let timingText = rawAdvice.timingMinutesText;
  let clinicalAddon = '';

  // Interacción Biomecánica: Aplicación en Pierna/Muslo + Caminata o Ejercicio de Piernas
  const isThighSite = iPort.site === 'thigh';
  const hasCustomLegOrWalkDone = Boolean(
    workout?.customRoutineItems?.some(
      (item) =>
        item.doneStatus === true &&
        (item.isLowerBody ||
          item.sportId === 'walking' ||
          item.sportId === 'running' ||
          item.sportId === 'cycling' ||
          item.muscleGroup === 'legs')
    )
  );
  const isLegOrWalkActivity = Boolean(
    workout &&
      (workout.walkDone === true ||
        workout.routineType === 'legs' ||
        workout.weekendActivity === 'walk' ||
        workout.weekendActivity === 'bike' ||
        hasCustomLegOrWalkDone)
  );

  if (isThighSite && isLegOrWalkActivity) {
    // La hiperemia por contracción del cuádriceps/isquiotibiales acelera la absorción en el muslo (~5-10 min más rápido)
    offset = Math.max(0, offset - 5);
    clinicalAddon += ` 🏃 Circulación activa en piernas: Al inyectar en el muslo habiendo entrenado pierna o caminado, el mayor flujo sanguíneo acelera la absorción (-5 min de espera).`;
  }

  if (offset > 0) {
    // Zona con absorción más lenta (ej. brazo +5m, muslo +6/+10m, glúteo +12m, o cánula en día 3/4)
    const cannulaExtraNote =
      insulinMode !== 'manual_pen' && iPortProfile.dayWearWearinessMinutes > 0
        ? ` (incluye demora por Día ${iPortProfile.effectiveDayOfWear} de la cánula)`
        : '';
    clinicalAddon = ` 📍 Ajuste por ${methodLabel}: En esta zona la insulina tarda +${offset} min extra en empezar a actuar${cannulaExtraNote}. Te sumamos esos minutos de espera antes del primer bocado para que la insulina llegue a tiempo.${clinicalAddon}`;
    if (rawAdvice.injectionTimingType === 'pre_standard') {
      const minStart = 10 + offset;
      const minEnd = 15 + offset;
      timingText = `${minStart} a ${minEnd} minutos antes de comer`;
    } else if (rawAdvice.injectionTimingType === 'pre_short') {
      const minStart = 15 + offset;
      const minEnd = 20 + offset;
      timingText = `${minStart} a ${minEnd} minutos antes de comer`;
    } else if (rawAdvice.injectionTimingType === 'pre_extended') {
      const minStart = 20 + offset;
      const minEnd = 25 + offset;
      timingText = `${minStart} a ${minEnd} minutos antes de comer`;
    } else if (rawAdvice.injectionTimingType === 'immediate') {
      timingText = `5 a ${offset} minutos antes de comer`;
    }
  } else if (offset < 0) {
    // Zona magra / fascia (ej. abdomen superior magro)
    clinicalAddon = ` 📍 Ajuste por ${methodLabel}: Zona magra con absorción más rápida (${offset} min). Se acorta la espera antes de comer para evitar que te baje antes de digerir.${clinicalAddon}`;
    if (rawAdvice.injectionTimingType === 'pre_standard') {
      timingText = `5 a 10 minutos antes de comer`;
    } else if (rawAdvice.injectionTimingType === 'pre_short') {
      timingText = `10 a 15 minutos antes de comer`;
    }
  } else {
    clinicalAddon = ` 📍 ${methodLabel}: Velocidad de absorción estándar óptima (sin demora adicional por zona).${clinicalAddon}`;
  }

  return {
    ...rawAdvice,
    timingMinutesText: timingText,
    clinicalAdvice: `${rawAdvice.clinicalAdvice}${clinicalAddon}`,
    iPortProfile,
    iPortNote: `${methodLabel} • ${iPortProfile.clinicalBadge}`,
  };
}

export interface SplitBolusAdvice {
  requiresSplit: boolean;
  strategy: 'single' | 'dual_moderate' | 'dual_extended';
  reason: string;
  absorptionLabel: 'Rápida' | 'Mixta / Moderada' | 'Lenta / Retardada';
  fastCarbsGrams: number;
  slowCarbsGrams: number;
  fastCarbsRatioPct: number;
  fatDelayMinutes: number;
  fiberDelayMinutes: number;
  totalDelayMinutes: number;
  correctionDoseUnits: number;
  fastCarbDoseUnits: number;
  slowCarbDoseUnits: number;
  firstDoseUnits: number;
  firstDosePct: number;
  firstDoseTiming: string;
  secondDoseUnits: number;
  secondDosePct: number;
  secondDoseDelayHours: number;
  secondDoseDelayFormatted: string;
  secondDoseTiming: string;
  
  absorptionWindowText?: string;
  clinicalExplanation: string;
  preBolusAdvice?: PreBolusTimingAdvice;
  iPortProfile?: IPortSiteBioProfile;
}

export interface SplitBolusInputOptions {
  totalDose: number;
  carbBolusUnits: number;
  netCorrectionUnits: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  glycemicIndex?: 'Bajo' | 'Medio' | 'Alto';
  glycemicLoad?: number;
  knownFastCarbsGrams?: number;
  knownSlowCarbsGrams?: number;
  trendArrow?: GlucoseTrend;
  currentGlucose?: number;
  targetGlucose?: number;
  customDelayHours?: number;
  sequencing?: EatingSequencingMode;
  iPortState?: IPortAdvanceState;
  roundStep?: 0.5 | 1.0 | 0.1;
}

/**
 * Calculates physiological Split Bolus (Dual Wave) parameters:
 * 1. 100% of the Correction Dose (to reach 100 mg/dL target) is ALWAYS applied in the FIRST dose immediately.
 * 2. Carbs are decomposed into Fast Carbs (simple sugars, high GI) and Slow Carbs (complex starches, low GI).
 * 3. The 1st dose contains: (100% Correction Dose) + (Carb Bolus corresponding to Fast Carbs).
 * 4. The 2nd dose contains ONLY the Carb Bolus corresponding to Slow Carbs (with timing delayed by Fat, Fiber, and Food Sequencing).
 * 5. Dynamic physiological delay in 15-minute increments (from 45m to 3.5h) based on GI, fat load, sequencing mode, and sensor trend.
 */
export function calculateSplitBolusStrategy(
  totalDose: number,
  carbsGrams: number,
  fatGrams: number,
  proteinGrams: number,
  fiberGrams: number,
  roundStep: 0.5 | 1.0 | 0.1 = 0.5,
  options?: {
    carbBolusUnits?: number;
    netCorrectionUnits?: number;
    glycemicIndex?: 'Bajo' | 'Medio' | 'Alto';
    glycemicLoad?: number;
    knownFastCarbsGrams?: number;
    knownSlowCarbsGrams?: number;
    trendArrow?: GlucoseTrend;
    currentGlucose?: number;
    targetGlucose?: number;
    customDelayHours?: number;
    sequencing?: EatingSequencingMode;
    iPortState?: IPortAdvanceState;
    insulinMode?: 'manual_pen' | 'iport' | 'pump';
    pumpDayOfWear?: number;
    zoneTissueConfig?: ZoneTissueCompositionConfig;
    dailyWorkout?: DailyWorkoutState;
  }
): SplitBolusAdvice {
  const correctionUnits = options?.netCorrectionUnits !== undefined ? Math.max(0, options.netCorrectionUnits) : 0;
  const carbDose = options?.carbBolusUnits !== undefined ? Math.max(0, options.carbBolusUnits) : Math.max(0, totalDose - correctionUnits);
  const trend = options?.trendArrow || 'flat';
  const sequencing = options?.sequencing || 'standard';
  const activeInsulinMode = options?.insulinMode || 'iport';
  const iPortProfile = options?.iPortState
    ? getIPortPharmacokineticProfile(options.iPortState, activeInsulinMode, options.pumpDayOfWear, options.zoneTissueConfig)
    : undefined;
  
  // Warsaw Method - Fat Protein Units (FPU)
  const fpu = (fatGrams * 9 + proteinGrams * 4) / 100;

  const preBolusAdvice = getPreBolusTimingAdvice(
    options?.currentGlucose || 100,
    trend,
    options?.targetGlucose || 100,
    sequencing,
    fatGrams,
    fiberGrams,
    options?.iPortState,
    options?.dailyWorkout,
    activeInsulinMode,
    options?.pumpDayOfWear,
    options?.zoneTissueConfig
  );

  if (totalDose <= 0) {
    return {
      requiresSplit: false,
      strategy: 'single',
      reason: 'Sin dosis requerida',
      absorptionLabel: 'Rápida',
      fastCarbsGrams: 0,
      slowCarbsGrams: 0,
      fastCarbsRatioPct: 100,
      fatDelayMinutes: 0,
      fiberDelayMinutes: 0,
      totalDelayMinutes: 0,
      correctionDoseUnits: 0,
      fastCarbDoseUnits: 0,
      slowCarbDoseUnits: 0,
      firstDoseUnits: 0,
      firstDosePct: 100,
      firstDoseTiming: preBolusAdvice.timingMinutesText,
      secondDoseUnits: 0,
      secondDosePct: 0,
      secondDoseDelayHours: 0,
      secondDoseDelayFormatted: '0 min',
      secondDoseTiming: '',
      clinicalExplanation: 'No hay dosis para dividir.',
      preBolusAdvice,
    };
  }

  // Si no hay carbohidratos (ej. solo corrección por glucosa alta), va 100% en 1ª dosis
  if (carbsGrams <= 0) {
    return {
      requiresSplit: false,
      strategy: 'single',
      reason: 'Dosis exclusiva de corrección de glucemia. Administrar 100% de inmediato para bajar a 100 mg/dL.',
      absorptionLabel: 'Rápida',
      fastCarbsGrams: 0,
      slowCarbsGrams: 0,
      fastCarbsRatioPct: 100,
      fatDelayMinutes: 0,
      fiberDelayMinutes: 0,
      totalDelayMinutes: 0,
      correctionDoseUnits: roundDose(correctionUnits, roundStep),
      fastCarbDoseUnits: 0,
      slowCarbDoseUnits: 0,
      firstDoseUnits: roundDose(totalDose, roundStep),
      firstDosePct: 100,
      firstDoseTiming: preBolusAdvice.timingMinutesText,
      secondDoseUnits: 0,
      secondDosePct: 0,
      secondDoseDelayHours: 0,
      secondDoseDelayFormatted: '0 min',
      secondDoseTiming: '',
      clinicalExplanation: `Corrección directa de glucemia (${totalDose.toFixed(1)} U). Se aplica todo de inmediato sin dividir.`,
      preBolusAdvice,
    };
  }

  // 1. Desglose Fisiológico de Carbohidratos (Rápidos vs Lentos)
  let fastCarbs = 0;
  let slowCarbs = 0;

  if (options?.knownFastCarbsGrams !== undefined && options?.knownSlowCarbsGrams !== undefined) {
    fastCarbs = Math.max(0, options.knownFastCarbsGrams);
    slowCarbs = Math.max(0, options.knownSlowCarbsGrams);
  } else {
    // Estimación basada en Índice Glucémico (IG) y contenido de fibra
    const gi = options?.glycemicIndex || (fiberGrams >= 8 ? 'Bajo' : fatGrams >= 15 ? 'Medio' : 'Alto');
    if (gi === 'Alto') {
      fastCarbs = carbsGrams * 0.75;
      slowCarbs = carbsGrams * 0.25;
    } else if (gi === 'Bajo') {
      fastCarbs = carbsGrams * 0.25;
      slowCarbs = carbsGrams * 0.75;
    } else {
      fastCarbs = carbsGrams * 0.50;
      slowCarbs = carbsGrams * 0.50;
    }
  }

  // Asegurar consistencia de suma y un piso mínimo fisiológico de absorción inicial
  // En fisiología humana, ningún alimento con carbohidratos absorbe 0% durante 3 horas.
  // El almidón (pan, cereales, harinas) siempre comienza a hidrolizarse y absorberse en los primeros 20-30 minutos.
  // La presencia de grasas modula la velocidad de vaciado gástrico para que se absorba gradualmente, no de golpe.
  const minFastCarbsRatio = 0.45; // Al menos 45% de los carbohidratos comienzan absorción en la primera fase
  if (fastCarbs < carbsGrams * minFastCarbsRatio) {
    fastCarbs = carbsGrams * minFastCarbsRatio;
    slowCarbs = carbsGrams - fastCarbs;
  } else {
    const totalCalculatedCarbs = fastCarbs + slowCarbs;
    if (totalCalculatedCarbs > 0 && Math.abs(totalCalculatedCarbs - carbsGrams) > 0.1) {
      const scale = carbsGrams / totalCalculatedCarbs;
      fastCarbs *= scale;
      slowCarbs *= scale;
    }
  }

  // 1b. Modulación por Secuenciación Fisiológica (Orden de Ingesta):
  if (sequencing === 'veggies_first') {
    // Ingerir ensalada/fibra/proteína antes de la pizza o arroz ralentiza levemente la absorción del almidón
    const shifted = fastCarbs * 0.15;
    fastCarbs -= shifted;
    slowCarbs += shifted;
  } else if (sequencing === 'mixed') {
    // Alimentos mezclados/untados con grasas (ej. pan con pasta de maní, salsa con fideos)
    const shifted = fastCarbs * 0.10;
    fastCarbs -= shifted;
    slowCarbs += shifted;
  }

  // Garantizar que nunca quede menos del 40% en HC de absorción temprana
  fastCarbs = Math.max(carbsGrams * 0.40, fastCarbs);
  slowCarbs = Math.max(0, carbsGrams - fastCarbs);

  const fastCarbsRatioPct = Math.round((fastCarbs / Math.max(1, carbsGrams)) * 100);

  // 2. Retraso fisiológico continuo por Grasas y Fibra para Novorapid (MDI)
  // Farmacocinética de Novorapid: inicio 10-15 min, pico máximo entre 60 y 75 min, duración 3.5-4h.
  // PRINCIPIO CLÍNICO CARDINAL: Para evitar la contradicción de "solapamiento de picos",
  // la 2ª dosis de una comida con grasa NUNCA debe programarse a los 30 o 45 min
  // (momento en que la 1ª dosis aún no llegó a su pico de acción).
  // La ventana biológica óptima se sitúa entre los 75 y 120 minutos (1h 15m a 2h).

  // Retraso continuo por grasa (Ecuación de Hunt/Pankowska): ~1.8 minutos por cada gramo de grasa
  const fatDelayMinutes = Math.min(60, Math.round(fatGrams * 1.8));

  // Retraso continuo por fibra viscosa: ~1.5 minutos por gramo de fibra vegetal
  const fiberDelayMinutes = Math.min(20, Math.round(fiberGrams * 1.5));
  
  // Base fisiológica sincronizada con la finalización del pico de Novorapid
  let baseDigestionMinutes = 60;
  if (options?.glycemicIndex === 'Alto') {
    baseDigestionMinutes = 50;
  } else if (options?.glycemicIndex === 'Bajo') {
    baseDigestionMinutes = 65;
  }

  let totalPhysiologicalDelayMinutes = baseDigestionMinutes + fatDelayMinutes + fiberDelayMinutes;

  // Modulación por sitio anatómico y día del i-Port Advance:
  // Si el puerto está en una zona lenta (pierna/glúteo) o día 4 de cánula, el pico del segundo bolo
  // también tardará más en aparecer, por lo que el retraso biológico se sincroniza:
  if (iPortProfile) {
    totalPhysiologicalDelayMinutes += Math.round(iPortProfile.peakDelayOffsetMinutes * 0.5);
  }

  // Secuenciación de comida (vegetales y proteínas primero antes de carbohidratos):
  // El estímulo anticipado de GLP-1 y secreción biliar retarda el vaciado gástrico en ~35 min.
  if (sequencing === 'veggies_first') {
    totalPhysiologicalDelayMinutes += 30;
  } else if (sequencing === 'mixed') {
    totalPhysiologicalDelayMinutes += 10;
  }

  // Modulador por sensor FreeStyle Libre al momento de calcular:
  if (trend === 'rising_fast') {
    totalPhysiologicalDelayMinutes = Math.max(65, totalPhysiologicalDelayMinutes - 15);
  } else if (trend === 'rising') {
    totalPhysiologicalDelayMinutes = Math.max(70, totalPhysiologicalDelayMinutes - 10);
  } else if (trend === 'falling' || trend === 'falling_fast') {
    totalPhysiologicalDelayMinutes += 15;
  }

  // Límites fisiológicos seguros para MDI: mínimo 70 min (1h 10m), máximo 135 min (2h 15m)
  let roundedDelayMinutes = Math.round(totalPhysiologicalDelayMinutes / 15) * 15;
  roundedDelayMinutes = Math.max(70, Math.min(135, roundedDelayMinutes));

  // Ventana fisiológica estimada (rango en minutos)
  const windowStartMin = Math.max(65, roundedDelayMinutes - 15);
  const windowEndMin = roundedDelayMinutes + 15;
  const absorptionWindowText = `Ventana esperada: entre min ${windowStartMin} y ${windowEndMin} post-comida`;

  // 3. Cálculo de Dosis por Componentes:
  const fastCarbDoseRaw = carbDose * (fastCarbs / Math.max(1, carbsGrams));
  const slowCarbDoseRaw = carbDose * (slowCarbs / Math.max(1, carbsGrams));

  // 4. Reglas de Decisión: ¿Requiere Bolo Dividido?
  const roundedTotalDose = roundDose(totalDose, roundStep);
  const isSmallDose = roundedTotalDose < 2.0;
  let isMinimalSlowDose = sequencing === 'veggies_first' ? (slowCarbDoseRaw < 0.8) : (slowCarbDoseRaw < 1.0);
  const isFastDominantLowDelay = fastCarbsRatioPct >= 75 && fatGrams < 12 && fiberGrams < 5 && sequencing === 'standard';

  // Fuerza el Split Bolus si hay suficientes UGP (Unidades Grasa-Proteína - Método Varsovia)
  const isHighFPU = fpu >= 1.5;
  if (isHighFPU) {
    isMinimalSlowDose = false; // Override minimal slow dose if high protein/fat
  }

  if ((isSmallDose || isMinimalSlowDose || isFastDominantLowDelay) && !isHighFPU) {
    const roundedTotal = roundDose(totalDose, roundStep);
    return {
      requiresSplit: false,
      strategy: 'single',
      reason: isMinimalSlowDose
        ? `La dosis para HC lentos (${slowCarbDoseRaw.toFixed(1)} U) es menor a 1.0 U. Administrar el 100% en bolo único.`
        : isSmallDose
        ? `Dosis total pequeña (${totalDose.toFixed(1)} U). Administrar el 100% en bolo único para evitar subdosificación.`
        : `Comida de absorción rápida (${fastCarbsRatioPct}% rápidos) con mínimo retraso de grasas (${fatGrams.toFixed(1)}g).`,
      absorptionLabel: 'Rápida',
      fastCarbsGrams: Math.round(fastCarbs * 10) / 10,
      slowCarbsGrams: Math.round(slowCarbs * 10) / 10,
      fastCarbsRatioPct,
      fatDelayMinutes,
      fiberDelayMinutes,
      totalDelayMinutes: 0,
      correctionDoseUnits: roundDose(correctionUnits, roundStep),
      fastCarbDoseUnits: roundDose(fastCarbDoseRaw, roundStep),
      slowCarbDoseUnits: 0,
      firstDoseUnits: roundedTotal,
      firstDosePct: 100,
      firstDoseTiming: preBolusAdvice.timingMinutesText,
      secondDoseUnits: 0,
      secondDosePct: 0,
      secondDoseDelayHours: 0,
      secondDoseDelayFormatted: '0 min',
      secondDoseTiming: '',
      clinicalExplanation: `Se administra el 100% (${roundedTotal} U) en una sola aplicación: ${preBolusAdvice.timingMinutesText}. ${preBolusAdvice.clinicalAdvice}`,
      preBolusAdvice,
      iPortProfile,
    };
  }

  // 5. ASIGNACIÓN ESTRICTA Y FISIOLÓGICA DEL BOLO DIVIDIDO:
  // REGLA CARDINAL: La 1ª dosis NUNCA puede ser 0 U ni inferior al 50% de la dosis total calculada.
  // El almidón y carbohidratos siempre comienzan a elevar la glucosa en los primeros 20-30 minutos.
  // 1ª DOSIS = Mínimo 50% al 65% del total (cubre los primeros carbohidratos y corrección si la hubiera).
  // 2ª DOSIS = 35% al 50% restante (cubre la liberación lenta de lípidos y almidones tardíos).
  const finalTotal = roundDose(totalDose, roundStep);
  
  // Dosis inicial preliminar calculada por componentes
  let rawFirstDose = correctionUnits + fastCarbDoseRaw;
  
  // Garantizar el piso fisiológico mínimo del 50% para la 1ª dosis
  const minFirstDoseRatio = 0.50;
  const targetFirstDoseRatio = fatGrams > 30 ? 0.55 : 0.60;
  const minFirstUnits = Math.max(roundStep, roundDose(finalTotal * minFirstDoseRatio, roundStep));
  const suggestedFirstUnits = roundDose(finalTotal * targetFirstDoseRatio, roundStep);

  let firstDoseUnits = roundDose(rawFirstDose, roundStep);
  if (firstDoseUnits < minFirstUnits) {
    firstDoseUnits = suggestedFirstUnits;
  }
  // No puede superar el total
  firstDoseUnits = Math.min(finalTotal, Math.max(minFirstUnits, firstDoseUnits));

  let secondDoseUnits = Math.max(0, roundDose(finalTotal - firstDoseUnits, roundStep));

  // Si la segunda dosis quedó por debajo de 1.0 U tras redondeo, unificar en bolo único
  if (secondDoseUnits < 1.0) {
    return {
      requiresSplit: false,
      strategy: 'single',
      reason: `La 2ª dosis calculada es inferior a 1.0 U (${secondDoseUnits} U). Conviene administrar el 100% (${finalTotal} U) en bolo único.`,
      absorptionLabel: 'Mixta / Moderada',
      fastCarbsGrams: Math.round(fastCarbs * 10) / 10,
      slowCarbsGrams: Math.round(slowCarbs * 10) / 10,
      fastCarbsRatioPct,
      fatDelayMinutes,
      fiberDelayMinutes,
      totalDelayMinutes: 0,
      correctionDoseUnits: roundDose(correctionUnits, roundStep),
      fastCarbDoseUnits: roundDose(fastCarbDoseRaw, roundStep),
      slowCarbDoseUnits: 0,
      firstDoseUnits: finalTotal,
      firstDosePct: 100,
      firstDoseTiming: preBolusAdvice.timingMinutesText,
      secondDoseUnits: 0,
      secondDosePct: 0,
      secondDoseDelayHours: 0,
      secondDoseDelayFormatted: '0 min',
      secondDoseTiming: '',
      clinicalExplanation: `Se administra el total (${finalTotal} U) en un solo bolo: ${preBolusAdvice.timingMinutesText}. ${preBolusAdvice.clinicalAdvice}`,
      preBolusAdvice,
      iPortProfile,
    };
  }

  // Porcentajes reales resultantes
  const firstDosePct = Math.round((firstDoseUnits / finalTotal) * 100);
  const secondDosePct = 100 - firstDosePct;

  // Horas de retraso exactas (permite anular con selección manual del usuario si existe, con tope máximo de 2.0h)
  const delayHours = options?.customDelayHours !== undefined && options.customDelayHours > 0
    ? Math.min(2.25, options.customDelayHours)
    : roundedDelayMinutes / 60;

  const delayFormatted = formatDelayHoursToText(delayHours);
  const isExtended = delayHours >= 1.75;

  const bgIsLow = (options?.currentGlucose !== undefined && options.currentGlucose < 85);
  const bgText = options?.currentGlucose !== undefined ? `${options.currentGlucose} mg/dL` : 'actual';

  const clinicalExplanation = bgIsLow
    ? `⚠️ Con glucemia baja (${bgText}): La 1ª dosis (${firstDoseUnits} U, ${firstDosePct}%) se aplica entre 20 y 30 minutos DESPUÉS de empezar a comer (confirmando en tu sensor que la glucosa subió a >85 mg/dL). La 2ª dosis (${secondDoseUnits} U, ${secondDosePct}%) se programa en la ${absorptionWindowText.toLowerCase()} para acompañar la liberación progresiva de los lípidos (${fatGrams.toFixed(0)}g de grasa), supeditada a lo que marque tu FreeStyle Libre.${iPortProfile ? ` (i-Port: ${iPortProfile.subSiteLabel})` : ''}`
    : `Bolo dividido adaptativo: La 1ª dosis (${firstDoseUnits} U, ${firstDosePct}%) se administra ${preBolusAdvice.timingMinutesText.toLowerCase()} para cubrir el almidón inicial. La 2ª dosis (${secondDoseUnits} U, ${secondDosePct}%) se vigilará en la ${absorptionWindowText.toLowerCase()} (${delayFormatted} aprox.) para frenar el impacto tardío de las grasas (${fatGrams.toFixed(0)}g) según tu tendencia de glucosa.${iPortProfile ? ` [Ajuste i-Port: ${iPortProfile.subSiteLabel}]` : ''}`;

  return {
    requiresSplit: true,
    strategy: isExtended ? 'dual_extended' : 'dual_moderate',
    reason: `1ª Dosis: ${firstDoseUnits} U (${firstDosePct}%). 2ª Dosis: ${secondDoseUnits} U (${secondDosePct}%) en ${absorptionWindowText.toLowerCase()} (+${delayFormatted}) por ${fatGrams.toFixed(1)}g grasa.`,
    absorptionLabel: isExtended ? 'Lenta / Retardada' : 'Mixta / Moderada',
    absorptionWindowText,
    fastCarbsGrams: Math.round(fastCarbs * 10) / 10,
    slowCarbsGrams: Math.round(slowCarbs * 10) / 10,
    fastCarbsRatioPct,
    fatDelayMinutes,
    fiberDelayMinutes,
    totalDelayMinutes: Math.round(delayHours * 60),
    correctionDoseUnits: roundDose(correctionUnits, roundStep),
    fastCarbDoseUnits: roundDose(fastCarbDoseRaw, roundStep),
    slowCarbDoseUnits: secondDoseUnits,
    firstDoseUnits,
    firstDosePct,
    firstDoseTiming: `${preBolusAdvice.timingMinutesText} (${preBolusAdvice.trendSymbol} ${preBolusAdvice.trendLabel})`,
    secondDoseUnits,
    secondDosePct,
    secondDoseDelayHours: delayHours,
    secondDoseDelayFormatted: delayFormatted,
    secondDoseTiming: `${absorptionWindowText} (~+${delayFormatted}) (supeditado al sensor)`,
    clinicalExplanation,
    preBolusAdvice,
    iPortProfile,
  };
}

/**
 * Analiza el historial de bolos recientes de Novorapid frente a un bolo dividido pendiente
 * y calcula con precisión matemática el retraso seguro (minutos a sumar)
 * para evitar el solapamiento de picos (hipoglucemia) sin pasarse (hiperglucemia),
 * teniendo en cuenta:
 * 1. Farmacocinética de Novorapid (pico máximo entre 40 y 75 min).
 * 2. Tiempo transcurrido desde la inyección reciente.
 * 3. Contenido de grasa de la comida pendiente (el freno gástrico natural).
 * 4. Contenido de fibra y carbohidratos.
 */
export function calculateSmartAntiStackingAdvice(
  pendingSplit: PendingSplitBolus,
  bolusHistory: BolusRecord[],
  nowMs: number = Date.now()
): AntiStackingRecommendation {
  // Ignoramos el propio registro si existiera
  const recentBoluses = (bolusHistory || [])
    .filter((b) => b.units > 0 && b.id !== pendingSplit.id)
    .map((b) => {
      const bTime = new Date(b.timestamp).getTime();
      const elapsedMinutes = (nowMs - bTime) / 60000;
      return { bolus: b, elapsedMinutes, bTime };
    })
    .filter((item) => item.elapsedMinutes >= 0 && item.elapsedMinutes <= 150)
    .sort((a, b) => a.elapsedMinutes - b.elapsedMinutes);

  const dueMs = new Date(pendingSplit.dueAt).getTime();
  const minutesUntilDue = Math.round((dueMs - nowMs) / 60000);

  if (recentBoluses.length === 0) {
    return {
      hasRisk: false,
      riskLevel: 'safe',
      recentBolus: null,
      elapsedMinutes: 999,
      minutesUntilDue,
      suggestedPostponeMinutes: 0,
      newScheduledTimeText: '',
      headline: 'Sin solapamiento reciente',
      clinicalExplanation: 'No se detectaron dosis de Novorapid en las últimas 2.5 horas.',
      fatProtectionNote: `${pendingSplit.fatGrams}g de grasa en esta comida amortiguan la absorción.`,
      actionButtonText: 'Horario programado seguro',
    };
  }

  const mostRecent = recentBoluses[0];
  const elapsedMinutes = Math.round(mostRecent.elapsedMinutes);
  const recentUnits = mostRecent.bolus.units;

  // Criterio de riesgo de solapamiento:
  // Novorapid tiene pico fuerte entre los 30 y 75 min.
  // Si la dosis reciente fue hace menos de 90 min y la 2ª dosis vence pronto (< 50 min) o ya venció:
  const isHighRisk = elapsedMinutes < 60 && minutesUntilDue <= 45;
  const isModerateRisk =
    (elapsedMinutes >= 60 && elapsedMinutes <= 90 && minutesUntilDue <= 30) ||
    (elapsedMinutes < 60 && minutesUntilDue > 45 && minutesUntilDue <= 70);

  if (!isHighRisk && !isModerateRisk) {
    return {
      hasRisk: false,
      riskLevel: 'safe',
      recentBolus: mostRecent.bolus,
      elapsedMinutes,
      minutesUntilDue,
      suggestedPostponeMinutes: 0,
      newScheduledTimeText: '',
      headline: `Dosis de ${recentUnits} U hace ${elapsedMinutes} min (distancia segura)`,
      clinicalExplanation: `La dosis anterior está fuera de la zona crítica de solapamiento.`,
      fatProtectionNote: `Grasa: ${pendingSplit.fatGrams}g.`,
      actionButtonText: 'Horario seguro',
    };
  }

  // Cálculo del retraso necesario:
  // Queremos que la 2ª dosis se aplique cuando la dosis previa haya superado su pico (mínimo a los 80-90 min de la dosis previa).
  const targetBufferFromRecent = 85; // minutos desde la inyección previa
  const minMinutesFromNow = Math.max(25, targetBufferFromRecent - elapsedMinutes);

  // Déficit frente al horario actual programado:
  const rawDeficitMinutes = minMinutesFromNow - minutesUntilDue;

  // Ajuste según el freno gástrico de las grasas y fibra de la comida:
  let suggestedPostponeMinutes = 45; // Valor estándar de oro
  let fatNote = '';

  if (pendingSplit.fatGrams >= 25) {
    // Comida muy grasa: el vaciado gástrico es muy lento (3-4 horas)
    suggestedPostponeMinutes = Math.max(45, Math.min(60, Math.round(rawDeficitMinutes / 15) * 15 || 45));
    fatNote = `Comida con alto contenido graso (${pendingSplit.fatGrams}g): la digestión lenta evita que la glucosa suba de golpe, permitiendo sumar +${suggestedPostponeMinutes} min con total seguridad.`;
  } else if (pendingSplit.fatGrams >= 12) {
    // Grasa moderada:
    suggestedPostponeMinutes = Math.max(30, Math.min(45, Math.round(rawDeficitMinutes / 15) * 15 || 45));
    fatNote = `Grasa moderada (${pendingSplit.fatGrams}g): absorción equilibrada. Un retraso de +${suggestedPostponeMinutes} min impide que se junten los picos de insulina.`;
  } else {
    // Poca grasa (<12g): ¡Cuidado con pasarse de tiempo para evitar hiperglucemia!
    suggestedPostponeMinutes = Math.min(30, Math.max(20, Math.round(rawDeficitMinutes / 15) * 15 || 30));
    fatNote = `Comida baja en grasa (${pendingSplit.fatGrams}g): absorción más rápida. Limitamos el retraso a +${suggestedPostponeMinutes} min para evitar que tu glucemia se dispare (hiperglucemia).`;
  }

  // Si la dosis reciente fue hace menos de 60 min, garantizar al menos +45 min si la grasa es >= 12g
  if (elapsedMinutes < 60 && pendingSplit.fatGrams >= 12) {
    suggestedPostponeMinutes = Math.max(45, suggestedPostponeMinutes);
  }

  // Calcular la nueva hora de inyección exacta
  const baseMs = Math.max(nowMs, dueMs);
  const newDueMs = baseMs + suggestedPostponeMinutes * 60 * 1000;
  const newDueDate = new Date(newDueMs);
  const newScheduledTimeText = `${newDueDate.getHours().toString().padStart(2, '0')}:${newDueDate.getMinutes().toString().padStart(2, '0')}`;

  const recentTimeObj = new Date(mostRecent.bolus.timestamp);
  const recentTimeStr = `${recentTimeObj.getHours().toString().padStart(2, '0')}:${recentTimeObj.getMinutes().toString().padStart(2, '0')}`;

  return {
    hasRisk: true,
    riskLevel: isHighRisk ? 'high' : 'moderate',
    recentBolus: mostRecent.bolus,
    elapsedMinutes,
    minutesUntilDue,
    suggestedPostponeMinutes,
    newScheduledTimeText,
    headline: `Dosis reciente: te inyectaste ${recentUnits} U hace ${elapsedMinutes} min (${recentTimeStr})`,
    clinicalExplanation: `Novorapid está en su momento de mayor fuerza (pico de acción entre los 40 y 70 min). Si te inyectas esta ${pendingSplit.part === 1 ? '1ª' : '2ª'} dosis de ${pendingSplit.units} U ahora, ambos picos se juntarán en sangre provocando una hipoglucemia súbita. El cálculo inteligente suma +${suggestedPostponeMinutes} min para separar los picos.`,
    fatProtectionNote: fatNote,
    actionButtonText: `⚡ Aumentar +${suggestedPostponeMinutes} min automáticamente (Pasa a las ${newScheduledTimeText})`,
  };
}

/**
 * Evalúa si hay colisiones o proximidad peligrosa entre múltiples bolos divididos pendientes
 */
export function evaluateMultipleSplitsSpacing(
  pendingSplits: PendingSplitBolus[],
  nowMs: number = Date.now()
): { hasCollision: boolean; message: string; suggestedFixes?: { splitId: string; additionalMinutes: number }[] } {
  if (!pendingSplits || pendingSplits.length < 2) {
    return { hasCollision: false, message: '' };
  }

  // Ordenar por dueAt ascendente
  const sorted = [...pendingSplits].sort(
    (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
  );

  const fixes: { splitId: string; additionalMinutes: number }[] = [];
  let collisionFound = false;
  let collisionDetails = '';

  for (let i = 0; i < sorted.length - 1; i++) {
    const splitA = sorted[i];
    const splitB = sorted[i + 1];
    const dueA = new Date(splitA.dueAt).getTime();
    const dueB = new Date(splitB.dueAt).getTime();
    const diffMinutes = Math.round((dueB - dueA) / 60000);

    // Si están a menos de 45 minutos una de la otra:
    if (diffMinutes >= 0 && diffMinutes < 45) {
      collisionFound = true;
      const neededShift = 45 - diffMinutes;
      fixes.push({ splitId: splitB.id, additionalMinutes: neededShift });
      collisionDetails = `Tenés 2 dosis programadas con solo ${diffMinutes} min de diferencia (${splitA.units} U y ${splitB.units} U). Inyectar ambas tan juntas puede sumar ${splitA.units + splitB.units} U en un lapso muy corto.`;
    }
  }

  return {
    hasCollision: collisionFound,
    message: collisionDetails,
    suggestedFixes: fixes,
  };
}

/**
 * Chequeo Fisiológico en Vivo antes de Inyectar la 2ª Dosis:
 * Permite al usuario medir su glucemia actual y flecha de tendencia del sensor FreeStyle Libre 2
 * antes de aplicar un bolo pendiente para decidir con criterio médico:
 * 1. Si la comida subió menos de lo esperado (< 95 mg/dL) o cae (↘️/⬇️): Freno de seguridad para evitar hipoglucemia (posponer o cancelar).
 * 2. Si hay pico tardío o estrés (> 135 mg/dL o ↗️/⬆️): Recalcular dosis sumando corrección según FSI (28) y restando IOB activa.
 * 3. Si está en rango ideal (95 a 135 mg/dL con flecha ➡️/↗️ leve): Confirmar dosis original de forma segura.
 */
export function evaluateSecondDoseSensorCheck(params: {
  currentGlucose: number;
  trendArrow: GlucoseTrend;
  originalUnits: number;
  scheduledMealDescription?: string;
  fatGrams?: number;
  fiberGrams?: number;
  isf: number; // 28 mg/dL
  targetGlucose?: number; // 100 mg/dL
  iobUnits?: number;
  roundStep?: 0.5 | 1.0 | 0.1;
  startingGlucose?: number; // Glucemia al momento de la comida para medir subida acumulada
}): SecondDoseSensorCheckResult {
  const {
    currentGlucose,
    trendArrow,
    originalUnits: rawOriginalUnits,
    isf = 28,
    targetGlucose = 100,
    iobUnits = 0,
    roundStep = 1.0,
    startingGlucose,
  } = params;

  // Asegurar que la dosis base respete el paso de la pluma
  const originalUnits = roundDose(rawOriginalUnits, roundStep);

  // Calcular variación respecto a la glucemia inicial de la comida si está disponible
  const hasStartingGlucose = typeof startingGlucose === 'number' && startingGlucose > 0;
  const deltaGlucose = hasStartingGlucose ? Math.round(currentGlucose - startingGlucose) : 0;

  // CASO 1: Glucemia < 75 mg/dL (Hipoglucemia o peligro inminente)
  if (currentGlucose < 75) {
    return {
      currentGlucose,
      trendArrow,
      originalUnits,
      recommendedAction: 'cancel_safe',
      recommendedUnits: 0,
      correctionUnits: 0,
      iobUnits,
      roundStep,
      deltaGlucose,
      actionTitle: '🛑 Suspender 2ª dosis (Hipoglucemia)',
      clinicalMessage: `¡PELIGRO DE HIPOGLUCEMIA! Tu glucosa está en ${currentGlucose} mg/dL (${trendArrow}). NO te inyectes insulina. Ingiere 15g de carbohidratos rápidos (jugo o glucosa) y recontrola en 15 minutos con el sensor.`,
      tone: 'rose',
    };
  }

  // CASO 2: Glucemia en descenso (↘️ o ⬇️) o baja (< 95 mg/dL)
  if (currentGlucose < 95 || trendArrow === 'falling' || trendArrow === 'falling_fast') {
    return {
      currentGlucose,
      trendArrow,
      originalUnits,
      recommendedAction: 'postpone',
      recommendedUnits: 0,
      correctionUnits: 0,
      iobUnits,
      roundStep,
      deltaGlucose,
      actionTitle: '⏳ Frenar: Glucosa sin subir o en descenso',
      clinicalMessage: `FRENO DE SEGURIDAD: Tu sensor marca ${currentGlucose} mg/dL con tendencia ${
        trendArrow === 'falling_fast' ? '⬇️ en caída rápida' : trendArrow === 'falling' ? '↘️ en descenso' : '➡️ baja (< 95)'
      }. La comida aún no ingresó a la sangre o la insulina previa sigue bajando tu glucosa. Inyectar las ${originalUnits} U ahora causaría hipoglucemia. Mantén en espera o descarta si la comida fue más liviana.`,
      tone: 'amber',
    };
  }

  // CASO 3: CRITERIO DUAL - SUBIDA SOSTENIDA INSIDIOSA (CREEPING RISE)
  // Aunque la flecha del FreeStyle Libre marque plana ➡️, si la glucosa aumentó ≥ 20 mg/dL desde la comida,
  // o si superó 140 mg/dL con aumento ≥ 15 mg/dL, o si superó 160 mg/dL:
  // ¡LA COMIDA GRASA COMENZÓ A ABSORBERSE! NO esperar una flecha que tal vez nunca aparezca.
  const isCreepingRise = trendArrow === 'flat' && (
    (hasStartingGlucose && deltaGlucose >= 20) ||
    (hasStartingGlucose && currentGlucose >= 140 && deltaGlucose >= 15) ||
    (currentGlucose >= 165)
  );

  if (isCreepingRise) {
    // Si la glucemia desbordó 140 mg/dL, calculamos corrección del excedente con descuento de IOB
    let netCorrection = 0;
    let grossCorrection = 0;
    if (currentGlucose > 140) {
      grossCorrection = Math.max(0, (currentGlucose - 140) / isf);
      netCorrection = Math.max(0, grossCorrection - iobUnits);
    }

    const calculatedTotal = originalUnits + netCorrection;
    const recommendedUnits = roundDose(calculatedTotal, roundStep);
    const addedCorrectionUnits = Math.max(0, recommendedUnits - originalUnits);

    return {
      currentGlucose,
      trendArrow,
      originalUnits,
      recommendedAction: addedCorrectionUnits > 0 ? 'apply_adjusted' : 'apply_original',
      recommendedUnits,
      correctionUnits: addedCorrectionUnits,
      grossCorrectionUnits: Math.round(grossCorrection * 10) / 10,
      netCorrectionUnits: Math.round(netCorrection * 10) / 10,
      iobUnits,
      roundStep,
      deltaGlucose,
      isCreepingRise: true,
      actionTitle: `⚡ Subida Sostenida Detectada (${recommendedUnits} U)`,
      clinicalMessage: `SUBIDA INSIDIOSA POR GRASAS: Aunque tu sensor muestra flecha plana (➡️), tu glucemia subió ${
        hasStartingGlucose ? `+${deltaGlucose} mg/dL (de ${startingGlucose} a ${currentGlucose} mg/dL)` : `a ${currentGlucose} mg/dL`
      }. La absorción tardía ya entró al torrente sanguíneo. MOMENTO ÓPTIMO DE APLICAR EL BOLO${
        addedCorrectionUnits > 0 ? ` con refuerzo justo de +${addedCorrectionUnits} U por superar 140 mg/dL (IOB de ${iobUnits.toFixed(1)} U descontado).` : ` sin corrección adicional.`
      }`,
      tone: 'emerald',
    };
  }

  // CASO 4: Glucemia menor a 145 mg/dL con Insulina Activa (IOB > 0.2 U) y sin subida
  // Si la glucosa no subió (delta < 15) y todavía queda IOB, se mantiene en espera para evitar apilamiento
  if (currentGlucose < 145 && iobUnits >= 0.2 && deltaGlucose < 15) {
    return {
      currentGlucose,
      trendArrow,
      originalUnits,
      recommendedAction: 'postpone',
      recommendedUnits: 0,
      correctionUnits: 0,
      iobUnits,
      roundStep,
      deltaGlucose,
      actionTitle: `⏳ Mantener en espera: Glucosa ${currentGlucose} mg/dL con ${iobUnits.toFixed(1)} U de IOB`,
      clinicalMessage: `PROTECCIÓN ANTI-APILAMIENTO: Tu sensor marca ${currentGlucose} mg/dL (sin subida tardía todavía, Δ +${deltaGlucose} mg/dL) y aún tenés ${iobUnits.toFixed(1)} U de insulina activa trabajando. Conviene mantener en espera hasta que la comida empiece a subir o el IOB descienda.`,
      tone: 'amber',
    };
  }

  // CASO 5: Desborde Hiperglucémico (> 180 mg/dL) O flecha ascendente (↗️ o ⬆️)
  if (currentGlucose > 180 || trendArrow === 'rising' || trendArrow === 'rising_fast') {
    const rawDiff = Math.max(0, currentGlucose - targetGlucose);
    const rawCorrection = rawDiff / isf;
    const trendAddon = trendArrow === 'rising_fast' ? 1.0 : trendArrow === 'rising' ? 0.5 : 0;
    const grossCorrection = rawCorrection + trendAddon;
    
    // DESCUENTO RIGUROSO DE IOB: Descontamos la insulina que aún está trabajando
    const netCorrection = Math.max(0, grossCorrection - iobUnits);
    const calculatedTotal = originalUnits + netCorrection;
    const recommendedUnits = roundDose(calculatedTotal, roundStep);
    const addedCorrectionUnits = Math.max(0, recommendedUnits - originalUnits);

    const grossCorrectionRounded = Math.round(grossCorrection * 10) / 10;
    const netCorrectionRounded = Math.round(netCorrection * 10) / 10;

    if (recommendedUnits === originalUnits || addedCorrectionUnits <= 0) {
      return {
        currentGlucose,
        trendArrow,
        originalUnits,
        recommendedAction: 'apply_original',
        recommendedUnits: originalUnits,
        correctionUnits: 0,
        grossCorrectionUnits: grossCorrectionRounded,
        netCorrectionUnits: 0,
        iobUnits,
        roundStep,
        deltaGlucose,
        actionTitle: `✅ Mantener ${originalUnits} U (IOB activo protege)`,
        clinicalMessage: `AJUSTE IOB: Tu glucosa está en ${currentGlucose} mg/dL (${trendArrow === 'rising_fast' ? '⬆️' : '↗️'}), pero contás con ${iobUnits.toFixed(1)} U de IOB que ya están compensando la subida. La dosis se mantiene en las ${originalUnits} U programadas para no sobredosificar.`,
        tone: 'emerald',
      };
    }

    return {
      currentGlucose,
      trendArrow,
      originalUnits,
      recommendedAction: 'apply_adjusted',
      recommendedUnits,
      correctionUnits: addedCorrectionUnits,
      grossCorrectionUnits: grossCorrectionRounded,
      netCorrectionUnits: netCorrectionRounded,
      iobUnits,
      roundStep,
      deltaGlucose,
      actionTitle: `⚡ Aplicar dosis recalculada (${recommendedUnits} U)`,
      clinicalMessage: `AJUSTE POR PICO TARDÍO: Glucosa en ${currentGlucose} mg/dL (${
        trendArrow === 'rising_fast' ? '⬆️ subiendo rápido' : '↗️ subiendo'
      }). Descontando ${iobUnits.toFixed(1)} U de IOB activo, se calcula un refuerzo neto de +${addedCorrectionUnits} U para llegar a tu meta de ${targetGlucose} mg/dL.`,
      tone: 'amber',
    };
  }

  // CASO 6: Glucemia postprandial esperada (95 a 180 mg/dL) con tendencia Estable (➡️)
  return {
    currentGlucose,
    trendArrow,
    originalUnits,
    recommendedAction: 'apply_original',
    recommendedUnits: originalUnits,
    correctionUnits: 0,
    grossCorrectionUnits: 0,
    netCorrectionUnits: 0,
    iobUnits,
    roundStep,
    deltaGlucose,
    actionTitle: `✅ Confirmar dosis programada (${originalUnits} U)`,
    clinicalMessage: `RANGO ÓPTIMO: Tu glucosa está en ${currentGlucose} mg/dL con flecha ➡️ estable. Podés aplicar las ${originalUnits} U programadas para finalizar la cobertura de la comida.`,
    tone: 'emerald',
  };
}
