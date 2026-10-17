import React from 'react';
import { AlertTriangle, Radio, Syringe, Compass, ChevronRight } from 'lucide-react';

interface TopBetaDisclaimerBannerProps {
  onGoToFactors?: () => void;
}

export const TopBetaDisclaimerBanner: React.FC<TopBetaDisclaimerBannerProps> = ({
  onGoToFactors,
}) => {
  const handleScrollToFactors = () => {
    if (onGoToFactors) {
      onGoToFactors();
      return;
    }
    const el = document.getElementById('section-glycemic-factors');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/95 backdrop-blur-sm p-3 sm:p-3.5 shadow-sm text-slate-200">
      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            Avisos de Precisión y Seguridad
          </span>
          <span className="text-[11px] text-slate-400">
            Recomendaciones para el día a día
          </span>
        </div>
        <button
          type="button"
          onClick={handleScrollToFactors}
          className="text-[11px] font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1 transition cursor-pointer shrink-0"
        >
          <Compass className="h-3 w-3" />
          <span>Ver los 42 factores</span>
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        {/* Aviso de la App (achicado, sin botón a comentarios) */}
        <div className="flex items-start gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-slate-300 leading-snug">
            <strong className="text-amber-300 font-semibold">Precisión de la app:</strong>{' '}
            Puede cometer errores en búsquedas o estimaciones. Cualquier fallo podés reportarlo en la sección de comentarios para corregirlo.
          </p>
        </div>

        {/* Aviso del Sensor (primer y último día) */}
        <div className="flex items-start gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
          <Radio className="h-3.5 w-3.5 text-sky-400 shrink-0 mt-0.5" />
          <p className="text-slate-300 leading-snug">
            <strong className="text-sky-300 font-semibold">Sensor de glucosa:</strong>{' '}
            En las primeras 24 h (día 1) y en su último día suele haber mayor variación. Si la lectura no coincide con cómo te sentís, confirmá siempre con el dedo.
          </p>
        </div>

        {/* Aviso de la Insulina (vencimiento 28-30 días y temperatura) */}
        <div className="flex items-start gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
          <Syringe className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-slate-300 leading-snug">
            <strong className="text-rose-300 font-semibold">Cuidado de la insulina:</strong>{' '}
            Abierta a temperatura ambiente dura 28-30 días. Cuidala del sol directo y calor (&gt;30°C), ya que pierde potencia.
          </p>
        </div>

        {/* Recordatorio de los 42 Factores */}
        <div className="flex items-start gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
          <Compass className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-slate-300 leading-snug">
            <strong className="text-emerald-300 font-semibold">Los 42 factores:</strong>{' '}
            Recordá tener en cuenta temperatura exterior, duchas calientes, sol, estrés o ejercicio previo antes de corregir o interpretar tu glucemia.
          </p>
        </div>
      </div>
    </div>
  );
};
