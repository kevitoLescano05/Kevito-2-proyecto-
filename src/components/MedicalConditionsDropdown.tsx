import React, { useState } from 'react';
import { MedicalConditionId, UserSettings } from '../types';
import {
  MEDICAL_CONDITIONS_CATALOG,
  getActiveMedicalConditions,
  countActiveMedicalConditions,
} from '../utils/medicalConditions';
import { HeartPulse, ChevronDown, ChevronUp, CheckCircle2, Circle, Sliders } from 'lucide-react';

interface MedicalConditionsDropdownProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  defaultExpanded?: boolean;
  compact?: boolean;
}

export const MedicalConditionsDropdown: React.FC<MedicalConditionsDropdownProps> = ({
  settings,
  onUpdateSettings,
  defaultExpanded = false,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(defaultExpanded);

  const activeMap = getActiveMedicalConditions(settings);
  const activeCount = countActiveMedicalConditions(settings);

  const handleToggleCondition = (conditionId: MedicalConditionId) => {
    const nextValue = !activeMap[conditionId];
    const updatedConditions = {
      ...activeMap,
      [conditionId]: nextValue,
    };

    const updatedSettings: UserSettings = {
      ...settings,
      medicalConditions: updatedConditions,
      // Mantener sincronizado el flag clásico de límite renal
      enableRenalProteinLimits: conditionId === 'renal' ? nextValue : updatedConditions.renal,
    };

    onUpdateSettings(updatedSettings);
  };

  return (
    <div className="bg-slate-950/90 border border-teal-500/30 rounded-2xl overflow-hidden shadow-md transition-all">
      {/* Botón Cabecera del Menú Desplegable */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-left hover:bg-slate-900/70 transition cursor-pointer"
      >
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-500/15 border border-teal-500/40 text-teal-400 shrink-0 mt-0.5 sm:mt-0">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-slate-100">
                Condiciones Médicas y Nutricionales Inclusivas
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                {activeCount} {activeCount === 1 ? 'activa' : 'activas'} de 6
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tocá para desplegar y activar o desactivar Celiaquía (Sin TACC), Protección Renal, Gastroparesia, Presión, Colesterol o Lactosa
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t sm:border-t-0 border-slate-800/80 pt-2 sm:pt-0">
          {/* Chips de condiciones activas en vista cerrada */}
          <div className="flex flex-wrap items-center gap-1">
            {MEDICAL_CONDITIONS_CATALOG.filter((c) => activeMap[c.id]).map((c) => (
              <span
                key={c.id}
                className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-bold text-teal-300 flex items-center gap-1"
              >
                <span>{c.emoji}</span>
                <span>{c.shortName}</span>
              </span>
            ))}
            {activeCount === 0 && (
              <span className="text-[10px] text-slate-500 italic">Ninguna condición extra activa</span>
            )}
          </div>

          <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-teal-300 flex items-center gap-1">
            <span>{isOpen ? 'Cerrar menú' : 'Abrir menú'}</span>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </div>
      </button>

      {/* Contenido Desplegable con las 6 Condiciones */}
      {isOpen && (
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-900/60 space-y-3 animate-fadeIn">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
            <Sliders className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
            <span>
              Al activar cualquiera de estas condiciones, <strong>la app adapta su funcionamiento en tiempo real</strong>: muestra carteles de advertencia en los alimentos buscados (ej. <em>Sin TACC</em>, <em>Bajo en Sodio</em>, <em>Sin Lactosa</em>), ajusta las sugerencias de insulina en la calculadora y suma metas específicas en tu balance del día.
            </span>
          </div>

          <div className={`grid grid-cols-1 ${compact ? '' : 'md:grid-cols-2'} gap-3`}>
            {MEDICAL_CONDITIONS_CATALOG.map((cond) => {
              const isEnabled = activeMap[cond.id];

              return (
                <div
                  key={cond.id}
                  className={`rounded-xl border p-3.5 transition-all flex flex-col justify-between gap-2.5 ${
                    isEnabled
                      ? 'bg-teal-950/25 border-teal-500/60 shadow-md'
                      : 'bg-slate-950/70 border-slate-800/90 opacity-90 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2">
                        <span className="text-lg leading-none mt-0.5">{cond.emoji}</span>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-100 leading-tight">
                            {cond.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                            {cond.summary}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleCondition(cond.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer shadow-sm ${
                          isEnabled
                            ? 'bg-teal-500 text-slate-950 hover:bg-teal-400'
                            : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {isEnabled ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Activado</span>
                          </>
                        ) : (
                          <>
                            <Circle className="h-3.5 w-3.5 text-slate-400" />
                            <span>Desactivado</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Lista clara de qué cambia en la app */}
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 block">
                        ¿Qué cambia en la app al activarlo?:
                      </span>
                      <ul className="space-y-1 text-[11px] text-slate-300">
                        {cond.howItChangesApp.map((change, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 leading-snug">
                            <span className="text-teal-400 font-bold">•</span>
                            <span>{change}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Ajustes rápidos específicos si está activado */}
                    {isEnabled && cond.id === 'renal' && (
                      <div className="pt-1.5 grid grid-cols-2 gap-2 text-[11px] border-t border-slate-800/80">
                        <div>
                          <label className="text-slate-400 block text-[10px]">Máx. Prot. Animal (g/día)</label>
                          <input
                            type="number"
                            placeholder="Ej: 25"
                            value={settings.maxAnimalProtein === 0 ? '' : settings.maxAnimalProtein}
                            onChange={(e) =>
                              onUpdateSettings({
                                ...settings,
                                maxAnimalProtein: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 font-mono text-slate-100 placeholder:text-slate-600 placeholder:font-normal mt-0.5"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block text-[10px]">Meta Prot. Vegetal (g/día)</label>
                          <div className="flex gap-1 mt-0.5">
                            <input
                              type="number"
                              placeholder="Ej: 25"
                              value={settings.minPlantProtein === 0 ? '' : settings.minPlantProtein}
                              onChange={(e) =>
                                onUpdateSettings({
                                  ...settings,
                                  minPlantProtein: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 font-mono text-slate-100 placeholder:text-slate-600 placeholder:font-normal text-center"
                            />
                            <input
                              type="number"
                              placeholder="Ej: 35"
                              value={settings.maxPlantProtein === 0 ? '' : settings.maxPlantProtein}
                              onChange={(e) =>
                                onUpdateSettings({
                                  ...settings,
                                  maxPlantProtein: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 font-mono text-slate-100 placeholder:text-slate-600 placeholder:font-normal text-center"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {isEnabled && cond.id === 'dyslipidemia' && (
                      <div className="pt-1.5 grid grid-cols-2 gap-2 text-[11px] border-t border-slate-800/80">
                        <div>
                          <label className="text-slate-400 block text-[10px]">Máx. Grasas Totales (g/día)</label>
                          <input
                            type="number"
                            placeholder="Ej: 60"
                            value={(settings.maxDailyFat ?? 60) === 0 ? '' : (settings.maxDailyFat ?? 60)}
                            onChange={(e) =>
                              onUpdateSettings({
                                ...settings,
                                maxDailyFat: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 font-mono text-slate-100 mt-0.5"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block text-[10px]">Mín. Fibra Soluble (g/día)</label>
                          <input
                            type="number"
                            value={settings.minDailyFiber ?? 25}
                            onChange={(e) =>
                              onUpdateSettings({
                                ...settings,
                                minDailyFiber: parseFloat(e.target.value) || 25,
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 font-mono text-slate-100 mt-0.5"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
