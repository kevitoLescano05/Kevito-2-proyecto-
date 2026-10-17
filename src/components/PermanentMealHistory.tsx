import React, { useState, useMemo } from 'react';
import { DailyMealLogItem, BolusRecord } from '../types';
import { 
  History, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  Flame, 
  Beef, 
  Leaf, 
  Syringe, 
  Trash2, 
  Search,
  CheckCircle2,
  AlertCircle,
  Cloud,
  BarChart3
} from 'lucide-react';

interface PermanentMealHistoryProps {
  allMeals: DailyMealLogItem[];
  bolusHistory?: BolusRecord[];
  onDeleteMeal: (id: string) => void;
  onOpenDriveSync?: () => void;
}

export const PermanentMealHistory: React.FC<PermanentMealHistoryProps> = ({
  allMeals,
  bolusHistory = [],
  onDeleteMeal,
  onOpenDriveSync,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Group meals by logical date
  const groupedMeals = useMemo(() => {
    const groups: { [dateKey: string]: DailyMealLogItem[] } = {};

    allMeals.forEach((meal) => {
      let dateKey = meal.date;
      if (!dateKey && meal.timestamp) {
        try {
          const d = new Date(meal.timestamp);
          dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } catch {
          dateKey = 'Sin fecha';
        }
      }
      if (!dateKey) dateKey = 'Sin fecha';

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(meal);
    });

    // Filter by search term if present
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      Object.keys(groups).forEach((key) => {
        groups[key] = groups[key].filter(
          (m) =>
            m.description.toLowerCase().includes(term) ||
            key.includes(term) ||
            (m.time && m.time.includes(term))
        );
        if (groups[key].length === 0) {
          delete groups[key];
        }
      });
    }

    // Sort dates in descending order (most recent first)
    const sortedDateKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return { groups, sortedDateKeys };
  }, [allMeals, searchTerm]);

  // Format date header to friendly Spanish text: "Registro del DD/MM/AAAA"
  const formatDateHeader = (dateKey: string) => {
    if (dateKey === 'Sin fecha') return 'Registro de comidas sin fecha';

    const parts = dateKey.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

      let labelPrefix = '';
      if (dateKey === todayKey) {
        labelPrefix = 'Hoy - ';
      } else if (dateKey === yesterdayKey) {
        labelPrefix = 'Ayer - ';
      }

      return `Registro del ${labelPrefix}${day}/${month}/${year}`;
    }

    return `Registro del ${dateKey}`;
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Seguro que deseas eliminar este registro permanentemente de la base de datos?')) {
      onDeleteMeal(id);
    }
  };

  // Resumen semanal simple (últimos 7 días con registros)
  const weeklySummary = useMemo(() => {
    const recentDateKeys = groupedMeals.sortedDateKeys.slice(0, 7);
    const daysCount = Math.max(1, recentDateKeys.length);

    let totalInsulin7d = 0;
    let totalCarbs7d = 0;
    let totalKcal7d = 0;

    recentDateKeys.forEach((dk) => {
      const meals = groupedMeals.groups[dk] || [];
      meals.forEach((m) => {
        totalInsulin7d += m.bolusUnits || 0;
        totalCarbs7d += m.carbsGrams || 0;
        totalKcal7d += m.calories || 0;
      });
    });

    // Glucemias registradas en los últimos 7 días en bolusHistory
    const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentBgRecords = (bolusHistory || []).filter((b) => {
      const ts = new Date(b.timestamp).getTime();
      return ts >= sevenDaysAgoMs && b.glucoseMgDl > 20;
    });

    const bgCount = recentBgRecords.length;
    const avgGlucose =
      bgCount > 0
        ? Math.round(
            recentBgRecords.reduce((sum, r) => sum + r.glucoseMgDl, 0) / bgCount
          )
        : null;

    const inRangeCount = recentBgRecords.filter(
      (r) => r.glucoseMgDl >= 70 && r.glucoseMgDl <= 180
    ).length;
    const tirPercent = bgCount > 0 ? Math.round((inRangeCount / bgCount) * 100) : null;

    return {
      daysCount: recentDateKeys.length,
      avgInsulinPerDay:
        recentDateKeys.length > 0
          ? Math.round((totalInsulin7d / daysCount) * 10) / 10
          : 0,
      avgCarbsPerDay:
        recentDateKeys.length > 0 ? Math.round(totalCarbs7d / daysCount) : 0,
      avgKcalPerDay:
        recentDateKeys.length > 0 ? Math.round(totalKcal7d / daysCount) : 0,
      avgGlucose,
      tirPercent,
      bgCount,
    };
  }, [groupedMeals, bolusHistory]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300">
      {/* Tarjeta de Resumen Semanal Simple siempre visible arriba del historial */}
      <div className="p-4 sm:px-6 bg-slate-950/70 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-teal-400" />
            <span>📊 Resumen Simple de los Últimos 7 Días</span>
          </span>
          <span className="text-[11px] text-slate-400">
            Basado en tus {weeklySummary.daysCount} {weeklySummary.daysCount === 1 ? 'día registrado' : 'días registrados'} y {weeklySummary.bgCount} controles
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[10px] text-slate-400 block">Glucemia Promedio</span>
            <span className="text-base font-mono font-extrabold text-teal-300">
              {weeklySummary.avgGlucose !== null ? `${weeklySummary.avgGlucose} mg/dL` : 'Sin datos aún'}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[10px] text-slate-400 block">En Rango (70-180 mg/dL)</span>
            <span className="text-base font-mono font-extrabold text-emerald-300">
              {weeklySummary.tirPercent !== null ? `${weeklySummary.tirPercent}%` : 'Sin datos aún'}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[10px] text-slate-400 block">Insulina Rápida / Día</span>
            <span className="text-base font-mono font-extrabold text-indigo-300">
              {weeklySummary.avgInsulinPerDay} U/día
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[10px] text-slate-400 block">Promedio Diario HC / Kcal</span>
            <span className="text-base font-mono font-extrabold text-amber-300">
              {weeklySummary.avgCarbsPerDay}g • {weeklySummary.avgKcalPerDay} kcal
            </span>
          </div>
        </div>
      </div>
      {/* Collapsible Header Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 md:p-6 flex items-center justify-between gap-4 text-left hover:bg-slate-800/40 transition"
      >
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 shrink-0">
            <History className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-slate-100">
                Historial Permanente de Comidas
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-teal-950/80 border border-teal-700/50 text-teal-300">
                {allMeals.length} {allMeals.length === 1 ? 'comida' : 'comidas'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Registro histórico indestructible almacenado en Firestore dividido por días
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400 shrink-0">
          <span className="text-xs font-medium hidden sm:inline">
            {isOpen ? 'Ocultar historial' : 'Ver historial'}
          </span>
          <div className="p-2 rounded-lg bg-slate-800/80 text-slate-300">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </button>

      {/* Expanded Content Panel */}
      {isOpen && (
        <div className="p-5 md:p-6 border-t border-slate-800/80 space-y-6 bg-slate-950/40">
          
          {/* Search Bar & Drive Backup Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            {allMeals.length > 3 ? (
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar por plato, ingrediente o fecha..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                />
              </div>
            ) : <div />}

            {onOpenDriveSync && (
              <button
                type="button"
                onClick={onOpenDriveSync}
                className="px-3 py-2 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/50 rounded-xl text-xs text-indigo-300 font-semibold flex items-center justify-center gap-1.5 transition shrink-0"
              >
                <Cloud className="h-3.5 w-3.5 text-indigo-400" />
                <span>Copia a Google Drive (15 GB)</span>
              </button>
            )}
          </div>

          {allMeals.length === 0 ? (
            <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <History className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">
                Aún no hay comidas registradas en el historial permanente.
              </p>
              <p className="text-[11px] text-slate-500">
                Las comidas que cargues mediante foto, etiqueta o manualmente aparecerán guardadas aquí de forma permanente.
              </p>
            </div>
          ) : groupedMeals.sortedDateKeys.length === 0 ? (
            <div className="p-6 text-center bg-slate-950 border border-slate-800 rounded-xl">
              <p className="text-xs text-slate-400">
                No se encontraron comidas que coincidan con "{searchTerm}".
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedMeals.sortedDateKeys.map((dateKey) => {
                const mealsForDay = groupedMeals.groups[dateKey];
                
                // Calculate totals for this day in history
                const dayCalories = mealsForDay.reduce((sum, m) => sum + (m.calories || 0), 0);
                const dayCarbs = mealsForDay.reduce((sum, m) => sum + (m.carbsGrams || 0), 0);
                const dayAnimalProt = mealsForDay.reduce((sum, m) => sum + (m.animalProteinGrams || 0), 0);
                const dayPlantProt = mealsForDay.reduce((sum, m) => sum + (m.plantProteinGrams || 0), 0);
                const dayFat = mealsForDay.reduce((sum, m) => sum + (m.fatGrams || 0), 0);
                const dayBolus = mealsForDay.reduce((sum, m) => sum + (m.bolusUnits || 0), 0);

                return (
                  <div 
                    key={dateKey} 
                    className="bg-slate-950 border border-slate-800/90 rounded-xl overflow-hidden shadow-sm"
                  >
                    {/* Day Group Header */}
                    <div className="bg-slate-900/90 border-b border-slate-800/80 p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-2.5">
                        <Calendar className="h-4 w-4 text-teal-400 shrink-0" />
                        <span className="font-bold text-sm text-slate-100 font-mono">
                          {formatDateHeader(dateKey)}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                          {mealsForDay.length} {mealsForDay.length === 1 ? 'comida' : 'comidas'}
                        </span>
                      </div>

                      {/* Day Totals Summary Pill */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                        <span className="bg-amber-950/40 border border-amber-800/40 text-amber-300 px-2 py-0.5 rounded flex items-center gap-1">
                          <Flame className="h-3 w-3" /> {dayCalories} kcal
                        </span>
                        <span className="bg-teal-950/40 border border-teal-800/40 text-teal-300 px-2 py-0.5 rounded">
                          {dayCarbs.toFixed(1)}g HC
                        </span>
                        <span className={`px-2 py-0.5 rounded border ${
                          dayAnimalProt > 25 
                            ? 'bg-rose-950/60 border-rose-700/60 text-rose-300 font-bold' 
                            : 'bg-slate-800/70 border-slate-700 text-rose-300'
                        }`}>
                          Anim: {dayAnimalProt.toFixed(1)}g
                        </span>
                        <span className="bg-slate-800/70 border border-slate-700 text-emerald-300 px-2 py-0.5 rounded">
                          Veg: {dayPlantProt.toFixed(1)}g
                        </span>
                        {dayBolus > 0 && (
                          <span className="bg-indigo-950/40 border border-indigo-800/40 text-indigo-300 px-2 py-0.5 rounded flex items-center gap-1">
                            <Syringe className="h-3 w-3" /> {dayBolus.toFixed(1)} U
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meal items for this date */}
                    <div className="p-3 sm:p-4 space-y-2.5 divide-y divide-slate-900">
                      {mealsForDay.map((meal) => (
                        <div
                          key={meal.id}
                          className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-100 text-sm">
                                {meal.description}
                              </span>
                              {meal.time && (
                                <span className="text-[11px] text-slate-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                  {meal.time}
                                </span>
                              )}
                            </div>

                            {/* Detailed Macros */}
                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-300">
                              <span className="text-teal-300 font-semibold bg-teal-950/40 px-2 py-0.5 rounded">
                                {meal.carbsGrams}g Carbohidratos
                              </span>
                              <span className="text-rose-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                Prot. Animal: {meal.animalProteinGrams}g
                              </span>
                              <span className="text-emerald-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                Prot. Vegetal: {meal.plantProteinGrams}g
                              </span>
                              <span className="text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                Grasas: {meal.fatGrams}g
                              </span>
                              <span className="text-amber-300 font-bold bg-amber-950/30 px-2 py-0.5 rounded border border-amber-900/40">
                                {meal.calories} kcal
                              </span>
                              {meal.bolusUnits > 0 && (
                                <span className="text-indigo-300 font-bold bg-indigo-950/60 border border-indigo-700/50 px-2 py-0.5 rounded flex items-center gap-1">
                                  <Syringe className="h-3 w-3" />
                                  {meal.bolusUnits} U Novorapid
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Delete Item Button */}
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={(e) => handleDeleteClick(meal.id, e)}
                              className="text-slate-500 hover:text-rose-400 hover:bg-slate-900 p-2 rounded-lg transition"
                              title="Eliminar esta comida del historial permanente"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}
    </div>
  );
};
