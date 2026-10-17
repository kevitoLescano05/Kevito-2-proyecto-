import React, { useState, useRef } from 'react';
import { UserSettings } from '../types';
import { 
  Settings, 
  X, 
  Save, 
  ShieldCheck, 
  Activity, 
  User,
  Camera,
  LogIn,
  LogOut,
  RefreshCw,
  Syringe,
  Compass,
  Info,
  Cloud,
  Radio,
  Plus,
  Trash2,
  Globe,
} from 'lucide-react';
import {
  getIPortPharmacokineticProfile,
  RAPID_INSULIN_CATALOG,
  DEFAULT_FIXED_MEAL_DOSES,
  DEFAULT_CORRECTION_SCALE,
} from '../utils/insulinMath';
import { getLogicalDateKey } from '../utils/dateCutoff';
import { computePlacedDateFromDayOfWear, DEFAULT_SENSOR_DURATION_BY_BRAND } from '../utils/iportDayTracker';
import { useAuth } from '../context/AuthContext';
import { MedicalConditionsDropdown } from './MedicalConditionsDropdown';
import { SENSOR_BRAND_CATALOG } from '../utils/cgmService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (newSettings: UserSettings) => void;
  onOpenAuthModal?: () => void;
  onOpenDriveSync?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onOpenAuthModal,
  onOpenDriveSync,
}) => {
  const { user, logout } = useAuth();
  const [formData, setFormData] = useState<UserSettings>({ ...settings });
  type SettingsTab = 'doses' | 'devices' | 'nutrition' | 'account';
  const [activeTab, setActiveTab] = useState<SettingsTab>('doses');

  // Sync formData whenever settings change or modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFormData({ ...settings });
    }
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned: UserSettings = {
      ...formData,
      icr: formData.icr > 0 ? formData.icr : 10,
      isf: formData.isf > 0 ? formData.isf : 40,
      targetGlucose: formData.targetGlucose > 0 ? formData.targetGlucose : 110,
      diaHours: formData.diaHours > 0 ? formData.diaHours : 4,
      weekdayCalorieGoal: formData.weekdayCalorieGoal > 0 ? formData.weekdayCalorieGoal : 2000,
      weekendCalorieGoal: formData.weekendCalorieGoal > 0 ? formData.weekendCalorieGoal : 2200,
      maxAnimalProtein: formData.maxAnimalProtein > 0 ? formData.maxAnimalProtein : 32,
      minPlantProtein: formData.minPlantProtein >= 0 ? formData.minPlantProtein : 20,
      maxPlantProtein: formData.maxPlantProtein > 0 ? formData.maxPlantProtein : 30,
    };
    onSave(cleaned);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 md:p-6 shadow-2xl space-y-5 text-slate-100">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Configuración de Parámetros T1D</h2>
              <p className="text-xs text-slate-400">Ajusta tus factores de insulina, metas nutricionales y copias de seguridad</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Selector de Modo de la App: Simple vs Completo */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
              Modo de la Aplicación:
            </span>
            <span className="text-[10px] text-teal-400 font-medium">
              Podés cambiar cuando quieras
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setFormData({ ...formData, interfaceMode: 'simple' });
                if (activeTab === 'devices') setActiveTab('doses');
              }}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer text-center ${
                formData.interfaceMode === 'simple'
                  ? 'bg-teal-500/20 border-teal-500 text-teal-200 ring-2 ring-teal-500/30 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs">
                <span>🟢</span>
                <span className="font-extrabold text-white">Modo Simple</span>
              </div>
              <span className="text-[10px] opacity-80 leading-tight">
                Rápido, limpio y directo para lapicera
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, interfaceMode: 'complete' })}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer text-center ${
                formData.interfaceMode !== 'simple'
                  ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200 ring-2 ring-indigo-500/30 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs">
                <span>⚙️</span>
                <span className="font-extrabold text-white">Modo Completo</span>
              </div>
              <span className="text-[10px] opacity-80 leading-tight">
                Sensores, bomba, i-Port y métricas avanzadas
              </span>
            </button>
          </div>
        </div>

        {/* Selector de Pestañas / Solapas para no abrumar al usuario */}
        <div className="flex border-b border-slate-800 pb-2 gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('doses')}
            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
              activeTab === 'doses'
                ? 'bg-teal-500 text-slate-950 shadow-md font-extrabold'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span>💉</span>
            <span>{formData.interfaceMode === 'simple' ? 'Mis Dosis y Ratios' : 'Dosis y Ratios'}</span>
          </button>
          {formData.interfaceMode !== 'simple' && (
            <button
              type="button"
              onClick={() => setActiveTab('devices')}
              className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
                activeTab === 'devices'
                  ? 'bg-teal-500 text-slate-950 shadow-md font-extrabold'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>📟</span>
              <span>Dispositivos</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('nutrition')}
            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
              activeTab === 'nutrition'
                ? 'bg-teal-500 text-slate-950 shadow-md font-extrabold'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span>🥗</span>
            <span>{formData.interfaceMode === 'simple' ? 'Condiciones de Salud' : 'Nutrición y Metas'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
              activeTab === 'account'
                ? 'bg-teal-500 text-slate-950 shadow-md font-extrabold'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span>☁️</span>
            <span>Mi Cuenta y Nube</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* ========== PESTAÑA 1: DOSIS Y RATIOS ========== */}
          {activeTab === 'doses' && (
            <div className="space-y-4">
              {formData.interfaceMode === 'simple' ? (
                <div className="space-y-3 bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <h3 className="font-bold text-teal-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Syringe className="h-4 w-4" /> Mis Factores Básicos de Insulina
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="text-slate-300 font-medium block">Marca de tu Insulina Rápida</label>
                      <select
                        value={formData.rapidInsulinBrand || 'novorapid'}
                        onChange={(e) => setFormData({ ...formData, rapidInsulinBrand: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 mt-1 text-slate-100 font-sans min-h-[42px]"
                      >
                        {RAPID_INSULIN_CATALOG.map((ins) => (
                          <option key={ins.id} value={ins.id}>
                            💉 {ins.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-slate-300 font-medium block">FSI (Sensibilidad)</label>
                        <span className="text-[10px] text-slate-400 block mb-1">Puntos que baja 1 U</span>
                        <div className="relative">
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="Ej: 28"
                            value={formData.isf === 0 ? '' : formData.isf}
                            onChange={(e) => setFormData({ ...formData, isf: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-100 pr-12 min-h-[42px]"
                          />
                          <span className="absolute right-2 top-2.5 text-[10px] text-slate-400">mg/dL</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-300 font-medium block">Ratio Carbohidratos (ICR)</label>
                        <span className="text-[10px] text-slate-400 block mb-1">Gramos por cada 1 U</span>
                        <div className="relative">
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="Ej: 8"
                            value={formData.icr === 0 ? '' : formData.icr}
                            onChange={(e) => setFormData({ ...formData, icr: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-100 pr-10 min-h-[42px]"
                          />
                          <span className="absolute right-2 top-2.5 text-[10px] text-slate-400">g/U</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-300 font-medium block">Glucemia Objetivo</label>
                        <span className="text-[10px] text-slate-400 block mb-1">Azúcar deseada</span>
                        <div className="relative">
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="Ej: 110"
                            value={formData.targetGlucose === 0 ? '' : formData.targetGlucose}
                            onChange={(e) => setFormData({ ...formData, targetGlucose: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-100 pr-12 min-h-[42px]"
                          />
                          <span className="absolute right-2 top-2.5 text-[10px] text-slate-400">mg/dL</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-300 font-medium block">Redondeo de Lapicera</label>
                        <span className="text-[10px] text-slate-400 block mb-1">Escalón de dosis</span>
                        <select
                          value={formData.roundDoseTo}
                          onChange={(e) => setFormData({ ...formData, roundDoseTo: parseFloat(e.target.value) as any })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-100 min-h-[42px]"
                        >
                          <option value={1.0}>1.0 U (Entera)</option>
                          <option value={0.5}>0.5 U (Media unidad)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
              <div className="space-y-3 bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                <h3 className="font-bold text-teal-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Syringe className="h-4 w-4" /> Forma de Cálculo e Insulina Rápida
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-slate-300 font-medium block">¿Cómo calculas tus dosis de comida?</label>
                    <select
                      value={formData.dosingMode || 'carb_counting'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dosingMode: e.target.value as any,
                          fixedMealDoses: formData.fixedMealDoses || DEFAULT_FIXED_MEAL_DOSES,
                          fixedCorrectionMethod: formData.fixedCorrectionMethod || 'sliding_scale',
                          correctionScale:
                            formData.correctionScale && formData.correctionScale.length > 0
                              ? formData.correctionScale
                              : DEFAULT_CORRECTION_SCALE,
                        })
                      }
                      className="w-full bg-slate-900 border border-teal-600/60 rounded-lg p-2 mt-1 text-slate-100 font-bold min-h-[42px]"
                    >
                      <option value="carb_counting">🥖 Conteo de Carbohidratos (Ratio ICR + Sensibilidad FSI)</option>
                      <option value="fixed_doses">📋 Esquema de Dosis Fijas por Comida y Escala de Glucosa</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium block">Marca / Tipo de tu Insulina Rápida</label>
                    <select
                      value={formData.rapidInsulinBrand || 'novorapid'}
                      onChange={(e) => setFormData({ ...formData, rapidInsulinBrand: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 mt-1 text-slate-100 font-sans min-h-[42px]"
                    >
                      {RAPID_INSULIN_CATALOG.map((ins) => (
                        <option key={ins.id} value={ins.id}>
                          💉 {ins.name} (Inicio: {ins.onsetMinutesText})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

          {/* Configuración de Dosis Fijas y Escala de Corrección (si está activo 'fixed_doses') */}
          {formData.dosingMode === 'fixed_doses' && (
            <div className="space-y-3 bg-slate-950 border border-amber-500/50 rounded-xl p-3.5 shadow-md">
              <h3 className="font-bold text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                📋 Tu Esquema de Dosis Fijas por Comida y Corrección
              </h3>

              <div className="space-y-2">
                <label className="text-slate-200 font-bold block">
                  1. Unidades fijas por comida (poné 0 si en alguna no tenés fija):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <span className="text-[10px] text-amber-200 font-bold block">🌅 Desayuno (U)</span>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      value={(formData.fixedMealDoses || DEFAULT_FIXED_MEAL_DOSES).breakfastUnits}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fixedMealDoses: {
                            ...(formData.fixedMealDoses || DEFAULT_FIXED_MEAL_DOSES),
                            breakfastUnits: Math.max(0, parseFloat(e.target.value) || 0),
                          },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 font-mono font-bold text-slate-100 mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-200 font-bold block">☀️ Almuerzo (U)</span>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      value={(formData.fixedMealDoses || DEFAULT_FIXED_MEAL_DOSES).lunchUnits}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fixedMealDoses: {
                            ...(formData.fixedMealDoses || DEFAULT_FIXED_MEAL_DOSES),
                            lunchUnits: Math.max(0, parseFloat(e.target.value) || 0),
                          },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 font-mono font-bold text-slate-100 mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-200 font-bold block">🧉 Merienda (U)</span>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      value={(formData.fixedMealDoses || DEFAULT_FIXED_MEAL_DOSES).snackUnits}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fixedMealDoses: {
                            ...(formData.fixedMealDoses || DEFAULT_FIXED_MEAL_DOSES),
                            snackUnits: Math.max(0, parseFloat(e.target.value) || 0),
                          },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 font-mono font-bold text-slate-100 mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-200 font-bold block">🌙 Cena (U)</span>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      value={(formData.fixedMealDoses || DEFAULT_FIXED_MEAL_DOSES).dinnerUnits}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fixedMealDoses: {
                            ...(formData.fixedMealDoses || DEFAULT_FIXED_MEAL_DOSES),
                            dinnerUnits: Math.max(0, parseFloat(e.target.value) || 0),
                          },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 font-mono font-bold text-slate-100 mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="text-slate-200 font-bold block">
                  2. ¿Cómo corregís la glucosa alta en Dosis Fijas?
                </label>
                <select
                  value={formData.fixedCorrectionMethod || 'sliding_scale'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fixedCorrectionMethod: e.target.value as any,
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 font-semibold"
                >
                  <option value="sliding_scale">📊 Por Tabla / Escala de Rangos de Glucosa (ej. 180 mg/dL = +3 U)</option>
                  <option value="isf_formula">➗ Por Factor de Sensibilidad FSI ((Glucosa - Meta) ÷ FSI)</option>
                </select>

                {(formData.fixedCorrectionMethod || 'sliding_scale') === 'sliding_scale' && (
                  <div className="space-y-1.5 pt-1">
                    {(formData.correctionScale && formData.correctionScale.length > 0
                      ? formData.correctionScale
                      : DEFAULT_CORRECTION_SCALE
                    ).map((b) => (
                      <div
                        key={b.id}
                        className="grid grid-cols-12 gap-1.5 items-center bg-slate-900 p-2 rounded-lg border border-slate-800"
                      >
                        <div className="col-span-4">
                          <span className="text-[9px] text-slate-400 block">Desde (mg/dL)</span>
                          <input
                            type="number"
                            value={b.minGlucose}
                            onChange={(e) => {
                              const list =
                                formData.correctionScale && formData.correctionScale.length > 0
                                  ? formData.correctionScale
                                  : DEFAULT_CORRECTION_SCALE;
                              setFormData({
                                ...formData,
                                correctionScale: list.map((item) =>
                                  item.id === b.id
                                    ? { ...item, minGlucose: Math.max(0, parseInt(e.target.value, 10) || 0) }
                                    : item
                                ),
                              });
                            }}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-1 font-mono font-bold text-slate-100"
                          />
                        </div>
                        <div className="col-span-4">
                          <span className="text-[9px] text-slate-400 block">Hasta (mg/dL)</span>
                          <input
                            type="number"
                            value={b.maxGlucose}
                            onChange={(e) => {
                              const list =
                                formData.correctionScale && formData.correctionScale.length > 0
                                  ? formData.correctionScale
                                  : DEFAULT_CORRECTION_SCALE;
                              setFormData({
                                ...formData,
                                correctionScale: list.map((item) =>
                                  item.id === b.id
                                    ? { ...item, maxGlucose: Math.max(0, parseInt(e.target.value, 10) || 0) }
                                    : item
                                ),
                              });
                            }}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-1 font-mono font-bold text-slate-100"
                          />
                        </div>
                        <div className="col-span-3">
                          <span className="text-[9px] text-amber-300 font-bold block">Corrección (+U)</span>
                          <input
                            type="number"
                            step="0.5"
                            value={b.units}
                            onChange={(e) => {
                              const list =
                                formData.correctionScale && formData.correctionScale.length > 0
                                  ? formData.correctionScale
                                  : DEFAULT_CORRECTION_SCALE;
                              setFormData({
                                ...formData,
                                correctionScale: list.map((item) =>
                                  item.id === b.id
                                    ? { ...item, units: Math.max(0, parseFloat(e.target.value) || 0) }
                                    : item
                                ),
                              });
                            }}
                            className="w-full bg-slate-950 border border-amber-600/60 rounded p-1 font-mono font-bold text-amber-300"
                          />
                        </div>
                        <div className="col-span-1 flex justify-end pt-3">
                          <button
                            type="button"
                            onClick={() => {
                              const list =
                                formData.correctionScale && formData.correctionScale.length > 0
                                  ? formData.correctionScale
                                  : DEFAULT_CORRECTION_SCALE;
                              if (list.length <= 1) return;
                              setFormData({
                                ...formData,
                                correctionScale: list.filter((item) => item.id !== b.id),
                              });
                            }}
                            className="text-slate-500 hover:text-rose-400 cursor-pointer"
                            title="Quitar rango"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const list =
                          formData.correctionScale && formData.correctionScale.length > 0
                            ? formData.correctionScale
                            : DEFAULT_CORRECTION_SCALE;
                        const last = list[list.length - 1];
                        const nextMin = last ? last.maxGlucose + 1 : 150;
                        setFormData({
                          ...formData,
                          correctionScale: [
                            ...list,
                            {
                              id: `scale-${Date.now()}`,
                              minGlucose: nextMin,
                              maxGlucose: nextMin + 40,
                              units: last ? last.units + 1 : 1,
                            },
                          ],
                        });
                      }}
                      className="text-[11px] font-bold text-teal-300 hover:text-teal-200 flex items-center gap-1 pt-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>+ Agregar otro rango a tu escala</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3 bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <h3 className="font-bold text-teal-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Activity className="h-4 w-4" /> Parámetros de Inmunología e Insulina
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-medium block">FSI (Factor Sensibilidad)</label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="Ej: 30"
                    value={formData.isf === 0 ? '' : formData.isf}
                    onChange={(e) => setFormData({ ...formData, isf: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-100 placeholder:text-slate-600 placeholder:font-normal pr-12 min-h-[42px]"
                  />
                  <span className="absolute right-2 top-2.5 text-[10px] text-slate-400">mg/dL/U</span>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block">ICR Base (Ratio Carbohidratos)</label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="Ej: 10"
                    value={formData.icr === 0 ? '' : formData.icr}
                    onChange={(e) => setFormData({ ...formData, icr: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-100 placeholder:text-slate-600 placeholder:font-normal pr-10 min-h-[42px]"
                  />
                  <span className="absolute right-2 top-2.5 text-[10px] text-slate-400">g/U</span>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block">Glucemia Objetivo</label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="Ej: 100"
                    value={formData.targetGlucose === 0 ? '' : formData.targetGlucose}
                    onChange={(e) => setFormData({ ...formData, targetGlucose: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-100 placeholder:text-slate-600 placeholder:font-normal pr-12 min-h-[42px]"
                  />
                  <span className="absolute right-2 top-2.5 text-[10px] text-slate-400">mg/dL</span>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block">DIA (Duración Insulina)</label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    placeholder="Ej: 4"
                    value={formData.diaHours === 0 ? '' : formData.diaHours}
                    onChange={(e) => setFormData({ ...formData, diaHours: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-100 placeholder:text-slate-600 placeholder:font-normal pr-10 min-h-[42px]"
                  />
                  <span className="absolute right-2 top-2.5 text-[10px] text-slate-400">horas</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-medium block">Escalón de Redondeo de Pluma / i-Port / Bomba</label>
              <select
                value={formData.roundDoseTo}
                onChange={(e) => setFormData({ ...formData, roundDoseTo: parseFloat(e.target.value) as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 mt-1 text-slate-100 font-mono"
              >
                <option value={1.0}>1.0 U (Unidad entera - Pluma estándar / i-Port)</option>
                <option value={0.5}>0.5 U (Media unidad - Plumas de precisión)</option>
                <option value={0.1}>0.1 U (Micro-dosis / Bomba de infusión)</option>
              </select>
            </div>

            {/* Opción de distintos Ratios ICR según Comida del Día (Desayuno, Almuerzo, Merienda y Cena) */}
            <div className="pt-2 border-t border-slate-800 space-y-2.5">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-slate-200 font-bold block">
                    🕒 Usar distinto Ratio (ICR) según la comida del día
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Para quienes necesitan diferente ratio en Desayuno, Almuerzo, Merienda y Cena
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(formData.enableMealTimeRatios)}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      enableMealTimeRatios: e.target.checked,
                      mealTimeRatios: formData.mealTimeRatios || {
                        breakfastIcr: formData.icr || 8,
                        lunchIcr: formData.icr || 10,
                        snackIcr: formData.icr || 10,
                        dinnerIcr: formData.icr || 10,
                      },
                    })
                  }
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-teal-500"
                />
              </label>

              {formData.enableMealTimeRatios && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/90 p-2.5 rounded-xl border border-teal-800/50">
                  <div>
                    <label className="text-[10px] text-teal-300 font-bold block">🌅 Desayuno (g/U)</label>
                    <input
                      type="number"
                      step="0.5"
                      min={1}
                      placeholder="Ej: 8"
                      value={(formData.mealTimeRatios?.breakfastIcr ?? formData.icr) === 0 ? '' : (formData.mealTimeRatios?.breakfastIcr ?? formData.icr)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          mealTimeRatios: {
                            breakfastIcr: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0,
                            lunchIcr: formData.mealTimeRatios?.lunchIcr ?? formData.icr,
                            snackIcr: formData.mealTimeRatios?.snackIcr ?? formData.icr,
                            dinnerIcr: formData.mealTimeRatios?.dinnerIcr ?? formData.icr,
                          },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 font-mono text-slate-100 placeholder:text-slate-600 placeholder:font-normal mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-amber-300 font-bold block">☀️ Almuerzo (g/U)</label>
                    <input
                      type="number"
                      step="0.5"
                      min={1}
                      placeholder="Ej: 10"
                      value={(formData.mealTimeRatios?.lunchIcr ?? formData.icr) === 0 ? '' : (formData.mealTimeRatios?.lunchIcr ?? formData.icr)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          mealTimeRatios: {
                            breakfastIcr: formData.mealTimeRatios?.breakfastIcr ?? formData.icr,
                            lunchIcr: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0,
                            snackIcr: formData.mealTimeRatios?.snackIcr ?? formData.icr,
                            dinnerIcr: formData.mealTimeRatios?.dinnerIcr ?? formData.icr,
                          },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 font-mono text-slate-100 placeholder:text-slate-600 placeholder:font-normal mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-emerald-300 font-bold block">🧉 Merienda (g/U)</label>
                    <input
                      type="number"
                      step="0.5"
                      min={1}
                      placeholder="Ej: 10"
                      value={(formData.mealTimeRatios?.snackIcr ?? formData.icr) === 0 ? '' : (formData.mealTimeRatios?.snackIcr ?? formData.icr)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          mealTimeRatios: {
                            breakfastIcr: formData.mealTimeRatios?.breakfastIcr ?? formData.icr,
                            lunchIcr: formData.mealTimeRatios?.lunchIcr ?? formData.icr,
                            snackIcr: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0,
                            dinnerIcr: formData.mealTimeRatios?.dinnerIcr ?? formData.icr,
                          },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 font-mono text-slate-100 placeholder:text-slate-600 placeholder:font-normal mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-indigo-300 font-bold block">🌙 Cena (g/U)</label>
                    <input
                      type="number"
                      step="0.5"
                      min={1}
                      placeholder="Ej: 10"
                      value={(formData.mealTimeRatios?.dinnerIcr ?? formData.icr) === 0 ? '' : (formData.mealTimeRatios?.dinnerIcr ?? formData.icr)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          mealTimeRatios: {
                            breakfastIcr: formData.mealTimeRatios?.breakfastIcr ?? formData.icr,
                            lunchIcr: formData.mealTimeRatios?.lunchIcr ?? formData.icr,
                            snackIcr: formData.mealTimeRatios?.snackIcr ?? formData.icr,
                            dinnerIcr: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 font-mono text-slate-100 placeholder:text-slate-600 placeholder:font-normal mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          </>
          )}
        </div>
      )}

      {/* ========== PESTAÑA 2: DISPOSITIVOS Y MONITOREO ========== */}
      {activeTab === 'devices' && (
        <div className="space-y-4">
          
          {/* Modalidad de Medición y Aplicación */}
          <div className="space-y-3 bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <h3 className="font-bold text-teal-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Radio className="h-4 w-4" /> Modalidad de Sensores y Aplicación
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-slate-300 font-medium block">¿Cómo mides tu glucosa?</label>
                <select
                  value={formData.glucoseMode || 'cgm_nfc'}
                  onChange={(e) => setFormData({ ...formData, glucoseMode: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 mt-1 text-slate-100 font-sans min-h-[42px]"
                >
                  <option value="cgm_nfc">📡 Sensor continuo en celular (FreeStyle, Dexcom, Sibionics, Sinocare, etc.)</option>
                  <option value="cgm_reader">📟 Sensor sin NFC usando Lector / Medidor FreeStyle</option>
                  <option value="capillary">🩸 Medición capilar tradicional (Glucómetro en dedo)</option>
                  <option value="pump_sensor">🔄 Sensor vinculado a Bomba (Medtronic Guardian / Dexcom / Nightscout)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block">Marca de tu Sensor o Medidor</label>
                <select
                  value={formData.sensorBrand || 'freestyle_libre'}
                  onChange={(e) => setFormData({ ...formData, sensorBrand: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 mt-1 text-slate-100 font-sans min-h-[42px]"
                >
                  {SENSOR_BRAND_CATALOG.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.emoji} {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block">¿Cómo aplicas tu insulina?</label>
                <select
                  value={formData.insulinMode || 'manual_pen'}
                  onChange={(e) => setFormData({ ...formData, insulinMode: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 mt-1 text-slate-100 font-sans min-h-[42px]"
                >
                  <option value="manual_pen">💉 Inyección manual (Pluma / Lapicera o jeringa)</option>
                  <option value="iport">🛡️ Puerto subcutáneo i-Port Advance</option>
                  <option value="pump">🔄 Bomba de infusión de insulina</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sección Adaptativa de Sitio de Inyección / Puerto i-Port / Set de Bomba según modalidad */}
          {(() => {
            const currentIPort = formData.iPortState || {
              site: 'abdomen',
              subSite: 'abdomen_lower_fat',
              dayOfWear: 1,
              placedDate: new Date().toISOString().split('T')[0],
            };
            const activeMode = formData.insulinMode || 'manual_pen';
            const currentProfile = getIPortPharmacokineticProfile(
              currentIPort,
              activeMode,
              formData.pumpSetTracker?.currentDayOfWear,
              formData.zoneTissueComposition
            );

            const handleSubSiteChange = (subSite: any) => {
              let site: 'abdomen' | 'thigh' | 'arm' | 'glute' = 'abdomen';
              if (subSite.startsWith('thigh')) site = 'thigh';
              else if (subSite.startsWith('arm')) site = 'arm';
              else if (subSite.startsWith('glute')) site = 'glute';

              setFormData({
                ...formData,
                iPortState: {
                  ...currentIPort,
                  site,
                  subSite,
                },
              });
            };

            const handleDayWearChange = (day: 1 | 2 | 3 | 4) => {
              const cutoff = formData.dayCutoffHour ?? 2;
              const daysAgo = day - 1;
              const refDate = new Date();
              refDate.setDate(refDate.getDate() - daysAgo);
              const computedPlacedDate = getLogicalDateKey(cutoff, refDate);

              setFormData({
                ...formData,
                iPortState: {
                  ...currentIPort,
                  dayOfWear: day,
                  placedDate: computedPlacedDate,
                },
              });
            };

            return (
              <div className="space-y-3 bg-slate-950 border border-teal-900/60 rounded-xl p-3.5 shadow-md">
                <div className="flex items-center justify-between border-b border-teal-900/40 pb-2">
                  <h3 className="font-bold text-teal-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Syringe className="h-4 w-4 text-teal-400" />
                    <span>
                      {activeMode === 'iport'
                        ? 'Puerto i-Port Advance: Ubicación y Tejido'
                        : activeMode === 'pump'
                        ? 'Set de Infusión / Cánula de Bomba: Zona y Rotación'
                        : 'Rotación de Zona de Pinchazo (Pluma Manual)'}
                    </span>
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                    {activeMode === 'iport'
                      ? 'Rotación cada 4 días'
                      : activeMode === 'pump'
                      ? 'Cambio cada 3 días'
                      : 'Evitar durezas en piel'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {activeMode === 'manual_pen' ? (
                    <span>
                      Indicá en qué zona del cuerpo te estás inyectando hoy para ajustar la <strong>velocidad de absorción subcutánea</strong> (el abdomen absorbe más rápido; el muslo y glúteo absorben más lento) y recordá rotar el sitio para prevenir lipohipertrofia.
                    </span>
                  ) : (
                    <span>
                      Modula la <strong>velocidad de absorción</strong> según la zona anatómica donde tenés colocada la cánula y el día de uso.
                    </span>
                  )}
                </p>

                {/* Selector de Zona Anatómica Específica */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold text-xs flex items-center gap-1">
                    <Compass className="h-3.5 w-3.5 text-teal-400" />
                    <span>
                      {activeMode === 'manual_pen'
                        ? 'Zona de Pinchazo Habitual / Actual:'
                        : 'Zona de Inserción Actual:'}
                    </span>
                  </label>
                  <select
                    id="select-iport-subsite"
                    value={currentIPort.subSite}
                    onChange={(e) => handleSubSiteChange(e.target.value)}
                    className="w-full bg-slate-900 border border-teal-700/60 rounded-lg p-2 text-slate-100 text-xs font-semibold focus:ring-2 focus:ring-teal-500"
                  >
                    <optgroup label="Abdomen">
                      <option value="abdomen_lower_fat">Abdomen Bajo / Flanco (Grasa subcutánea - Absorción rápida estándar)</option>
                      <option value="abdomen_upper_lean">Abdomen Alto / Centro (Zona magra / Músculo definido - Absorción rápida)</option>
                    </optgroup>
                    <optgroup label="Pierna / Muslo">
                      <option value="thigh_inner_soft">Cara Interna del Muslo (Zona blanda - Absorción moderada)</option>
                      <option value="thigh_anterior_firm">Cara Delantera del Muslo (Cuádriceps - Absorción más lenta / se acelera al caminar)</option>
                      <option value="thigh_lateral_firm">Costado Lateral del Muslo (Absorción lenta y sostenida)</option>
                    </optgroup>
                    <optgroup label="Brazo y Glúteo">
                      <option value="arm_standard">Brazo (Tríceps / Cara posterior - Absorción intermedia)</option>
                      <option value="glute_standard">Glúteo (Cuadrante superior externo - Absorción muy lenta)</option>
                    </optgroup>
                  </select>
                </div>

                {/* Selector de Día de Uso de la Cánula: Solo si usa i-Port o Bomba */}
                {activeMode !== 'manual_pen' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                        <span>
                          {activeMode === 'pump'
                            ? 'Día de Uso del Set de Infusión:'
                            : 'Día de Uso del Puerto (Cánula):'}
                        </span>
                        <span className="text-[10px] text-teal-400/80 font-normal">(Avanza solo cada medianoche)</span>
                      </label>
                      <span className="text-[11px] font-mono text-teal-300 font-bold">
                        Día {currentIPort.dayOfWear} de {activeMode === 'pump' ? 3 : 4}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map((d) => {
                        const isSelected = currentIPort.dayOfWear === d;
                        return (
                          <button
                            key={d}
                            type="button"
                            id={`btn-iport-day-${d}`}
                            onClick={() => handleDayWearChange(d as any)}
                            className={`py-2 px-1 rounded-lg border text-center transition flex flex-col items-center justify-center ${
                              isSelected
                                ? 'bg-teal-600/30 border-teal-500 text-teal-200 ring-2 ring-teal-500/40 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            <span className="text-xs">Día {d}</span>
                            <span className="text-[9px] text-slate-400">
                              {d === 1 ? 'Nuevo' : d === 2 ? 'Óptimo' : d === 3 ? '+5m retr.' : 'Cambiar (+10m)'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Calibración Individual de Tejido por Zona (Abdomen, Pierna, Brazo, Glúteo) */}
                <div className="space-y-2 pt-2 border-t border-teal-900/40">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-200 font-semibold text-xs flex items-center gap-1.5">
                      <span>🧬 Calibración de tu Tejido por Zona Corporal:</span>
                    </label>
                    <span className="text-[10px] text-teal-400 font-medium">Ajuste anatómico</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    No todos acumulamos la grasa en el mismo lugar. Por ejemplo, un corredor o futbolista suele tener piernas magras y musculosas, mientras que otra persona puede tener más grasa en muslos o abdomen. Indicá la contextura real de cada zona de tu cuerpo:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {/* Abdomen */}
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-200">🟢 Abdomen</span>
                        <span className="text-[10px] text-teal-300 font-mono">
                          {formData.zoneTissueComposition?.abdomen === 'lean_athletic'
                            ? 'Músculo / Magro'
                            : formData.zoneTissueComposition?.abdomen === 'adipose'
                            ? 'Adiposo'
                            : 'Neutro'}
                        </span>
                      </div>
                      <select
                        value={formData.zoneTissueComposition?.abdomen || 'neutral'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            zoneTissueComposition: {
                              ...formData.zoneTissueComposition,
                              abdomen: e.target.value as any,
                            },
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-teal-500"
                      >
                        <option value="adipose">Adiposo / Acolchado (Pellizco generoso de grasa)</option>
                        <option value="neutral">Neutro / Estándar (Capa normal de grasa)</option>
                        <option value="lean_athletic">Magro / Atlético (Abdomen marcado / Poco tejido graso)</option>
                      </select>
                    </div>

                    {/* Pierna / Muslo */}
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-200">🦵 Piernas / Muslos</span>
                        <span className="text-[10px] text-teal-300 font-mono">
                          {formData.zoneTissueComposition?.thigh === 'lean_athletic'
                            ? 'Cuádriceps Magro'
                            : formData.zoneTissueComposition?.thigh === 'adipose'
                            ? 'Adiposo'
                            : 'Neutro'}
                        </span>
                      </div>
                      <select
                        value={formData.zoneTissueComposition?.thigh || 'neutral'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            zoneTissueComposition: {
                              ...formData.zoneTissueComposition,
                              thigh: e.target.value as any,
                            },
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-teal-500"
                      >
                        <option value="adipose">Adiposo / Blando (Mayor tejido graso)</option>
                        <option value="neutral">Neutro / Estándar (Grasa moderada)</option>
                        <option value="lean_athletic">Magro / Atlético (Deportista / Cuádriceps duro y fibroso)</option>
                      </select>
                    </div>

                    {/* Brazo */}
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-200">💪 Brazos</span>
                        <span className="text-[10px] text-teal-300 font-mono">
                          {formData.zoneTissueComposition?.arm === 'lean_athletic'
                            ? 'Tríceps Magro'
                            : formData.zoneTissueComposition?.arm === 'adipose'
                            ? 'Adiposo'
                            : 'Neutro'}
                        </span>
                      </div>
                      <select
                        value={formData.zoneTissueComposition?.arm || 'neutral'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            zoneTissueComposition: {
                              ...formData.zoneTissueComposition,
                              arm: e.target.value as any,
                            },
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-teal-500"
                      >
                        <option value="adipose">Adiposo (Poco músculo / Más grasa subcutánea)</option>
                        <option value="neutral">Neutro / Estándar</option>
                        <option value="lean_athletic">Magro / Fuerte (Bajo porcentaje graso en brazos)</option>
                      </select>
                    </div>

                    {/* Glúteo */}
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-200">🍑 Glúteos</span>
                        <span className="text-[10px] text-teal-300 font-mono">
                          {formData.zoneTissueComposition?.glute === 'lean_athletic'
                            ? 'Muscular Firme'
                            : 'Adiposo Profundo'}
                        </span>
                      </div>
                      <select
                        value={formData.zoneTissueComposition?.glute || 'adipose'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            zoneTissueComposition: {
                              ...formData.zoneTissueComposition,
                              glute: e.target.value as any,
                            },
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-teal-500"
                      >
                        <option value="adipose">Adiposo Profundo (Fisiología estándar en glúteo)</option>
                        <option value="neutral">Neutro / Moderado</option>
                        <option value="lean_athletic">Magro / Atleta (Glúteo muy firme con poca grasa)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Badge y Explicación Dinámica del Perfil Seleccionado */}
                <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Velocidad en esta zona:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-800">
                      {currentProfile.clinicalBadge}
                    </span>
                  </div>
                  <p className="text-slate-300 leading-snug">
                    {currentProfile.tissueDescription}
                  </p>
                  <div className="flex items-center gap-1.5 pt-1 text-[10px] text-slate-400">
                    <span className="text-teal-400 font-semibold">Consistencia detectada:</span>
                    <span>{currentProfile.tissueConsistencyLabel}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Configuración Global de Duración en Días para Sensores, Puertos i-Port y Sets de Bomba */}
          {(() => {
            const cutoff = formData.dayCutoffHour ?? 2;
            const todayKey = getLogicalDateKey(cutoff, new Date());
            const defaultSensorDays =
              DEFAULT_SENSOR_DURATION_BY_BRAND[formData.sensorBrand || 'freestyle_libre'] || 14;

            const currentSensorTracker = formData.sensorTracker || {
              enabled: true,
              targetDurationDays: defaultSensorDays,
              currentDayOfWear: 1,
              placedDate: todayKey,
            };

            const currentPumpTracker = formData.pumpSetTracker || {
              enabled: formData.insulinMode === 'pump',
              targetDurationDays: 3,
              currentDayOfWear: 1,
              placedDate: todayKey,
            };

            const currentIPort = formData.iPortState || {
              site: 'abdomen',
              subSite: 'abdomen_lower_fat',
              dayOfWear: 1,
              targetDurationDays: 4,
              placedDate: todayKey,
            };

            return (
              <div className="space-y-3 bg-slate-950 border border-cyan-900/60 rounded-xl p-3.5 shadow-md">
                <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2">
                  <h3 className="font-bold text-cyan-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Radio className="h-4 w-4 text-cyan-400" />
                    <span>Duración de Dispositivos y Avisos de Cambio (Sensor, Puerto y Bomba)</span>
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Aviso al abrir la app
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Configurá cuántos días dura cada dispositivo y por qué día vas hoy. La app sumará un día automáticamente cada medianoche y te mostrará un <strong>aviso al abrir la app</strong> cuando se cumplan los días estipulados.
                </p>

                {/* 1. Sensor Continuo de Glucosa */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300">
                      📡 Sensor de Glucosa (FreeStyle, Dexcom, Medtronic, Sibionics, etc.)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          sensorTracker: {
                            ...currentSensorTracker,
                            enabled: !currentSensorTracker.enabled,
                          },
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                        currentSensorTracker.enabled
                          ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/50'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {currentSensorTracker.enabled ? 'Aviso Activo' : 'Desactivado'}
                    </button>
                  </div>

                  {currentSensorTracker.enabled && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 items-end">
                      <div>
                        <label className="text-[10px] text-slate-400 block">Día actual de uso</label>
                        <input
                          type="number"
                          min="1"
                          max="180"
                          value={currentSensorTracker.currentDayOfWear}
                          onChange={(e) => {
                            const day = Math.max(1, parseInt(e.target.value, 10) || 1);
                            setFormData({
                              ...formData,
                              sensorTracker: {
                                ...currentSensorTracker,
                                currentDayOfWear: day,
                                placedDate: computePlacedDateFromDayOfWear(day, cutoff),
                                dismissedAlertForDate: undefined,
                              },
                            });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 font-mono text-slate-100 mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block">Días estipulados de duración</label>
                        <input
                          type="number"
                          min="1"
                          max="180"
                          value={currentSensorTracker.targetDurationDays}
                          onChange={(e) => {
                            const target = Math.max(1, parseInt(e.target.value, 10) || 14);
                            setFormData({
                              ...formData,
                              sensorTracker: {
                                ...currentSensorTracker,
                                targetDurationDays: target,
                                dismissedAlertForDate: undefined,
                              },
                            });
                          }}
                          className="w-full bg-slate-950 border border-cyan-700/60 rounded-lg p-1.5 font-mono text-cyan-300 font-bold mt-1"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            sensorTracker: {
                              ...currentSensorTracker,
                              currentDayOfWear: 1,
                              placedDate: todayKey,
                              dismissedAlertForDate: undefined,
                            },
                          })
                        }
                        className="py-2 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Puse sensor nuevo hoy (Día 1)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Puerto de Inyección (i-Port Advance) */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-300">
                      💉 Puerto de Inyección Subcutáneo (i-Port Advance)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Día {currentIPort.dayOfWear} de {currentIPort.targetDurationDays || 4}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 items-end">
                    <div>
                      <label className="text-[10px] text-slate-400 block">Día actual del puerto</label>
                      <input
                        type="number"
                        min="1"
                        max="15"
                        value={currentIPort.dayOfWear}
                        onChange={(e) => {
                          const day = Math.max(1, parseInt(e.target.value, 10) || 1);
                          setFormData({
                            ...formData,
                            iPortState: {
                              ...currentIPort,
                              dayOfWear: day,
                              placedDate: computePlacedDateFromDayOfWear(day, cutoff),
                              dismissedAlertForDate: undefined,
                            },
                          });
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 font-mono text-slate-100 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">Días estipulados (ej. 3 o 4)</label>
                      <input
                        type="number"
                        min="1"
                        max="15"
                        value={currentIPort.targetDurationDays || 4}
                        onChange={(e) => {
                          const target = Math.max(1, parseInt(e.target.value, 10) || 4);
                          setFormData({
                            ...formData,
                            iPortState: {
                              ...currentIPort,
                              targetDurationDays: target,
                              dismissedAlertForDate: undefined,
                            },
                          });
                        }}
                        className="w-full bg-slate-950 border border-teal-700/60 rounded-lg p-1.5 font-mono text-teal-300 font-bold mt-1"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          iPortState: {
                            ...currentIPort,
                            dayOfWear: 1,
                            placedDate: todayKey,
                            dismissedAlertForDate: undefined,
                          },
                        })
                      }
                      className="py-2 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Cambié el puerto hoy (Día 1)</span>
                    </button>
                  </div>
                </div>

                {/* 3. Set de Infusión / Catéter de Bomba de Insulina */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300">
                      📟 Set de Infusión / Cánula de Bomba de Insulina
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          pumpSetTracker: {
                            ...currentPumpTracker,
                            enabled: !currentPumpTracker.enabled,
                          },
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                        currentPumpTracker.enabled || formData.insulinMode === 'pump'
                          ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/50'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {currentPumpTracker.enabled || formData.insulinMode === 'pump'
                        ? 'Aviso Activo'
                        : 'Desactivado'}
                    </button>
                  </div>

                  {(currentPumpTracker.enabled || formData.insulinMode === 'pump') && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 items-end">
                      <div>
                        <label className="text-[10px] text-slate-400 block">Día actual del set</label>
                        <input
                          type="number"
                          min="1"
                          max="15"
                          value={currentPumpTracker.currentDayOfWear}
                          onChange={(e) => {
                            const day = Math.max(1, parseInt(e.target.value, 10) || 1);
                            setFormData({
                              ...formData,
                              pumpSetTracker: {
                                ...currentPumpTracker,
                                enabled: true,
                                currentDayOfWear: day,
                                placedDate: computePlacedDateFromDayOfWear(day, cutoff),
                                dismissedAlertForDate: undefined,
                              },
                            });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 font-mono text-slate-100 mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block">Días estipulados (ej. 3 o 7)</label>
                        <input
                          type="number"
                          min="1"
                          max="15"
                          value={currentPumpTracker.targetDurationDays}
                          onChange={(e) => {
                            const target = Math.max(1, parseInt(e.target.value, 10) || 3);
                            setFormData({
                              ...formData,
                              pumpSetTracker: {
                                ...currentPumpTracker,
                                enabled: true,
                                targetDurationDays: target,
                                dismissedAlertForDate: undefined,
                              },
                            });
                          }}
                          className="w-full bg-slate-950 border border-indigo-700/60 rounded-lg p-1.5 font-mono text-indigo-300 font-bold mt-1"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            pumpSetTracker: {
                              ...currentPumpTracker,
                              enabled: true,
                              currentDayOfWear: 1,
                              placedDate: todayKey,
                              dismissedAlertForDate: undefined,
                            },
                          })
                        }
                        className="py-2 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Cambié el set hoy (Día 1)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Permisos de Dispositivo: Cámara */}
          <div className="space-y-3 bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <h3 className="font-bold text-teal-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Camera className="h-4 w-4" /> Permisos de Cámara para Análisis IA
            </h3>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-slate-200 text-xs font-semibold">Acceso a cámara para fotos de platos y rótulos</p>
                <p className="text-[11px] text-slate-400">
                  {formData.cameraPermissionGranted !== false 
                    ? 'Permitido automáticamente (no vuelve a pedir confirmación)' 
                    : 'Deshabilitado manualmente'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    cameraPermissionGranted: !formData.cameraPermissionGranted
                  });
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  formData.cameraPermissionGranted !== false
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40'
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-teal-500/20 hover:text-teal-300'
                }`}
              >
                {formData.cameraPermissionGranted !== false ? 'Permiso Activo' : 'Otorgar Permiso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== PESTAÑA 3: NUTRICIÓN Y METAS ========== */}
      {activeTab === 'nutrition' && (
        <div className="space-y-4">
          
          {/* País y Base de Datos Oficial */}
          <div className="space-y-3 bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <h3 className="font-bold text-teal-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Globe className="h-4 w-4" /> País y Base de Datos Nutricional Oficial
            </h3>
            <div>
              <label className="text-slate-300 font-medium block">País de Alimentos y Rótulos</label>
              <select
                value={formData.countryCode || 'AR'}
                onChange={(e) => setFormData({ ...formData, countryCode: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 mt-1 text-slate-100 font-sans min-h-[42px]"
              >
                <option value="AR">🇦🇷 Argentina (ARGENFOODS / ANMAT / CAA)</option>
                <option value="ES">🇪🇸 España (BEDCA / AESAN / Supermercados ES)</option>
                <option value="MX">🇲🇽 México (SMAE / BAM INCMNSZ / NOM-051)</option>
                <option value="CL">🇨🇱 Chile (INTA Universidad de Chile / MINSAL)</option>
                <option value="CO">🇨🇴 Colombia (TCAC ICBF / INVIMA)</option>
                <option value="UY">🇺🇾 Uruguay (MSP / UdelaR / MERCOSUR)</option>
                <option value="PE">🇵🇪 Perú (CENAN / INS / DIGESA)</option>
                <option value="BR">🇧🇷 Brasil (TACO UNICAMP / TBCA / ANVISA)</option>
                <option value="US">🇺🇸 Estados Unidos (USDA FoodData / FDA)</option>
                <option value="GLOBAL">🌎 Internacional / Global (FAO / INFOODS / OFF Mundial)</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Metas Nutricionales y Condiciones Médicas
              </h3>
            </div>

            {/* Interruptor de visualización de Calorías */}
            <div className="space-y-2.5 pb-2 border-b border-slate-800">
              <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                <div>
                  <p className="text-xs font-semibold text-slate-200">Contador de Calorías y Macronutrientes</p>
                  <p className="text-[11px] text-slate-400">Mostrar balance de calorías y metas diarias en la pantalla principal</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, showCaloriesAndMacros: formData.showCaloriesAndMacros === false ? true : false })}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                    formData.showCaloriesAndMacros !== false
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {formData.showCaloriesAndMacros !== false ? 'Activado' : 'Desactivado'}
                </button>
              </div>
            </div>

            {formData.showCaloriesAndMacros !== false && (
              <div className="grid grid-cols-2 gap-3 pb-2">
                <div>
                  <label className="text-slate-300 font-medium block">Calorías Lun-Vie (Actividad)</label>
                  <input
                    type="number"
                    placeholder="Ej: 2350"
                    value={formData.weekdayCalorieGoal === 0 ? '' : formData.weekdayCalorieGoal}
                    onChange={(e) => setFormData({ ...formData, weekdayCalorieGoal: e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-100 placeholder:text-slate-600 placeholder:font-normal mt-1"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block">Calorías Sáb-Dom (Descanso)</label>
                  <input
                    type="number"
                    placeholder="Ej: 1850"
                    value={formData.weekendCalorieGoal === 0 ? '' : formData.weekendCalorieGoal}
                    onChange={(e) => setFormData({ ...formData, weekendCalorieGoal: e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-100 placeholder:text-slate-600 placeholder:font-normal mt-1"
                  />
                </div>
              </div>
            )}

            {/* Menú desplegable de las 6 condiciones médicas (incluyendo Límite Renal, Celiaquía Sin TACC, etc.) */}
            <MedicalConditionsDropdown
              settings={formData}
              onUpdateSettings={(updated) => setFormData(updated)}
              compact={true}
            />
          </div>
        </div>
      )}

      {/* ========== PESTAÑA 4: MI CUENTA Y NUBE ========== */}
      {activeTab === 'account' && (
        <div className="space-y-4">
          <div className="space-y-3 bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <h3 className="font-bold text-indigo-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <User className="h-4 w-4" /> Cuenta y Sesión en la Nube
            </h3>
            
            {user ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {user.displayName || 'Sesión Iniciada'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email || 'Cuenta privada'}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded-full">
                    Sincronizado
                  </span>
                </div>

                <div className="flex gap-2">
                  {onOpenDriveSync && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenDriveSync();
                      }}
                      className="flex-1 py-2 px-3 bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-indigo-700/50 cursor-pointer"
                    >
                      <Cloud className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Google Drive (15 GB)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenAuthModal) {
                        onClose();
                        onOpenAuthModal();
                      }
                    }}
                    className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Cambiar Cuenta</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      onClose();
                    }}
                    className="py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 border border-rose-500/30 cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Salir</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400">
                  Actualmente estás en modo invitado. Inicia sesión con Google o correo para aislar tus registros y favoritos en la nube.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenAuthModal) {
                      onClose();
                      onOpenAuthModal();
                    }
                  }}
                  className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Iniciar Sesión con Google / Cuenta</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

          <button
            type="submit"
            className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-lg"
          >
            <Save className="h-4 w-4" />
            <span>Guardar Configuración</span>
          </button>

        </form>

      </div>
    </div>
  );
};
