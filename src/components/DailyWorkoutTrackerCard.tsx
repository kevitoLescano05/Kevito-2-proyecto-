import React, { useState } from 'react';
import {
  UserSettings,
  WorkoutRoutineType,
  SportId,
  ExerciseIntensity,
  CustomExerciseItem,
  CalorieAccountingMode,
} from '../types';
import {
  Dumbbell,
  Check,
  X,
  Flame,
  Compass,
  Plus,
  Trash2,
  Settings2,
  Activity,
  Sparkles,
  Scale,
  Clock,
  Zap,
  Info,
} from 'lucide-react';
import {
  SPORTS_CATALOG,
  getSportDefinition,
  calculateExerciseCalories,
  getCalculatedCalorieGoal,
  getRoutineLabel,
} from '../utils/workoutSchedule';

interface DailyWorkoutTrackerCardProps {
  settings: UserSettings;
  onUpdateWorkout: (updatedWorkout: UserSettings['dailyWorkout']) => void;
  onUpdateWeightKg?: (weightKg: number) => void;
}

export const DailyWorkoutTrackerCard: React.FC<DailyWorkoutTrackerCardProps> = ({
  settings,
  onUpdateWorkout,
  onUpdateWeightKg,
}) => {
  const isWeekday = settings.dayType === 'weekday';
  const weightKg = settings.weightKg || 65;

  const workout = settings.dailyWorkout || {
    routineType: 'chest_back',
    weightsDone: null,
    walkDone: null,
    weekendActivity: 'none',
    calorieAccountingMode: 'add_when_done',
    customRoutineItems: [],
    activeGlycemicFactors: [],
  };

  const customItems: CustomExerciseItem[] = workout.customRoutineItems || [];
  const accountingMode: CalorieAccountingMode = workout.calorieAccountingMode || 'add_when_done';

  // Estado para abrir/cerrar el creador de rutina propia
  const [isBuilderOpen, setIsBuilderOpen] = useState<boolean>(customItems.length === 0);
  const [selectedSportId, setSelectedSportId] = useState<SportId>('gym_weights');
  const [customLabelInput, setCustomLabelInput] = useState<string>('');
  const [durationInput, setDurationInput] = useState<string>('');
  const [intensityInput, setIntensityInput] = useState<ExerciseIntensity>('moderate');
  const [muscleGroupInput, setMuscleGroupInput] = useState<WorkoutRoutineType>('chest_back');
  const [customKcalInput, setCustomKcalInput] = useState<string>('');
  const [editingWeight, setEditingWeight] = useState<string>('');

  const calorieCalcs = getCalculatedCalorieGoal(settings);

  const selectedSportDef = getSportDefinition(selectedSportId);
  const effectiveDurationMinutes = Number(durationInput) || selectedSportDef.defaultDurationMinutes;
  const previewAutoKcal = calculateExerciseCalories(
    selectedSportId,
    effectiveDurationMinutes,
    intensityInput,
    weightKg,
    customKcalInput.trim() !== '' && Number(customKcalInput) > 0 ? Number(customKcalInput) : undefined
  );

  const handleSelectSportInBuilder = (sportId: SportId) => {
    setSelectedSportId(sportId);
    setDurationInput('');
    setCustomKcalInput('');
  };

  const handleAddExerciseToRoutine = () => {
    const def = getSportDefinition(selectedSportId);
    const customKcalNum =
      customKcalInput.trim() !== '' && Number(customKcalInput) > 0
        ? Math.round(Number(customKcalInput))
        : undefined;

    const isLower =
      selectedSportId === 'gym_weights'
        ? muscleGroupInput === 'legs'
        : def.isLowerBody;

    const newItem: CustomExerciseItem = {
      id: `routine-item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sportId: selectedSportId,
      customLabel: customLabelInput.trim() || undefined,
      muscleGroup: selectedSportId === 'gym_weights' ? muscleGroupInput : undefined,
      durationMinutes: Math.max(5, Math.min(360, Number(durationInput) || def.defaultDurationMinutes)),
      intensity: intensityInput,
      customCaloriesOverride: customKcalNum,
      doneStatus: null,
      isLowerBody: isLower,
    };

    const nextItems = [...customItems, newItem];
    onUpdateWorkout({
      ...workout,
      customRoutineItems: nextItems,
    });

    setCustomLabelInput('');
    setCustomKcalInput('');
    if (customItems.length >= 1) {
      setIsBuilderOpen(false);
    }
  };

  const handleRemoveRoutineItem = (id: string) => {
    const nextItems = customItems.filter((item) => item.id !== id);
    onUpdateWorkout({
      ...workout,
      customRoutineItems: nextItems,
    });
  };

  const handleToggleItemDoneStatus = (id: string, status: boolean) => {
    const nextItems = customItems.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        doneStatus: item.doneStatus === status ? null : status,
      };
    });
    onUpdateWorkout({
      ...workout,
      customRoutineItems: nextItems,
    });
  };

  const handleChangeItemMuscleGroup = (id: string, group: WorkoutRoutineType) => {
    const nextItems = customItems.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        muscleGroup: group,
        isLowerBody: group === 'legs',
      };
    });
    onUpdateWorkout({
      ...workout,
      routineType: group,
      customRoutineItems: nextItems,
    });
  };

  const handleChangeAccountingMode = (mode: CalorieAccountingMode) => {
    onUpdateWorkout({
      ...workout,
      calorieAccountingMode: mode,
    });
  };

  // Verificación de interacción anatómica con el i-Port en muslo
  const isIPortOnLeg = settings.iPortState?.site === 'thigh';
  const hasLowerBodyDoneToday = customItems.some((item) => {
    if (item.doneStatus !== true) return false;
    const def = getSportDefinition(item.sportId);
    if (item.sportId === 'gym_weights') {
      return item.muscleGroup === 'legs';
    }
    return Boolean(item.isLowerBody ?? def.isLowerBody);
  });

  const muscleGroups: { type: WorkoutRoutineType; title: string }[] = [
    { type: 'chest_back', title: 'Pecho y Espalda' },
    { type: 'arms', title: 'Brazos / Hombros' },
    { type: 'legs', title: 'Piernas' },
    { type: 'weekend_extra', title: 'Cuerpo Completo' },
  ];

  const intensityLabels: Record<ExerciseIntensity, string> = {
    light: 'Suave',
    moderate: 'Moderada',
    intense: 'Intensa',
  };

  return (
    <div
      id="card-daily-workout-tracker"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Dumbbell className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 flex-wrap">
              <span>Mi Rutina de Ejercicio y Deporte</span>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-teal-300 border border-slate-700">
                {isWeekday ? 'Día Laboral' : 'Fin de Semana'} • Peso: {weightKg} kg
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Armá tu propia rutina con los deportes que hacés y marcá Hecho o No hecho para ajustar tus calorías e insulina
            </p>
          </div>
        </div>

        {/* Resumen dinámico de calorías y botón para editar rutina */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Flame className="h-4 w-4 text-amber-400" />
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-medium">Meta calórica de hoy:</span>
              <span className="text-sm font-mono font-bold text-amber-300">
                {calorieCalcs.goal} kcal
              </span>
            </div>
            {calorieCalcs.isAdjusted && (
              <span
                className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                  calorieCalcs.adjustmentKcal < 0
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {calorieCalcs.adjustmentKcal > 0
                  ? `+${calorieCalcs.adjustmentKcal}`
                  : calorieCalcs.adjustmentKcal}{' '}
                kcal
              </span>
            )}
          </div>

          <button
            type="button"
            id="btn-toggle-routine-builder"
            onClick={() => setIsBuilderOpen(!isBuilderOpen)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
              isBuilderOpen
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
            }`}
          >
            {customItems.length === 0 ? (
              <>
                <Plus className="h-4 w-4" />
                <span>Armar Mi Rutina</span>
              </>
            ) : (
              <>
                <Settings2 className="h-4 w-4" />
                <span>{isBuilderOpen ? 'Cerrar Editor' : 'Editar / Agregar Deporte'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* LISTA DE ACTIVIDADES DE LA RUTINA PERSONAL DEL USUARIO */}
      {customItems.length > 0 ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {customItems.map((item, idx) => {
              const sportDef = getSportDefinition(item.sportId);
              const itemKcal = calculateExerciseCalories(
                item.sportId,
                item.durationMinutes,
                item.intensity,
                weightKg,
                item.customCaloriesOverride
              );
              const displayTitle = item.customLabel || sportDef.name;
              const isWeights = item.sportId === 'gym_weights';

              return (
                <div
                  key={item.id}
                  className={`rounded-xl p-3.5 space-y-3 border transition ${
                    item.doneStatus === true
                      ? 'bg-emerald-950/20 border-emerald-500/50'
                      : item.doneStatus === false
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  {/* Encabezado de la actividad */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl" role="img" aria-label={sportDef.name}>
                        {sportDef.emoji}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                            {idx + 1}. {displayTitle}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                            {item.durationMinutes} min • {intensityLabels[item.intensity]}
                          </span>
                        </div>
                        <span className="text-[11px] text-teal-300 font-mono font-semibold block mt-0.5">
                          🔥 Gasto / Reposición: ~{itemKcal} kcal (para {weightKg} kg)
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveRoutineItem(item.id)}
                      title="Quitar de mi rutina"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Si eligió Gimnasio / Pesas, permitir elegir qué grupo muscular entrena hoy */}
                  {isWeights && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                      <span className="text-[11px] text-slate-300 font-medium block">
                        Grupo muscular de hoy:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {muscleGroups.map((mg) => {
                          const isSelected = (item.muscleGroup || 'chest_back') === mg.type;
                          return (
                            <button
                              key={mg.type}
                              type="button"
                              onClick={() => handleChangeItemMuscleGroup(item.id, mg.type)}
                              className={`p-1.5 rounded-lg text-[11px] font-semibold text-center transition border ${
                                isSelected
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {mg.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Nota breve de impacto glucémico y requerimiento nutricional */}
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {sportDef.glycemicImpactSummary}
                  </p>

                  {/* Botones [HECHO] y [NO HECHO] */}
                  <div className="pt-1 space-y-1.5">
                    <span className="text-[11px] text-slate-300 font-medium block">
                      ¿Completaste {displayTitle.toLowerCase()} hoy?
                      {isWeights && item.muscleGroup ? ` (${getRoutineLabel(item.muscleGroup)})` : ''}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleItemDoneStatus(item.id, true)}
                        className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition border ${
                          item.doneStatus === true
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-950/40'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-emerald-950/40 hover:text-emerald-300 hover:border-emerald-700'
                        }`}
                      >
                        <Check className="h-4 w-4 stroke-[3]" />
                        <span>
                          Hecho{' '}
                          {accountingMode === 'add_when_done' ? `(+${itemKcal} kcal)` : '✓'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleItemDoneStatus(item.id, false)}
                        className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition border ${
                          item.doneStatus === false
                            ? 'bg-rose-500 text-slate-950 border-rose-400 shadow-md shadow-rose-950/40'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-700'
                        }`}
                      >
                        <X className="h-4 w-4 stroke-[3]" />
                        <span>
                          No hecho{' '}
                          {accountingMode === 'subtract_when_missed' ? `(-${itemKcal} kcal)` : ''}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Explicación automática cuando marca HECHO */}
                  {item.doneStatus === true && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-200 space-y-1">
                      <div className="font-bold flex items-center gap-1 text-emerald-300">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>
                          Energía a reponer por este deporte: +{itemKcal} kcal (~
                          {Math.round((itemKcal * 0.55) / 4)}g de carbohidratos + proteína de recuperación)
                        </span>
                      </div>
                      <p className="text-emerald-100/80">
                        Al marcarlo como <strong>Hecho</strong>, la calculadora de insulina también activó el aviso orientativo de sensibilidad post-ejercicio para tu próximo bolo.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ESTADO INICIAL CUANDO EL USUARIO TODAVÍA NO ARMÓ SU RUTINA */
        <div className="bg-slate-950/80 border border-dashed border-slate-700 rounded-xl p-4 text-center space-y-2">
          <p className="text-xs sm:text-sm font-semibold text-slate-200">
            Todavía no agregaste ningún deporte o actividad a tu rutina personal
          </p>
          <p className="text-xs text-slate-400 max-w-xl mx-auto">
            Cada persona entrena o se mueve distinto (Natación, Boxeo, Gimnasio, Caminata, Fútbol, Ciclismo, Correr, etc.). Elegí acá abajo las actividades que hacés vos para que aparezcan siempre tus botones de <strong>Hecho / No hecho</strong> con tus calorías exactas.
          </p>
        </div>
      )}

      {/* CONSTRUCTOR / EDITOR DE RUTINA PERSONALIZADA (OPCIÓN 1) */}
      {isBuilderOpen && (
        <div className="bg-slate-950 border border-amber-500/40 rounded-2xl p-4 space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span>Armar / Personalizar Mi Rutina dentro de la App</span>
              </h4>
              <p className="text-xs text-slate-400">
                Elegí el deporte o actividad física que practicás y la app calculará cuántas calorías requiere comer tu cuerpo según tu peso ({weightKg} kg)
              </p>
            </div>

            {/* Ajuste rápido de peso corporal si quiere calcular las calorías para su peso exacto */}
            {onUpdateWeightKg && (
              <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800">
                <Scale className="h-3.5 w-3.5 text-teal-400" />
                <span className="text-[11px] text-slate-300">Tu peso:</span>
                <input
                  type="number"
                  min={25}
                  max={220}
                  value={editingWeight}
                  placeholder={`Ej: ${weightKg}`}
                  onChange={(e) => {
                    setEditingWeight(e.target.value);
                    const val = Number(e.target.value);
                    if (val >= 25 && val <= 220) {
                      onUpdateWeightKg(val);
                    }
                  }}
                  className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono text-teal-300 placeholder:text-slate-500 text-center"
                />
                <span className="text-[11px] text-slate-400">kg</span>
              </div>
            )}
          </div>

          {/* 1. Selección del Deporte (Todos los 20 deportes posibles) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 block">
              1. Elegí el deporte o ejercicio para agregar a tu rutina:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-1.5 max-h-60 overflow-y-auto pr-1">
              {SPORTS_CATALOG.map((sport) => {
                const isSelected = selectedSportId === sport.id;
                return (
                  <button
                    key={sport.id}
                    type="button"
                    onClick={() => handleSelectSportInBuilder(sport.id)}
                    className={`p-2 rounded-xl text-left text-xs transition flex items-center gap-2 border ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-slate-100'
                    }`}
                  >
                    <span className="text-base shrink-0">{sport.emoji}</span>
                    <span className="truncate leading-tight">{sport.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Configuración de Duración, Intensidad y Nombre opcional */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Duración en minutos */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-teal-400" />
                <span>2. Duración (minutos)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={360}
                  step={5}
                  value={durationInput}
                  placeholder={`Ej: ${selectedSportDef.defaultDurationMinutes}`}
                  onChange={(e) => setDurationInput(e.target.value)}
                  className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm font-mono font-bold text-slate-100 placeholder:text-slate-500 placeholder:font-normal"
                />
                <div className="flex gap-1 flex-wrap">
                  {[30, 45, 60, 90].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDurationInput(String(m))}
                      className={`px-2 py-1 rounded text-[10px] font-mono border ${
                        Number(durationInput) === m
                          ? 'bg-teal-500/20 border-teal-400 text-teal-200 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Intensidad */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span>3. Intensidad del Esfuerzo</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['light', 'moderate', 'intense'] as ExerciseIntensity[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setIntensityInput(lvl)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition ${
                      intensityInput === lvl
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {intensityLabels[lvl]}
                  </button>
                ))}
              </div>
            </div>

            {/* Calorías calculadas o personalizadas */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-amber-400" />
                  <span>4. Calorías del Ejercicio</span>
                </span>
                <span className="text-[10px] font-mono text-teal-300">
                  Auto: ~{calculateExerciseCalories(selectedSportId, effectiveDurationMinutes, intensityInput, weightKg)} kcal
                </span>
              </label>
              <input
                type="number"
                min={20}
                max={2500}
                placeholder={`Automático (~${calculateExerciseCalories(selectedSportId, effectiveDurationMinutes, intensityInput, weightKg)} kcal)`}
                value={customKcalInput}
                onChange={(e) => setCustomKcalInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 placeholder:text-slate-500"
              />
              <span className="text-[10px] text-slate-400 block">
                Dejalo vacío para cálculo automático por tu peso o escribí tus kcal fijas (ej. 350).
              </span>
            </div>
          </div>

          {/* Nombre opcional o grupo muscular inicial si es pesas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                Nombre personalizado o días (opcional):
              </label>
              <input
                type="text"
                placeholder={`Ej: ${selectedSportDef.name} (Lun, Mié y Vie)`}
                value={customLabelInput}
                onChange={(e) => setCustomLabelInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
              />
            </div>

            {/* Modo de Conteo de Calorías para la meta del día */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 block">
                ¿Cómo querés que cuente las calorías en tu meta diaria?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleChangeAccountingMode('add_when_done')}
                  className={`p-2 rounded-lg text-[11px] text-left border transition ${
                    accountingMode === 'add_when_done'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  ➕ Sumar kcal al marcar &quot;Hecho&quot; (Meta base sin ejercicio)
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeAccountingMode('subtract_when_missed')}
                  className={`p-2 rounded-lg text-[11px] text-left border transition ${
                    accountingMode === 'subtract_when_missed'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  ➖ Restar kcal si marco &quot;No hecho&quot; (Mi meta ya incluye rutina)
                </button>
              </div>
            </div>
          </div>

          {/* Resumen de calorías a comer post-ejercicio y botón de guardar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3">
            <div className="flex items-start gap-2 text-xs text-slate-300">
              <Info className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-teal-300">
                  {selectedSportDef.emoji} {selectedSportDef.name} ({durationInput} min • {intensityLabels[intensityInput]}):
                </span>{' '}
                Con tu peso de <strong>{weightKg} kg</strong>, tu cuerpo quema y requiere reponer aprox.{' '}
                <strong className="text-amber-300">{previewAutoKcal} kcal</strong> una vez hecho el ejercicio.
              </div>
            </div>

            <button
              type="button"
              id="btn-add-sport-to-routine"
              onClick={handleAddExerciseToRoutine}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shrink-0 transition"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Agregar a Mi Rutina ({previewAutoKcal} kcal)</span>
            </button>
          </div>
        </div>
      )}

      {/* Alerta de interacción Biomecánica: i-Port en Muslo + Deporte de Tren Inferior */}
      {isIPortOnLeg && (
        <div
          className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
            hasLowerBodyDoneToday
              ? 'bg-teal-950/40 border-teal-700/60 text-teal-200'
              : 'bg-slate-950 border-slate-800 text-slate-400'
          }`}
        >
          <Compass className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-teal-300 block">
              Interacción i-Port en Muslo (
              {settings.iPortState?.subSite
                ? settings.iPortState.subSite.replace(/_/g, ' ')
                : 'Pierna'}
              )
            </span>
            <p className="leading-relaxed">
              {hasLowerBodyDoneToday ? (
                <span>
                  Al hacer actividad que involucra las piernas (caminata, correr, fútbol, bici, natación o rutina de pierna), la{' '}
                  <strong>hiperemia muscular</strong> acelera el flujo sanguíneo en el muslo. La app toma esto en cuenta para tu absorción de insulina.
                </span>
              ) : (
                <span>
                  Tu puerto está en el muslo. En reposo la absorción es más lenta y sostenida, pero si entrenás piernas o caminás se activa la aceleración por flujo sanguíneo.
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
