import React, { useState } from 'react';
import { BolusRecord, UserSettings } from '../types';
import { calculateIOB, generateIOBChartData } from '../utils/insulinMath';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { HeartPulse, Clock, Trash2, Plus, X, Syringe, Sparkles, CheckCircle2 } from 'lucide-react';

interface ActiveInsulinTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bolusHistory: BolusRecord[];
  settings: UserSettings;
  onAddManualBolus: (units: number, minutesAgo: number, notes?: string) => void;
  onDeleteBolus: (id: string) => void;
}

function formatElapsedTime(elapsedMinutes: number, timestamp: string): string {
  const date = new Date(timestamp);
  const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  if (elapsedMinutes < 60) {
    return `Hace ${Math.round(elapsedMinutes)} min (${timeStr})`;
  }
  if (elapsedMinutes < 1440) {
    const hours = (elapsedMinutes / 60).toFixed(1);
    return `Hace ${hours} h (${timeStr})`;
  }
  const days = Math.floor(elapsedMinutes / 1440);
  const dayStr = days === 1 ? '1 día' : `${days} días`;
  return `Hace ${dayStr} (${timeStr})`;
}

export const ActiveInsulinTrackerModal: React.FC<ActiveInsulinTrackerModalProps> = ({
  isOpen,
  onClose,
  bolusHistory,
  settings,
  onAddManualBolus,
  onDeleteBolus,
}) => {
  const [manualUnits, setManualUnits] = useState<string>('');
  const [manualMinutesAgo, setManualMinutesAgo] = useState<string>('');
  const [manualTime, setManualTime] = useState<string>('');
  const [manualNotes, setManualNotes] = useState<string>('');

  if (!isOpen) return null;

  const nowMs = Date.now();
  const { totalIOB, currentActivityUnitsPerHour, breakdown } = calculateIOB(bolusHistory, settings.diaHours, nowMs);
  const chartData = generateIOBChartData(bolusHistory, settings.diaHours, nowMs);

  // Separate active insulin doses from already absorbed ones
  const activeDoses = breakdown.filter((item) => item.remaining > 0.001);
  const absorbedDoses = breakdown.filter((item) => item.remaining <= 0.001);

  const handleClearAllAbsorbed = () => {
    if (absorbedDoses.length === 0) return;
    if (window.confirm(`¿Deseas eliminar las ${absorbedDoses.length} dosis pasadas que ya están 100% absorbidas?`)) {
      absorbedDoses.forEach((d) => onDeleteBolus(d.record.id));
    }
  };

  const handleTimeChange = (timeStr: string) => {
    setManualTime(timeStr);
    if (!timeStr) return;
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (!isNaN(h) && !isNaN(m)) {
      const now = new Date();
      const injection = new Date();
      injection.setHours(h, m, 0, 0);
      const diffMs = now.getTime() - injection.getTime();
      if (diffMs >= 0) {
        const mins = Math.round(diffMs / (60 * 1000));
        setManualMinutesAgo(mins.toString());
      }
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = parseFloat(manualUnits);
    const m = parseInt(manualMinutesAgo, 10);
    if (!u || u <= 0) return;
    onAddManualBolus(u, isNaN(m) ? 0 : m, manualNotes || (manualTime ? `Dosis de las ${manualTime}` : 'Bolus manual'));
    setManualNotes('');
    setManualTime('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 md:p-6 shadow-2xl space-y-5 text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <HeartPulse className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Curva e Historial de Insulina Activa (IOB)</h2>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  OpenAPS oref0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Modelo bi-exponencial Novorapid (Pico: 75 min • DIA: {settings.diaHours} horas)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Total IOB Highlight & Activity Rate */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-indigo-950/50 border border-indigo-800/60 rounded-xl p-4 flex items-center justify-between shadow-inner">
            <div>
              <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider block">Insulina Activa (IOB)</span>
              <span className="text-xs text-slate-400">Remanente actual en sangre</span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-extrabold font-mono text-indigo-300 tracking-tight">
                {totalIOB.toFixed(2)} <span className="text-lg font-bold text-indigo-400">U</span>
              </span>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-teal-300 uppercase tracking-wider block">Tasa de Acción Actual</span>
              <span className="text-xs text-slate-400">Actividad metabólica instantánea</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold font-mono text-teal-300 tracking-tight">
                {(currentActivityUnitsPerHour || 0).toFixed(2)} <span className="text-sm font-bold text-teal-400">U/h</span>
              </span>
            </div>
          </div>
        </div>

        {/* SECCIÓN 1: DOSIS CON INSULINA ACTIVA (PRIMERO Y DESTACADO) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {activeDoses.length > 0 && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${activeDoses.length > 0 ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
              </span>
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                Dosis con Insulina Activa en Sangre ({activeDoses.length})
              </span>
            </div>
            {activeDoses.length > 0 && (
              <span className="text-[11px] font-mono text-indigo-300 font-bold">
                Total activo: {totalIOB.toFixed(2)} U
              </span>
            )}
          </div>

          {activeDoses.length === 0 ? (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-center space-y-1">
              <p className="text-xs text-slate-400">No hay insulina activa circulando en sangre en este momento.</p>
              <p className="text-[11px] text-slate-500">Toda la insulina inyectada previamente ya ha completado sus {settings.diaHours} horas de acción.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeDoses.map(({ record, remaining, elapsedHours, elapsedMinutes, decayFraction, activityUnitsPerHour }) => {
                const dateObj = new Date(record.timestamp);
                const timeStr = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
                const absorbedPercent = decayFraction !== undefined 
                  ? Math.round((1 - decayFraction) * 100) 
                  : Math.round((1 - (remaining / record.units)) * 100);
                
                const mins = elapsedMinutes || Math.round(elapsedHours * 60);
                const totalDiaMins = settings.diaHours * 60;
                const remainingMinutesOfAction = Math.max(0, Math.round(totalDiaMins - mins));

                return (
                  <div 
                    key={record.id} 
                    className="bg-indigo-950/30 border border-indigo-500/40 hover:border-indigo-400/60 transition rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm"
                  >
                    <div className="flex items-start space-x-2.5">
                      <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 shrink-0 mt-0.5">
                        <Syringe className="h-4 w-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-slate-100">{record.units} U Novorapid</span>
                          {record.splitInfo?.isSplit && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {record.splitInfo.part === 1 ? '1ª Dosis (Split)' : '2ª Dosis (Split)'}
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Activa
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-300 flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium">{formatElapsedTime(mins, record.timestamp)}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-teal-300">⏳ Quedan ~{remainingMinutesOfAction > 60 ? `${(remainingMinutesOfAction / 60).toFixed(1)} h` : `${remainingMinutesOfAction} min`}</span>
                          {activityUnitsPerHour && (
                            <>
                              <span className="text-slate-500">•</span>
                              <span className="text-indigo-300">Tasa: {activityUnitsPerHour.toFixed(2)} U/h</span>
                            </>
                          )}
                        </div>

                        {record.notes && (
                          <span className="text-slate-400 block text-[10px] italic">
                            {record.notes}
                          </span>
                        )}

                        {/* Progress Bar of absorption */}
                        <div className="w-full max-w-xs bg-slate-800 rounded-full h-1.5 overflow-hidden mt-1.5">
                          <div 
                            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" 
                            style={{ width: `${absorbedPercent}%` }}
                            title={`${absorbedPercent}% absorbida`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end space-x-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-400 block">IOB remanente</span>
                        <span className="font-mono text-base font-extrabold text-indigo-300">
                          {remaining.toFixed(2)} <span className="text-xs font-bold text-indigo-400">U</span>
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">{absorbedPercent}% absorbida</span>
                      </div>

                      <button
                        onClick={() => onDeleteBolus(record.id)}
                        className="text-rose-400/80 hover:text-rose-300 hover:bg-rose-950/40 p-1.5 rounded-lg transition"
                        title="Eliminar dosis"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recharts Area Chart */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 block">Proyección de Curva IOB (Próximas 4 Horas)</span>
            <span className="text-[10px] text-slate-400 font-mono">Resolución 10 min</span>
          </div>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="iobGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '12px' }}
                  itemStyle={{ color: '#818cf8', fontSize: '12px', fontWeight: 'bold' }}
                  formatter={(val: any) => [`${parseFloat(val).toFixed(2)} U`, 'IOB Restante']}
                />
                <Area type="monotone" dataKey="iob" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#iobGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECCIÓN 2: DOSIS YA ABSORBIDAS (CUANDO VA BAJANDO) */}
        <div className="space-y-2.5 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Dosis Ya Absorbidas ({absorbedDoses.length})
              </span>
            </div>
            {absorbedDoses.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllAbsorbed}
                className="text-[10px] text-rose-400/80 hover:text-rose-300 hover:underline flex items-center gap-1 transition"
              >
                <Trash2 className="h-3 w-3" />
                <span>Limpiar absorbidas</span>
              </button>
            )}
          </div>

          {absorbedDoses.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No hay registros de dosis absorbidas pasadas.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {absorbedDoses.map(({ record, elapsedHours, elapsedMinutes }) => {
                const mins = elapsedMinutes || Math.round(elapsedHours * 60);

                return (
                  <div 
                    key={record.id} 
                    className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between text-xs text-slate-400 hover:bg-slate-950 transition"
                  >
                    <div className="flex items-center space-x-2">
                      <Syringe className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-300">{record.units} U Novorapid</span>
                          {record.splitInfo?.isSplit && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                              {record.splitInfo.part === 1 ? '1ª Split' : '2ª Split'}
                            </span>
                          )}
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-500 border border-slate-800">
                            100% absorbida
                          </span>
                        </div>
                        <span className="text-slate-500 block text-[10px]">
                          {formatElapsedTime(mins, record.timestamp)} • {record.notes || 'Bolus registrado'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-slate-500 text-[11px]">
                        0.00 U
                      </span>
                      <button
                        onClick={() => onDeleteBolus(record.id)}
                        className="text-slate-600 hover:text-rose-400 p-1 transition"
                        title="Eliminar del historial"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Manual Past Bolus Form */}
        <form onSubmit={handleAddSubmit} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3">
          <span className="text-xs font-bold text-slate-300 block">Registrar Bolus Previo Manualmente</span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <label className="text-[10px] text-slate-400 block">Unidades (U)</label>
              <input
                type="number"
                step="0.5"
                value={manualUnits}
                onChange={(e) => setManualUnits(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block">Hora exacta (Reloj)</label>
              <input
                type="time"
                value={manualTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-full bg-slate-900 border border-indigo-500/40 rounded-lg p-2 text-indigo-200 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block">O minutos transcurridos</label>
              <input
                type="number"
                value={manualMinutesAgo}
                onChange={(e) => {
                  setManualMinutesAgo(e.target.value);
                  setManualTime('');
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block">Notas</label>
              <input
                type="text"
                placeholder="Ej. Almuerzo"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Añadir a Historial IOB</span>
          </button>
        </form>

      </div>
    </div>
  );
};

