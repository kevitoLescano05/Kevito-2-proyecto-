import React, { useState, useEffect } from 'react';
import {
  UserSettings,
  MealPlateItem,
  GlucoseTrend,
  PendingSplitBolus,
  DailyMealLogItem,
  LiveCgmReading,
  ActiveGlycemicFactorId,
  MealTimeSlot,
} from '../types';
import {
  ACTIONABLE_GLYCEMIC_FACTORS,
  evaluateActiveGlycemicFactorsForBolus,
} from '../utils/glycemicFactors42';
import {
  SENSOR_BRAND_CATALOG,
  fetchLiveGlucoseFromConfiguredSource,
  formatReadingAgeMinutes,
} from '../utils/cgmService';
import { CgmConnectorModal } from './CgmConnectorModal';
import { HypoRescueAssistantCard } from './HypoRescueAssistantCard';
import {
  calculateCarbBolus,
  calculateCorrectionBolus,
  roundDose,
  calculateSplitBolusStrategy,
  formatDelayHoursToText,
  getFirstDoseWaitMinutes,
  calculateProjectedGlucoseAndNetBolus,
  getIPortPharmacokineticProfile,
  INJECTION_SITE_QUICK_OPTIONS,
  getRapidInsulinInfo,
  getCurrentMealTimeSlot,
  getEffectiveIcrForMealSlot,
  MEAL_SLOT_LABELS,
  DEFAULT_FIXED_MEAL_DOSES,
  DEFAULT_CORRECTION_SCALE,
  getFixedDoseForMealSlot,
  calculateSlidingScaleCorrection,
} from '../utils/insulinMath';
import { calculateDynamicCOB } from '../utils/openapsCob';
import {
  evaluatePlateForCalculatorConditions,
  getActiveMedicalConditions,
} from '../utils/medicalConditions';
import { Calculator, Syringe, AlertCircle, MinusCircle, PlusCircle, CheckCircle2, ChevronDown, ChevronUp, ShieldAlert, Sparkles, RefreshCw, Utensils, Clock, Split, Timer, Info, ArrowRight, AlertTriangle, XCircle, BookOpen, Radio, ListChecks } from 'lucide-react';

const TREND_OPTIONS: { trend: GlucoseTrend; symbol: string; label: string; sub: string; activeColor: string }[] = [
  { trend: 'falling_fast', symbol: '⬇️', label: 'Bajando Rápido', sub: '>2 mg/dL/min', activeColor: 'bg-rose-500/20 text-rose-300 border-rose-500 ring-rose-500/30' },
  { trend: 'falling', symbol: '↘️', label: 'Bajando', sub: '1-2 mg/dL/min', activeColor: 'bg-amber-500/20 text-amber-300 border-amber-500 ring-amber-500/30' },
  { trend: 'flat', symbol: '➡️', label: 'Estable', sub: '<1 mg/dL/min', activeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500 ring-emerald-500/30' },
  { trend: 'rising', symbol: '↗️', label: 'Subiendo', sub: '1-2 mg/dL/min', activeColor: 'bg-amber-500/20 text-amber-300 border-amber-500 ring-amber-500/30' },
  { trend: 'rising_fast', symbol: '⬆️', label: 'Subiendo Rápido', sub: '>2 mg/dL/min', activeColor: 'bg-rose-500/20 text-rose-300 border-rose-500 ring-rose-500/30' },
];

const RECENT_MEAL_TIME_OPTIONS: { minutesAgo: number; label: string; shortBadge: string }[] = [
  { minutesAgo: 0, label: '🍽️ Ahora mismo (Actual)', shortBadge: 'Ahora' },
  { minutesAgo: 10, label: 'Hace 10 min', shortBadge: '-10m' },
  { minutesAgo: 15, label: 'Hace 15 min', shortBadge: '-15m' },
  { minutesAgo: 20, label: 'Hace 20 min', shortBadge: '-20m' },
  { minutesAgo: 30, label: 'Hace 30 min', shortBadge: '-30m' },
  { minutesAgo: 45, label: 'Hace 45 min', shortBadge: '-45m' },
  { minutesAgo: 60, label: 'Hace 1 hora', shortBadge: '-1h' },
  { minutesAgo: 90, label: 'Hace 1h 30m', shortBadge: '-1h 30m' },
  { minutesAgo: 120, label: 'Hace 2 horas', shortBadge: '-2h' },
];

export function formatMinutesAgoLabel(mins: number): string {
  if (mins <= 0) return 'ahora mismo';
  if (mins === 60) return '1 hora';
  if (mins === 90) return '1 hora y 30 min';
  if (mins === 120) return '2 horas';
  return `${mins} min`;
}

interface InsulinCalculatorCardProps {
  settings: UserSettings;
  iobValue: number;
  dailyMeals?: DailyMealLogItem[];
  plateItems: MealPlateItem[];
  manualCarbs: number;
  setManualCarbs: (carbs: number) => void;
  onClearPlate: () => void;
  pendingSplits?: PendingSplitBolus[];
  onPostponeSplit?: (splitId: string, additionalMinutes: number) => void;
  onTogglePauseSplit?: (splitId: string) => void;
  onDismissSplit?: (splitId: string) => void;
  onConfirmSecondDose?: (splitId: string) => void;
  onRequestSafetyCheck?: (split: PendingSplitBolus) => void;
  onUpdateSettings?: (newSettings: UserSettings) => void;
  onLogBolusAndMeal: (data: {
    units: number;
    carbUnits: number;
    correctionUnits: number;
    carbsGrams: number;
    carbsNetGrams?: number;
    fiberGrams?: number;
    glucoseMgDl: number;
    mealDescription: string;
    animalProteinGrams: number;
    plantProteinGrams: number;
    fatGrams: number;
    calories: number;
    mealMinutesAgo?: number;
    bolusMinutesAgo?: number;
    firstDoseIsPending?: boolean;
    firstDoseDelayMinutes?: number;
    splitDetails?: {
      isSplit: boolean;
      firstDoseUnits: number;
      secondDoseUnits: number;
      delayHours: number;
      absorptionWindowText?: string;
      totalDose: number;
      firstDoseIsPending?: boolean;
      firstDoseDelayMinutes?: number;
    };
  }) => void;
}

export const InsulinCalculatorCard: React.FC<InsulinCalculatorCardProps> = ({
  settings,
  iobValue,
  dailyMeals = [],
  plateItems,
  manualCarbs,
  setManualCarbs,
  onClearPlate,
  pendingSplits,
  onPostponeSplit,
  onTogglePauseSplit,
  onDismissSplit,
  onConfirmSecondDose,
  onRequestSafetyCheck,
  onUpdateSettings,
  onLogBolusAndMeal,
}) => {
  const [currentGlucose, setCurrentGlucose] = useState<string>(() =>
    settings.cgmConnection?.lastReading?.glucoseMgDl
      ? String(settings.cgmConnection.lastReading.glucoseMgDl)
      : ''
  );
  const [trendArrow, setTrendArrow] = useState<GlucoseTrend>(() =>
    settings.cgmConnection?.lastReading?.trendArrow || 'flat'
  );
  const [isCgmModalOpen, setIsCgmModalOpen] = useState<boolean>(false);
  const [isFetchingCgm, setIsFetchingCgm] = useState<boolean>(false);
  const [cgmError, setCgmError] = useState<string | null>(null);
  const [lastLiveReading, setLastLiveReading] = useState<LiveCgmReading | undefined>(
    settings.cgmConnection?.lastReading
  );
  const [selectedMealSlot, setSelectedMealSlot] = useState<MealTimeSlot>(() =>
    getCurrentMealTimeSlot()
  );
  const [selectedFixedSlot, setSelectedFixedSlot] = useState<MealTimeSlot | 'correction_only'>(() =>
    getCurrentMealTimeSlot()
  );
  const [customFixedMealUnitsOverride, setCustomFixedMealUnitsOverride] = useState<number | null>(null);
  const [mealMinutesAgo, setMealMinutesAgo] = useState<number>(0);
  const [recentBolusTimingMode, setRecentBolusTimingMode] = useState<'inject_now' | 'already_injected'>('inject_now');

  const isFixedDosesMode = settings.dosingMode === 'fixed_doses';
  const isFixedMode = isFixedDosesMode;
  const isSimpleMode = settings.interfaceMode === 'simple';
  const fixedCorrectionMethod = settings.fixedCorrectionMethod || 'sliding_scale';
  const fixedMealNone = selectedFixedSlot === 'correction_only';
  const rapidInsulinInfo = getRapidInsulinInfo(settings.rapidInsulinBrand);
  const mealIcrInfo = getEffectiveIcrForMealSlot(settings, selectedMealSlot);
  const effectiveIcr = mealIcrInfo.effectiveIcr;

  const activeSensorBrandInfo =
    SENSOR_BRAND_CATALOG.find((b) => b.id === (settings.sensorBrand || 'freestyle_libre')) ||
    SENSOR_BRAND_CATALOG[0];

  const handleFetchLiveCgm = async (silent = false) => {
    const conn = settings.cgmConnection;
    if (!conn || conn.provider === 'none') {
      if (!silent) setIsCgmModalOpen(true);
      return;
    }
    setIsFetchingCgm(true);
    if (!silent) setCgmError(null);
    try {
      const reading = await fetchLiveGlucoseFromConfiguredSource(conn);
      setCurrentGlucose(String(reading.glucoseMgDl));
      setTrendArrow(reading.trendArrow);
      setLastLiveReading(reading);
      if (onUpdateSettings) {
        onUpdateSettings({
          ...settings,
          cgmConnection: {
            ...conn,
            lastReading: reading,
          },
        });
      }
    } catch (err: any) {
      if (!silent) {
        setCgmError(err?.message || 'No se pudo sincronizar con el sensor.');
      }
    } finally {
      setIsFetchingCgm(false);
    }
  };

  // Auto-sincronizar al abrir o cada 5 min si el usuario lo activó
  useEffect(() => {
    const conn = settings.cgmConnection;
    if (!conn || conn.provider === 'none' || conn.provider === 'web_bluetooth') return;

    if (conn.autoSyncOnOpen !== false) {
      handleFetchLiveCgm(true);
    }

    if (conn.autoPollEvery5Min) {
      const interval = setInterval(() => {
        handleFetchLiveCgm(true);
      }, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [settings.cgmConnection?.provider, settings.cgmConnection?.autoPollEvery5Min]);
  const [customDelayHours, setCustomDelayHours] = useState<number | undefined>(undefined);
  const [deductIob, setDuctIob] = useState<boolean>(true);
  const [showFormulaDetails, setShowFormulaDetails] = useState<boolean>(false);
  const [showStackingGuide, setShowStackingGuide] = useState<boolean>(false);
  const [justLogged, setJustLogged] = useState<boolean>(false);
  const [autoPostponePreviousSplits, setAutoPostponePreviousSplits] = useState<boolean>(true);
  const [postponedSplitsNotice, setPostponedSplitsNotice] = useState<string | null>(null);

  // Compute total carbs, fiber and macros from plate items or manual input
  const plateCarbs = plateItems.reduce((acc, item) => acc + item.foodItem.carbsGrams * item.quantity, 0);
  const plateFiber = plateItems.reduce((acc, item) => acc + (item.foodItem.fiberGrams || 0) * item.quantity, 0);

  const plateAnimalProtein = plateItems.reduce((acc, item) => acc + item.foodItem.animalProteinGrams * item.quantity, 0);
  const platePlantProtein = plateItems.reduce((acc, item) => acc + item.foodItem.plantProteinGrams * item.quantity, 0);
  const plateFat = plateItems.reduce((acc, item) => acc + item.foodItem.fatGrams * item.quantity, 0);
  const plateCalories = plateItems.reduce((acc, item) => acc + item.foodItem.calories * item.quantity, 0);

  // REGLA CLÍNICA ARGENTINA (CAA / MERCOSUR): La dosis de bolus se calcula sobre los Carbohidratos declarados
  const carbsToUse = plateItems.length > 0 ? plateCarbs : manualCarbs;

  const bgNumber = parseFloat(currentGlucose) || 0;

  const currentCob = calculateDynamicCOB(dailyMeals || []);

  // CÁLCULO FISIOLÓGICO CLÍNICO CON PROYECCIÓN DE GLUCOSA E INSULINA ACTIVA (IOB)
  const projectedCalc = calculateProjectedGlucoseAndNetBolus({
    currentGlucose: bgNumber,
    targetGlucose: settings.targetGlucose,
    iobUnits: iobValue,
    isf: settings.isf,
    icr: effectiveIcr,
    carbsGrams: carbsToUse,
    trendArrow,
    cobGrams: currentCob,
    roundStep: settings.roundDoseTo,
    deductIob,
  });

  // Cálculo para Modalidad de Dosis Fijas por Comida + Escala de Glucosa (o FSI)
  const configuredFixedMealUnits = getFixedDoseForMealSlot(settings.fixedMealDoses, selectedFixedSlot);
  const activeFixedMealUnits =
    customFixedMealUnitsOverride !== null ? customFixedMealUnitsOverride : configuredFixedMealUnits;

  const slidingScaleMatch = calculateSlidingScaleCorrection(
    bgNumber,
    settings.correctionScale || DEFAULT_CORRECTION_SCALE
  );

  const fixedCorrectionUnits =
    bgNumber > 0 && bgNumber < 70
      ? 0
      : (settings.fixedCorrectionMethod || 'sliding_scale') === 'sliding_scale'
      ? slidingScaleMatch.units
      : projectedCalc.grossCorrectionUnits;

  const carbBolus = isFixedDosesMode ? activeFixedMealUnits : projectedCalc.carbBolusUnits;
  const grossCorrectionBolus = isFixedDosesMode ? fixedCorrectionUnits : projectedCalc.grossCorrectionUnits;

  // Deducción real de IOB para el desglose visual
  const appliedIobDeduction = deductIob ? iobValue : 0;

  const netDoseRaw = isFixedDosesMode
    ? bgNumber > 0 && bgNumber < 70
      ? 0
      : Math.round((carbBolus + grossCorrectionBolus - appliedIobDeduction) * 100) / 100
    : projectedCalc.netBolusRaw;

  const finalSuggestedDose = isFixedDosesMode
    ? netDoseRaw > 0
      ? roundDose(netDoseRaw, settings.roundDoseTo)
      : 0
    : projectedCalc.suggestedDose;

  const netCorrectionBolus = Math.max(0, grossCorrectionBolus - (deductIob ? iobValue : 0));

  // Desglose de carbohidratos rápidos vs lentos según los alimentos en el plato
  let knownFastCarbs = 0;
  let knownSlowCarbs = 0;
  let plateGi: 'Bajo' | 'Medio' | 'Alto' = 'Medio';

  if (plateItems.length > 0) {
    for (const item of plateItems) {
      const itemCarbs = item.foodItem.carbsGrams * item.quantity;
      if (item.foodItem.absorption === 'Rápida' || item.foodItem.gi === 'Alto') {
        knownFastCarbs += itemCarbs;
      } else if (item.foodItem.absorption === 'Lenta' || item.foodItem.gi === 'Bajo') {
        knownSlowCarbs += itemCarbs;
      } else {
        // Mixta: 50% rápido / 50% lento
        knownFastCarbs += itemCarbs * 0.5;
        knownSlowCarbs += itemCarbs * 0.5;
      }
    }
    const fastRatio = carbsToUse > 0 ? knownFastCarbs / carbsToUse : 0.5;
    plateGi = fastRatio >= 0.65 ? 'Alto' : fastRatio <= 0.35 ? 'Bajo' : 'Medio';
  }

  // ESTRATEGIA FISIOLÓGICA DE BOLO DIVIDIDO (SPLIT BOLUS / DUAL WAVE)
  const effectiveFat = plateItems.length > 0 ? plateFat : 0;
  const effectiveFiber = plateItems.length > 0 ? plateFiber : 0;
  const splitAdvice = calculateSplitBolusStrategy(
    finalSuggestedDose,
    carbsToUse,
    effectiveFat,
    plateAnimalProtein + platePlantProtein,
    effectiveFiber,
    settings.roundDoseTo,
    {
      carbBolusUnits: carbBolus,
      netCorrectionUnits: netCorrectionBolus,
      glycemicIndex: plateItems.length > 0 ? plateGi : undefined,
      knownFastCarbsGrams: plateItems.length > 0 ? knownFastCarbs : undefined,
      knownSlowCarbsGrams: plateItems.length > 0 ? knownSlowCarbs : undefined,
      trendArrow,
      currentGlucose: bgNumber,
      targetGlucose: settings.targetGlucose,
      customDelayHours,
      iPortState: settings.iPortState,
      dailyWorkout: settings.dailyWorkout,
      insulinMode: settings.insulinMode || 'manual_pen',
      pumpDayOfWear: settings.pumpSetTracker?.currentDayOfWear,
      zoneTissueConfig: settings.zoneTissueComposition,
    }
  );

  // Si la comida ya fue hace X minutos (mealMinutesAgo > 0), no debe diferir la 1ª dosis salvo que esté en hipoglucemia (<70)
  const isFirstDoseDeferred =
    mealMinutesAgo > 0
      ? bgNumber > 0 && bgNumber < 70
      : splitAdvice.preBolusAdvice?.injectionTimingType === 'post_meal' || (bgNumber > 0 && bgNumber < 85);
  const firstDoseDelayMinutes =
    splitAdvice.preBolusAdvice?.suggestedWaitMinutes ||
    getFirstDoseWaitMinutes(bgNumber, trendArrow, undefined, splitAdvice.preBolusAdvice?.timingMinutesText) ||
    25;

  // Glucose status visual helper
  const getGlucoseStatus = (bg: number) => {
    if (!bg) return { color: 'text-slate-400', bg: 'bg-slate-800', border: 'border-slate-700', label: 'Sin datos' };
    if (bg < 70) return { color: 'text-rose-400', bg: 'bg-rose-950/60', border: 'border-rose-800/80', label: 'Hipoglucemia (< 70 mg/dL)' };
    if (bg <= 130) return { color: 'text-emerald-400', bg: 'bg-emerald-950/60', border: 'border-emerald-800/80', label: 'En Rango Objetivo (70 - 130 mg/dL)' };
    if (bg <= 180) return { color: 'text-amber-400', bg: 'bg-amber-950/60', border: 'border-amber-800/80', label: 'Levemente Elevada (131 - 180 mg/dL)' };
    return { color: 'text-rose-400', bg: 'bg-rose-950/60', border: 'border-rose-800/80', label: 'Hiperglucemia (> 180 mg/dL)' };
  };

  const status = getGlucoseStatus(bgNumber);
  const activeConditions = getActiveMedicalConditions(settings);
  const conditionAlerts = evaluatePlateForCalculatorConditions(
    plateItems,
    carbsToUse,
    effectiveFat,
    effectiveFiber,
    plateAnimalProtein,
    settings
  );

  const buildMealDescription = (baseFallback: string) => {
    const recentTag = mealMinutesAgo > 0 ? `[Hace ${formatMinutesAgoLabel(mealMinutesAgo)}] ` : '';
    if (plateItems.length > 0) {
      return `${recentTag}${plateItems.map((i) => `${i.quantity} unid. ${i.foodItem.name}`).join(', ')}`;
    }
    if (isFixedDosesMode) {
      const slotName =
        selectedFixedSlot === 'correction_only'
          ? 'Solo Corrección de Glucosa'
          : `${MEAL_SLOT_LABELS[selectedFixedSlot].name} (Dosis fija ${activeFixedMealUnits} U)`;
      return `${recentTag}${slotName}`;
    }
    return `${recentTag}${baseFallback}`;
  };

  const effectiveBolusMinutesAgo =
    mealMinutesAgo > 0 && recentBolusTimingMode === 'already_injected' ? mealMinutesAgo : 0;

  // Registro del 100% en un solo bolo
  const handleRegisterSingleDose = () => {
    const mealDesc = buildMealDescription(`Comida manual (${carbsToUse}g HC)`);

    onLogBolusAndMeal({
      units: finalSuggestedDose,
      carbUnits: Math.round(carbBolus * 100) / 100,
      correctionUnits: Math.round(netCorrectionBolus * 100) / 100,
      carbsGrams: Math.round(carbsToUse * 10) / 10,
      carbsNetGrams: Math.round(carbsToUse * 10) / 10,
      fiberGrams: Math.round(plateFiber * 10) / 10,
      glucoseMgDl: bgNumber,
      mealDescription: mealDesc,
      animalProteinGrams: Math.round(plateAnimalProtein * 10) / 10,
      plantProteinGrams: Math.round(platePlantProtein * 10) / 10,
      fatGrams: Math.round(plateFat * 10) / 10,
      calories: Math.round(plateCalories),
      mealMinutesAgo,
      bolusMinutesAgo: effectiveBolusMinutesAgo,
      firstDoseIsPending: isFirstDoseDeferred,
      firstDoseDelayMinutes: firstDoseDelayMinutes,
    });

    // Protección Anti-Hipoglucemia: posponer automáticamente los bolos pendientes anteriores
    if (autoPostponePreviousSplits && pendingSplits && pendingSplits.length > 0 && onPostponeSplit && finalSuggestedDose > 0) {
      pendingSplits.forEach((s) => {
        onPostponeSplit(s.id, 45);
      });
      setPostponedSplitsNotice(`Se aumentó automáticamente +45 min a ${pendingSplits.length} bolo(s) pendiente(s) anterior(es) para evitar hipoglucemia.`);
      setTimeout(() => setPostponedSplitsNotice(null), 5000);
    }

    setJustLogged(true);
    setTimeout(() => setJustLogged(false), 3000);
  };

  // Registro de la 1ª dosis de bolo dividido (inicia IOB solo de la 1ª dosis y programa la 2ª)
  const handleRegisterSplitDose = () => {
    const mealDesc = buildMealDescription(`Comida (${carbsToUse}g HC, ${effectiveFat.toFixed(1)}g Grasa)`);

    // Si la comida fue hace X minutos, descontar ese tiempo ya transcurrido de la espera de la 2ª dosis (mínimo 30 min desde ahora)
    const elapsedMealHours = mealMinutesAgo > 0 ? mealMinutesAgo / 60 : 0;
    const adjustedSecondDoseDelayHours =
      mealMinutesAgo > 0
        ? Math.max(0.5, Math.round((splitAdvice.secondDoseDelayHours - elapsedMealHours) * 100) / 100)
        : splitAdvice.secondDoseDelayHours;

    onLogBolusAndMeal({
      units: splitAdvice.firstDoseUnits,
      carbUnits: Math.round(carbBolus * (splitAdvice.firstDosePct / 100) * 100) / 100,
      correctionUnits: Math.round(netCorrectionBolus * 100) / 100,
      carbsGrams: Math.round(carbsToUse * 10) / 10,
      carbsNetGrams: Math.round(carbsToUse * 10) / 10,
      fiberGrams: Math.round(plateFiber * 10) / 10,
      glucoseMgDl: bgNumber,
      mealDescription: mealDesc,
      animalProteinGrams: Math.round(plateAnimalProtein * 10) / 10,
      plantProteinGrams: Math.round(platePlantProtein * 10) / 10,
      fatGrams: Math.round(plateFat * 10) / 10,
      calories: Math.round(plateCalories),
      mealMinutesAgo,
      bolusMinutesAgo: effectiveBolusMinutesAgo,
      firstDoseIsPending: isFirstDoseDeferred,
      firstDoseDelayMinutes: firstDoseDelayMinutes,
      splitDetails: {
        isSplit: true,
        firstDoseUnits: splitAdvice.firstDoseUnits,
        secondDoseUnits: splitAdvice.secondDoseUnits,
        delayHours: adjustedSecondDoseDelayHours,
        absorptionWindowText: splitAdvice.absorptionWindowText,
        totalDose: finalSuggestedDose,
        firstDoseIsPending: isFirstDoseDeferred,
        firstDoseDelayMinutes: firstDoseDelayMinutes,
      },
    });

    if (autoPostponePreviousSplits && pendingSplits && pendingSplits.length > 0 && onPostponeSplit) {
      pendingSplits.forEach((s) => {
        onPostponeSplit(s.id, 45);
      });
      setPostponedSplitsNotice(`Se coordinó el horario (+45 min) para ${pendingSplits.length} bolo(s) pendiente(s) anterior(es) para evitar solapamiento de insulina.`);
      setTimeout(() => setPostponedSplitsNotice(null), 5000);
    }

    setJustLogged(true);
    setTimeout(() => setJustLogged(false), 3000);
  };

  const handleRegisterOnlyMeal = () => {
    const mealDesc = buildMealDescription(`[Comida sin insulina] Manual (${carbsToUse}g HC)`);

    onLogBolusAndMeal({
      units: 0,
      carbUnits: 0,
      correctionUnits: 0,
      carbsGrams: Math.round(carbsToUse * 10) / 10,
      carbsNetGrams: Math.round(carbsToUse * 10) / 10,
      fiberGrams: Math.round(plateFiber * 10) / 10,
      glucoseMgDl: 0,
      mealDescription: mealDesc,
      animalProteinGrams: Math.round(plateAnimalProtein * 10) / 10,
      plantProteinGrams: Math.round(platePlantProtein * 10) / 10,
      fatGrams: Math.round(plateFat * 10) / 10,
      calories: Math.round(plateCalories),
      mealMinutesAgo,
      bolusMinutesAgo: 0,
    });

    setJustLogged(true);
    setTimeout(() => setJustLogged(false), 3000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden p-5 md:p-6">
      
      {/* Header Title & Dosing Mode Quick Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
            <Calculator className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Calculadora de Dosis de Bolus</h2>
            <p className="text-xs text-slate-400">
              {isFixedDosesMode
                ? `Esquema de Dosis Fijas por Comida + ${
                    (settings.fixedCorrectionMethod || 'sliding_scale') === 'sliding_scale'
                      ? 'Escala de Glucosa'
                      : `Sensibilidad FSI (${settings.isf} mg/dL)`
                  } y resta de IOB`
                : `Cálculo de ${rapidInsulinInfo.shortName} con ajuste por FSI, ICR y resta de IOB activa`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">
              {isFixedDosesMode ? 'Modalidad Activa' : 'Relación Ratio ICR'}
            </span>
            <span className={`text-xs font-bold ${isFixedDosesMode ? 'text-amber-300' : 'text-teal-400'}`}>
              {isFixedDosesMode ? 'Dosis Fijas + Escala' : `1 U cada ${effectiveIcr}g HC`}
            </span>
          </div>
        </div>
      </div>

      {/* Selector rápido de zona de pinchazo SOLO cuando el modo activo es Pluma Manual */}
      {(() => {
        const activeMode = settings.insulinMode || 'manual_pen';
        if (activeMode !== 'manual_pen') return null;

        const currentIPort = settings.iPortState || {
          site: 'abdomen' as const,
          subSite: 'abdomen_lower_fat' as const,
          dayOfWear: 1,
          targetDurationDays: 4,
        };

        const profile = getIPortPharmacokineticProfile(
          currentIPort,
          activeMode,
          1,
          settings.zoneTissueComposition
        );

        const handleSelectQuickSite = (
          site: 'abdomen' | 'thigh' | 'arm' | 'glute',
          subSite: typeof currentIPort.subSite
        ) => {
          if (!onUpdateSettings) return;
          onUpdateSettings({
            ...settings,
            iPortState: {
              ...currentIPort,
              site,
              subSite,
            },
          });
        };

        return (
          <div className="mt-3 p-3 rounded-xl bg-slate-950/85 border border-teal-900/60 space-y-2.5 text-xs shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Syringe className="h-4 w-4 text-teal-400 shrink-0" />
                <span className="text-slate-200 font-semibold">
                  📍 ¿Dónde te vas a pinchar ahora? (Ajusta la espera antes de comer):
                </span>
                <strong className="text-teal-300">{profile.subSiteLabel}</strong>

                {/* Badge de consistencia del tejido real */}
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-teal-200 font-mono">
                  {profile.tissueConsistencyLabel}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                  Velocidad:{' '}
                  <strong
                    className={
                      profile.absorptionRateTone === 'slow'
                        ? 'text-amber-300'
                        : profile.absorptionRateTone === 'fast'
                        ? 'text-emerald-300'
                        : 'text-teal-300'
                    }
                  >
                    {profile.clinicalBadge}
                  </strong>
                </span>
                <span
                  className={`px-2 py-0.5 rounded border font-bold ${
                    profile.preBolusOffsetMinutes > 0
                      ? 'bg-amber-950/70 border-amber-600/60 text-amber-300'
                      : profile.preBolusOffsetMinutes < 0
                      ? 'bg-emerald-950/70 border-emerald-600/60 text-emerald-300'
                      : 'bg-teal-950/70 border-teal-700/60 text-teal-300'
                  }`}
                >
                  {profile.preBolusOffsetMinutes > 0
                    ? `+${profile.preBolusOffsetMinutes} min espera antes de comer`
                    : profile.preBolusOffsetMinutes < 0
                    ? `${profile.preBolusOffsetMinutes} min (más rápida)`
                    : 'Sin demora extra (0 min)'}
                </span>
              </div>
            </div>

            {/* Botones rápidos de 1 toque para elegir el lugar de aplicación ahora mismo */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {INJECTION_SITE_QUICK_OPTIONS.map((opt) => {
                const isSelected = currentIPort.subSite === opt.subSite;
                return (
                  <button
                    key={opt.subSite}
                    type="button"
                    onClick={() => handleSelectQuickSite(opt.site, opt.subSite)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] transition flex items-center gap-1.5 border cursor-pointer ${
                      isSelected
                        ? 'bg-teal-500/25 border-teal-400 text-teal-100 font-bold ring-1 ring-teal-500/40 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span>{opt.emoji}</span>
                    <span>{opt.shortLabel}</span>
                    <span
                      className={`text-[10px] font-mono ${
                        isSelected ? 'text-teal-300' : 'text-slate-500'
                      }`}
                    >
                      ({opt.zoneWaitOffsetText})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Banner de Aviso de 2ª Dosis Pendiente de comida anterior (Asistente Anti-Solapamiento) */}
      {pendingSplits && pendingSplits.length > 0 && (
        <div className="mt-4 p-4 rounded-2xl bg-amber-950/70 border-2 border-amber-500/70 text-slate-200 shadow-xl space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start space-x-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-amber-300 uppercase tracking-wider">
                  ⚠️ Tenés {pendingSplits.length} segundo(s) bolo(s) pendiente(s) en espera
                </h4>
                <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                  ¿Vas a comer ahora o te aplicaste insulina hace poco? <strong>Regla Anti-Hipoglucemia:</strong> Aumentá <strong>45 minutos</strong> al bolo pendiente para no juntar los picos de Novorapid en sangre.
                </p>
              </div>
            </div>
          </div>

          {/* Listado de Bolos Pendientes con Ajuste de Tiempo */}
          <div className="space-y-2.5">
            {pendingSplits.map((split) => {
              const dueMs = new Date(split.dueAt).getTime();
              const dueDate = new Date(dueMs);
              const dueTimeStr = `${dueDate.getHours().toString().padStart(2, '0')}:${dueDate.getMinutes().toString().padStart(2, '0')}`;

              return (
                <div key={split.id} className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/40 text-xs space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded mr-1.5 ${split.part === 1 ? 'bg-teal-900/80 text-teal-300 border border-teal-500/40' : 'bg-amber-900/80 text-amber-300 border border-amber-500/40'}`}>
                        {split.part === 1 ? '1ª Dosis' : '2ª Dosis'}
                      </span>
                      <strong className={`${split.part === 1 ? 'text-teal-300' : 'text-amber-300'} font-bold text-xs`}>{split.units} U Novorapid</strong>
                      <span className="text-slate-300 ml-1.5">({split.mealDescription} • {split.fatGrams}g grasa)</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Horario actual: <strong className={split.part === 1 ? 'text-teal-300' : 'text-amber-300'}>{dueTimeStr} hs</strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {onTogglePauseSplit && (
                      <button
                        type="button"
                        onClick={() => onTogglePauseSplit(split.id)}
                        id={`btn-card-toggle-pause-${split.id}`}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 ${
                          split.isPaused
                            ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700'
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5 text-amber-400" />
                        <span>{split.isPaused ? '▶️ Reanudar (+30m)' : '⏸️ Pausar bolo'}</span>
                      </button>
                    )}
                    {onRequestSafetyCheck ? (
                      <button
                        type="button"
                        onClick={() => onRequestSafetyCheck(split)}
                        id={`btn-card-safety-check-${split.id}`}
                        className="py-1.5 px-3 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-1.5 cursor-pointer ml-auto shadow-sm active:scale-95"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        <span>⚡ Chequear Sensor</span>
                      </button>
                    ) : onConfirmSecondDose ? (
                      <button
                        type="button"
                        onClick={() => onConfirmSecondDose(split.id)}
                        id={`btn-card-confirm-${split.id}`}
                        className="py-1.5 px-2.5 rounded-lg text-xs font-medium bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/50 transition flex items-center gap-1 cursor-pointer ml-auto"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Ya me la inyecté</span>
                      </button>
                    ) : null}
                    {onRequestSafetyCheck && onConfirmSecondDose && (
                      <button
                        type="button"
                        onClick={() => onConfirmSecondDose(split.id)}
                        id={`btn-card-confirm-direct-${split.id}`}
                        className="py-1.5 px-2 rounded-lg text-[11px] font-medium text-emerald-400 hover:bg-slate-800 transition cursor-pointer"
                        title="Registrar dosis original sin chequeo de sensor"
                      >
                        Ya me la inyecté
                      </button>
                    )}
                    {onDismissSplit && (
                      <button
                        type="button"
                        onClick={() => onDismissSplit(split.id)}
                        id={`btn-card-dismiss-${split.id}`}
                        className="py-1.5 px-2 rounded-lg text-xs text-slate-400 hover:text-rose-300 hover:bg-slate-800 border border-slate-700 transition flex items-center gap-1 cursor-pointer"
                        title="Descartar"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Toggle de Protección Automática Anti-Hipoglucemia */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
              <input
                type="checkbox"
                checked={autoPostponePreviousSplits}
                onChange={(e) => setAutoPostponePreviousSplits(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-400 focus:ring-offset-slate-950 cursor-pointer"
              />
              <span>
                <strong>Modo Automático:</strong> Al registrar una nueva inyección, sumar automáticamente <strong>+45 min</strong> a los bolos pendientes.
              </span>
            </label>
          </div>

          {/* Toast de confirmación de posposición */}
          {postponedSplitsNotice && (
            <div className="p-2.5 bg-emerald-950/90 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{postponedSplitsNotice}</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5">
        
        {/* Left Column: Inputs (Glucose & Carbs) */}
        <div className="lg:col-span-6 space-y-4">
          
          {/* Glucosa Actual Input */}
          <div className="space-y-2 bg-slate-950/80 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span>Glucemia Actual</span>
                {!isSimpleMode && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-teal-300 font-normal normal-case">
                    {settings.glucoseMode === 'cgm_reader'
                      ? `📟 ${activeSensorBrandInfo.shortName} (Lector sin NFC)`
                      : settings.glucoseMode === 'capillary'
                      ? '🩸 Glucómetro capilar'
                      : `${activeSensorBrandInfo.emoji} ${activeSensorBrandInfo.shortName}`}
                  </span>
                )}
              </label>
              <div className="flex items-center gap-2">
                {!isSimpleMode && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-medium">
                    {settings.insulinMode === 'pump' ? '📟 Bomba' : settings.insulinMode === 'iport' ? '🛡️ i-Port' : '💉 Pluma manual'}
                  </span>
                )}
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.color} border ${status.border}`}>
                  {status.label}
                </span>
              </div>
            </div>

            {/* Barra de Conexión Automática con Sensor (solo si el usuario tiene un conector configurado y activo y NO está en Modo Simple) */}
            {(() => {
              if (isSimpleMode) return null;

              const hasActiveCgm = Boolean(
                settings.cgmConnection && settings.cgmConnection.provider && settings.cgmConnection.provider !== 'none'
              );

              // Si el usuario no tiene ningún conector configurado (o usa sensor sin NFC / capilar / manual), no mostrar la barra ni molestar
              if (!hasActiveCgm) {
                return null;
              }

              return (
                <div className="bg-slate-900/90 border border-teal-800/50 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Radio className="h-4 w-4 text-teal-400 shrink-0" />
                    {hasActiveCgm ? (
                      <div className="truncate">
                        <span className="text-teal-300 font-bold">
                          Conector activo:{' '}
                          {settings.cgmConnection?.provider === 'librelinkup'
                            ? 'LibreLinkUp'
                            : settings.cgmConnection?.provider === 'dexcom_share'
                            ? 'Dexcom Share'
                            : settings.cgmConnection?.provider === 'nightscout'
                            ? 'Nightscout'
                            : settings.cgmConnection?.provider === 'xdrip_local'
                            ? 'xDrip+ / Juggluco'
                            : 'Bluetooth'}
                        </span>
                        {lastLiveReading && (
                          <span className="text-[11px] text-slate-400 ml-1.5">
                            • Última: <strong className="text-slate-200">{lastLiveReading.glucoseMgDl} mg/dL</strong> ({formatReadingAgeMinutes(lastLiveReading.timestamp).text})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-300">
                        ¿Querés traer tu glucosa sola sin escribirla? (LibreLinkUp, Dexcom, Medtronic, Sibionics, xDrip+)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasActiveCgm && (
                      <button
                        type="button"
                        onClick={() => handleFetchLiveCgm(false)}
                        disabled={isFetchingCgm}
                        className="px-2.5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isFetchingCgm ? 'animate-spin' : ''}`} />
                        <span>{isFetchingCgm ? 'Leyendo...' : 'Leer Sensor'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsCgmModalOpen(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                    >
                      <span>
                        {hasActiveCgm
                          ? '⚙️ Sensor'
                          : '📡 Conectar Sensor'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {cgmError && (
              <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-700/70 text-[11px] text-rose-200 flex items-center justify-between gap-2">
                <span>⚠️ {cgmError}</span>
                <button
                  type="button"
                  onClick={() => setCgmError(null)}
                  className="text-rose-400 hover:text-white font-bold px-1"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                id="input-glucose-level"
                value={currentGlucose}
                onChange={(e) => setCurrentGlucose(e.target.value)}
                placeholder="Ej. 110"
                className={`w-full bg-slate-900 border ${status.border} text-slate-100 placeholder:text-slate-600 placeholder:font-normal font-mono text-2xl font-bold rounded-xl py-3 px-4 focus:ring-2 focus:ring-teal-500 focus:outline-none transition shadow-inner min-h-[48px]`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                mg/dL
              </span>
            </div>

            {/* Selector de Flecha o Medición Capilar (Oculto en Modo Simple para no marear al usuario) */}
            {!isSimpleMode && (
              settings.glucoseMode === 'capillary' ? (
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                      <span>🩸 Medición Capilar (Glucómetro)</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950/60 border border-rose-800/60 text-rose-300 font-medium">
                      Puntual en dedo
                    </span>
                  </div>
                  <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">
                      Cálculo directo sobre glucemia medida ({currentGlucose || 100} mg/dL) sin requerir sensor continuo.
                    </span>
                    <button
                      type="button"
                      onClick={() => setTrendArrow(trendArrow === 'flat' ? 'rising' : 'flat')}
                      className="text-[10px] text-teal-400 hover:text-teal-300 underline shrink-0 cursor-pointer"
                    >
                      {trendArrow !== 'flat' ? 'Quitar flecha' : 'Simular flecha'}
                    </button>
                  </div>
                  {trendArrow !== 'flat' && (
                    <div className="grid grid-cols-5 gap-1.5 pt-1">
                      {TREND_OPTIONS.map((opt) => {
                        const isSelected = trendArrow === opt.trend;
                        return (
                          <button
                            key={opt.trend}
                            type="button"
                            onClick={() => setTrendArrow(opt.trend)}
                            id={`btn-trend-${opt.trend}`}
                            className={`py-1.5 px-1 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                              isSelected
                                ? `${opt.activeColor} ring-2 font-bold shadow-md bg-opacity-40`
                                : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <span className="text-base leading-none">{opt.symbol}</span>
                            <span className="text-[9px] tracking-tight truncate mt-0.5">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      {settings.glucoseMode === 'pump_sensor'
                        ? '📟 Sensor de Bomba:'
                        : settings.glucoseMode === 'cgm_reader'
                        ? '📟 Flecha en Lector FreeStyle:'
                        : 'Flecha de Tendencia del Sensor:'}
                    </span>
                    <span className="text-[11px] text-teal-400 font-medium">
                      Ajusta los minutos del 1er pinchazo
                    </span>
                  </div>

                  {/* 5 Botones de Dirección de Flecha */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {TREND_OPTIONS.map((opt) => {
                      const isSelected = trendArrow === opt.trend;
                      return (
                        <button
                          key={opt.trend}
                          type="button"
                          onClick={() => setTrendArrow(opt.trend)}
                          id={`btn-trend-${opt.trend}`}
                          className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer min-h-[54px] ${
                            isSelected
                              ? `${opt.activeColor} ring-2 font-bold shadow-md bg-opacity-40`
                              : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                          }`}
                        >
                          <span className="text-xl leading-none">{opt.symbol}</span>
                          <span className="text-[10px] tracking-tight truncate mt-1 font-medium">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            )}

            {/* Aviso Dinámico de Momento del 1er Pinchazo según la Flecha */}
            {splitAdvice.preBolusAdvice && (
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all mt-2.5 ${
                splitAdvice.preBolusAdvice.alertTone === 'rose'
                  ? 'bg-rose-950/60 border-rose-600/70 text-rose-200 shadow-md ring-1 ring-rose-500/30'
                  : splitAdvice.preBolusAdvice.alertTone === 'amber'
                  ? 'bg-amber-950/50 border-amber-600/60 text-amber-200'
                  : splitAdvice.preBolusAdvice.alertTone === 'cyan'
                  ? 'bg-cyan-950/50 border-cyan-600/60 text-cyan-200'
                  : 'bg-emerald-950/50 border-emerald-600/60 text-emerald-200'
              }`}>
                <Timer className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold flex items-center gap-1.5 flex-wrap">
                    <span>⏱️ Momento recomendado del 1er pinchazo:</span>
                    <span className="underline decoration-2 font-extrabold text-white">
                      {splitAdvice.preBolusAdvice.timingMinutesText}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-95">
                    {splitAdvice.preBolusAdvice.clinicalAdvice}
                  </p>
                  {rapidInsulinInfo.speedCategory === 'ultra_rapid' && (
                    <p className="text-[11px] font-bold text-teal-200 bg-teal-950/80 border border-teal-500/60 rounded-lg p-2 mt-1.5">
                      ⚡ Ajuste por {rapidInsulinInfo.shortName}: Como tu insulina es ultra-rápida (inicia en 2 a 5 min), acortá la espera unos 5 a 8 minutos respecto a una insulina común (o inyectá al empezar a comer si estás en rango) para evitar que te baje antes de digerir.
                    </p>
                  )}
                  {activeConditions.gastroparesis && (
                    <p className="text-[11px] font-bold text-indigo-200 bg-indigo-950/80 border border-indigo-500/60 rounded-lg p-2 mt-1.5">
                      🐢 Ajuste por Gastroparesia Activa: No hagas espera previa larga antes de comer. Aplicá la dosis al empezar el plato o al terminar para evitar que la insulina haga pico antes de que el estómago vacíe los carbohidratos.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Asistente de Rescate para Hipoglucemias (<70 mg/dL o <80 mg/dL en descenso) con Reloj de 15 Minutos */}
            {bgNumber > 0 &&
              (bgNumber < 70 ||
                (bgNumber < 80 && (trendArrow === 'falling' || trendArrow === 'falling_fast'))) && (
                <div className="pt-2">
                  <HypoRescueAssistantCard
                    currentGlucose={bgNumber}
                    trendArrow={trendArrow}
                    iobValue={iobValue}
                    weightKg={settings.weightKg}
                    icr={effectiveIcr}
                  />
                </div>
              )}

            {/* Alertas Clínicas Dinámicas según Condiciones Médicas Activas (Celiaquía, Gastroparesia, Lactosa, Renal, Colesterol) */}
            {conditionAlerts.length > 0 && (
              <div className="space-y-2 pt-1">
                {conditionAlerts.map((alert, idx) => {
                  const toneStyle =
                    alert.tone === 'rose'
                      ? 'bg-rose-950/70 border-rose-500/70 text-rose-200'
                      : alert.tone === 'indigo'
                      ? 'bg-indigo-950/70 border-indigo-500/70 text-indigo-200'
                      : alert.tone === 'amber'
                      ? 'bg-amber-950/70 border-amber-500/70 text-amber-200'
                      : 'bg-teal-950/70 border-teal-500/70 text-teal-200';

                  return (
                    <div
                      key={`${alert.conditionId}-${idx}`}
                      className={`p-3 rounded-xl border text-xs space-y-1 shadow-sm ${toneStyle}`}
                    >
                      <div className="font-bold text-white">{alert.title}</div>
                      <p className="text-[11px] leading-relaxed opacity-95">{alert.message}</p>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-[11px] text-slate-400 pt-1">
              Métrica objetivo: <strong className="text-slate-200">{settings.targetGlucose} mg/dL</strong> |{' '}
              {isFixedMode && fixedCorrectionMethod === 'sliding_scale' ? (
                <span>
                  Corrección: <strong className="text-indigo-300">Por Escala de Rangos</strong>
                </span>
              ) : (
                <span>
                  FSI: <strong className="text-slate-200">{settings.isf} mg/dL por U</strong>
                </span>
              )}
            </p>
          </div>

          {/* Comida / Dosis Fija + Selector de Comida Actual o Reciente */}
          <div className="space-y-3 bg-slate-950/80 border border-slate-800 rounded-xl p-4">
            {/* Barra superior: Modalidad Activa */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800/80">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {isFixedMode ? '📋 Esquema de Dosis Fija por Comida' : '🥖 Carbohidratos de la Comida'}
              </span>
            </div>

            {/* NUEVO: Selector de Momento de la Comida (Actual vs Reciente hace 10m, 15m, 30m, 1h...) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1.5">
                <span className="text-[11px] font-bold text-teal-300 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-teal-400" />
                  <span>¿Cuándo es esta comida?</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {mealMinutesAgo === 0 ? '🍽️ Comiendo ahora' : `⏪ Comida de hace ${formatMinutesAgoLabel(mealMinutesAgo)}`}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {RECENT_MEAL_TIME_OPTIONS.map((opt) => {
                  const isSelected = mealMinutesAgo === opt.minutesAgo;
                  return (
                    <button
                      key={opt.minutesAgo}
                      type="button"
                      onClick={() => setMealMinutesAgo(opt.minutesAgo)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                        isSelected
                          ? opt.minutesAgo === 0
                            ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-sm'
                            : 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Si eligió una comida reciente (> 0 min), preguntar si se inyecta recién ahora o si ya se había inyectado antes */}
              {mealMinutesAgo > 0 && (
                <div className="pt-2 border-t border-slate-800/80 space-y-2 animate-fadeIn">
                  <span className="text-[10px] font-bold text-amber-300 block">
                    ⏱️ Comiste hace {formatMinutesAgoLabel(mealMinutesAgo)}: ¿Cuándo te aplicás la insulina?
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRecentBolusTimingMode('inject_now')}
                      className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                        recentBolusTimingMode === 'inject_now'
                          ? 'bg-teal-950/70 border-teal-400 text-teal-100 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-[11px] block">💉 Me inyecto recién AHORA</span>
                      <span className="text-[10px] font-normal text-slate-300 block mt-0.5">
                        Ya comí hace {formatMinutesAgoLabel(mealMinutesAgo)}. No hace falta esperar pre-bolo: pinchate ahora.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecentBolusTimingMode('already_injected')}
                      className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                        recentBolusTimingMode === 'already_injected'
                          ? 'bg-indigo-950/70 border-indigo-400 text-indigo-100 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-[11px] block">
                        📝 Ya me pinché hace {formatMinutesAgoLabel(mealMinutesAgo)}
                      </span>
                      <span className="text-[10px] font-normal text-slate-300 block mt-0.5">
                        Solo olvidé anotarlo. Descuenta {formatMinutesAgoLabel(mealMinutesAgo)} de la curva de IOB.
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {isFixedMode ? (
              /* MODO DOSIS FIJAS POR COMIDA + ESCALA DE CORRECCIÓN */
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="text-xs font-bold text-indigo-200">
                    1. Elegí qué comida vas a hacer (o solo corrección):
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Podés editar tus valores fijos en ⚙️ Configuración
                  </span>
                </div>

                {/* Botones de Comidas Fijas + Opción Solo Corrección */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {(['breakfast', 'lunch', 'snack', 'dinner'] as MealTimeSlot[]).map((slot) => {
                    const slotMeta = MEAL_SLOT_LABELS[slot];
                    const defaultSlotUnits = getFixedDoseForMealSlot(settings.fixedMealDoses, slot);
                    const isActive = selectedFixedSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          setSelectedFixedSlot(slot);
                          setSelectedMealSlot(slot);
                          setCustomFixedMealUnitsOverride(null);
                        }}
                        className={`p-2 rounded-xl text-center transition border cursor-pointer ${
                          isActive
                            ? 'bg-indigo-500/25 border-indigo-400 text-indigo-100 font-bold shadow-sm ring-1 ring-indigo-400/30'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="text-xs block">
                          {slotMeta.emoji} {slotMeta.name}
                        </span>
                        <span className="text-sm font-mono font-extrabold text-indigo-300 block mt-0.5">
                          +{defaultSlotUnits} U
                        </span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFixedSlot('correction_only');
                      setCustomFixedMealUnitsOverride(null);
                    }}
                    className={`p-2 rounded-xl text-center transition border cursor-pointer col-span-2 sm:col-span-1 ${
                      fixedMealNone
                        ? 'bg-amber-500/25 border-amber-400 text-amber-100 font-bold shadow-sm ring-1 ring-amber-400/30'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-xs block">🩸 Solo Corrección</span>
                    <span className="text-sm font-mono font-extrabold text-amber-300 block mt-0.5">
                      0 U comida
                    </span>
                  </button>
                </div>

                {/* Casillero por si hoy quiere ajustar las unidades de esta comida puntual */}
                {selectedFixedSlot !== 'correction_only' && (
                  <div className="bg-slate-900/90 border border-indigo-500/30 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <span className="text-xs font-bold text-indigo-200 block">
                        Dosis fija para {MEAL_SLOT_LABELS[selectedFixedSlot].emoji}{' '}
                        {MEAL_SLOT_LABELS[selectedFixedSlot].name}:
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Si hoy vas a comer un poco más o menos, podés cambiar las unidades acá:
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="80"
                        value={
                          customFixedMealUnitsOverride !== null
                            ? String(customFixedMealUnitsOverride)
                            : String(configuredFixedMealUnits)
                        }
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') {
                            setCustomFixedMealUnitsOverride(0);
                          } else {
                            setCustomFixedMealUnitsOverride(Math.max(0, parseFloat(raw) || 0));
                          }
                        }}
                        className="w-24 bg-slate-950 border border-indigo-500/60 text-indigo-200 font-mono text-lg font-extrabold rounded-xl py-1.5 px-3 text-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <span className="text-xs font-bold text-indigo-300">U</span>
                    </div>
                  </div>
                )}

                {/* Resumen en vivo de la Escala de Corrección si está activa */}
                {fixedCorrectionMethod === 'sliding_scale' && (
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="text-[11px] font-bold text-amber-300">
                        📏 Tu Tabla de Corrección por Glucosa ({bgNumber} mg/dL):
                      </span>
                      <span className="text-xs font-mono font-extrabold text-amber-300">
                        {slidingScaleMatch.matchedBracket
                          ? `Escalón ${slidingScaleMatch.matchedBracket.minGlucose}-${slidingScaleMatch.matchedBracket.maxGlucose} mg/dL ➔ +${slidingScaleMatch.units} U`
                          : 'En rango normal (+0 U)'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] font-mono">
                      {(settings.correctionScale && settings.correctionScale.length > 0
                        ? settings.correctionScale
                        : DEFAULT_CORRECTION_SCALE
                      ).map((b) => {
                        const isMatched = slidingScaleMatch.matchedBracket?.id === b.id;
                        return (
                          <div
                            key={b.id}
                            className={`p-1.5 rounded-lg border text-center ${
                              isMatched
                                ? 'bg-amber-500/25 border-amber-400 text-amber-100 font-bold ring-1 ring-amber-400/40'
                                : 'bg-slate-950 border-slate-800 text-slate-400'
                            }`}
                          >
                            <span className="block">
                              {b.minGlucose}-{b.maxGlucose >= 999 ? 'más' : b.maxGlucose}
                            </span>
                            <span className="text-amber-300 font-extrabold">+{b.units} U</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* MODO CONTEO DE CARBOHIDRATOS TRADICIONAL */
              <>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] text-slate-400">
                    Ingresá los gramos de HC o sumalos desde el buscador de abajo:
                  </span>
                  <div className="flex items-center gap-2">
                    {onUpdateSettings && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateSettings({
                            ...settings,
                            enableMealTimeRatios: !settings.enableMealTimeRatios,
                            mealTimeRatios: settings.mealTimeRatios || {
                              breakfastIcr: settings.icr || 8,
                              lunchIcr: settings.icr || 10,
                              snackIcr: settings.icr || 10,
                              dinnerIcr: settings.icr || 10,
                            },
                          })
                        }
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                          settings.enableMealTimeRatios
                            ? 'bg-teal-500/20 border-teal-400 text-teal-200'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        🕒{' '}
                        {settings.enableMealTimeRatios
                          ? `Ratio por comida (1U:${effectiveIcr}g)`
                          : 'Usar Ratios por horario'}
                      </button>
                    )}
                    {plateItems.length > 0 && (
                      <button
                        onClick={onClearPlate}
                        className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Limpiar Plato ({plateItems.length} ítems)
                      </button>
                    )}
                  </div>
                </div>

                {/* Selector de Comida del Día cuando están activos los Ratios por Horario */}
                {settings.enableMealTimeRatios && (
                  <div className="grid grid-cols-4 gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
                    {(['breakfast', 'lunch', 'snack', 'dinner'] as MealTimeSlot[]).map((slot) => {
                      const slotMeta = MEAL_SLOT_LABELS[slot];
                      const slotIcr = getEffectiveIcrForMealSlot(settings, slot).effectiveIcr;
                      const isActive = selectedMealSlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedMealSlot(slot)}
                          className={`py-1.5 px-1 rounded-lg text-center transition border cursor-pointer ${
                            isActive
                              ? 'bg-teal-500/20 border-teal-400 text-teal-200 font-bold shadow-sm'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span className="text-[11px] block">
                            {slotMeta.emoji} {slotMeta.name}
                          </span>
                          <span className="text-[10px] font-mono text-teal-300">1U : {slotIcr}g</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {plateItems.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-teal-950/50 border border-teal-800/60">
                      <div>
                        <span className="text-xs font-bold text-teal-200 block">
                          Carbohidratos para Bolus (Rótulo Argentino):
                        </span>
                        <span className="text-[10px] text-teal-300/80">
                          HC: {plateCarbs.toFixed(1)}g | Fibra separada (CAA): {plateFiber.toFixed(1)}g (no se descuenta)
                        </span>
                      </div>
                      <span className="text-2xl font-extrabold font-mono text-teal-300">
                        {plateCarbs.toFixed(1)} g
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 max-h-24 overflow-y-auto space-y-1">
                      {plateItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between border-b border-slate-800/60 pb-1"
                        >
                          <span className="text-slate-300 truncate">
                            {item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'} •{' '}
                            {item.foodItem.name}
                          </span>
                          <span className="font-mono text-teal-300 font-semibold">
                            {(item.foodItem.carbsGrams * item.quantity).toFixed(1)}g HC
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        id="input-manual-carbs"
                        value={manualCarbs || ''}
                        onChange={(e) => setManualCarbs(parseFloat(e.target.value) || 0)}
                        placeholder="Ej. 40"
                        className="w-full bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-600 placeholder:font-normal font-mono text-xl font-bold rounded-xl py-3 px-4 focus:ring-2 focus:ring-teal-500 focus:outline-none transition shadow-inner min-h-[48px]"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-teal-400 text-xs font-bold">
                        g Carbohidratos
                      </span>
                    </div>
                    <p className="text-[11px] text-teal-300/90 mt-1.5 flex items-center gap-1">
                      🇦🇷 En Argentina / MERCOSUR (CAA), ingresa directamente los Carbohidratos del rótulo. La fibra se declara por separado y NO debe restarse.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Deduct Active Insulin Toggle (Oculto en Modo Simple para evitar saturación) */}
          {!isSimpleMode ? (
            <>
              <div className="bg-indigo-950/30 border border-indigo-900/40 rounded-xl p-3.5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-3">
                    <MinusCircle className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-indigo-200 block">Restar Insulina Activa (IOB)</span>
                      <span className="text-[11px] text-slate-400">
                        Descuenta {iobValue.toFixed(2)} U activas para amortizar corrección y comida.
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="toggle-deduct-iob"
                      checked={deductIob}
                      onChange={(e) => setDuctIob(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                
                {currentCob > 0 && deductIob && (
                  <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-lg p-2.5 flex items-start gap-2">
                    <Utensils className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[11px] font-bold text-indigo-300 block">Carbohidratos en Digestión Previa (COB Informativo)</span>
                      <span className="text-[10px] text-slate-300 block leading-tight mt-0.5">
                        Hay <strong>~{currentCob.toFixed(0)}g</strong> en tránsito digestivo. Para garantizar tu seguridad y evitar hipoglucemias severas con glucemia en descenso, se descuenta el <strong>100% de tu insulina activa ({iobValue.toFixed(2)} U)</strong>.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Proyección Fisiológica de Glucemia con Insulina Activa (IOB) */}
              {deductIob && iobValue > 0 && bgNumber > 0 && (
                <div className={`p-4 rounded-xl border space-y-3 transition-all ${
                  projectedCalc.projectedGlucoseWithoutFood < 70
                    ? 'bg-rose-950/50 border-rose-600/70 text-rose-100 shadow-lg shadow-rose-950/40'
                    : projectedCalc.projectedGlucoseWithoutFood < 90
                    ? 'bg-amber-950/50 border-amber-600/70 text-amber-100 shadow-lg shadow-amber-950/40'
                    : 'bg-indigo-950/40 border-indigo-700/60 text-indigo-100'
                }`}>
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide">
                      <ShieldAlert className="h-4 w-4 text-amber-300" /> Proyección de Glucemia por Insulina Activa
                    </span>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-black/40 border border-white/10">
                      IOB: {iobValue.toFixed(2)} U
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Glucosa Actual</span>
                      <span className="text-sm font-mono font-bold text-white">{bgNumber} mg/dL</span>
                    </div>
                    <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Descenso por IOB ({iobValue.toFixed(2)}U × {settings.isf})</span>
                      <span className="text-sm font-mono font-bold text-rose-400">-{projectedCalc.iobGlucoseDrop} mg/dL</span>
                    </div>
                    <div className="bg-black/40 p-2.5 rounded-lg border border-white/10">
                      <span className="text-[10px] text-slate-300 block font-semibold">Proyección sin comida</span>
                      <span className={`text-base font-mono font-extrabold ${
                        projectedCalc.projectedGlucoseWithoutFood < 70 ? 'text-rose-400 animate-pulse' : projectedCalc.projectedGlucoseWithoutFood < 90 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {projectedCalc.projectedGlucoseWithoutFood} mg/dL
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] space-y-1.5 bg-black/25 p-2.5 rounded-lg leading-relaxed">
                    {projectedCalc.isIobExcess ? (
                      <p className="text-rose-200 font-medium">
                        ⚠️ <strong>¡Alerta de Hipoglucemia Evitada!</strong> Tu insulina activa ({iobValue.toFixed(2)} U) descendería tu glucosa a <strong>{projectedCalc.projectedGlucoseWithoutFood} mg/dL</strong> sin comida. Tu dosis de comida ({carbBolus.toFixed(2)} U) es cubierta íntegramente por tu IOB{trendArrow !== 'flat' ? ` y tu tendencia ${trendArrow === 'falling' ? '↘️ en descenso' : trendArrow === 'falling_fast' ? '⬇️ en caída rápida' : '↗️ en alza'}` : ''}: sobran <strong>{projectedCalc.excessIobUnits.toFixed(2)} U</strong> activas.
                        <span className="block mt-1 text-emerald-300 font-bold">
                          🛡️ Dosis requerida: 0 U • NO te inyectes insulina para esta comida.
                        </span>
                      </p>
                    ) : (
                      <p className="text-slate-200">
                        🛡️ De tus <strong>{iobValue.toFixed(2)} U activas</strong>, las <strong>{projectedCalc.surplusIobAfterCorrection.toFixed(2)} U</strong> amortizan parte de esta dosis. Por eso se reduce a <strong>{finalSuggestedDose} U</strong>.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            // Modo Simple: Solo un aviso claro si la insulina activa ya cubre toda la comida
            projectedCalc.isIobExcess ? (
              <div className="bg-emerald-950/60 border border-emerald-600/70 rounded-xl p-3 text-xs text-emerald-200 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-emerald-300">
                  🛡️ ¡No necesitás inyectarte ahora!
                </span>
                <p className="text-[11px] leading-relaxed">
                  Todavía te queda insulina activa de antes ({iobValue.toFixed(1)} U) que cubre estos carbohidratos. La dosis sugerida es <strong>0 U</strong> para no tener una baja de azúcar.
                </p>
              </div>
            ) : null
          )}

        </div>

        {/* Right Column: Breakdown & Recommended Dose Result */}
        <div className="lg:col-span-6 flex flex-col justify-between bg-slate-950/90 border border-slate-800 rounded-2xl p-5 shadow-inner">
          
          <div className="space-y-4">
            {isSimpleMode ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Resumen de tu Cuenta
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 font-medium">
                    🟢 Modo Simple
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Comida */}
                  {carbsToUse > 0 && (
                    <div className="flex justify-between items-center bg-slate-900/70 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-300 font-medium">
                        🍞 Comida ({carbsToUse.toFixed(0)}g de carbohidratos):
                      </span>
                      <span className="font-mono font-bold text-teal-300 text-sm">
                        +{carbBolus.toFixed(1)} U
                      </span>
                    </div>
                  )}

                  {/* Corrección */}
                  {bgNumber > 0 && (
                    <div className="flex justify-between items-center bg-slate-900/70 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-300 font-medium">
                        🩸 Glucemia ({bgNumber} mg/dL):
                      </span>
                      <span className={`font-mono font-bold text-sm ${grossCorrectionBolus > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {grossCorrectionBolus > 0
                          ? `+${grossCorrectionBolus.toFixed(1)} U corrección`
                          : grossCorrectionBolus < 0
                          ? `-${Math.abs(grossCorrectionBolus).toFixed(1)} U (glucemia baja)`
                          : 'En objetivo (0 U)'}
                      </span>
                    </div>
                  )}

                  {/* Insulina activa amortizada */}
                  {deductIob && iobValue > 0 && appliedIobDeduction > 0 && (
                    <div className="flex justify-between items-center bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-800/40 text-xs">
                      <span className="text-indigo-300 font-medium">
                        🛡️ Insulina activa previa descontada:
                      </span>
                      <span className="font-mono font-bold text-indigo-300">
                        -{appliedIobDeduction.toFixed(1)} U
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {isFixedMode ? 'Desglose de Dosis Fija + Corrección' : 'Desglose Matemático de la Dosis'}
                  </span>
                  <button
                    onClick={() => setShowFormulaDetails(!showFormulaDetails)}
                    className="text-xs text-teal-400 hover:underline flex items-center gap-1"
                  >
                    {showFormulaDetails ? 'Ocultar fórmulas' : 'Ver fórmulas'}
                    {showFormulaDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* Step-by-step numbers */}
                <div className="space-y-2.5 font-mono text-sm">
                  
                  {/* Bolus por Comida (Carbohidratos o Dosis Fija) */}
                  <div className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-300 font-sans">
                      {isFixedMode
                        ? selectedFixedSlot === 'correction_only'
                          ? 'Dosis por Comida (Solo Corrección):'
                          : `Dosis Fija de ${MEAL_SLOT_LABELS[selectedFixedSlot].emoji} ${MEAL_SLOT_LABELS[selectedFixedSlot].name}:`
                        : `Bolus por HC (${carbsToUse.toFixed(1)}g ÷ ${effectiveIcr}${
                            settings.enableMealTimeRatios ? ` [${MEAL_SLOT_LABELS[selectedMealSlot].name}]` : ''
                          }):`}
                    </span>
                    <span className="font-bold text-slate-100">+{carbBolus.toFixed(2)} U</span>
                  </div>

                  {/* Bolus por Corrección de Glucemia (Escala o FSI) */}
                  <div className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-300 font-sans">
                      {isFixedMode && fixedCorrectionMethod === 'sliding_scale'
                        ? slidingScaleMatch.matchedBracket
                          ? `Corrección por Escala (${slidingScaleMatch.matchedBracket.minGlucose}-${slidingScaleMatch.matchedBracket.maxGlucose} mg/dL):`
                          : `Corrección por Escala (${bgNumber} mg/dL en rango):`
                        : trendArrow !== 'flat'
                        ? `Corrección con Flecha ${TREND_OPTIONS.find(t => t.trend === trendArrow)?.symbol || ''} (${bgNumber} ➔ ${projectedCalc.trendAdjustedGlucose} mg/dL vs ${settings.targetGlucose}):`
                        : bgNumber < settings.targetGlucose
                        ? `Ajuste por Glucemia Inicial (${bgNumber - settings.targetGlucose} mg/dL ÷ ${settings.isf}):`
                        : `Corrección hacia ${settings.targetGlucose} mg/dL (+${bgNumber - settings.targetGlucose} mg/dL ÷ ${settings.isf}):`}
                    </span>
                    <span className={`font-bold ${grossCorrectionBolus >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {grossCorrectionBolus >= 0 ? '+' : ''}{grossCorrectionBolus.toFixed(2)} U
                    </span>
                  </div>

                  {/* Explicación de Resta de Carbohidratos cuando la Glucosa o Flecha es a la baja */}
                  {projectedCalc.trendAdjustedGlucose < settings.targetGlucose && grossCorrectionBolus < 0 && (
                    <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-lg p-2.5 text-xs text-emerald-200 space-y-1">
                      <div className="flex items-center justify-between font-bold text-emerald-300">
                        <span>📉 Glucemia / Inercia en descenso ({projectedCalc.trendAdjustedGlucose} mg/dL &lt; {settings.targetGlucose} mg/dL):</span>
                        <span>-{Math.abs(grossCorrectionBolus).toFixed(2)} U restadas</span>
                      </div>
                      <p className="text-[11px] text-emerald-300/90 leading-tight">
                        Se restan <strong>{Math.abs(grossCorrectionBolus).toFixed(2)} U</strong> de la dosis de comida para amortiguar el descenso y sincronizar con la meta de <strong>{settings.targetGlucose} mg/dL</strong>.
                      </p>
                    </div>
                  )}

                  {/* Descuento Completo por Insulina Activa (IOB) */}
                  {deductIob && iobValue > 0 && (
                    <div className="flex justify-between items-center bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-800/40">
                      <div>
                        <span className="text-xs text-indigo-300 font-sans flex items-center gap-1 font-medium">
                          <MinusCircle className="h-3.5 w-3.5 text-indigo-400" /> Insulina Activa (IOB) descontada:
                        </span>
                        <span className="text-[10px] text-indigo-400/80 block">
                          Descenso -{projectedCalc.iobGlucoseDrop} mg/dL • Protege de superposición de dosis
                        </span>
                      </div>
                      <span className="font-bold text-indigo-300 text-sm">
                        -{appliedIobDeduction.toFixed(2)} U
                      </span>
                    </div>
                  )}

                  {/* Subtotal Neto Exacto antes de Redondeo */}
                  <div className="flex justify-between items-center text-xs text-slate-400 px-2 pt-1 border-t border-slate-800/60">
                    <span className="font-sans">Cálculo Neto Fisiológico:</span>
                    <span className={`font-semibold font-mono ${netDoseRaw <= 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {netDoseRaw.toFixed(2)} U {netDoseRaw <= 0 && '(Cubierto por IOB)'}
                    </span>
                  </div>
                </div>

                {/* Formulas explanation accordion */}
                {showFormulaDetails && (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-[11px] text-slate-300 space-y-1.5 font-sans leading-relaxed">
                    {isFixedMode ? (
                      <>
                        <p>• <strong>Dosis Fija de Comida:</strong> {activeFixedMealUnits.toFixed(2)} U ({selectedFixedSlot === 'correction_only' ? 'Solo corrección' : MEAL_SLOT_LABELS[selectedFixedSlot].name})</p>
                        <p>• <strong>Corrección de Glucosa:</strong> {fixedCorrectionMethod === 'sliding_scale' ? `${grossCorrectionBolus.toFixed(2)} U según tu tabla de rangos para ${bgNumber} mg/dL` : `(${projectedCalc.trendAdjustedGlucose} - ${settings.targetGlucose}) ÷ ${settings.isf} = ${grossCorrectionBolus.toFixed(2)} U`}</p>
                        <p>• <strong>Fórmula Total:</strong> {carbBolus.toFixed(2)} U (comida) {grossCorrectionBolus >= 0 ? `+ ${grossCorrectionBolus.toFixed(2)}` : `- ${Math.abs(grossCorrectionBolus).toFixed(2)}`} U (corrección) - {appliedIobDeduction.toFixed(2)} U (IOB) = <strong>{netDoseRaw.toFixed(2)} U</strong></p>
                      </>
                    ) : (
                      <>
                        <p>• <strong>Bolus HC:</strong> {carbsToUse.toFixed(1)}g HC ÷ {effectiveIcr} g/U = {carbBolus.toFixed(2)} U</p>
                        <p>• <strong>Corrección Inicial {trendArrow !== 'flat' ? `(con flecha ${trendArrow} ajustada a ${projectedCalc.trendAdjustedGlucose} mg/dL)` : ''}:</strong> ({projectedCalc.trendAdjustedGlucose} mg/dL - {settings.targetGlucose} mg/dL) ÷ {settings.isf} mg/U = {grossCorrectionBolus.toFixed(2)} U</p>
                        <p>• <strong>Descenso por IOB:</strong> {iobValue.toFixed(2)} U × {settings.isf} mg/dL = -{projectedCalc.iobGlucoseDrop} mg/dL (proyección sin comida: {projectedCalc.projectedGlucoseWithoutFood} mg/dL)</p>
                        <p>• <strong>Fórmula Neta Fisiológica:</strong> {carbBolus.toFixed(2)} U (comida) {grossCorrectionBolus >= 0 ? `+ ${grossCorrectionBolus.toFixed(2)}` : `- ${Math.abs(grossCorrectionBolus).toFixed(2)}`} U (glucemia) - {appliedIobDeduction.toFixed(2)} U (IOB) = <strong>{netDoseRaw.toFixed(2)} U</strong></p>
                      </>
                    )}
                    <p className="text-teal-300 font-medium pt-1">
                      Redondeado al bolígrafo ({settings.roundDoseTo} U): <strong>{finalSuggestedDose} U</strong>
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Warning if Hypo */}
            {bgNumber > 0 && bgNumber < 70 && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl flex items-start space-x-2.5 text-rose-200 text-xs">
                <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-rose-300 block">¡Atención! Glucemia en hipoglucemia ({bgNumber} mg/dL)</strong>
                  Trata primero la hipoglucemia con 15g de carbohidratos de absorción rápida antes de inyectar insulina.
                </div>
              </div>
            )}
          </div>

            {/* Big Suggested Dose Callout Card */}
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
            <div className={`border-2 rounded-2xl p-4 flex items-center justify-between shadow-lg ${
              finalSuggestedDose === 0
                ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-100'
                : 'bg-teal-950/60 border-teal-500/60 text-teal-100'
            }`}>
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-teal-300 block">
                  {finalSuggestedDose === 0
                    ? '🛡️ Dosis Recomendada: 0 U (No Inyectar)'
                    : `Dosis Total de ${rapidInsulinInfo.shortName}`}
                </span>
                <span className="text-[11px] text-teal-200/80 block">
                  {finalSuggestedDose === 0
                    ? `Tu IOB de ${iobValue.toFixed(2)} U cubre esta ingesta`
                    : mealMinutesAgo > 0
                    ? recentBolusTimingMode === 'already_injected'
                      ? `Se registrará con hora de hace ${formatMinutesAgoLabel(mealMinutesAgo)}`
                      : `Comida hace ${formatMinutesAgoLabel(mealMinutesAgo)} • Inyectar ahora (${netDoseRaw.toFixed(2)} U)`
                    : `Valor exacto calculado: ${netDoseRaw.toFixed(2)} U`}
                </span>
              </div>
              <div className="text-right">
                <div className="text-3xl font-extrabold font-mono text-teal-300 tracking-tight">
                  {finalSuggestedDose} <span className="text-lg font-bold text-teal-400">U</span>
                </div>
                <span className="text-[10px] text-teal-400/90 font-medium">Redondeo {settings.roundDoseTo}U</span>
              </div>
            </div>

            {/* APARTADO Y AVISO ORIENTATIVO DE LOS 42 FACTORES AL MOMENTO DE APLICAR INSULINA (Solo en Modo Completo) */}
            {!isSimpleMode && (() => {
              const factorAdvisories = evaluateActiveGlycemicFactorsForBolus(finalSuggestedDose, settings);
              const manualActiveFactors = settings.dailyWorkout?.activeGlycemicFactors || [];

              const handleQuickToggleFactor = (factorId: ActiveGlycemicFactorId) => {
                if (!onUpdateSettings) return;
                const currentWorkout = settings.dailyWorkout || {
                  routineType: 'chest_back',
                  weightsDone: null,
                  walkDone: null,
                  weekendActivity: 'none',
                  customRoutineItems: [],
                  activeGlycemicFactors: [],
                };
                const currentList = currentWorkout.activeGlycemicFactors || [];
                const nextList = currentList.includes(factorId)
                  ? currentList.filter((id) => id !== factorId)
                  : [...currentList, factorId];

                onUpdateSettings({
                  ...settings,
                  dailyWorkout: {
                    ...currentWorkout,
                    activeGlycemicFactors: nextList,
                  },
                });
              };

              return (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      <span>Factores de Hoy al Aplicar Insulina (42 Factores):</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Solo da consejo orientativo • No modifica tu número sin avisar
                    </span>
                  </div>

                  {/* Botones rápidos para marcar factores frecuentes antes de inyectar */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {ACTIONABLE_GLYCEMIC_FACTORS.map((f) => {
                      const isChecked = manualActiveFactors.includes(f.id);
                      const isAuto = factorAdvisories.some(
                        (a) => a.factorId === f.id && a.isAutoLinkedFromWorkout
                      );
                      const isActive = isChecked || isAuto;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => handleQuickToggleFactor(f.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition border cursor-pointer ${
                            isActive
                              ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          <span>{f.emoji}</span>
                          <span>{f.shortName}</span>
                          {isActive && <span className="text-amber-300 font-bold">✓</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tarjetas de Aviso / Consejo cuando hay algún factor confirmado */}
                  {factorAdvisories.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {factorAdvisories.map((adv) => {
                        const boxStyle =
                          adv.tone === 'rose'
                            ? 'bg-rose-950/60 border-rose-500/70 text-rose-100'
                            : adv.tone === 'teal'
                            ? 'bg-teal-950/60 border-teal-500/70 text-teal-100'
                            : adv.tone === 'indigo'
                            ? 'bg-indigo-950/60 border-indigo-500/70 text-indigo-100'
                            : 'bg-amber-950/60 border-amber-500/70 text-amber-100';

                        return (
                          <div
                            key={adv.id}
                            className={`p-3 rounded-xl border text-xs space-y-1.5 shadow-md ${boxStyle}`}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-bold text-white flex items-center gap-1.5">
                                <span>{adv.emoji}</span>
                                <span>{adv.headline}: {adv.name}</span>
                              </span>
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/40 border border-white/15 text-amber-200">
                                {adv.badgeText}
                              </span>
                            </div>

                            <p className="text-[11px] leading-relaxed opacity-95">
                              {adv.physiologicalExplanation}
                            </p>

                            <div className="p-2 rounded-lg bg-black/35 border border-white/10 text-[11px] font-bold text-amber-200 flex items-start gap-1.5">
                              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="block">{adv.recommendedRangeText}</span>
                                <span className="font-normal text-[10px] text-slate-300 block mt-0.5">
                                  {adv.detailedWarning} (Tu cálculo original de {finalSuggestedDose} U se mantiene arriba sin alterar para que vos decidas).
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Banner de Protección Activa cuando la dosis es 0 U por IOB activo */}
            {finalSuggestedDose === 0 && carbsToUse > 0 && iobValue > 0 && (
              <div className="p-3.5 bg-emerald-950/70 border border-emerald-500/80 rounded-xl text-xs text-emerald-100 space-y-1.5 shadow-md">
                <div className="flex items-center gap-2 font-bold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>PROTECCIÓN ANTI-HIPOGLUCEMIA ACTIVA: 0 U RECOMENDADAS</span>
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-200/95">
                  Tenés <strong>{iobValue.toFixed(2)} U de insulina activa</strong> trabajando en sangre y tu sensor marca <strong>{bgNumber} mg/dL</strong> ({trendArrow === 'falling' ? '↘️ bajando' : trendArrow === 'falling_fast' ? '⬇️ bajando rápido' : '➡️'}). 
                  Esa insulina activa bajará tu glucosa en <strong>-{projectedCalc.iobGlucoseDrop} mg/dL</strong>, lo que neutraliza por completo los <strong>{carbsToUse.toFixed(1)}g de carbohidratos</strong> de esta comida sin requerir insulina extra.
                </p>
              </div>
            )}

            {/* RECOMENDACIÓN DE BOLO DIVIDIDO (SPLIT / DUAL-WAVE BOLUS) SEGÚN GRASAS Y FIBRA */}
            {finalSuggestedDose > 0 && carbsToUse > 0 && (
              isSimpleMode ? (
                splitAdvice.requiresSplit ? (
                  <div className="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wide">
                      <Split className="h-4 w-4" />
                      <span>Comida con grasa o fritura: Podés dividir la dosis</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      Si comés empanadas, pizza o alimentos fritos, dividir en 2 partes evita que te baje el azúcar al principio y te suba horas después:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-center pt-1">
                      <div className="bg-slate-900/90 border border-teal-500/40 p-2.5 rounded-xl">
                        <span className="text-[10px] text-teal-300 block font-bold">1ª PARTE (Ahora)</span>
                        <span className="text-2xl font-mono font-extrabold text-teal-300">{splitAdvice.firstDoseUnits} U</span>
                      </div>
                      <div className="bg-slate-900/90 border border-amber-500/40 p-2.5 rounded-xl">
                        <span className="text-[10px] text-amber-300 block font-bold">2ª PARTE (en 2 horas)</span>
                        <span className="text-2xl font-mono font-extrabold text-amber-300">{splitAdvice.secondDoseUnits} U</span>
                      </div>
                    </div>
                  </div>
                ) : null
              ) : (
                <div className={`rounded-2xl p-4 border transition-all ${
                  splitAdvice.requiresSplit
                    ? splitAdvice.strategy === 'dual_extended'
                      ? 'bg-amber-950/40 border-amber-500/50 shadow-md'
                      : 'bg-indigo-950/40 border-indigo-500/50 shadow-md'
                    : 'bg-slate-900/80 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1.5 rounded-lg ${
                        splitAdvice.requiresSplit
                          ? splitAdvice.strategy === 'dual_extended'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-indigo-500/20 text-indigo-400'
                          : 'bg-teal-500/20 text-teal-400'
                      }`}>
                        <Split className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">
                          {splitAdvice.requiresSplit ? '⚡ Estrategia de Bolo Dividido Recomendada' : '🎯 Bolo Único Recomendado'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Absorción: <strong className={splitAdvice.requiresSplit ? 'text-amber-300' : 'text-teal-300'}>{splitAdvice.absorptionLabel}</strong> (Grasas: {effectiveFat.toFixed(1)}g | Fibra: {effectiveFiber.toFixed(1)}g)
                        </span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      splitAdvice.requiresSplit
                        ? splitAdvice.strategy === 'dual_extended'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {splitAdvice.requiresSplit ? `División ${splitAdvice.firstDosePct}/${splitAdvice.secondDosePct}` : '100% Inmediato'}
                    </span>
                  </div>

                  {/* Micro Fila Fisiológica: HC Rápidos vs Lentos y Retardos */}
                  {splitAdvice.requiresSplit && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      <div className="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">HC Rápidos:</span>
                        <strong className="text-teal-300">{splitAdvice.fastCarbsGrams}g ({splitAdvice.fastCarbsRatioPct}%)</strong>
                      </div>
                      <div className="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">HC Lentos:</span>
                        <strong className="text-indigo-300">{splitAdvice.slowCarbsGrams}g</strong>
                      </div>
                      <div className="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Retardo Grasa:</span>
                        <strong className="text-amber-300">+{splitAdvice.fatDelayMinutes} min</strong>
                      </div>
                      <div className="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Retardo Fibra:</span>
                        <strong className="text-emerald-300">+{splitAdvice.fiberDelayMinutes} min</strong>
                      </div>
                    </div>
                  )}

                  {/* Badge contextual de Zona de Aplicación en Bolo Dividido */}
                  {splitAdvice.iPortProfile && (
                    <div className="mt-2 py-1.5 px-2.5 rounded-lg bg-slate-950/80 border border-teal-900/60 flex items-center justify-between text-[10px] text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Syringe className="h-3.5 w-3.5 text-teal-400" />
                        {settings.insulinMode === 'manual_pen'
                          ? 'Zona de pinchazo:'
                          : settings.insulinMode === 'pump'
                          ? 'Set de Bomba:'
                          : 'Puerto i-Port:'}{' '}
                        <strong className="text-teal-200">{splitAdvice.iPortProfile.subSiteLabel}</strong>
                      </span>
                      <span className="font-mono text-teal-300">
                        {settings.insulinMode === 'manual_pen'
                          ? splitAdvice.iPortProfile.clinicalBadge
                          : `Día ${splitAdvice.iPortProfile.effectiveDayOfWear} • ${splitAdvice.iPortProfile.clinicalBadge}`}
                      </span>
                    </div>
                  )}

                  {/* Detalle visual de las dos fracciones de dosis */}
                  {splitAdvice.requiresSplit ? (
                    <div className="mt-3 space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        
                        {/* 1ra Dosis */}
                        <div className={`border rounded-xl p-3 flex flex-col justify-between ${
                          bgNumber < 70
                            ? 'bg-rose-950/40 border-rose-600/60'
                            : bgNumber < 85
                            ? 'bg-amber-950/40 border-amber-600/60'
                            : 'bg-slate-900/90 border-slate-700/80'
                        }`}>
                          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                            <span className="font-semibold text-slate-200 flex items-center gap-1">
                              <Timer className="h-3 w-3 text-teal-400" /> 1ª Dosis ({splitAdvice.firstDosePct}%)
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              bgNumber < 70
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : bgNumber < 85
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'text-slate-400'
                            }`}>
                              {bgNumber < 70 ? '20-30m post-comida' : bgNumber < 85 ? '15-20m post-comida' : 'Al comer / Pre-bolo'}
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-2xl font-extrabold font-mono text-teal-300">
                              {splitAdvice.firstDoseUnits} <span className="text-xs font-bold text-teal-400">U</span>
                            </span>
                          </div>
                          <div className="mt-1 text-[10px] text-teal-300/90 font-medium">
                            {splitAdvice.correctionDoseUnits > 0 ? (
                              <span>{splitAdvice.correctionDoseUnits} U corrección (a 100 mg/dL) + {splitAdvice.fastCarbDoseUnits} U HC iniciales</span>
                            ) : bgNumber < 85 ? (
                              <span className="text-amber-300">Cubre la fase inicial de HC tras remontar glucosa</span>
                            ) : (
                              <span>{splitAdvice.fastCarbDoseUnits} U para absorción inicial de HC</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-300 mt-1.5 leading-tight bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80">
                            🕒 <strong>Momento:</strong> {splitAdvice.firstDoseTiming}
                          </p>
                        </div>

                        {/* 2da Dosis */}
                        <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-3 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                            <span className="font-semibold text-amber-300 flex items-center gap-1">
                              <Clock className="h-3 w-3 text-amber-400" /> 2ª Dosis ({splitAdvice.secondDosePct}%)
                            </span>
                            <span className="text-[10px] text-amber-400 font-bold font-mono">+{splitAdvice.secondDoseDelayFormatted}</span>
                          </div>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-2xl font-extrabold font-mono text-amber-300">
                              {splitAdvice.secondDoseUnits} <span className="text-xs font-bold text-amber-400">U</span>
                            </span>
                          </div>
                          <div className="mt-1 text-[10px] text-amber-300/90 font-medium">
                            <span>{splitAdvice.slowCarbDoseUnits} U para digestión sostenida (grasas/almidón lento)</span>
                          </div>
                          <p className="text-[10px] text-slate-300 mt-1.5 leading-tight bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80">
                            🕒 <strong>Momento:</strong> {splitAdvice.secondDoseTiming}
                          </p>
                        </div>

                      </div>

                      {/* Ventana Dinámica de Auditoría Fisiológica */}
                      {splitAdvice.absorptionWindowText && (
                        <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-between text-xs text-amber-200">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                            <span>
                              <strong>Ventana Fisiológica:</strong> {splitAdvice.absorptionWindowText}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-amber-300/80 hidden sm:inline">
                            Freno: +{splitAdvice.fatDelayMinutes}m grasa / +{splitAdvice.fiberDelayMinutes}m fibra
                          </span>
                        </div>
                      )}

                      {/* Aviso si hay una comida previa en curso (Solapamiento de Eventos) */}
                      {pendingSplits && pendingSplits.some((s) => s.part === 2) && (
                        <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 flex items-start gap-2 text-xs text-indigo-200">
                          <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-indigo-100 block">Comida previa con digestión en curso detectada:</strong>
                            <span className="text-[11px] text-indigo-300/90 leading-tight block mt-0.5">
                              Esta nueva ingesta cubrirá sus carbohidratos inmediatos ahora con la 1ª dosis. Su componente graso se coordinará con la auditoría tardía para no amontonar picos de insulina.
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Chips interactivos para ajustar el tiempo del 2º bolo (ej. si la glucosa sube antes) */}
                      <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-300 font-semibold flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-amber-400" />
                            <span>¿Tu glucemia sube antes o después? Ajusta el tiempo del 2º bolo:</span>
                          </span>
                          <span className="font-mono text-amber-300 font-bold">
                            +{splitAdvice.secondDoseDelayFormatted}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[
                            { label: '45 min', hours: 0.75 },
                            { label: '1 h 00m', hours: 1.0 },
                            { label: '1 h 15m', hours: 1.25 },
                            { label: '1 h 30m', hours: 1.5 },
                            { label: '1 h 45m', hours: 1.75 },
                            { label: '2 h 00m', hours: 2.0 },
                          ].map((slot) => {
                            const isCurrent = Math.abs(splitAdvice.secondDoseDelayHours - slot.hours) < 0.05;
                            return (
                              <button
                                key={slot.label}
                                type="button"
                                onClick={() => setCustomDelayHours(slot.hours)}
                                id={`btn-delay-chip-${slot.label.replace(/\s+/g, '')}`}
                                className={`py-1 px-2.5 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                                  isCurrent
                                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                                }`}
                              >
                                {slot.label}
                              </button>
                            );
                          })}
                          {customDelayHours !== undefined && (
                            <button
                              type="button"
                              onClick={() => setCustomDelayHours(undefined)}
                              className="text-[10px] text-teal-400 hover:underline px-1 font-semibold cursor-pointer"
                              title="Restablecer al cálculo automático"
                            >
                              ↺ Auto
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Explicación médica/fisiológica */}
                      <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/60 flex items-start gap-2">
                        <Info className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{splitAdvice.clinicalExplanation}</span>
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2.5 text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-start gap-2">
                      <Info className="h-3.5 w-3.5 text-teal-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-teal-300 block">Aplicar {finalSuggestedDose} U en 1 sola inyección:</strong>
                        <span className="text-[11px] text-slate-400">{splitAdvice.firstDoseTiming}. {splitAdvice.clinicalExplanation}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}

            {/* Submit / Log Button */}
            {isSimpleMode && splitAdvice.requiresSplit ? (
              <div className="space-y-2.5">
                {/* Opción 1: Aplicar todo de una */}
                <button
                  onClick={handleRegisterSingleDose}
                  id="btn-register-single-full"
                  disabled={justLogged}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-teal-500 hover:bg-teal-400 text-slate-950 flex items-center justify-center space-x-2 transition shadow-lg active:scale-[0.98] cursor-pointer"
                >
                  <Syringe className="h-5 w-5" />
                  <span>
                    {justLogged
                      ? '¡Dosis Completa Registrada!'
                      : `Inyectar todo de una sola vez (${finalSuggestedDose} U)`}
                  </span>
                </button>

                {/* Opción 2: Dividir la dosis en dos */}
                <button
                  onClick={handleRegisterSplitDose}
                  id="btn-register-split-dose-1"
                  disabled={justLogged}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 flex items-center justify-center space-x-2 transition shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  <Split className="h-4 w-4" />
                  <span>
                    {justLogged
                      ? '¡1ª Dosis Registrada y Recordatorio Activado!'
                      : `Dividir dosis (${splitAdvice.firstDoseUnits} U ahora + ${splitAdvice.secondDoseUnits} U en 2h)`}
                  </span>
                </button>
              </div>
            ) : splitAdvice.requiresSplit ? (
              <div className="space-y-2">
                {/* Botón Principal: Registrar 1ª Dosis e Iniciar Timer */}
                <button
                  onClick={handleRegisterSplitDose}
                  id="btn-register-split-dose-1"
                  disabled={justLogged}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition shadow-lg ${
                    justLogged
                      ? 'bg-emerald-600 text-white'
                      : isFirstDoseDeferred
                      ? 'bg-teal-500 hover:bg-teal-400 text-slate-950 active:scale-[0.98] cursor-pointer'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-[0.98] cursor-pointer'
                  }`}
                >
                  {justLogged ? (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      <span>
                        {isFirstDoseDeferred
                          ? `¡1ª Dosis (+${firstDoseDelayMinutes}m) y 2ª Dosis Programadas en el Reloj!`
                          : `¡1ª Dosis (${splitAdvice.firstDoseUnits} U) Registrada y Timer Activado!`}
                      </span>
                    </>
                  ) : (
                    <>
                      <Split className="h-5 w-5" />
                      <span>
                        {isFirstDoseDeferred
                          ? `⏱️ Programar 1ª Dosis (+${firstDoseDelayMinutes} min) y 2ª Dosis (+${splitAdvice.secondDoseDelayFormatted})`
                          : `Aplicar 1ª Dosis (${splitAdvice.firstDoseUnits} U) y Programar 2ª (${splitAdvice.secondDoseUnits} U)`}
                      </span>
                    </>
                  )}
                </button>

                {/* Botón Secundario: Aplicar 100% de una sola vez si el usuario lo prefiere */}
                <button
                  onClick={handleRegisterSingleDose}
                  id="btn-register-single-full"
                  disabled={justLogged}
                  className="w-full py-2 px-3 rounded-xl font-semibold text-xs bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/80 flex items-center justify-center space-x-2 transition cursor-pointer"
                >
                  <Syringe className="h-4 w-4 text-teal-400" />
                  <span>
                    {isFirstDoseDeferred
                      ? `Programar dosis completa de golpe (+${firstDoseDelayMinutes} min) (${finalSuggestedDose} U)`
                      : `Aplicar dosis completa de golpe (${finalSuggestedDose} U en 1 solo bolo)`}
                  </span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleRegisterSingleDose}
                id="btn-register-bolus-dose"
                disabled={justLogged}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition shadow-lg ${
                  justLogged
                    ? 'bg-emerald-600 text-white'
                    : 'bg-teal-500 hover:bg-teal-400 text-slate-950 active:scale-[0.98] cursor-pointer'
                }`}
              >
                {justLogged ? (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    <span>
                      {isFirstDoseDeferred
                        ? '¡1ª Dosis Programada como Pendiente en el Reloj!'
                        : '¡Dosis e Inyección Registrada!'}
                    </span>
                  </>
                ) : (
                  <>
                    <Syringe className="h-5 w-5" />
                    <span>
                      {isFirstDoseDeferred
                        ? `⏱️ Programar 1ª Dosis (+${firstDoseDelayMinutes} min tras comer) (${finalSuggestedDose} U)`
                        : `Registrar Dosis Administrada (${finalSuggestedDose} U)`}
                    </span>
                  </>
                )}
              </button>
            )}

            {/* Secondary Option: Register meal only without insulin */}
            <button
              onClick={handleRegisterOnlyMeal}
              id="btn-register-only-meal"
              disabled={justLogged}
              className="w-full py-2.5 px-4 rounded-xl font-medium text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center space-x-2 transition shadow-sm active:scale-[0.98]"
            >
              <Clock className="h-4 w-4 text-teal-400" />
              <span>Registrar solo comida pasada / sin dosis de insulina (0 U)</span>
            </button>

            {/* Guía Médica Rápida: Solapamiento de Bolos y Flechas FreeStyle (Oculto en Modo Simple) */}
            {!isSimpleMode && (
              <div className="pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowStackingGuide(!showStackingGuide)}
                  className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 font-semibold text-amber-300/90">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Guía: ¿Qué hacer si como antes de la 2ª dosis o baja mi glucosa?</span>
                  </span>
                  {showStackingGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

              {showStackingGuide && (
                <div className="mt-2.5 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-3 animate-fade-in leading-relaxed">
                  <div className="space-y-1">
                    <strong className="text-amber-300 block font-bold">
                      1. ¿Qué hacer si quiero comer antes de que se cumpla el tiempo de la 2ª dosis anterior?
                    </strong>
                    <p className="text-[11px] text-slate-300">
                      <strong>Regla de Oro Anti-Hipoglucemia:</strong> 🛑 <em>NUNCA juntes la 2ª dosis anterior con la inyección de ahora</em>. Si las juntas, tendrías un pico masivo de insulina en sangre y caerías en hipoglucemia severa a los 40-50 minutos.
                    </p>
                    <p className="text-[11px] text-slate-300">
                      <strong>Conducta correcta:</strong> Inyéctate <em>únicamente</em> la dosis que te calcula esta nueva comida. Para la 2ª dosis que te quedó pendiente, usa el botón <strong>[+45m]</strong> o <strong>[+1h]</strong> para posponerla.
                    </p>
                  </div>

                  <div className="space-y-1 pt-1.5 border-t border-slate-800/80">
                    <strong className="text-teal-300 block font-bold">
                      2. Las 5 Flechas del Sensor FreeStyle Libre 2 y Tiempos de Inyección:
                    </strong>
                    <ul className="text-[11px] space-y-1 text-slate-300">
                      <li>• <span className="font-bold text-rose-300">⬇️ Bajando rápido:</span> <strong>NUNCA</strong> pinchar antes. Inyectar al terminar de comer o +10-15 min después.</li>
                      <li>• <span className="font-bold text-amber-300">↘️ Bajando:</span> Inyectar con el <strong>primer bocado (0 min)</strong>. No esperar 15 min para evitar hipoglucemia.</li>
                      <li>• <span className="font-bold text-emerald-300">➡️ Estable:</span> Inyectar de <strong>10 a 15 min antes</strong> de comer (tiempo habitual de Novorapid).</li>
                      <li>• <span className="font-bold text-amber-300">↗️ Subiendo:</span> Inyectar de <strong>15 a 20 min antes</strong> para frenar el ascenso prandial.</li>
                      <li>• <span className="font-bold text-rose-300">⬆️ Subiendo rápido:</span> Inyectar de <strong>20 a 25 min antes</strong> y monitorear hasta que la curva comience a curvarse.</li>
                    </ul>
                  </div>

                  <div className="space-y-1 pt-1.5 border-t border-slate-800/80">
                    <strong className="text-indigo-300 block font-bold">
                      3. ¿Por qué a veces la glucemia sube antes (ej. a la hora)?
                    </strong>
                    <p className="text-[11px] text-slate-300">
                      Si la comida tuvo una proporción menor de grasa o carbohidratos de absorción intermedia (o si hiciste actividad física previa), el vaciado gástrico es más rápido. Usa los nuevos <strong>chips de tiempo [45m, 1h, 1h15m]</strong> en la tarjeta para adelantar la 2ª dosis exactamente cuando lo necesitas.
                    </p>
                  </div>
                </div>
              )}
            </div>
            )}
          </div>

        </div>

      </div>

      {/* Modal Universal de Conexión de Sensores (LibreLinkUp / Dexcom / Nightscout / xDrip+ / Bluetooth) */}
      <CgmConnectorModal
        isOpen={isCgmModalOpen}
        onClose={() => setIsCgmModalOpen(false)}
        settings={settings}
        onSaveSettings={(updated) => {
          if (onUpdateSettings) {
            onUpdateSettings(updated);
          }
          if (updated.cgmConnection?.lastReading) {
            setCurrentGlucose(String(updated.cgmConnection.lastReading.glucoseMgDl));
            setTrendArrow(updated.cgmConnection.lastReading.trendArrow);
            setLastLiveReading(updated.cgmConnection.lastReading);
          }
        }}
        onApplyLiveReading={(reading) => {
          setCurrentGlucose(String(reading.glucoseMgDl));
          setTrendArrow(reading.trendArrow);
          setLastLiveReading(reading);
        }}
      />

    </div>
  );
};
