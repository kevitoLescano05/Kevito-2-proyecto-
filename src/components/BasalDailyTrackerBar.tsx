import React, { useState } from 'react';
import { UserSettings } from '../types';
import { getLogicalDateKey } from '../utils/dateCutoff';
import { ShieldCheck, Check, Clock, Settings2, RotateCcw } from 'lucide-react';

interface BasalDailyTrackerBarProps {
  settings: UserSettings;
  onUpdateSettings: (updated: UserSettings) => void;
}

const BASAL_BRANDS = ['Tresiba', 'Toujeo', 'Lantus', 'Basaglar', 'Levemir', 'NPH', 'Otra Lenta'];

export const BasalDailyTrackerBar: React.FC<BasalDailyTrackerBarProps> = ({
  settings,
  onUpdateSettings,
}) => {
  // Si usa bomba de infusión, no usa insulina basal lenta en lapicera
  if (settings.insulinMode === 'pump') return null;

  const basal = settings.basalConfig || {
    enabled: true,
    brandName: 'Tresiba',
    defaultUnits: 18,
    scheduledTime: '22:00',
  };

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [brandInput, setBrandInput] = useState<string>(basal.brandName || 'Tresiba');
  const [unitsInput, setUnitsInput] = useState<number>(basal.defaultUnits || 18);
  const [timeInput, setTimeInput] = useState<string>(basal.scheduledTime || '22:00');

  if (basal.enabled === false && !isEditing) {
    return null;
  }

  const todayKey = getLogicalDateKey(settings.dayCutoffHour ?? 2, new Date());
  const isAppliedToday = basal.lastAppliedDateKey === todayKey;

  const handleMarkAppliedToday = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');

    onUpdateSettings({
      ...settings,
      basalConfig: {
        ...basal,
        enabled: true,
        lastAppliedDateKey: todayKey,
        lastAppliedAtTime: `${hh}:${mm}`,
        lastAppliedUnits: basal.defaultUnits,
      },
    });
  };

  const handleUnmarkToday = () => {
    onUpdateSettings({
      ...settings,
      basalConfig: {
        ...basal,
        lastAppliedDateKey: undefined,
        lastAppliedAtTime: undefined,
      },
    });
  };

  const handleSaveBasalConfig = () => {
    onUpdateSettings({
      ...settings,
      basalConfig: {
        ...basal,
        enabled: true,
        brandName: brandInput,
        defaultUnits: Math.max(1, Number(unitsInput) || 18),
        scheduledTime: timeInput || '22:00',
      },
    });
    setIsEditing(false);
  };

  return (
    <div
      id="bar-basal-daily-tracker"
      className={`rounded-2xl p-3.5 border transition shadow-md ${
        isAppliedToday
          ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-100'
          : 'bg-slate-900 border-slate-800 text-slate-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl border ${
              isAppliedToday
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
            }`}
          >
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-white">
                Control de Insulina Basal / Lenta ({basal.brandName} • {basal.defaultUnits} U)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 border border-slate-700 text-slate-300 flex items-center gap-1">
                <Clock className="h-3 w-3 text-indigo-400" />
                Horario habitual: {basal.scheduledTime} hs
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isAppliedToday ? (
                <span className="text-emerald-300 font-semibold">
                  ✅ Ya te aplicaste tu basal hoy ({basal.lastAppliedUnits || basal.defaultUnits} U de {basal.brandName} a las {basal.lastAppliedAtTime} hs). ¡No volver a inyectar!
                </span>
              ) : (
                <span>
                  ¿Ya te aplicaste tu insulina lenta de hoy? Marcalo acá apenas te pinches para no olvidarte ni inyectarte dos veces por duda.
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isAppliedToday ? (
            <button
              type="button"
              id="btn-unmark-basal-today"
              onClick={handleUnmarkToday}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Deshacer si marcaste por error"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Aplicada ({basal.lastAppliedAtTime}) • Deshacer</span>
            </button>
          ) : (
            <button
              type="button"
              id="btn-mark-basal-applied"
              onClick={handleMarkAppliedToday}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <Check className="h-4 w-4 stroke-[3]" />
              <span>Confirmar Basal Aplicada Hoy ({basal.defaultUnits} U)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Configurar marca, unidades u horario de tu basal"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Editor rápido de Insulina Basal */}
      {isEditing && (
        <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs animate-fadeIn">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Marca de Basal / Lenta:</label>
            <select
              value={brandInput}
              onChange={(e) => setBrandInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100"
            >
              {BASAL_BRANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Unidades habituales (U):</label>
            <input
              type="number"
              min={1}
              max={150}
              value={unitsInput}
              onChange={(e) => setUnitsInput(Number(e.target.value) || 18)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-slate-100"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Horario habitual:</label>
            <input
              type="time"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-slate-100"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleSaveBasalConfig}
              className="w-full py-1.5 px-3 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition"
            >
              Guardar Basal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
