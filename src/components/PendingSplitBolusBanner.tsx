import React, { useState, useEffect } from 'react';
import { PendingSplitBolus, BolusRecord } from '../types';
import { calculateSmartAntiStackingAdvice, evaluateMultipleSplitsSpacing } from '../utils/insulinMath';
import { Split, Timer, CheckCircle2, XCircle, AlertTriangle, Syringe, Clock, Sparkles, ShieldAlert, ArrowRight, Bell, AlarmClock } from 'lucide-react';

interface PendingSplitBolusBannerProps {
  pendingSplits: PendingSplitBolus[];
  bolusHistory?: BolusRecord[];
  onConfirmSecondDose: (splitId: string) => void;
  onDismissSplit: (splitId: string) => void;
  onPostponeSplit?: (splitId: string, additionalMinutes: number) => void;
  onTogglePauseSplit?: (splitId: string) => void;
  onPostponeAllSplits?: (adjustments: { splitId: string; additionalMinutes: number }[]) => void;
  onRequestSafetyCheck?: (split: PendingSplitBolus) => void;
}

export const PendingSplitBolusBanner: React.FC<PendingSplitBolusBannerProps> = ({
  pendingSplits,
  bolusHistory = [],
  onConfirmSecondDose,
  onDismissSplit,
  onPostponeSplit,
  onTogglePauseSplit,
  onPostponeAllSplits,
  onRequestSafetyCheck,
}) => {
  const [now, setNow] = useState<number>(Date.now());
  const [postponedNotice, setPostponedNotice] = useState<string | null>(null);

  // Actualizar el reloj cada 15 segundos para el contador
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  if (!pendingSplits || pendingSplits.length === 0) return null;

  // Analizar colisión entre múltiples bolos pendientes
  const multiCollision = evaluateMultipleSplitsSpacing(pendingSplits, now);

  return (
    <div className="space-y-4 mb-6">
      {/* Alerta de Colisión cuando hay Múltiples Bolos Divididos Cercanos */}
      {multiCollision.hasCollision && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border-2 border-rose-500/80 text-rose-200 shadow-xl space-y-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-6 w-6 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-rose-300 uppercase tracking-wider">
                ⚠️ Alerta Anti-Hipoglucemia: Múltiples Segundos Bolos Muy Juntos
              </h4>
              <p className="text-xs text-rose-100 leading-relaxed">
                {multiCollision.message}
              </p>
            </div>
          </div>

          {multiCollision.suggestedFixes && multiCollision.suggestedFixes.length > 0 && onPostponeAllSplits && (
            <div className="pt-1 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  onPostponeAllSplits(multiCollision.suggestedFixes!);
                  setPostponedNotice('Se espaciaron los bolos pendientes automáticamente para que no choquen');
                  setTimeout(() => setPostponedNotice(null), 4000);
                }}
                className="py-2 px-3.5 rounded-xl font-bold text-xs bg-rose-500 hover:bg-rose-400 text-slate-950 flex items-center gap-2 transition shadow-lg ring-2 ring-rose-400 cursor-pointer active:scale-95"
              >
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>⚡ Reorganizar y espaciar todos los bolos pendientes (+45m de seguridad)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tarjetas Individuales de Bolos Pendientes (1ª Dosis y/o 2ª Dosis) */}
      {pendingSplits.map((split) => {
        const dueMs = new Date(split.dueAt).getTime();
        const diffMs = dueMs - now;
        const isOverdue = diffMs <= 0;
        const absDiffMs = Math.abs(diffMs);
        const hours = Math.floor(absDiffMs / (1000 * 60 * 60));
        const minutes = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));
        const timeStr = `${hours > 0 ? `${hours}h ` : ''}${minutes} min`;

        const dueDate = new Date(dueMs);
        const dueTimeStr = `${dueDate.getHours().toString().padStart(2, '0')}:${dueDate.getMinutes().toString().padStart(2, '0')}`;

        // Cálculo Automático de Anti-Solapamiento frente a inyecciones recientes
        const advice = calculateSmartAntiStackingAdvice(split, bolusHistory, now);

        // Si es 1ª Dosis Pendiente (Post-prandial diferido / espera tras comer para remontar glucosa)
        if (split.part === 1) {
          const waitMinsText = split.delayMinutes ? `${split.delayMinutes} min` : `${Math.round(split.delayHours * 60)} min`;
          return (
            <div
              key={split.id}
              className={`rounded-2xl border p-4 md:p-5 transition-all shadow-xl space-y-3.5 ${
                isOverdue
                  ? 'bg-teal-950/80 border-teal-500/80 ring-2 ring-teal-500/40 animate-pulse'
                  : 'bg-slate-900/90 border-teal-500/50 shadow-teal-950/40'
              }`}
            >
              {/* Cabecera de la 1ª Dosis */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Información de la 1ª Dosis */}
                <div className="flex items-start space-x-3.5">
                  <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                    isOverdue ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  }`}>
                    <Syringe className="h-6 w-6" />
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900/80 text-teal-300 border border-teal-500/40">
                        1ª Dosis en Espera
                      </span>
                      <span className="text-xs text-slate-300 font-medium">
                        (Post-prandial diferido • Espera de {waitMinsText} tras comer)
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-100 mt-1 flex items-center gap-2">
                      <span>1ª Dosis Pendiente:</span>
                      <span className="text-2xl font-mono font-black text-teal-400">{split.units} U Novorapid</span>
                    </h3>

                    <p className="text-xs text-slate-300 mt-0.5 max-w-xl line-clamp-1">
                      Comida: <strong className="text-slate-100">{split.mealDescription}</strong> ({split.carbsGrams}g HC | <strong className="text-amber-300">{split.fatGrams}g Grasa</strong>)
                    </p>
                  </div>
                </div>

                {/* Horario Fijado y Botón Confirmar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                  {/* Indicador de tiempo en el reloj */}
                  <div className={`px-3 py-2 rounded-xl border flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs font-bold ${
                    split.isPaused
                      ? 'bg-amber-950/60 border-amber-500/60 text-amber-300'
                      : isOverdue
                      ? 'bg-teal-950/60 border-teal-500/60 text-teal-300'
                      : 'bg-slate-900/90 border-slate-700/80 text-slate-200'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <Timer className={`h-4 w-4 ${split.isPaused ? 'text-amber-400' : isOverdue ? 'text-teal-400 animate-spin' : 'text-teal-400'}`} />
                      <span>{split.isPaused ? '⏸️ En espera (Pausado)' : isOverdue ? `¡Cumplido hace ${timeStr}!` : `Aplicar en ${timeStr}`}</span>
                    </div>
                    {!split.isPaused && (
                      <span className="text-[11px] text-teal-300/90 font-mono">
                        ({dueTimeStr} hs)
                      </span>
                    )}
                  </div>

                  {/* Botón: Chequeo Sensor FreeStyle / Confirmar 1ra Dosis */}
                  {onRequestSafetyCheck ? (
                    <button
                      onClick={() => onRequestSafetyCheck(split)}
                      id={`btn-safety-check-split-${split.id}`}
                      className="py-2.5 px-4 rounded-xl font-bold text-xs bg-teal-500 hover:bg-teal-400 text-slate-950 flex items-center justify-center gap-1.5 transition shadow-md active:scale-95 cursor-pointer"
                    >
                      <ShieldAlert className="h-4 w-4 text-slate-950" />
                      <span>⚡ Chequear Sensor e Inyectar 1ª Dosis</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onConfirmSecondDose(split.id)}
                      id={`btn-confirm-split-${split.id}`}
                      className="py-2.5 px-4 rounded-xl font-bold text-xs bg-teal-500 hover:bg-teal-400 text-slate-950 flex items-center justify-center gap-2 transition shadow-md active:scale-95 cursor-pointer"
                    >
                      <Syringe className="h-4 w-4" />
                      <span>Confirmar Inyección 1ª Dosis ({split.units} U)</span>
                    </button>
                  )}

                  {/* Botón rápido: Ya me la inyecté */}
                  {onRequestSafetyCheck && (
                    <button
                      onClick={() => onConfirmSecondDose(split.id)}
                      id={`btn-direct-confirm-split-${split.id}`}
                      className="py-2.5 px-3 rounded-xl text-xs bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-700 transition flex items-center justify-center gap-1 cursor-pointer"
                      title="Registrar dosis sin chequeo de sensor"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">Ya inyectada</span>
                    </button>
                  )}




                  {/* Botón: Cancelar / Descartar */}
                  <button
                    onClick={() => onDismissSplit(split.id)}
                    id={`btn-dismiss-split-${split.id}`}
                    className="py-2.5 px-3 rounded-xl text-xs bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition flex items-center justify-center gap-1"
                    title="Descartar recordatorio si no se aplicó"
                  >
                    <XCircle className="h-4 w-4" />
                    <span className="sm:hidden">Descartar</span>
                  </button>
                </div>

              </div>

              {/* CONTROL UNIFICADO: PAUSAR BOLO / EN ESPERA DE SENSOR */}
              {split.isPaused ? (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-200">
                  <div className="space-y-0.5">
                    <span className="font-bold flex items-center gap-1.5 text-amber-300">
                      <Clock className="h-4 w-4" />
                      <span>1ª Dosis en espera indefinida del sensor FreeStyle</span>
                    </span>
                    <p className="text-[11px] text-slate-300">
                      El reloj está pausado hasta que escanees tu sensor o decidas inyectarte. Red de seguridad activa (aviso a los 90 min).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onTogglePauseSplit?.(split.id);
                      setPostponedNotice(`Reloj reanudado (+30 min) para 1ª dosis de ${split.units} U`);
                      setTimeout(() => setPostponedNotice(null), 3500);
                    }}
                    id={`btn-resume-p1-${split.id}`}
                    className="py-2 px-3.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition cursor-pointer shrink-0 active:scale-95"
                  >
                    ▶️ Reanudar reloj (+30m)
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-teal-400" />
                      <span>¿Tu glucosa aún no remontó?</span>
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Pausa el reloj indefinidamente hasta que escanees tu sensor o decidas colocarte la dosis.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onTogglePauseSplit?.(split.id);
                      setPostponedNotice(`1ª Dosis de ${split.units} U pausada indefinidamente en espera de sensor`);
                      setTimeout(() => setPostponedNotice(null), 3500);
                    }}
                    id={`btn-pause-p1-${split.id}`}
                    className="py-2 px-3.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                  >
                    <span>⏸️ Pausar bolo / En espera</span>
                  </button>
                </div>
              )}

              {/* Aviso flotante de dosis pospuesta */}
              {postponedNotice && (
                <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{postponedNotice}.</span>
                </div>
              )}

              {/* Micro Nota Médica */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-400">
                <span>
                  💡 <strong>Regla Clínica:</strong> Aplica esta 1ª dosis cuando confirmes en tu sensor FreeStyle Libre que la glucemia haya remontado a &gt;85-90 mg/dL para no inducir hipoglucemia.
                </span>
                <span className="font-mono text-teal-400/80">
                  {split.delayMinutes ? `+${split.delayMinutes} min tras comida` : `+${Math.round(split.delayHours * 60)} min`}
                </span>
              </div>

            </div>
          );
        }

        // ==========================================
        // APARTADO DE SEGUNDOS BOLOS (INTACTO)
        // ==========================================
        const isFirstDoseStillPending = pendingSplits.some(s => s.part === 1 && s.parentBolusId === split.parentBolusId);

        return (
          <div
            key={split.id}
            className={`rounded-2xl border p-4 md:p-5 transition-all shadow-xl space-y-3.5 ${
              isOverdue
                ? 'bg-amber-950/80 border-amber-500/80 ring-2 ring-amber-500/40 animate-pulse'
                : 'bg-indigo-950/70 border-indigo-500/60 shadow-indigo-950/50'
            }`}
          >
            {/* Cabecera de la 2ª Dosis */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Información de la 2ª Dosis */}
              <div className="flex items-start space-x-3.5">
                <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                  isOverdue ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                }`}>
                  <Split className="h-6 w-6" />
                </div>
                
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900/80 text-amber-300 border border-amber-500/30">
                      Bolo Dividido en Curso
                    </span>
                    <span className="text-xs text-slate-300 font-medium">
                      {isFirstDoseStillPending 
                        ? `(1ª Dosis de ${split.firstDoseUnits} U en espera)` 
                        : `(1ª Dosis de ${split.firstDoseUnits} U ya inyectada)`}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-100 mt-1 flex items-center gap-2">
                    <span>2ª Dosis Pendiente:</span>
                    <span className="text-2xl font-mono font-black text-amber-400">{split.units} U Novorapid</span>
                  </h3>

                  <p className="text-xs text-slate-300 mt-0.5 max-w-xl line-clamp-1">
                    Comida: <strong className="text-slate-100">{split.mealDescription}</strong> ({split.carbsGrams}g HC | <strong className="text-amber-300">{split.fatGrams}g Grasa</strong>)
                  </p>

                  {split.absorptionWindowText && (
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-amber-300/90 bg-slate-900/60 py-0.5 px-2 rounded-lg w-fit border border-amber-500/20">
                      <Clock className="h-3 w-3 text-amber-400" />
                      <span>{split.absorptionWindowText}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Horario Fijado y Botón Confirmar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                {/* Indicador de tiempo */}
                <div className={`px-3 py-2 rounded-xl border flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs font-bold ${
                  split.isPaused
                    ? 'bg-amber-950/60 border-amber-500/60 text-amber-300'
                    : isOverdue
                    ? 'bg-rose-950/60 border-rose-500/60 text-rose-300'
                    : 'bg-slate-900/90 border-slate-700/80 text-slate-200'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <Timer className={`h-4 w-4 ${split.isPaused ? 'text-amber-400' : isOverdue ? 'text-rose-400 animate-spin' : 'text-indigo-400'}`} />
                    <span>{split.isPaused ? '⏸️ En espera (Pausado)' : isOverdue ? `¡Cumplido hace ${timeStr}!` : `Vence en ${timeStr}`}</span>
                  </div>
                  {!split.isPaused && (
                    <span className="text-[11px] text-amber-300/90 font-mono">
                      ({dueTimeStr} hs)
                    </span>
                  )}
                </div>

                {/* Botón: Chequeo Sensor FreeStyle / Confirmar 2da Dosis */}
                {onRequestSafetyCheck ? (
                  <button
                    onClick={() => onRequestSafetyCheck(split)}
                    id={`btn-safety-check-split-${split.id}`}
                    className="py-2.5 px-4 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-1.5 transition shadow-md active:scale-95 cursor-pointer"
                  >
                    <ShieldAlert className="h-4 w-4 text-slate-950" />
                    <span>⚡ Chequear Sensor e Inyectar</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onConfirmSecondDose(split.id)}
                    id={`btn-confirm-split-${split.id}`}
                    className="py-2.5 px-4 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-2 transition shadow-md active:scale-95 cursor-pointer"
                  >
                    <Syringe className="h-4 w-4" />
                    <span>Confirmar Inyección ({split.units} U)</span>
                  </button>
                )}

                {/* Botón rápido: Ya me la inyecté */}
                {onRequestSafetyCheck && (
                  <button
                    onClick={() => onConfirmSecondDose(split.id)}
                    id={`btn-direct-confirm-split-${split.id}`}
                    className="py-2.5 px-3 rounded-xl text-xs bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-700 transition flex items-center justify-center gap-1 cursor-pointer"
                    title="Registrar dosis original sin chequeo de sensor"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Ya inyectada</span>
                  </button>
                )}




                {/* Botón: Cancelar / Descartar */}
                <button
                  onClick={() => onDismissSplit(split.id)}
                  id={`btn-dismiss-split-${split.id}`}
                  className="py-2.5 px-3 rounded-xl text-xs bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition flex items-center justify-center gap-1 cursor-pointer"
                  title="Descartar este bolo si la comida no subió o si hiciste actividad física"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Descartar</span>
                </button>
              </div>

            </div>

            {/* SECCIÓN INTELIGENTE: AVISO Y CÁLCULO AUTOMÁTICO DE ANTI-SOLAPAMIENTO */}
            {advice.hasRisk && (
              <div className="p-3.5 rounded-xl bg-amber-950/90 border-2 border-amber-500/80 text-slate-200 shadow-md space-y-2.5 animate-fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-extrabold text-amber-300 uppercase tracking-wide">
                      {advice.headline}
                    </h4>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {advice.clinicalExplanation}
                    </p>
                    <p className="text-[11px] text-amber-200 bg-slate-900/80 p-2 rounded-lg border border-amber-500/30">
                      🛡️ <strong>Regulación de Digestión:</strong> {advice.fatProtectionNote}
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onPostponeSplit?.(split.id, advice.suggestedPostponeMinutes);
                      setPostponedNotice(`Dosis de ${split.units} U ajustada +${advice.suggestedPostponeMinutes} min (horario seguro: ${advice.newScheduledTimeText})`);
                      setTimeout(() => setPostponedNotice(null), 4000);
                    }}
                    id={`btn-apply-smart-postpone-${split.id}`}
                    className="w-full sm:w-auto py-2.5 px-4 rounded-xl font-extrabold text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center gap-2 transition shadow-lg ring-2 ring-amber-300 cursor-pointer active:scale-95"
                  >
                    <Sparkles className="h-4 w-4 text-slate-950 shrink-0" />
                    <span>{advice.actionButtonText}</span>
                  </button>
                </div>
              </div>
            )}

            {/* CONTROL UNIFICADO: PAUSAR BOLO / EN ESPERA DE SENSOR */}
            {split.isPaused ? (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-200">
                <div className="space-y-0.5">
                  <span className="font-bold flex items-center gap-1.5 text-amber-300">
                    <Clock className="h-4 w-4" />
                    <span>2ª Dosis en espera indefinida del sensor FreeStyle</span>
                  </span>
                  <p className="text-[11px] text-slate-300">
                    El reloj está pausado. Se mantendrá detenido hasta que escanees tu sensor o decidas aplicarte el bolo. Red de seguridad activa (aviso a los 90 min).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onTogglePauseSplit?.(split.id);
                    setPostponedNotice(`Reloj reanudado (+30 min) para 2ª dosis de ${split.units} U`);
                    setTimeout(() => setPostponedNotice(null), 3500);
                  }}
                  id={`btn-resume-p2-${split.id}`}
                  className="py-2 px-3.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition cursor-pointer shrink-0 active:scale-95"
                >
                  ▶️ Reanudar reloj (+30m)
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-teal-400" />
                    <span>¿La subida por grasas aún no comenzó?</span>
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Pausa el reloj indefinidamente hasta que tu sensor marque subida o decidas chequear.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onTogglePauseSplit?.(split.id);
                    setPostponedNotice(`2ª Dosis de ${split.units} U pausada indefinidamente en espera de sensor`);
                    setTimeout(() => setPostponedNotice(null), 3500);
                  }}
                  id={`btn-pause-p2-${split.id}`}
                  className="py-2 px-3.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                >
                  <span>⏸️ Pausar bolo / En espera</span>
                </button>
              </div>
            )}

            {/* Aviso flotante de dosis pospuesta */}
            {postponedNotice && (
              <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{postponedNotice}. Se ajustó el tiempo sin mezclar dosis.</span>
              </div>
            )}

            {/* Micro Nota Médica */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-400">
              <span>
                💡 <strong>Regla Anti-Hipoglucemia:</strong> Si te colocaste insulina hace poco o tu glucemia no sube, usa los botones de arriba para aumentar el tiempo y no juntar inyecciones.
              </span>
              <span className="font-mono text-slate-500">
                Programada a las +{split.delayHours}h
              </span>
            </div>

          </div>
        );
      })}
    </div>
  );
};

