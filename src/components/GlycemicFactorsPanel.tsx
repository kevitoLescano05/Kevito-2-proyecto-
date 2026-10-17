import React, { useState } from 'react';
import { ActiveGlycemicFactorId, UserSettings } from '../types';
import {
  ACTIONABLE_GLYCEMIC_FACTORS,
  ALL_42_FACTORS_BY_CATEGORY,
  evaluateActiveGlycemicFactorsForBolus,
} from '../utils/glycemicFactors42';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Search,
  Info,
} from 'lucide-react';

interface GlycemicFactorsPanelProps {
  settings?: UserSettings;
  onUpdateWorkout?: (updatedWorkout: UserSettings['dailyWorkout']) => void;
}

export const GlycemicFactorsPanel: React.FC<GlycemicFactorsPanelProps> = ({
  settings,
  onUpdateWorkout,
}) => {
  const [isFullCatalogOpen, setIsFullCatalogOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [openCategoryId, setOpenCategoryId] = useState<string>('food_nutrition');

  const workout = settings?.dailyWorkout || {
    routineType: 'chest_back',
    weightsDone: null,
    walkDone: null,
    weekendActivity: 'none',
    customRoutineItems: [],
    activeGlycemicFactors: [],
  };

  const activeFactors: ActiveGlycemicFactorId[] = workout.activeGlycemicFactors || [];

  const handleToggleFactor = (factorId: ActiveGlycemicFactorId) => {
    if (!onUpdateWorkout) return;
    const exists = activeFactors.includes(factorId);
    const nextFactors = exists
      ? activeFactors.filter((id) => id !== factorId)
      : [...activeFactors, factorId];

    onUpdateWorkout({
      ...workout,
      activeGlycemicFactors: nextFactors,
    });
  };

  const activeAdvisories = settings
    ? evaluateActiveGlycemicFactorsForBolus(0, settings)
    : [];

  const filteredCategories = ALL_42_FACTORS_BY_CATEGORY.map((cat) => {
    if (!searchTerm.trim()) return cat;
    const q = searchTerm.toLowerCase();
    return {
      ...cat,
      factors: cat.factors.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.explanation.toLowerCase().includes(q) ||
          f.practicalTip.toLowerCase().includes(q)
      ),
    };
  }).filter((cat) => cat.factors.length > 0);

  return (
    <div
      id="card-42-glycemic-factors"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4"
    >
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 flex-wrap">
              <span>Los 42 Factores que Afectan la Diabetes</span>
              {activeAdvisories.length > 0 && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {activeAdvisories.length}{' '}
                  {activeAdvisories.length === 1 ? 'factor activo hoy' : 'factores activos hoy'}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Confirmá si hiciste o estás pasando por alguno de estos factores hoy para recibir un aviso orientativo antes de aplicar insulina
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsFullCatalogOpen(!isFullCatalogOpen)}
          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto transition"
        >
          <span>{isFullCatalogOpen ? 'Ocultar Lista de 42 Factores' : 'Ver Guía de los 42 Factores'}</span>
          {isFullCatalogOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* SECCIÓN 1: SELECTOR INTERACTIVO DE FACTORES HECHOS / ACTIVOS HOY */}
      {settings && onUpdateWorkout && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>¿Hiciste o tenés alguno de estos factores hoy? (Tocalos para activar el consejo en la calculadora):</span>
            </span>
            {activeFactors.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  onUpdateWorkout({
                    ...workout,
                    activeGlycemicFactors: [],
                  })
                }
                className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold underline"
              >
                Limpiar factores marcados
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {ACTIONABLE_GLYCEMIC_FACTORS.map((factor) => {
              const isSelected = activeFactors.includes(factor.id);
              const isAutoLinked = activeAdvisories.some(
                (adv) => adv.factorId === factor.id && adv.isAutoLinkedFromWorkout
              );
              const isActive = isSelected || isAutoLinked;

              return (
                <button
                  key={factor.id}
                  type="button"
                  id={`btn-factor-${factor.id}`}
                  onClick={() => handleToggleFactor(factor.id)}
                  className={`p-2.5 rounded-xl text-left transition flex flex-col justify-between gap-1.5 border ${
                    isActive
                      ? 'bg-amber-500/15 border-amber-400 text-amber-100 shadow-md'
                      : 'bg-slate-950/90 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5 w-full">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{factor.emoji}</span>
                      <span className="text-xs font-bold leading-tight">{factor.shortName}</span>
                    </div>
                    {isActive && (
                      <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 leading-snug line-clamp-2">
                    {factor.effectSummary}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Vista previa de los avisos activos hoy */}
          {activeAdvisories.length > 0 && (
            <div className="space-y-2 pt-1">
              {activeAdvisories.map((adv) => (
                <div
                  key={adv.id}
                  className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <span>{adv.emoji}</span>
                      <span>{adv.name}</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                      {adv.badgeText}
                    </span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">{adv.physiologicalExplanation}</p>
                  <p className="text-amber-200 font-semibold flex items-start gap-1.5 pt-0.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{adv.recommendedRangeText}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN 2: DICCIONARIO COMPLETO DE LOS 42 FACTORES EN 7 CATEGORÍAS */}
      {isFullCatalogOpen && (
        <div className="border-t border-slate-800 pt-4 space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-teal-300 font-semibold">
              <Info className="h-4 w-4 shrink-0" />
              <span>
                Explorá los 42 factores completos y cómo suben (↑), bajan (↓) o cambian la velocidad (↑↓) de tu glucosa:
              </span>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar factor (ej. alcohol, pesas...)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredCategories.map((cat) => {
              const isCatOpen = Boolean(searchTerm.trim()) || openCategoryId === cat.id;
              return (
                <div
                  key={cat.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenCategoryId(isCatOpen ? '' : cat.id)}
                    className="w-full p-3 text-left flex items-center justify-between hover:bg-slate-900/60 transition"
                  >
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-teal-300 flex items-center gap-2">
                        <span>{cat.emoji}</span>
                        <span>{cat.title}</span>
                      </h4>
                      <p className="text-[11px] text-slate-400">{cat.description}</p>
                    </div>
                    {isCatOpen ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </button>

                  {isCatOpen && (
                    <div className="p-3 pt-0 grid grid-cols-1 md:grid-cols-2 gap-2.5 border-t border-slate-800/80">
                      {cat.factors.map((f) => (
                        <div
                          key={f.number}
                          className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-slate-100">
                              #{f.number}. {f.name}
                            </span>
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                                f.effectArrow === '↑'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : f.effectArrow === '↓'
                                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              }`}
                            >
                              {f.effectArrow} {f.effectLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            {f.explanation}
                          </p>
                          <p className="text-[11px] text-teal-300/90 font-medium pt-0.5">
                            💡 <strong>Consejo:</strong> {f.practicalTip}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
