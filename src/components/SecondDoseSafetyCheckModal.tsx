import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ArrowUp,
  Syringe,
  X,
  Sparkles,
  HeartPulse,
} from 'lucide-react';
import { PendingSplitBolus, GlucoseTrend } from '../types';
import { evaluateSecondDoseSensorCheck } from '../utils/insulinMath';

interface SecondDoseSafetyCheckModalProps {
  isOpen: boolean;
  split: PendingSplitBolus | null;
  isf: number;
  targetGlucose: number;
  iobValue: number;
  roundStep?: 0.5 | 1.0 | 0.1;
  onClose: () => void;
  onApplyDose: (splitId: string, finalUnits: number) => void;
  onPostpone: (splitId: string, additionalMinutes: number) => void;
  onTogglePauseSplit?: (splitId: string) => void;
  onCancelSplit: (splitId: string) => void;
}

export const SecondDoseSafetyCheckModal: React.FC<SecondDoseSafetyCheckModalProps> = ({
  isOpen,
  split,
  isf,
  targetGlucose,
  iobValue,
  roundStep = 1.0,
  onClose,
  onApplyDose,
  onPostpone,
  onTogglePauseSplit,
  onCancelSplit,
}) => {
  if (!isOpen || !split) return null;

  const [glucoseInput, setGlucoseInput] = useState<string>('');
  const [selectedTrend, setSelectedTrend] = useState<GlucoseTrend>('flat');
  const [customUnitsOverride, setCustomUnitsOverride] = useState<string>('');
  const [isManualOverride, setIsManualOverride] = useState<boolean>(false);

  const glucoseVal = parseFloat(glucoseInput) || 100;
  const effectiveStep = roundStep || 1.0;

  const evalResult = evaluateSecondDoseSensorCheck({
    currentGlucose: glucoseVal,
    trendArrow: selectedTrend,
    originalUnits: split.units,
    scheduledMealDescription: split.mealDescription,
    fatGrams: split.fatGrams,
    fiberGrams: split.fiberGrams,
    isf: isf || 28,
    targetGlucose: targetGlucose || 100,
    iobUnits: iobValue || 0,
    roundStep: effectiveStep,
    startingGlucose: split.startingGlucose,
  });

  const finalUnitsToApply = isManualOverride && customUnitsOverride !== ''
    ? Math.max(0, parseFloat(customUnitsOverride) || 0)
    : evalResult.recommendedUnits;

  const TREND_OPTIONS: { trend: GlucoseTrend; icon: any; label: string; color: string }[] = [
    { trend: 'falling_fast', icon: ArrowDown, label: '⬇️ Cae rápido', color: 'text-rose-400 border-rose-500/50 hover:bg-rose-950/40' },
    { trend: 'falling', icon: ArrowDownRight, label: '↘️ Cae lento', color: 'text-amber-400 border-amber-500/50 hover:bg-amber-950/40' },
    { trend: 'flat', icon: ArrowRight, label: '➡️ Estable', color: 'text-emerald-400 border-emerald-500/50 hover:bg-emerald-950/40' },
    { trend: 'rising', icon: ArrowUpRight, label: '↗️ Sube lento', color: 'text-amber-400 border-amber-500/50 hover:bg-amber-950/40' },
    { trend: 'rising_fast', icon: ArrowUp, label: '⬆️ Sube rápido', color: 'text-rose-400 border-rose-500/50 hover:bg-rose-950/40' },
  ];

  const isPart1 = split.part === 1;

  return (
    <div
      id="modal-second-dose-safety-check"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden my-auto">
        
        {/* Header */}
        <div className="bg-slate-950 px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border shrink-0 ${isPart1 ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-1.5 leading-tight">
                <span>{isPart1 ? 'Chequeo FreeStyle 2 para 1ª Dosis' : 'Chequeo FreeStyle 2 Antes de Inyectar'}</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400">
                {isPart1 ? 'Verificación de remonte seguro de glucosa post-comida' : 'Freno de seguridad fisiológico para 2ª dosis de Novorapid'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="btn-close-safety-modal"
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0 ml-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body - Scrollable */}
        <div className="p-3.5 sm:p-5 space-y-3.5 overflow-y-auto flex-1 min-h-0 overscroll-contain">
          
          {/* Tarjeta de Dosis Programada Original */}
          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">
                {isPart1 ? '1ª Dosis Programada:' : '2ª Dosis Programada:'}
              </span>
              <strong className={`${isPart1 ? 'text-teal-300' : 'text-amber-300'} text-sm font-bold`}>{split.units} U de Novorapid</strong>
              <span className="text-slate-400 ml-1.5">({split.mealDescription})</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-mono">Grasas: {split.fatGrams}g</span>
              <span className="text-[10px] text-teal-400 font-mono">IOB activo: {iobValue.toFixed(1)} U</span>
            </div>
          </div>

          {/* Selector de Glucosa Actual */}
          <div className="bg-slate-950/70 p-3 sm:p-3.5 rounded-xl border border-slate-800 space-y-2.5">
            <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <HeartPulse className="h-4 w-4 text-rose-400" />
                <span>¿Cuánto marca tu sensor FreeStyle Libre ahora?</span>
              </span>
              <span className="text-[11px] font-mono text-teal-300 font-bold">{glucoseVal} mg/dL</span>
            </label>

            <div className="flex items-center gap-2">
              <input
                type="number"
                id="input-sensor-glucose-check"
                value={glucoseInput}
                onChange={(e) => setGlucoseInput(e.target.value)}
                min="40"
                max="400"
                step="1"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono font-bold text-base focus:outline-none focus:border-amber-400"
              />
              <span className="text-xs text-slate-400 font-bold">mg/dL</span>
            </div>

            {/* Presets rápidos */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {[70, 85, 100, 120, 145, 180, 220].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setGlucoseInput(val.toString())}
                  className={`py-1 px-2.5 rounded-lg text-[10px] font-bold font-mono transition border cursor-pointer ${
                    glucoseVal === val
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Selector de Flecha de Tendencia */}
          <div className="bg-slate-950/70 p-3 sm:p-3.5 rounded-xl border border-slate-800 space-y-2">
            <label className="text-xs font-bold text-slate-200 block">
              Dirección de la flecha en la pantalla del sensor:
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {TREND_OPTIONS.map((item) => {
                const IconComponent = item.icon;
                const isSelected = selectedTrend === item.trend;
                return (
                  <button
                    key={item.trend}
                    type="button"
                    onClick={() => setSelectedTrend(item.trend)}
                    id={`btn-trend-${item.trend}`}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center transition cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-amber-400 ring-2 ring-amber-400/30'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                    }`}
                  >
                    <IconComponent className={`h-4 w-4 ${item.color.split(' ')[0]}`} />
                    <span className="text-[9px] font-semibold mt-1 tracking-tight text-center">
                      {item.trend === 'flat' ? 'Estable' : item.trend.includes('fast') ? 'Rápido' : 'Lento'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DICTAMEN MÉDICO / FISIOLÓGICO */}
          <div
            className={`p-3.5 sm:p-4 rounded-xl border transition space-y-2.5 ${
              evalResult.tone === 'rose'
                ? 'bg-rose-950/50 border-rose-600/70 text-rose-200'
                : evalResult.tone === 'amber'
                ? 'bg-amber-950/50 border-amber-500/70 text-amber-200'
                : 'bg-emerald-950/50 border-emerald-500/70 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {evalResult.tone === 'rose' ? (
                <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />
              ) : evalResult.tone === 'amber' ? (
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              )}
              <h4 className="text-xs sm:text-sm font-bold leading-tight">
                {evalResult.actionTitle}
              </h4>
            </div>

            {/* Badge de Criterio Dual de Disparo (Subida silenciosa/sostenida por grasas) */}
            {evalResult.isCreepingRise && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[11px] font-bold">
                <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Criterio Dual Activado: Subida acumulada sostenida (Δ +{evalResult.deltaGlucose} mg/dL con flecha ➡️)</span>
              </div>
            )}

            <p className="text-xs leading-relaxed text-slate-200">
              {evalResult.clinicalMessage}
            </p>

            {split.startingGlucose && (
              <div className="text-[11px] text-slate-300 flex items-center justify-between border-t border-slate-800/80 pt-1.5 font-mono">
                <span>Glucemia inicio comida: <strong>{split.startingGlucose} mg/dL</strong></span>
                <span className={evalResult.deltaGlucose && evalResult.deltaGlucose > 0 ? 'text-amber-300 font-bold' : 'text-slate-400'}>
                  Delta acumulado: {evalResult.deltaGlucose && evalResult.deltaGlucose > 0 ? `+${evalResult.deltaGlucose}` : evalResult.deltaGlucose} mg/dL
                </span>
              </div>
            )}

            {evalResult.grossCorrectionUnits !== undefined && (
              <div className="text-[11px] p-2.5 rounded-lg bg-slate-950/70 border border-amber-500/30 font-mono text-amber-300 space-y-1">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Dosis comida programada:</span>
                  <span className="font-semibold">{split.units} U</span>
                </div>
                {evalResult.grossCorrectionUnits > 0 && (
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Corrección glucemia ({glucoseVal} mg/dL vs {targetGlucose}):</span>
                    <span>+{evalResult.grossCorrectionUnits} U</span>
                  </div>
                )}
                {evalResult.iobUnits > 0 && (
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Insulina activa restante (IOB descontada):</span>
                    <span>-{evalResult.iobUnits.toFixed(1)} U</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-slate-800 pt-1 font-bold text-slate-100">
                  <span>Dosis recomendada ({effectiveStep === 1.0 ? 'unidad entera' : `paso ${effectiveStep} U`}):</span>
                  <span className="text-amber-400 text-xs font-black">{evalResult.recommendedUnits} U</span>
                </div>
              </div>
            )}
          </div>

          {/* Control Directo de Dosis (Siempre Visible con [-] y [+]) */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Syringe className="h-4 w-4 text-teal-400" />
                <span>Dosis a Inyectar (editable libremente):</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Paso: <strong className="text-teal-300">{effectiveStep === 1.0 ? '1.0 U' : `${effectiveStep} U`}</strong>
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-900/90 p-2 rounded-xl border border-slate-700/80">
              <div className="text-xs text-slate-300">
                <span className="text-[10px] text-slate-400 block">Sugerencia fisiológica: {evalResult.recommendedUnits} U</span>
                <span className="font-semibold text-slate-200">
                  {finalUnitsToApply !== evalResult.recommendedUnits ? '✏️ Modificada manualmente' : '✅ Valor sugerido'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const current = isManualOverride && customUnitsOverride !== '' ? parseFloat(customUnitsOverride) || 0 : evalResult.recommendedUnits;
                    const updated = Math.max(0, Math.round((current - effectiveStep) / effectiveStep) * effectiveStep);
                    setCustomUnitsOverride(updated.toString());
                    setIsManualOverride(true);
                  }}
                  id="btn-safety-modal-minus-dose"
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-extrabold text-xl flex items-center justify-center border border-slate-600 cursor-pointer active:scale-90 transition shadow-sm"
                  title="Disminuir dosis"
                >
                  -
                </button>

                <div className="relative">
                  <input
                    type="number"
                    value={isManualOverride && customUnitsOverride !== '' ? customUnitsOverride : evalResult.recommendedUnits}
                    onChange={(e) => {
                      setCustomUnitsOverride(e.target.value);
                      setIsManualOverride(true);
                    }}
                    step={effectiveStep.toString()}
                    min="0"
                    max="40"
                    id="input-safety-modal-units"
                    className="w-20 bg-slate-950 border-2 border-teal-500/80 rounded-xl py-1.5 text-center text-lg text-teal-300 font-mono font-black focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[9px] text-teal-400 font-bold uppercase">
                    Unidades
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const current = isManualOverride && customUnitsOverride !== '' ? parseFloat(customUnitsOverride) || 0 : evalResult.recommendedUnits;
                    const updated = Math.round((current + effectiveStep) / effectiveStep) * effectiveStep;
                    setCustomUnitsOverride(updated.toString());
                    setIsManualOverride(true);
                  }}
                  id="btn-safety-modal-plus-dose"
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-extrabold text-xl flex items-center justify-center border border-slate-600 cursor-pointer active:scale-90 transition shadow-sm"
                  title="Aumentar dosis"
                >
                  +
                </button>
              </div>
            </div>

            {isManualOverride && (
              <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400">
                <span>Ajustaste la dosis a <strong className="text-teal-300 font-mono">{finalUnitsToApply} U</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomUnitsOverride('');
                    setIsManualOverride(false);
                  }}
                  className="text-teal-400 hover:underline cursor-pointer"
                >
                  ↺ Restablecer a {evalResult.recommendedUnits} U
                </button>
              </div>
            )}
          </div>

          {/* Opción Unificada: Pausar bolo / En espera de sensor (Sin minutos fijos) */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2.5">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span>¿La glucosa todavía no subió?</span>
              </span>
              <p className="text-[11px] text-slate-400">
                Pausa el reloj indefinidamente. La app te avisará si pasan 90 min sin registrarte.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onTogglePauseSplit) {
                  onTogglePauseSplit(split.id);
                } else {
                  onPostpone(split.id, 45);
                }
                onClose();
              }}
              id="btn-modal-pause-split"
              className="py-2 px-3 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
            >
              <span>⏸️ Pausar bolo</span>
            </button>
          </div>

        </div>

        {/* Footer Actions - ALWAYS VISIBLE AT BOTTOM */}
        <div className="bg-slate-950 px-4 sm:px-5 py-3 border-t border-slate-800 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shadow-lg">
          
          {/* Botón Principal de Aplicar Dosis (Primero en mobile para visibilidad y accesibilidad inmediata) */}
          {(evalResult.recommendedAction !== 'cancel_safe' || (isManualOverride && finalUnitsToApply > 0)) && (
            <button
              type="button"
              onClick={() => {
                onApplyDose(split.id, finalUnitsToApply);
                onClose();
              }}
              id="btn-modal-apply-evaluated-dose"
              className={`w-full sm:w-auto order-1 sm:order-2 py-2.5 sm:py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md min-h-[42px] ${
                evalResult.tone === 'emerald'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-teal-500 hover:bg-teal-400 text-slate-950'
              }`}
            >
              <Syringe className="h-4 w-4 shrink-0" />
              <span>Inyectar {finalUnitsToApply} U Ahora</span>
            </button>
          )}

          {/* Botones secundarios (Pausar en espera / Descartar) */}
          <div className="flex items-center gap-2 w-full sm:w-auto order-2 sm:order-1">
            <button
              type="button"
              onClick={() => {
                if (onTogglePauseSplit) {
                  onTogglePauseSplit(split.id);
                } else {
                  onPostpone(split.id, 45);
                }
                onClose();
              }}
              id="btn-modal-pause-footer"
              className="flex-1 sm:flex-initial py-2.5 sm:py-2 px-3 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm min-h-[40px]"
            >
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>⏸️ Poner en espera</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onCancelSplit(split.id);
                onClose();
              }}
              id="btn-modal-cancel-dose"
              className="flex-1 sm:flex-initial py-2.5 sm:py-2 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 border border-slate-700 transition cursor-pointer min-h-[40px]"
            >
              <span>Descartar</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
