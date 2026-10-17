import React from 'react';
import { DailyMealLogItem, UserSettings } from '../types';
import { Flame, ShieldCheck, ShieldAlert, Leaf, Beef, PieChart, RefreshCw, Trash2, PlusCircle, HeartPulse, Droplet } from 'lucide-react';
import { getCalculatedCalorieGoal } from '../utils/workoutSchedule';
import { getActiveMedicalConditions, classifyFoodSodiumStatus, classifyFoodGlutenStatus } from '../utils/medicalConditions';
import { MedicalConditionsDropdown } from './MedicalConditionsDropdown';

interface DailyRenalAndCalorieTrackerProps {
  settings: UserSettings;
  dailyMeals: DailyMealLogItem[];
  onResetDay: () => void;
  onDeleteMeal: (id: string) => void;
  onOpenAddMealModal?: () => void;
  onUpdateSettings?: (newSettings: UserSettings) => void;
}

export const DailyRenalAndCalorieTracker: React.FC<DailyRenalAndCalorieTrackerProps> = ({
  settings,
  dailyMeals,
  onResetDay,
  onDeleteMeal,
  onOpenAddMealModal,
  onUpdateSettings,
}) => {
  const calorieCalcs = getCalculatedCalorieGoal(settings);
  const currentCalorieGoal = calorieCalcs.goal;
  const activeConditions = getActiveMedicalConditions(settings);

  // Accumulated totals
  const totalCalories = dailyMeals.reduce((acc, m) => acc + m.calories, 0);
  const totalAnimalProtein = dailyMeals.reduce((acc, m) => acc + m.animalProteinGrams, 0);
  const totalPlantProtein = dailyMeals.reduce((acc, m) => acc + m.plantProteinGrams, 0);
  const totalCarbs = dailyMeals.reduce((acc, m) => acc + m.carbsGrams, 0);
  const totalFat = dailyMeals.reduce((acc, m) => acc + m.fatGrams, 0);
  const totalFiber = dailyMeals.reduce((acc, m) => acc + (m.fiberGrams || 0), 0);
  const totalBolusGiven = dailyMeals.reduce((acc, m) => acc + m.bolusUnits, 0);

  // Calculations
  const caloriesRemaining = currentCalorieGoal - totalCalories;
  const animalProteinRemaining = Math.max(0, settings.maxAnimalProtein - totalAnimalProtein);
  const plantProteinNeeded = Math.max(0, settings.minPlantProtein - totalPlantProtein);

  const maxDailyFat = settings.maxDailyFat ?? 60;
  const minDailyFiber = settings.minDailyFiber ?? 25;
  const fatRemaining = Math.max(0, maxDailyFat - totalFat);
  const fiberNeeded = Math.max(0, minDailyFiber - totalFiber);

  // Count high sodium or gluten alerts in today's logged meals
  const highSodiumMealsCount = dailyMeals.filter(
    (m) =>
      classifyFoodSodiumStatus({
        id: m.id,
        name: m.description,
        portionName: '',
        gramsPerPortion: 100,
        carbsGrams: m.carbsGrams,
        animalProteinGrams: m.animalProteinGrams,
        plantProteinGrams: m.plantProteinGrams,
        fatGrams: m.fatGrams,
        calories: m.calories,
        gi: 'Medio',
        cg: 10,
        absorption: 'Mixta',
      }) === 'high_sodium'
  ).length;

  const taccMealsCount = dailyMeals.filter(
    (m) =>
      classifyFoodGlutenStatus({
        id: m.id,
        name: m.description,
        portionName: '',
        gramsPerPortion: 100,
        carbsGrams: m.carbsGrams,
        animalProteinGrams: m.animalProteinGrams,
        plantProteinGrams: m.plantProteinGrams,
        fatGrams: m.fatGrams,
        calories: m.calories,
        gi: 'Medio',
        cg: 10,
        absorption: 'Mixta',
      }).status === 'contains_tacc'
  ).length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-5">
      
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <PieChart className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 flex-wrap">
              <span>Balance Acumulado del Día y Metas de Salud</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-slate-800 border border-slate-700 text-amber-300 font-normal font-mono flex items-center gap-1">
                {settings.dayType === 'weekday' 
                  ? `Día Laboral: ${currentCalorieGoal} kcal` 
                  : `Fin de Semana: ${currentCalorieGoal} kcal`}
                {calorieCalcs.isAdjusted && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    calorieCalcs.adjustmentKcal < 0 ? 'text-rose-300 bg-rose-950/60' : 'text-emerald-300 bg-emerald-950/60'
                  }`}>
                    ({calorieCalcs.explanation})
                  </span>
                )}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Control diario adaptado a tus condiciones médicas activas y balance calórico progresivo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {onOpenAddMealModal && (
            <button
              onClick={onOpenAddMealModal}
              id="btn-add-meal-manual"
              className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ Cargar Comida Manual</span>
            </button>
          )}

          <button
            onClick={onResetDay}
            id="btn-reset-day-tracker"
            className="px-3.5 py-2 bg-rose-950/50 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reiniciar Día</span>
          </button>
        </div>
      </div>

      {/* Menú Desplegable de las 6 Condiciones Médicas y Nutricionales */}
      {onUpdateSettings && (
        <MedicalConditionsDropdown
          settings={settings}
          onUpdateSettings={onUpdateSettings}
        />
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* CARD 1: CALORIAS */}
        {settings.showCaloriesAndMacros !== false && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-amber-400" /> Calorías
              </span>
              <span className="text-xs font-mono font-bold text-slate-200">
                {totalCalories} / {currentCalorieGoal} kcal
              </span>
            </div>

            <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 ${
                  totalCalories > currentCalorieGoal ? 'bg-rose-500' : 'bg-amber-400'
                }`}
                style={{ width: `${Math.min(100, (totalCalories / currentCalorieGoal) * 100)}%` }}
              />
            </div>

            <p className="text-xs text-slate-400">
              {caloriesRemaining >= 0 ? (
                <span>Faltan <strong className="text-amber-300 font-bold">{caloriesRemaining} kcal</strong> para la meta.</span>
              ) : (
                <span className="text-rose-400 font-semibold">Excedido en {Math.abs(caloriesRemaining)} kcal de la meta.</span>
              )}
            </p>
          </div>
        )}

        {/* CARD 2 & 3: PROTEINA ANIMAL & VEGETAL (CONDICIÓN RENAL ACTIVA) */}
        {activeConditions.renal ? (
          <>
            <div className={`bg-slate-950 border rounded-xl p-4 space-y-3 ${
              totalAnimalProtein > settings.maxAnimalProtein ? 'border-rose-700/80' : 'border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <Beef className="h-4 w-4 text-rose-400" /> Proteína Animal (Renal)
                </span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {totalAnimalProtein.toFixed(1)} / {settings.maxAnimalProtein} g máx
                </span>
              </div>

              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-500 ${
                    totalAnimalProtein > settings.maxAnimalProtein ? 'bg-rose-500' : 'bg-rose-400'
                  }`}
                  style={{ width: `${Math.min(100, (totalAnimalProtein / settings.maxAnimalProtein) * 100)}%` }}
                />
              </div>

              <p className="text-xs text-slate-400">
                {totalAnimalProtein <= settings.maxAnimalProtein ? (
                  <span>Quedan disponibles <strong className="text-emerald-400 font-bold">{animalProteinRemaining.toFixed(1)} g</strong> de límite renal.</span>
                ) : (
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                    Límite renal superado (+{(totalAnimalProtein - settings.maxAnimalProtein).toFixed(1)}g).
                  </span>
                )}
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Leaf className="h-4 w-4 text-emerald-400" /> Proteína Vegetal (Renal)
                </span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {totalPlantProtein.toFixed(1)} / ({settings.minPlantProtein}-{settings.maxPlantProtein} g)
                </span>
              </div>

              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, (totalPlantProtein / settings.maxPlantProtein) * 100)}%` }}
                />
              </div>

              <p className="text-xs text-slate-400">
                {totalPlantProtein < settings.minPlantProtein ? (
                  <span>Faltan <strong className="text-emerald-300 font-bold">{plantProteinNeeded.toFixed(1)} g</strong> para el mínimo deseado ({settings.minPlantProtein}g).</span>
                ) : totalPlantProtein <= settings.maxPlantProtein ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> En rango óptimo vegetal ({settings.minPlantProtein}g - {settings.maxPlantProtein}g).
                  </span>
                ) : (
                  <span>Rango objetivo completado con éxito.</span>
                )}
              </p>
            </div>
          </>
        ) : (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 md:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                <Beef className="h-4 w-4 text-teal-400" /> Proteínas Totales del Día (Sin restricción renal activa)
              </span>
              <span className="text-xs font-mono font-bold text-slate-200">
                {(totalAnimalProtein + totalPlantProtein).toFixed(1)} g totales
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Animal: <strong className="text-slate-200">{totalAnimalProtein.toFixed(1)} g</strong> • Vegetal: <strong className="text-emerald-300">{totalPlantProtein.toFixed(1)} g</strong>. (Podés activar la Protección Renal en el menú de arriba si necesitás tope diario).
            </p>
          </div>
        )}

        {/* CONDICIÓN DISLIPIDEMIA: LÍMITE DE GRASAS Y META DE FIBRA */}
        {activeConditions.dyslipidemia && (
          <>
            <div className={`bg-slate-950 border rounded-xl p-4 space-y-3 ${
              totalFat > maxDailyFat ? 'border-rose-700/80' : 'border-emerald-800/60'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Droplet className="h-4 w-4 text-amber-400" /> Límite Grasas (Colesterol)
                </span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {totalFat.toFixed(1)} / {maxDailyFat} g máx
                </span>
              </div>
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-500 ${
                    totalFat > maxDailyFat ? 'bg-rose-500' : 'bg-amber-400'
                  }`}
                  style={{ width: `${Math.min(100, (totalFat / maxDailyFat) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-400">
                {totalFat <= maxDailyFat ? (
                  <span>Margen disponible: <strong className="text-emerald-400">{fatRemaining.toFixed(1)} g</strong> de grasa hoy.</span>
                ) : (
                  <span className="text-rose-400 font-bold">Tope diario de grasas superado (+{(totalFat - maxDailyFat).toFixed(1)}g).</span>
                )}
              </p>
            </div>

            <div className="bg-slate-950 border border-emerald-800/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <Leaf className="h-4 w-4 text-emerald-400" /> Meta de Fibra Soluble
                </span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {totalFiber.toFixed(1)} / {minDailyFiber} g mín
                </span>
              </div>
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, (totalFiber / minDailyFiber) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-400">
                {totalFiber < minDailyFiber ? (
                  <span>Faltan <strong className="text-emerald-300">{fiberNeeded.toFixed(1)} g</strong> de fibra para ayudar a reducir colesterol y aplanar picos.</span>
                ) : (
                  <span className="text-emerald-400 font-bold">¡Meta diaria de fibra soluble alcanzada!</span>
                )}
              </p>
            </div>
          </>
        )}

      </div>

      {/* Tarjetas de Estado Diario para Celiaquía, Hipertensión, Gastroparesia y Lactosa */}
      {(activeConditions.celiac || activeConditions.hypertension || activeConditions.gastroparesis || activeConditions.lactose_intolerance) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {activeConditions.celiac && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              taccMealsCount > 0
                ? 'bg-rose-950/50 border-rose-700/70 text-rose-200'
                : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
            }`}>
              <span className="text-base leading-none mt-0.5">🌾</span>
              <div>
                <strong className="block font-bold">
                  {taccMealsCount > 0
                    ? `⚠️ Atención Celíacos: ${taccMealsCount} comida(s) de hoy figuran con posible TACC`
                    : '✅ Control Celíaco del Día: Todas tus comidas registradas son libres de TACC'}
                </strong>
                <span className="text-[11px] opacity-90 block mt-0.5">
                  El buscador de alimentos tiene activo el detector automático Sin TACC en cada producto.
                </span>
              </div>
            </div>
          )}

          {activeConditions.hypertension && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              highSodiumMealsCount > 0
                ? 'bg-amber-950/50 border-amber-700/70 text-amber-200'
                : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
            }`}>
              <span className="text-base leading-none mt-0.5">🧂</span>
              <div>
                <strong className="block font-bold">
                  {highSodiumMealsCount > 0
                    ? `⚠️ Cuidado Presión Arterial: ${highSodiumMealsCount} comida(s) con sodio elevado hoy`
                    : '💚 Control de Sodio: Sin ultraprocesados salados registrados hoy'}
                </strong>
                <span className="text-[11px] opacity-90 block mt-0.5">
                  Priorizá hidratación con agua y alimentos frescos para cuidar la presión arterial y los riñones.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Secondary Nutrients Bar */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div>
          <span className="text-slate-400 block font-sans text-[11px]">Carbohidratos Totales</span>
          <span className="text-teal-300 font-bold text-sm">{totalCarbs.toFixed(1)} g</span>
        </div>
        <div>
          <span className="text-slate-400 block font-sans text-[11px]">Grasas Totales</span>
          <span className="text-slate-200 font-bold text-sm">{totalFat.toFixed(1)} g</span>
        </div>
        <div>
          <span className="text-slate-400 block font-sans text-[11px]">Fibra Acumulada</span>
          <span className="text-emerald-300 font-bold text-sm">{totalFiber.toFixed(1)} g</span>
        </div>
        <div>
          <span className="text-slate-400 block font-sans text-[11px]">Total Insulina Inyectada Hoy</span>
          <span className="text-indigo-300 font-bold text-sm">{totalBolusGiven.toFixed(1)} U</span>
        </div>
      </div>

      {/* Today's Meals Log */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Registro de Comidas Ingresadas Hoy ({dailyMeals.length})
            </h3>
            <span className="text-[10px] text-slate-400">
              Comidas activas en el balance del día actual
            </span>
          </div>
        </div>

        {dailyMeals.length === 0 ? (
          <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-2.5">
            <p className="text-xs text-slate-400">
              No hay comidas registradas para el balance de hoy.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {dailyMeals.map((meal) => (
              <div
                key={meal.id}
                className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{meal.description}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{meal.time}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 font-mono flex-wrap">
                    <span>{meal.carbsGrams}g HC</span>
                    <span>Prot.Anim: {meal.animalProteinGrams}g</span>
                    <span>Prot.Veg: {meal.plantProteinGrams}g</span>
                    <span>Grasa: {meal.fatGrams}g</span>
                    <span>{meal.calories} kcal</span>
                    {meal.bolusUnits > 0 && <span className="text-teal-400 font-bold">{meal.bolusUnits} U Novorapid</span>}
                  </div>
                </div>

                <button
                  onClick={() => onDeleteMeal(meal.id)}
                  className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-slate-900 transition"
                  title="Eliminar registro del día actual"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
