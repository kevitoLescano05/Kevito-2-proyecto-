import React, { useState, useEffect } from 'react';
import { GlucoseTrend } from '../types';
import { calculateHypoRescuePlan } from '../utils/insulinMath';
import {
  ShieldAlert,
  Timer,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface HypoRescueAssistantCardProps {
  currentGlucose: number;
  trendArrow: GlucoseTrend;
  iobValue: number;
  weightKg?: number;
  icr: number;
}

export const HypoRescueAssistantCard: React.FC<HypoRescueAssistantCardProps> = ({
  currentGlucose,
  trendArrow,
  iobValue,
  weightKg = 65,
  icr,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [timerFinished, setTimerFinished] = useState<boolean>(false);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      setSecondsLeft(null);
      setTimerFinished(true);
      return;
    }
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const plan = calculateHypoRescuePlan(
    currentGlucose,
    trendArrow,
    iobValue,
    weightKg,
    icr
  );

  const handleStart15MinTimer = () => {
    setTimerFinished(false);
    setSecondsLeft(15 * 60); // 15 minutos = 900 segundos
  };

  const handleResetTimer = () => {
    setSecondsLeft(null);
    setTimerFinished(false);
  };

  const formatMmSs = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div
      id="card-hypo-rescue-assistant"
      className="bg-rose-950/80 border-2 border-rose-500 rounded-2xl p-4 shadow-xl space-y-3 text-rose-100 animate-fadeIn"
    >
      <div className="flex items-start justify-between gap-2 border-b border-rose-800/80 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-400/50 text-rose-300">
            <ShieldAlert className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2 flex-wrap">
              <span>
                🚨 Asistente de Rescate de Hipoglucemia ({currentGlucose} mg/dL)
              </span>
              {plan.isSevereHypo && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-slate-950 font-extrabold uppercase">
                  Urgente (&lt;54 mg/dL)
                </span>
              )}
            </h4>
            <p className="text-[11px] text-rose-200/90">
              Cálculo según tu peso ({weightKg} kg), glucemia e Insulina Activa ({iobValue.toFixed(1)} U)
            </p>
          </div>
        </div>

        <div className="text-right shrink-0 bg-black/40 px-3 py-1.5 rounded-xl border border-rose-400/40">
          <span className="text-[10px] text-rose-300 block uppercase font-bold">
            Tomar ahora:
          </span>
          <span className="text-xl font-mono font-extrabold text-amber-300">
            {plan.totalFastCarbsRecommended}g HC
          </span>
        </div>
      </div>

      {/* Explicación simple del porqué de esa cantidad */}
      <div className="bg-black/30 border border-rose-800/60 rounded-xl p-2.5 text-xs space-y-1">
        <p className="text-rose-100 font-medium leading-relaxed">
          💡 <strong>¿Por qué {plan.totalFastCarbsRecommended} gramos?:</strong> {plan.explanation}.
        </p>
        <p className="text-[11px] text-amber-200/90">
          ⚠️ <strong>Importante:</strong> Usá azúcar rápida pura (sin grasa ni proteína). El chocolate, helado o leche con grasa tardan mucho en subir la glucosa.
        </p>
      </div>

      {/* Opciones prácticas equivalentes */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-rose-200 block">
          Elegí UNA sola de estas opciones equivalentes a {plan.totalFastCarbsRecommended}g rápidos:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {plan.practicalOptions.map((opt, idx) => (
            <div
              key={idx}
              className="bg-slate-950/75 border border-rose-700/50 rounded-xl p-2.5 flex items-start gap-2 text-xs"
            >
              <span className="text-lg shrink-0">{opt.emoji}</span>
              <div>
                <span className="font-bold text-white block leading-tight">
                  {opt.label}
                </span>
                <span className="text-[11px] text-amber-300 font-semibold block mt-0.5">
                  {opt.portionDetail}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reloj de la Regla de los 15 Minutos */}
      <div className="bg-slate-950/90 border border-rose-700/60 rounded-xl p-3 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-white block">
                ⏱️ Regla de los 15 Minutos (Evitar efecto rebote)
              </span>
              <span className="text-[11px] text-slate-300">
                El azúcar tarda 15 minutos en pasar a la sangre y otro ratito en verse en el sensor. No comas de más en el medio.
              </span>
            </div>
          </div>

          {secondsLeft === null ? (
            <button
              type="button"
              id="btn-start-hypo-15m-timer"
              onClick={handleStart15MinTimer}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shrink-0 transition shadow-md cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Ya tomé los {plan.totalFastCarbsRecommended}g • Iniciar 15 min</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 font-mono text-base font-extrabold">
                ⏳ {formatMmSs(secondsLeft)}
              </div>
              <button
                type="button"
                onClick={handleResetTimer}
                title="Reiniciar reloj"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {timerFinished && (
          <div className="p-2.5 rounded-lg bg-emerald-950/90 border border-emerald-500/70 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              <strong>¡Se cumplieron los 15 minutos!</strong> Volvé a medir tu glucosa (idealmente en dedo si seguís con síntomas). Si ya subió de 70 mg/dL, podés comer normal. Si sigue menor a 70 mg/dL, repetí 15g rápidos.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
