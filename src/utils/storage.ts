import { UserSettings, BolusRecord, DailyMealLogItem, PendingSplitBolus, FoodItem } from '../types';
import { getLogicalDateKey } from './dateCutoff';
import { getUserFavorites, saveUserFavorites } from './foodCacheAndFavorites';
import { getScheduleDefaultRoutine } from './workoutSchedule';
import { syncAllDevicesWearDays } from './iportDayTracker';

export const MASTER_STORAGE_KEYS = {
  SETTINGS: 'insu_calc_settings_master',
  SETTINGS_USER_SAVED: 'insu_calc_settings_user_saved',
  BOLUS_HISTORY: 'insu_calc_bolus_history_master',
  DAILY_MEALS: 'insu_calc_daily_meals_master',
  ALL_MEALS_ARCHIVE: 'insu_calc_all_meals_archive',
  PENDING_SPLITS: 'insu_calc_pending_splits_master',
  LAST_ACTIVE_DAY: 'insu_calc_last_active_day',
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  interfaceMode: 'simple', // 'simple' por defecto para que sea intuitivo y limpio, o 'complete'
  countryCode: 'AR', // Argentina por defecto
  glucoseMode: 'cgm_nfc', // Sensor continuo con NFC en el celular (FreeStyle Libre) por defecto
  sensorBrand: 'freestyle_libre',
  cgmConnection: {
    provider: 'none',
    autoSyncOnOpen: true,
    autoPollEvery5Min: false,
    libreLinkUpRegion: 'Auto',
    dexcomRegion: 'ous',
    xdripLocalPort: 17580,
  },
  insulinMode: 'manual_pen', // Pluma / lapicera de insulina por defecto
  rapidInsulinBrand: 'novorapid', // Análogo rápido por defecto (configurable a Humalog, Fiasp, Lyumjev, Apidra)
  dosingMode: 'carb_counting', // Por defecto Conteo de Carbohidratos (configurable a 'fixed_doses')
  fixedMealDoses: {
    breakfastUnits: 3,
    lunchUnits: 5,
    snackUnits: 3,
    dinnerUnits: 4,
    extraUnits: 0,
  },
  fixedCorrectionMethod: 'sliding_scale',
  correctionScale: [
    { id: 'scale-1', minGlucose: 150, maxGlucose: 180, units: 1 },
    { id: 'scale-2', minGlucose: 181, maxGlucose: 220, units: 2 },
    { id: 'scale-3', minGlucose: 221, maxGlucose: 260, units: 3 },
    { id: 'scale-4', minGlucose: 261, maxGlucose: 300, units: 4 },
    { id: 'scale-5', minGlucose: 301, maxGlucose: 600, units: 5 },
  ],
  isProfileConfigured: false, // Pantalla inicial obligatoria hasta confirmar ambas opciones
  isf: 30, // Factor de sensibilidad inicial editable en bienvenida (mg/dL por U)
  icr: 10, // Ratio carbohidratos inicial editable en bienvenida (g por U)
  enableMealTimeRatios: false,
  mealTimeRatios: {
    breakfastIcr: 8,
    lunchIcr: 10,
    snackIcr: 10,
    dinnerIcr: 10,
  },
  basalConfig: {
    enabled: true,
    brandName: 'Tresiba',
    defaultUnits: 18,
    scheduledTime: '22:00',
  },
  targetGlucose: 100, // 100 mg/dL
  diaHours: 4.0, // 4.0 horas de duración de la insulina activa
  dayType: new Date().getDay() === 0 || new Date().getDay() === 6 ? 'weekend' : 'weekday',
  weightKg: 65, // Peso editable en bienvenida (kg)
  kcalPerKg: 35,
  weekdayCalorieGoal: 2000, // Meta calórica base editable
  weekendCalorieGoal: 2000, // Meta calórica base editable
  maxAnimalProtein: 25, // Límite estricto renal: máx 25g animal / día
  minPlantProtein: 25, // Rango vegetal: 25 a 35g / día
  maxPlantProtein: 35,
  maxDailyFat: 60, // Límite diario sugerido de grasas en Dislipidemia
  minDailyFiber: 25, // Meta diaria sugerida de fibra soluble en Dislipidemia
  roundDoseTo: 1.0, // Pluma / i-Port Advance en unidad entera (1.0 U)
  dayCutoffHour: 2, // Por defecto 02:00 AM
  enableRenalProteinLimits: false,
  medicalConditions: {
    renal: false,
    celiac: false,
    gastroparesis: false,
    hypertension: false,
    dyslipidemia: false,
    lactose_intolerance: false,
  },
  iPortState: {
    site: 'abdomen',
    subSite: 'abdomen_lower_fat',
    dayOfWear: 1,
    targetDurationDays: 4,
    placedDate: new Date().toISOString().split('T')[0],
  },
  sensorTracker: {
    enabled: true,
    targetDurationDays: 14,
    currentDayOfWear: 1,
    placedDate: new Date().toISOString().split('T')[0],
  },
  pumpSetTracker: {
    enabled: false,
    targetDurationDays: 3,
    currentDayOfWear: 1,
    placedDate: new Date().toISOString().split('T')[0],
  },
  dailyWorkout: {
    dateKey: new Date().toISOString().split('T')[0],
    routineType: getScheduleDefaultRoutine(),
    weightsDone: null, // null = sin marcar, true = hecho, false = no hecho
    walkDone: null,    // null = sin marcar, true = hecho, false = no hecho
    weekendActivity: 'none',
  },
};

/**
 * Checks if the logical day has changed safely without destroying user data.
 */
export function checkAndAutoResetDayIfNeeded(): { didReset: boolean; currentDayKey: string } {
  if (typeof localStorage === 'undefined') return { didReset: false, currentDayKey: '' };

  try {
    const settings = loadUserSettings();
    const cutoff = settings.dayCutoffHour ?? 2;
    const currentLogicalDay = getLogicalDateKey(cutoff, new Date());
    localStorage.setItem(MASTER_STORAGE_KEYS.LAST_ACTIVE_DAY, currentLogicalDay);
    return { didReset: false, currentDayKey: currentLogicalDay };
  } catch (e) {
    console.error('Error during day check:', e);
    return { didReset: false, currentDayKey: '' };
  }
}

export function loadUserSettings(): UserSettings {
  if (typeof localStorage === 'undefined') return DEFAULT_USER_SETTINGS;
  try {
    const saved = localStorage.getItem(MASTER_STORAGE_KEYS.SETTINGS);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure target goals are preserved or fallback cleanly
      const weekdayCalorieGoal = parsed.weekdayCalorieGoal === 2600 ? 2350 : (parsed.weekdayCalorieGoal || 2000);
      const weekendCalorieGoal = parsed.weekendCalorieGoal === 2100 ? 1850 : (parsed.weekendCalorieGoal || 2000);
      
      const loadedSettings: UserSettings = {
        ...DEFAULT_USER_SETTINGS,
        ...parsed,
        weekdayCalorieGoal,
        weekendCalorieGoal,
      };

      // Auto-avanzar días de Sensor, Set de Bomba y Puerto i-Port según días transcurridos
      const { updatedSettings, changed } = syncAllDevicesWearDays(loadedSettings);
      if (changed) {
        saveUserSettings(updatedSettings);
      }

      return updatedSettings;
    }
  } catch (e) {
    console.error('Error loading settings', e);
  }
  return DEFAULT_USER_SETTINGS;
}

export function saveUserSettings(settings: UserSettings): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(MASTER_STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    localStorage.setItem(MASTER_STORAGE_KEYS.SETTINGS_USER_SAVED, 'true');
  } catch (e) {
    console.error('Error saving settings', e);
  }
}

export function loadBolusHistory(): BolusRecord[] {
  try {
    const saved = localStorage.getItem(MASTER_STORAGE_KEYS.BOLUS_HISTORY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Fallback de recuperación automática si la clave fue sobreescrita o vaciada
    const { foundBoluses } = scanAndRecoverAllData();
    if (foundBoluses && foundBoluses.length > 0) {
      localStorage.setItem(MASTER_STORAGE_KEYS.BOLUS_HISTORY, JSON.stringify(foundBoluses));
      return foundBoluses;
    }
  } catch (e) {
    console.error('Error loading bolus history', e);
  }
  return [];
}

export function saveBolusHistory(history: BolusRecord[]): void {
  try {
    localStorage.setItem(MASTER_STORAGE_KEYS.BOLUS_HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error('Error saving bolus history', e);
  }
}

export function loadDailyMealLog(): DailyMealLogItem[] {
  try {
    const saved = localStorage.getItem(MASTER_STORAGE_KEYS.DAILY_MEALS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const active = parsed.filter((m) => !m.isArchived);
        if (active.length > 0) {
          return active;
        }
      }
    }
    // Fallback de recuperación si DAILY_MEALS quedó vacío o fue sobreescrito:
    const archive = loadAllMealsArchive();
    if (archive && archive.length > 0) {
      const settings = loadUserSettings();
      const currentLogicalDate = getLogicalDateKey(settings.dayCutoffHour ?? 2, new Date());
      const todaysFromArchive = archive.filter((m) => m.date === currentLogicalDate);
      if (todaysFromArchive.length > 0) {
        localStorage.setItem(MASTER_STORAGE_KEYS.DAILY_MEALS, JSON.stringify(todaysFromArchive));
        return todaysFromArchive;
      }
    }
    const { foundMeals } = scanAndRecoverAllData();
    if (foundMeals && foundMeals.length > 0) {
      const settings = loadUserSettings();
      const currentLogicalDate = getLogicalDateKey(settings.dayCutoffHour ?? 2, new Date());
      const recoveredToday = foundMeals.filter((m) => m.date === currentLogicalDate || !m.isArchived);
      if (recoveredToday.length > 0) {
        localStorage.setItem(MASTER_STORAGE_KEYS.DAILY_MEALS, JSON.stringify(recoveredToday));
        return recoveredToday;
      }
    }
  } catch (e) {
    console.error('Error loading daily meals', e);
  }
  return [];
}

export function loadAllMealsArchive(): DailyMealLogItem[] {
  try {
    const saved = localStorage.getItem(MASTER_STORAGE_KEYS.ALL_MEALS_ARCHIVE);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading meals archive', e);
  }
  return [];
}

export function saveAllMealsArchive(meals: DailyMealLogItem[]): void {
  try {
    localStorage.setItem(MASTER_STORAGE_KEYS.ALL_MEALS_ARCHIVE, JSON.stringify(meals));
  } catch (e) {
    console.error('Error saving meals archive', e);
  }
}

export function saveDailyMealLog(meals: DailyMealLogItem[]): void {
  try {
    localStorage.setItem(MASTER_STORAGE_KEYS.DAILY_MEALS, JSON.stringify(meals));
  } catch (e) {
    console.error('Error saving daily meals', e);
  }
}

export function loadPendingSplitBoluses(): PendingSplitBolus[] {
  try {
    const saved = localStorage.getItem(MASTER_STORAGE_KEYS.PENDING_SPLITS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter((s) => s.status === 'pending');
      }
    }
  } catch (e) {
    console.error('Error loading pending split boluses', e);
  }
  return [];
}

export function savePendingSplitBoluses(splits: PendingSplitBolus[]): void {
  try {
    localStorage.setItem(MASTER_STORAGE_KEYS.PENDING_SPLITS, JSON.stringify(splits));
  } catch (e) {
    console.error('Error saving pending split boluses', e);
  }
}

export function resetDailyLog(archiveMeals: boolean = true): void {
  try {
    if (archiveMeals) {
      const current = loadDailyMealLog();
      if (current.length > 0) {
        const archive = loadAllMealsArchive();
        const map = new Map<string, DailyMealLogItem>();
        for (const m of archive) map.set(m.id, m);
        for (const m of current) {
          map.set(m.id, { ...m, isArchived: true });
        }
        const updatedArchive = Array.from(map.values());
        localStorage.setItem(MASTER_STORAGE_KEYS.ALL_MEALS_ARCHIVE, JSON.stringify(updatedArchive));
      }
    }

    localStorage.setItem(MASTER_STORAGE_KEYS.DAILY_MEALS, JSON.stringify([]));
    localStorage.setItem(MASTER_STORAGE_KEYS.PENDING_SPLITS, JSON.stringify([]));
  } catch (e) {
    console.error('Error resetting daily log', e);
  }
}

/**
 * Restore previous meals from archive and merge with existing meals
 */
export function restoreMealsFromArchive(
  currentMeals: DailyMealLogItem[] = [],
  fallbackArchive: DailyMealLogItem[] = []
): DailyMealLogItem[] {
  try {
    let archive = loadAllMealsArchive();
    if (archive.length === 0 && fallbackArchive.length > 0) {
      archive = fallbackArchive;
      localStorage.setItem(MASTER_STORAGE_KEYS.ALL_MEALS_ARCHIVE, JSON.stringify(archive));
    }

    const { foundMeals } = scanAndRecoverAllData();
    const sourceList = archive.length > 0 ? archive : foundMeals;

    const settings = loadUserSettings();
    const currentLogicalDate = getLogicalDateKey(settings.dayCutoffHour ?? 2, new Date());
    const map = new Map<string, DailyMealLogItem>();
    
    // First add archived / recovered meals, unarchive them
    for (const m of sourceList) {
      const key = m.id || `${m.time}-${m.description}-${m.carbsGrams}`;
      map.set(key, {
        ...m,
        isArchived: false,
        date: currentLogicalDate,
      });
    }
    
    // Then overlay current active meals
    for (const m of currentMeals) {
      const key = m.id || `${m.time}-${m.description}-${m.carbsGrams}`;
      map.set(key, {
        ...m,
        isArchived: false,
        date: currentLogicalDate,
      });
    }

    const merged = Array.from(map.values());
    if (merged.length > 0) {
      localStorage.setItem(MASTER_STORAGE_KEYS.DAILY_MEALS, JSON.stringify(merged));
      saveDailyMealLog(merged);
      return merged;
    }
  } catch (e) {
    console.error('Error restoring meals from archive', e);
  }
  return currentMeals;
}

/**
 * Removes any meals from yesterday that may have been restored by mistake,
 * keeping only today's genuine meals in the active balance.
 */
export function clearYesterdayMealsFromToday(currentMeals: DailyMealLogItem[]): DailyMealLogItem[] {
  const filtered = currentMeals.filter((m) => {
    const isYesterday = (m.description && m.description.includes('[Ayer]')) ||
      m.id?.includes('yesterday');
    return !isYesterday;
  });

  try {
    localStorage.setItem(MASTER_STORAGE_KEYS.DAILY_MEALS, JSON.stringify(filtered));
    saveDailyMealLog(filtered);
  } catch (e) {
    console.error('Error clearing yesterday meals:', e);
  }

  return filtered;
}

/**
 * Emergency deep scanner to recover any meals or boluses from any localStorage key
 */
export function scanAndRecoverAllData(): {
  foundMeals: DailyMealLogItem[];
  foundBoluses: BolusRecord[];
  foundFavorites: FoodItem[];
} {
  const foundMeals: DailyMealLogItem[] = [];
  const foundBoluses: BolusRecord[] = [];
  const foundFavorites: FoodItem[] = [];

  if (typeof localStorage === 'undefined') return { foundMeals, foundBoluses, foundFavorites };

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      try {
        const raw = localStorage.getItem(key);
        if (!raw || !raw.startsWith('[')) continue;
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            // Check if it looks like a meal
            if (item && typeof item === 'object' && 'carbsGrams' in item && 'calories' in item && 'timestamp' in item && 'description' in item) {
              if (!foundMeals.some((m) => m.id === item.id)) {
                foundMeals.push(item as DailyMealLogItem);
              }
            }
            // Check if it looks like a bolus
            if (item && typeof item === 'object' && 'units' in item && 'timestamp' in item && !('description' in item)) {
              if (!foundBoluses.some((b) => b.id === item.id)) {
                foundBoluses.push(item as BolusRecord);
              }
            }
            // Check if it looks like a favorite food
            if (item && typeof item === 'object' && 'portionName' in item && 'carbsGrams' in item && 'name' in item) {
              if (!foundFavorites.some((f) => f.id === item.id || f.name === item.name)) {
                foundFavorites.push(item as FoodItem);
              }
            }
          }
        }
      } catch {
        // Skip invalid JSON
      }
    }
  } catch (e) {
    console.error('Error during deep storage scan:', e);
  }

  return { foundMeals, foundBoluses, foundFavorites };
}

/**
 * Server sync disabled - strictly local client storage
 */
export function syncToServer(_data: any) {
  // No-op: user requested strictly local persistence
}

export async function fetchServerBackup(): Promise<null> {
  // No-op: strictly local persistence, no server backup overrides
  return null;
}

/**
 * Export full JSON data for manual backup
 */
export function exportUserDataJson(): string {
  const data = {
    exportDate: new Date().toISOString(),
    settings: loadUserSettings(),
    bolusHistory: loadBolusHistory(),
    dailyMeals: loadDailyMealLog(),
    allMealsArchive: loadAllMealsArchive(),
    pendingSplits: loadPendingSplitBoluses(),
    favorites: getUserFavorites(),
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Import full JSON data
 */
export function importUserDataJson(jsonStr: string): {
  success: boolean;
  settings?: UserSettings;
  bolusHistory?: BolusRecord[];
  dailyMeals?: DailyMealLogItem[];
  allMealsArchive?: DailyMealLogItem[];
  pendingSplits?: PendingSplitBolus[];
  favorites?: FoodItem[];
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Formato JSON inválido' };
    }

    if (parsed.settings) {
      saveUserSettings(parsed.settings);
    }
    if (Array.isArray(parsed.bolusHistory)) {
      saveBolusHistory(parsed.bolusHistory);
    }
    if (Array.isArray(parsed.dailyMeals)) {
      saveDailyMealLog(parsed.dailyMeals);
    }
    if (Array.isArray(parsed.allMealsArchive)) {
      saveAllMealsArchive(parsed.allMealsArchive);
    }
    if (Array.isArray(parsed.pendingSplits)) {
      savePendingSplitBoluses(parsed.pendingSplits);
    }
    if (Array.isArray(parsed.favorites)) {
      saveUserFavorites(parsed.favorites);
    }

    return {
      success: true,
      settings: parsed.settings,
      bolusHistory: parsed.bolusHistory,
      dailyMeals: parsed.dailyMeals,
      allMealsArchive: parsed.allMealsArchive,
      pendingSplits: parsed.pendingSplits,
      favorites: parsed.favorites,
    };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al analizar archivo' };
  }
}
