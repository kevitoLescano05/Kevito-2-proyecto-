import {
  WorkoutRoutineType,
  UserSettings,
  SportId,
  ExerciseIntensity,
  CustomExerciseItem,
} from '../types';

export interface SportDefinition {
  id: SportId;
  name: string;
  emoji: string;
  metabolicType: 'strength_anaerobic' | 'aerobic' | 'mixed';
  isLowerBody: boolean;
  defaultDurationMinutes: number;
  mets: {
    light: number;
    moderate: number;
    intense: number;
  };
  glycemicImpactSummary: string;
}

/**
 * Catálogo inclusivo de 20 deportes y actividades físicas con sus equivalentes metabólicos (METs)
 * basados en el Compendium of Physical Activities para calcular cuántas calorías quema y necesita
 * reponer cada persona según su propio peso corporal y minutos de entrenamiento.
 */
export const SPORTS_CATALOG: SportDefinition[] = [
  {
    id: 'gym_weights',
    name: 'Gimnasio / Levantamiento de Pesas',
    emoji: '🏋️',
    metabolicType: 'strength_anaerobic',
    isLowerBody: false, // depende del grupo muscular (Pierna = true)
    defaultDurationMinutes: 60,
    mets: { light: 3.5, moderate: 5.0, intense: 6.5 },
    glycemicImpactSummary: 'Al principio puede subir un poco por adrenalina, y luego genera sensibilidad a la insulina por 12-24h.',
  },
  {
    id: 'walking',
    name: 'Caminata / Marcha',
    emoji: '🚶',
    metabolicType: 'aerobic',
    isLowerBody: true,
    defaultDurationMinutes: 40,
    mets: { light: 2.8, moderate: 3.8, intense: 5.0 },
    glycemicImpactSummary: 'Baja la glucosa de forma suave y constante sin elevar hormonas de estrés.',
  },
  {
    id: 'running',
    name: 'Correr / Running / Trote',
    emoji: '🏃',
    metabolicType: 'aerobic',
    isLowerBody: true,
    defaultDurationMinutes: 45,
    mets: { light: 7.0, moderate: 9.5, intense: 11.5 },
    glycemicImpactSummary: 'Alto consumo de glucosa en sangre durante la carrera y sensibilidad elevada por 12-18h.',
  },
  {
    id: 'swimming',
    name: 'Natación (Pileta / Aguas Abiertas)',
    emoji: '🏊',
    metabolicType: 'aerobic',
    isLowerBody: true,
    defaultDurationMinutes: 50,
    mets: { light: 5.5, moderate: 7.5, intense: 10.0 },
    glycemicImpactSummary: 'Involucra todo el cuerpo y el agua exige termorregulación: consume mucha glucosa rápida.',
  },
  {
    id: 'boxing_martial_arts',
    name: 'Boxeo / Artes Marciales / Kickboxing',
    emoji: '🥊',
    metabolicType: 'mixed',
    isLowerBody: true,
    defaultDurationMinutes: 60,
    mets: { light: 5.5, moderate: 8.0, intense: 10.5 },
    glycemicImpactSummary: 'Combina picos explosivos de adrenalina con gran vaciamiento de glucógeno muscular.',
  },
  {
    id: 'football',
    name: 'Fútbol (Fútbol 5 / 7 / 11)',
    emoji: '⚽',
    metabolicType: 'mixed',
    isLowerBody: true,
    defaultDurationMinutes: 60,
    mets: { light: 6.0, moderate: 8.0, intense: 10.0 },
    glycemicImpactSummary: 'Sprints intermitentes: puede subir en el partido por adrenalina y bajar fuerte en la noche.',
  },
  {
    id: 'cycling',
    name: 'Ciclismo / Bicicleta / Spinning',
    emoji: '🚴',
    metabolicType: 'aerobic',
    isLowerBody: true,
    defaultDurationMinutes: 50,
    mets: { light: 4.5, moderate: 7.0, intense: 9.5 },
    glycemicImpactSummary: 'Gran consumo aeróbico en cuádriceps y piernas; baja la glucemia de forma sostenida.',
  },
  {
    id: 'tennis_padel',
    name: 'Tenis / Pádel',
    emoji: '🎾',
    metabolicType: 'mixed',
    isLowerBody: true,
    defaultDurationMinutes: 60,
    mets: { light: 5.0, moderate: 7.0, intense: 8.5 },
    glycemicImpactSummary: 'Deporte intermitente de reacciones rápidas y gasto calórico sostenido.',
  },
  {
    id: 'basketball_volleyball',
    name: 'Básquet / Vóley / Handball',
    emoji: '🏀',
    metabolicType: 'mixed',
    isLowerBody: true,
    defaultDurationMinutes: 60,
    mets: { light: 5.0, moderate: 7.0, intense: 9.0 },
    glycemicImpactSummary: 'Saltos y carreras cortas: combina estímulo anaeróbico y consumo aeróbico.',
  },
  {
    id: 'crossfit_hiit',
    name: 'CrossFit / Funcional / HIIT',
    emoji: '🔥',
    metabolicType: 'strength_anaerobic',
    isLowerBody: true,
    defaultDurationMinutes: 50,
    mets: { light: 6.0, moderate: 8.5, intense: 11.0 },
    glycemicImpactSummary: 'Alta descarga inicial de lactato/adrenalina seguida de fuerte sensibilidad post-entreno.',
  },
  {
    id: 'dancing_zumba',
    name: 'Baile / Zumba / Danza',
    emoji: '💃',
    metabolicType: 'aerobic',
    isLowerBody: true,
    defaultDurationMinutes: 50,
    mets: { light: 4.0, moderate: 6.0, intense: 7.8 },
    glycemicImpactSummary: 'Actividad aeróbica continua que aumenta la captación muscular de glucosa.',
  },
  {
    id: 'yoga_pilates',
    name: 'Yoga / Pilates / Stretching',
    emoji: '🧘',
    metabolicType: 'aerobic',
    isLowerBody: false,
    defaultDurationMinutes: 50,
    mets: { light: 2.5, moderate: 3.3, intense: 4.2 },
    glycemicImpactSummary: 'Reduce el cortisol y el estrés, mejorando suavemente la sensibilidad a la insulina.',
  },
  {
    id: 'rowing_kayak',
    name: 'Remo / Kayak / Canotaje',
    emoji: '🚣',
    metabolicType: 'mixed',
    isLowerBody: false,
    defaultDurationMinutes: 45,
    mets: { light: 4.5, moderate: 7.0, intense: 9.5 },
    glycemicImpactSummary: 'Alto trabajo de espalda, brazos y torso con importante consumo de glucógeno.',
  },
  {
    id: 'hockey_skating',
    name: 'Hockey / Patinaje / Rollers',
    emoji: '🏑',
    metabolicType: 'mixed',
    isLowerBody: true,
    defaultDurationMinutes: 60,
    mets: { light: 5.5, moderate: 7.5, intense: 9.5 },
    glycemicImpactSummary: 'Intenso trabajo de tren inferior que acelera la absorción de insulina en piernas.',
  },
  {
    id: 'hiking_climbing',
    name: 'Senderismo / Trekking / Escalada',
    emoji: '🥾',
    metabolicType: 'aerobic',
    isLowerBody: true,
    defaultDurationMinutes: 90,
    mets: { light: 5.0, moderate: 6.8, intense: 8.5 },
    glycemicImpactSummary: 'Esfuerzo prolongado de larga duración; requiere reponer carbohidratos y calorías.',
  },
  {
    id: 'calisthenics',
    name: 'Calistenia / Barras / Gimnasia',
    emoji: '🤸',
    metabolicType: 'strength_anaerobic',
    isLowerBody: false,
    defaultDurationMinutes: 50,
    mets: { light: 3.8, moderate: 5.5, intense: 7.5 },
    glycemicImpactSummary: 'Fuerza con propio peso corporal: aumenta la sensibilidad muscular por 12-24h.',
  },
  {
    id: 'jump_rope',
    name: 'Saltar la Soga',
    emoji: '⚡',
    metabolicType: 'aerobic',
    isLowerBody: true,
    defaultDurationMinutes: 25,
    mets: { light: 7.5, moderate: 10.0, intense: 12.0 },
    glycemicImpactSummary: 'Quema muchas calorías y glucosa en pocos minutos.',
  },
  {
    id: 'rugby',
    name: 'Rugby',
    emoji: '🏉',
    metabolicType: 'mixed',
    isLowerBody: true,
    defaultDurationMinutes: 70,
    mets: { light: 6.0, moderate: 8.3, intense: 10.5 },
    glycemicImpactSummary: 'Fuerza de contacto y sprints: gran demanda calórica y sensibilidad tardía.',
  },
  {
    id: 'golf',
    name: 'Golf (Caminando el campo)',
    emoji: '⛳',
    metabolicType: 'aerobic',
    isLowerBody: true,
    defaultDurationMinutes: 120,
    mets: { light: 3.5, moderate: 4.3, intense: 5.0 },
    glycemicImpactSummary: 'Caminata prolongada de varias horas con descenso gradual de glucemia.',
  },
  {
    id: 'physical_work',
    name: 'Trabajo Físico / Movimiento Intenso',
    emoji: '🛠️',
    metabolicType: 'aerobic',
    isLowerBody: true,
    defaultDurationMinutes: 60,
    mets: { light: 3.5, moderate: 4.8, intense: 6.5 },
    glycemicImpactSummary: 'Gasto energético sostenido que aumenta la sensibilidad a la insulina del día.',
  },
];

export function getSportDefinition(sportId: SportId): SportDefinition {
  return SPORTS_CATALOG.find((s) => s.id === sportId) || SPORTS_CATALOG[0];
}

/**
 * Calcula las calorías reales quemadas (y por lo tanto las calorías extra que el cuerpo
 * necesita reponer con la comida para no perder peso ni sufrir hipoglucemias por vaciamiento de glucógeno)
 * usando la fórmula fisiológica: Kcal = MET * Peso(kg) * (Minutos / 60).
 */
export function calculateExerciseCalories(
  sportId: SportId,
  durationMinutes: number,
  intensity: ExerciseIntensity,
  weightKg: number = 65,
  customCaloriesOverride?: number
): number {
  if (typeof customCaloriesOverride === 'number' && customCaloriesOverride > 0) {
    return Math.round(customCaloriesOverride);
  }
  const sport = getSportDefinition(sportId);
  const safeWeight = weightKg > 20 ? weightKg : 65;
  const safeMinutes = durationMinutes > 0 ? durationMinutes : sport.defaultDurationMinutes;
  const metValue = sport.mets[intensity] || sport.mets.moderate;

  const rawKcal = metValue * safeWeight * (safeMinutes / 60);
  // Redondear a múltiplos de 5 kcal para lectura limpia
  return Math.max(20, Math.round(rawKcal / 5) * 5);
}

/**
 * Determina la rutina sugerida por defecto según el día de la semana (para quienes eligen dividir pesas por grupo muscular)
 */
export function getScheduleDefaultRoutine(date: Date = new Date()): WorkoutRoutineType {
  const day = date.getDay();
  switch (day) {
    case 1: // Lunes
    case 4: // Jueves
      return 'chest_back';
    case 2: // Martes
    case 5: // Viernes
      return 'arms';
    case 3: // Miércoles
      return 'legs';
    case 6: // Sábado
    case 0: // Domingo
    default:
      return 'rest';
  }
}

/**
 * Retorna la etiqueta amigable del grupo muscular
 */
export function getRoutineLabel(routine: WorkoutRoutineType): string {
  switch (routine) {
    case 'chest_back':
      return 'Pecho y Espalda';
    case 'arms':
      return 'Brazos / Hombros';
    case 'legs':
      return 'Piernas / Tren Inferior';
    case 'weekend_extra':
      return 'Cuerpo Completo / Mixto';
    case 'rest':
      return 'General';
  }
}

/**
 * Retorna la descripción de días sugeridos para el grupo muscular
 */
export function getRoutineScheduleNote(routine: WorkoutRoutineType): string {
  switch (routine) {
    case 'chest_back':
      return 'Tren Superior (Torso)';
    case 'arms':
      return 'Tren Superior (Brazos)';
    case 'legs':
      return 'Tren Inferior (Piernas)';
    case 'weekend_extra':
      return 'Full Body';
    case 'rest':
      return 'Recuperación';
  }
}

/**
 * Obtiene el objetivo calórico dinámico ajustado en tiempo real según la rutina propia que armó el usuario:
 * - Modo 'add_when_done' (Por defecto para rutinas personalizadas):
 *   La meta calórica base es el requerimiento basal/sin deporte, y cada vez que el usuario marca un deporte
 *   de su rutina como "Hecho", se SUMAN (+kcal) las calorías quemadas por ese deporte según su peso y duración.
 * - Modo 'subtract_when_missed':
 *   La meta calórica base ya incluye el entrenamiento habitual del día, por lo que si marca "Hecho" se mantiene
 *   la meta completa, y si marca "No hecho" se RESTAN (-kcal) las calorías no gastadas.
 */
export function getCalculatedCalorieGoal(settings: UserSettings): {
  goal: number;
  baseGoal: number;
  adjustmentKcal: number;
  explanation: string;
  isAdjusted: boolean;
  burnedTodayKcal: number;
} {
  const isWeekday = settings.dayType === 'weekday';
  const baseGoal = isWeekday ? settings.weekdayCalorieGoal : settings.weekendCalorieGoal;
  const workout = settings.dailyWorkout;
  const weightKg = settings.weightKg || 65;

  if (!workout) {
    return {
      goal: baseGoal,
      baseGoal,
      adjustmentKcal: 0,
      explanation: isWeekday ? 'Meta base del día' : 'Meta base de fin de semana',
      isAdjusted: false,
      burnedTodayKcal: 0,
    };
  }

  const customItems: CustomExerciseItem[] = workout.customRoutineItems || [];
  const mode = workout.calorieAccountingMode || 'add_when_done';

  // Si el usuario tiene su propia rutina armada en la app (Opción 1)
  if (customItems.length > 0) {
    let adjustment = 0;
    let burnedTodayKcal = 0;
    const reasons: string[] = [];

    for (const item of customItems) {
      const sportDef = getSportDefinition(item.sportId);
      const itemKcal = calculateExerciseCalories(
        item.sportId,
        item.durationMinutes,
        item.intensity,
        weightKg,
        item.customCaloriesOverride
      );
      const label = item.customLabel || sportDef.name;

      if (item.doneStatus === true) {
        burnedTodayKcal += itemKcal;
        if (mode === 'add_when_done') {
          adjustment += itemKcal;
          reasons.push(`${label} Hecho (+${itemKcal} kcal)`);
        } else {
          reasons.push(`${label} Hecho (cumplido)`);
        }
      } else if (item.doneStatus === false) {
        if (mode === 'subtract_when_missed') {
          adjustment -= itemKcal;
          reasons.push(`Sin ${label} (-${itemKcal} kcal)`);
        }
      }
    }

    const finalGoal = Math.max(1200, baseGoal + adjustment);

    return {
      goal: finalGoal,
      baseGoal,
      adjustmentKcal: adjustment,
      explanation:
        reasons.length > 0
          ? reasons.join(' • ')
          : mode === 'add_when_done'
          ? 'Marcá "Hecho" en tu rutina para sumar las calorías del ejercicio'
          : 'Meta con rutina incluida (se resta si marcás "No hecho")',
      isAdjusted: adjustment !== 0,
      burnedTodayKcal,
    };
  }

  // Fallback de compatibilidad si aún no agregó ítems a customRoutineItems pero tocó estados previos
  let adjustment = 0;
  let burnedTodayKcal = 0;
  const reasons: string[] = [];

  if (isWeekday) {
    if (workout.weightsDone === false) {
      adjustment -= 350;
      reasons.push('Sin entrenamiento (-350 kcal)');
    } else if (workout.weightsDone === true) {
      burnedTodayKcal += 350;
    }
    if (workout.walkDone === false) {
      adjustment -= 150;
      reasons.push('Sin caminata (-150 kcal)');
    } else if (workout.walkDone === true) {
      burnedTodayKcal += 150;
    }
  } else {
    if (workout.weekendActivity === 'walk' || workout.walkDone === true) {
      adjustment += 250;
      burnedTodayKcal += 250;
      reasons.push('Caminata (+250 kcal)');
    } else if (workout.weekendActivity === 'bike') {
      adjustment += 300;
      burnedTodayKcal += 300;
      reasons.push('Bicicleta (+300 kcal)');
    }
  }

  const finalGoal = Math.max(1200, baseGoal + adjustment);

  return {
    goal: finalGoal,
    baseGoal,
    adjustmentKcal: adjustment,
    explanation:
      reasons.length > 0
        ? reasons.join(' • ')
        : 'Armá tu rutina personalizada de deportes para calcular tus calorías',
    isAdjusted: adjustment !== 0,
    burnedTodayKcal,
  };
}
