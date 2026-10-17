/**
 * OpenAPS / Nightscout (oref0) Bi-Exponential Insulin On Board (IOB) Algorithm
 * Specifically calibrated for rapid-acting insulin analogues (Novorapid / Insulin Aspart).
 *
 * References:
 * - OpenAPS reference implementation: https://github.com/openaps/oref0
 * - Nightscout cgm-remote-monitor: https://github.com/nightscout/cgm-remote-monitor
 * - Dragan Maksimovic biexponential insulin activity model
 */

import { BolusRecord } from '../types';

export interface OpenApsIobResult {
  totalIOB: number;
  currentActivityUnitsPerHour: number;
  breakdown: {
    record: BolusRecord;
    remaining: number;
    decayFraction: number; // 0 to 1
    elapsedMinutes: number;
    elapsedHours: number;
    activityUnitsPerHour: number;
  }[];
  algorithm: 'OpenAPS oref0 Bi-Exponential (Novorapid)';
  peakMinutes: number;
  diaHours: number;
}

export interface IobCurvePoint {
  time: string;
  iob: number;
  activityRate: number; // U/hr
  minutesFromNow: number;
}

/**
 * Standard pharmacological constants for Novorapid (Insulin Aspart):
 * - Peak action time (tp): 75 minutes (typical range 65-80 min)
 * - Duration of Insulin Action (DIA): typically 4.0 - 5.0 hours (default 4.0h)
 */
export const NOVORAPID_PEAK_MINUTES = 75;

/**
 * Computes the OpenAPS biexponential remaining fraction of insulin at elapsed minutes t.
 *
 * @param elapsedMinutes Time in minutes since the injection
 * @param diaHours Duration of Insulin Action in hours (e.g. 4.0)
 * @param peakMinutes Peak activity in minutes (75 min for Novorapid)
 * @returns fraction of insulin remaining (between 1.0 at t=0 and 0.0 at t>=DIA)
 */
export function openapsIobFraction(
  elapsedMinutes: number,
  diaHours: number = 4.0,
  peakMinutes: number = NOVORAPID_PEAK_MINUTES
): number {
  if (elapsedMinutes <= 0) return 1.0;
  const diaMinutes = diaHours * 60;
  if (elapsedMinutes >= diaMinutes) return 0.0;

  const t = elapsedMinutes;
  const dia = diaMinutes;
  const peak = peakMinutes;

  // Validate peak is strictly before half of DIA to keep Maksimovic equations well-defined
  const safePeak = Math.min(peak, (dia / 2) - 1);

  // Time constant tau
  const tau = (safePeak * (1 - safePeak / dia)) / (1 - (2 * safePeak) / dia);
  // Dimensionless factor a
  const a = (2 * tau) / dia;
  // Normalization scale factor S
  const S = 1 / (1 - a + (1 + a) * Math.exp(-dia / tau));

  // OpenAPS integrated IOB equation
  const expTerm = Math.exp(-t / tau);
  const polyTerm = ((t * t) / (tau * dia * (1 - a))) - (t / tau) - 1;
  const iob = 1 - S * (1 - a) * (polyTerm * expTerm + 1);

  // Clamp safely between 0 and 1
  return Math.max(0, Math.min(1, iob));
}

/**
 * Computes instantaneous insulin activity (rate of insulin action) in fraction per minute.
 */
export function openapsActivityRate(
  elapsedMinutes: number,
  diaHours: number = 4.0,
  peakMinutes: number = NOVORAPID_PEAK_MINUTES
): number {
  if (elapsedMinutes <= 0 || elapsedMinutes >= diaHours * 60) return 0.0;

  const t = elapsedMinutes;
  const dia = diaHours * 60;
  const peak = Math.min(peakMinutes, (dia / 2) - 1);

  const tau = (peak * (1 - peak / dia)) / (1 - (2 * peak) / dia);
  const a = (2 * tau) / dia;
  const S = 1 / (1 - a + (1 + a) * Math.exp(-dia / tau));

  // Activity = (S / tau^2) * t * (1 - t/dia) * exp(-t/tau)
  const act = (S / (tau * tau)) * t * (1 - t / dia) * Math.exp(-t / tau);
  return Math.max(0, act);
}

/**
 * Calculates current Active Insulin (IOB) for a list of boluses using the OpenAPS model.
 */
export function calculateOpenApsIOB(
  bolusRecords: BolusRecord[],
  diaHours: number = 4.0,
  nowMs: number = Date.now(),
  peakMinutes: number = NOVORAPID_PEAK_MINUTES
): OpenApsIobResult {
  let totalIOB = 0;
  let totalActivityPerMin = 0;
  const breakdown: OpenApsIobResult['breakdown'] = [];

  for (const record of bolusRecords) {
    const recordTime = new Date(record.timestamp).getTime();
    const elapsedMs = nowMs - recordTime;
    const elapsedMinutes = Math.max(0, elapsedMs / (60 * 1000));
    const elapsedHours = Math.round((elapsedMinutes / 60) * 10) / 10;

    const fractionRemaining = openapsIobFraction(elapsedMinutes, diaHours, peakMinutes);
    const actRate = openapsActivityRate(elapsedMinutes, diaHours, peakMinutes); // fraction per min

    const remainingUnits = record.units * fractionRemaining;
    const activityUPerHr = record.units * actRate * 60; // Convert to Units/hour

    totalIOB += remainingUnits;
    totalActivityPerMin += record.units * actRate;

    breakdown.push({
      record,
      remaining: Math.round(remainingUnits * 100) / 100,
      decayFraction: Math.round(fractionRemaining * 100) / 100,
      elapsedMinutes: Math.round(elapsedMinutes),
      elapsedHours,
      activityUnitsPerHour: Math.round(activityUPerHr * 100) / 100,
    });
  }

  // Strictly order breakdown:
  // 1. Doses with ACTIVE insulin (remaining > 0) appear first at the top!
  // 2. Doses already fully absorbed (remaining == 0) appear down below.
  // 3. Within each group, order from most recent to oldest.
  breakdown.sort((a, b) => {
    const aActive = a.remaining > 0.001;
    const bActive = b.remaining > 0.001;

    if (aActive && !bActive) return -1; // a goes first
    if (!aActive && bActive) return 1;  // b goes first

    // Within same active status: most recent injection first
    return a.elapsedMinutes - b.elapsedMinutes;
  });

  return {
    totalIOB: Math.round(totalIOB * 100) / 100,
    currentActivityUnitsPerHour: Math.round(totalActivityPerMin * 60 * 100) / 100,
    breakdown,
    algorithm: 'OpenAPS oref0 Bi-Exponential (Novorapid)',
    peakMinutes,
    diaHours,
  };
}

/**
 * Generates data points for the OpenAPS IOB curve chart (next 4 hours, 10-minute resolution).
 */
export function generateOpenApsChartData(
  bolusRecords: BolusRecord[],
  diaHours: number = 4.0,
  nowMs: number = Date.now(),
  peakMinutes: number = NOVORAPID_PEAK_MINUTES
): IobCurvePoint[] {
  const points: IobCurvePoint[] = [];
  const hoursAhead = 4;
  const stepMinutes = 10;
  const totalSteps = (hoursAhead * 60) / stepMinutes;

  for (let i = 0; i <= totalSteps; i++) {
    const futureMs = nowMs + i * stepMinutes * 60 * 1000;
    const { totalIOB, currentActivityUnitsPerHour } = calculateOpenApsIOB(bolusRecords, diaHours, futureMs, peakMinutes);
    const dateObj = new Date(futureMs);
    const timeLabel = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;

    points.push({
      time: timeLabel,
      iob: totalIOB,
      activityRate: currentActivityUnitsPerHour,
      minutesFromNow: i * stepMinutes,
    });
  }

  return points;
}
