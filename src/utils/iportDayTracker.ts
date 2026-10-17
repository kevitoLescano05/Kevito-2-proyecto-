import {
  UserSettings,
  IPortAdvanceState,
  DeviceWearTrackerState,
  SensorBrand,
} from '../types';
import { getLogicalDateKey } from './dateCutoff';

export const DEFAULT_SENSOR_DURATION_BY_BRAND: Record<SensorBrand, number> = {
  freestyle_libre: 14, // FreeStyle Libre 1 / 2 / 3 (14 días estándar; configurable a 15 para Plus)
  dexcom: 10,          // Dexcom G6 / G7 / ONE+ (10 días)
  medtronic: 7,        // Medtronic Guardian Sensor 3 / 4 / Simplera (7 días)
  sibionics: 14,       // Sibionics GS1 (14 días)
  sinocare: 15,        // Sinocare iCan i3 (15 días)
  eversense: 180,      // Eversense E3 (180 días)
  medtrum: 14,         // Medtrum TouchCare (14 días)
  accu_chek: 14,       // Accu-Chek SmartGuide (14 días)
  other_cgm: 14,       // Otra marca por defecto (14 días)
};

export interface ExpiredDeviceNotice {
  deviceType: 'sensor' | 'pump_set' | 'iport';
  title: string;
  currentDay: number;
  targetDays: number;
  placedDate?: string;
  clinicalReason: string;
}

/**
 * Calcula cuántos días de uso lleva un dispositivo (Día 1 en el mismo día de colocación,
 * Día 2 al día siguiente, etc.) comparando la fecha lógica actual con placedDate.
 */
export function calculateElapsedWearDay(
  placedDateStr?: string,
  cutoffHour: number = 2,
  maxCap?: number
): number {
  if (!placedDateStr) return 1;

  try {
    const currentLogicalKey = getLogicalDateKey(cutoffHour, new Date());

    const [pYear, pMonth, pDay] = placedDateStr.split('-').map(Number);
    const [cYear, cMonth, cDay] = currentLogicalKey.split('-').map(Number);

    if (
      isNaN(pYear) ||
      isNaN(pMonth) ||
      isNaN(pDay) ||
      isNaN(cYear) ||
      isNaN(cMonth) ||
      isNaN(cDay)
    ) {
      return 1;
    }

    const placedTime = new Date(pYear, pMonth - 1, pDay).getTime();
    const currentTime = new Date(cYear, cMonth - 1, cDay).getTime();

    const diffDays = Math.floor((currentTime - placedTime) / (1000 * 60 * 60 * 24));
    const rawDay = Math.max(1, diffDays + 1);

    if (typeof maxCap === 'number' && maxCap > 0) {
      return Math.min(rawDay, maxCap);
    }
    return rawDay;
  } catch (err) {
    console.error('Error calculando día de uso del dispositivo:', err);
    return 1;
  }
}

/**
 * Calcula la fecha de colocación (YYYY-MM-DD) cuando el usuario indica manualmente
 * "Hoy voy por el Día X".
 */
export function computePlacedDateFromDayOfWear(
  dayOfWear: number,
  cutoffHour: number = 2
): string {
  const safeDay = Math.max(1, Math.round(dayOfWear || 1));
  const daysAgo = safeDay - 1;
  const refDate = new Date();
  refDate.setDate(refDate.getDate() - daysAgo);
  return getLogicalDateKey(cutoffHour, refDate);
}

/**
 * Compatibilidad para i-Port Advance (1 al 4 para la curva farmacocinética,
 * aunque guarda el día real si el usuario configuró más días).
 */
export function calculateAutoIPortDay(
  placedDateStr?: string,
  cutoffHour: number = 2
): number {
  return calculateElapsedWearDay(placedDateStr, cutoffHour);
}

/**
 * Sincroniza y avanza automáticamente el estado del iPort si la fecha ha progresado.
 */
export function syncIPortStateDay(
  currentIPort: IPortAdvanceState | undefined,
  cutoffHour: number = 2
): { updatedState: IPortAdvanceState; changed: boolean } {
  const currentLogicalKey = getLogicalDateKey(cutoffHour, new Date());

  if (!currentIPort) {
    const newState: IPortAdvanceState = {
      site: 'abdomen',
      subSite: 'abdomen_lower_fat',
      dayOfWear: 1,
      targetDurationDays: 4,
      placedDate: currentLogicalKey,
    };
    return { updatedState: newState, changed: true };
  }

  const targetDurationDays = currentIPort.targetDurationDays || 4;
  let placedDate = currentIPort.placedDate;
  if (!placedDate) {
    placedDate = computePlacedDateFromDayOfWear(currentIPort.dayOfWear || 1, cutoffHour);
  }

  const computedDay = calculateElapsedWearDay(placedDate, cutoffHour);

  if (
    computedDay !== currentIPort.dayOfWear ||
    placedDate !== currentIPort.placedDate ||
    currentIPort.targetDurationDays !== targetDurationDays
  ) {
    const updated: IPortAdvanceState = {
      ...currentIPort,
      placedDate,
      dayOfWear: computedDay,
      targetDurationDays,
    };
    return { updatedState: updated, changed: true };
  }

  return { updatedState: currentIPort, changed: false };
}

/**
 * Sincroniza un DeviceWearTrackerState genérico (Sensor CGM o Set de Bomba).
 */
export function syncDeviceWearTracker(
  tracker: DeviceWearTrackerState | undefined,
  defaultEnabled: boolean,
  defaultTargetDays: number,
  cutoffHour: number = 2
): { updatedTracker: DeviceWearTrackerState; changed: boolean } {
  const currentLogicalKey = getLogicalDateKey(cutoffHour, new Date());

  if (!tracker) {
    return {
      updatedTracker: {
        enabled: defaultEnabled,
        targetDurationDays: defaultTargetDays,
        currentDayOfWear: 1,
        placedDate: currentLogicalKey,
      },
      changed: true,
    };
  }

  const targetDurationDays =
    tracker.targetDurationDays && tracker.targetDurationDays >= 1
      ? tracker.targetDurationDays
      : defaultTargetDays;

  let placedDate = tracker.placedDate;
  if (!placedDate) {
    placedDate = computePlacedDateFromDayOfWear(tracker.currentDayOfWear || 1, cutoffHour);
  }

  const computedDay = calculateElapsedWearDay(placedDate, cutoffHour);

  if (
    computedDay !== tracker.currentDayOfWear ||
    placedDate !== tracker.placedDate ||
    tracker.targetDurationDays !== targetDurationDays
  ) {
    return {
      updatedTracker: {
        ...tracker,
        targetDurationDays,
        placedDate,
        currentDayOfWear: computedDay,
      },
      changed: true,
    };
  }

  return { updatedTracker: tracker, changed: false };
}

/**
 * Sincroniza todos los dispositivos (Puerto i-Port, Sensor de Glucosa y Set de Bomba)
 * al abrir la app o cambiar de día.
 */
export function syncAllDevicesWearDays(settings: UserSettings): {
  updatedSettings: UserSettings;
  changed: boolean;
} {
  const cutoff = settings.dayCutoffHour ?? 2;
  const usesSensorByDefault =
    settings.glucoseMode === 'cgm_nfc' ||
    settings.glucoseMode === 'cgm_reader' ||
    settings.glucoseMode === 'pump_sensor';
  const defaultSensorDays =
    DEFAULT_SENSOR_DURATION_BY_BRAND[settings.sensorBrand || 'freestyle_libre'] || 14;
  const usesPumpByDefault = settings.insulinMode === 'pump';

  const iPortSync = syncIPortStateDay(settings.iPortState, cutoff);
  const sensorSync = syncDeviceWearTracker(
    settings.sensorTracker,
    usesSensorByDefault,
    defaultSensorDays,
    cutoff
  );
  const pumpSync = syncDeviceWearTracker(
    settings.pumpSetTracker,
    usesPumpByDefault,
    3,
    cutoff
  );

  if (iPortSync.changed || sensorSync.changed || pumpSync.changed) {
    return {
      updatedSettings: {
        ...settings,
        iPortState: iPortSync.updatedState,
        sensorTracker: sensorSync.updatedTracker,
        pumpSetTracker: pumpSync.updatedTracker,
      },
      changed: true,
    };
  }

  return { updatedSettings: settings, changed: false };
}

/**
 * Devuelve la lista de dispositivos que ya cumplieron o superaron sus días estipulados
 * para mostrar el aviso al abrir la app.
 */
export function getExpiredDevicesList(
  settings: UserSettings,
  ignoreDismissedToday: boolean = false
): ExpiredDeviceNotice[] {
  const cutoff = settings.dayCutoffHour ?? 2;
  const todayKey = getLogicalDateKey(cutoff, new Date());
  const notices: ExpiredDeviceNotice[] = [];

  // 1. Sensor Continuo de Glucosa (CGM)
  const sensorTracker = settings.sensorTracker;
  const isSensorRelevant =
    sensorTracker?.enabled ??
    (settings.glucoseMode === 'cgm_nfc' ||
      settings.glucoseMode === 'cgm_reader' ||
      settings.glucoseMode === 'pump_sensor');

  if (isSensorRelevant && sensorTracker) {
    const target = sensorTracker.targetDurationDays || 14;
    const current = sensorTracker.currentDayOfWear || 1;
    const isDismissedToday =
      !ignoreDismissedToday && sensorTracker.dismissedAlertForDate === todayKey;

    if (current >= target && !isDismissedToday) {
      notices.push({
        deviceType: 'sensor',
        title: 'Sensor Continuo de Glucosa (CGM)',
        currentDay: current,
        targetDays: target,
        placedDate: sensorTracker.placedDate,
        clinicalReason:
          current > target
            ? `Ya superaste por ${current - target} ${current - target === 1 ? 'día' : 'días'} la duración estipulada de tu sensor (${target} días). Es momento de colocar un sensor nuevo para no quedarte sin lecturas o con mediciones inexactas.`
            : `Hoy se cumplen los ${target} días estipulados de duración de tu sensor. Prepará el recambio para evitar quedarte sin mediciones de glucosa.`,
      });
    }
  }

  // 2. Set de Infusión / Catéter de Bomba de Insulina
  const pumpTracker = settings.pumpSetTracker;
  const isPumpRelevant =
    (pumpTracker?.enabled ?? false) || settings.insulinMode === 'pump';

  if (isPumpRelevant && pumpTracker) {
    const target = pumpTracker.targetDurationDays || 3;
    const current = pumpTracker.currentDayOfWear || 1;
    const isDismissedToday =
      !ignoreDismissedToday && pumpTracker.dismissedAlertForDate === todayKey;

    if (current >= target && !isDismissedToday) {
      notices.push({
        deviceType: 'pump_set',
        title: 'Set de Infusión / Cánula de Bomba de Insulina',
        currentDay: current,
        targetDays: target,
        placedDate: pumpTracker.placedDate,
        clinicalReason:
          current > target
            ? `Llevás ${current} días con el mismo set de infusión (estipulado: ${target} días). Estirar la cánula más allá del límite frena la absorción de insulina, genera hiperglucemias inexplicables y riesgo de infección o durezas.`
            : `Hoy se cumplen los ${target} días estipulados de tu set de infusión de bomba. Recordá rotar de sitio y colocar una cánula nueva hoy.`,
      });
    }
  }

  // 3. Puerto de Inyección Subcutáneo (i-Port Advance)
  const iPort = settings.iPortState;
  const isIPortRelevant = settings.insulinMode === 'iport';

  if (isIPortRelevant && iPort) {
    const target = iPort.targetDurationDays || 4;
    const current = iPort.dayOfWear || 1;
    const isDismissedToday =
      !ignoreDismissedToday && iPort.dismissedAlertForDate === todayKey;

    if (current >= target && !isDismissedToday) {
      notices.push({
        deviceType: 'iport',
        title: 'Puerto de Inyección Subcutáneo (i-Port Advance)',
        currentDay: current,
        targetDays: target,
        placedDate: iPort.placedDate,
        clinicalReason:
          current > target
            ? `Llevás ${current} días con el mismo puerto i-Port (estipulado: ${target} días). La saturación tisular en la cánula enlentece la insulina rápida y puede causar picos altos después de comer.`
            : `Hoy se cumplen los ${target} días estipulados de uso de tu puerto i-Port Advance. Te recomendamos cambiarlo hoy y rotar la zona de inserción.`,
      });
    }
  }

  return notices;
}
