import { ActiveGlycemicFactorId, UserSettings } from '../types';
import { SPORTS_CATALOG } from './workoutSchedule';

function roundToStep(value: number, step: number = 0.5): number {
  const safeStep = step > 0 ? step : 0.5;
  return Math.round((Math.round(value / safeStep) * safeStep) * 100) / 100;
}

export interface ActionableGlycemicFactor {
  id: ActiveGlycemicFactorId;
  name: string;
  shortName: string;
  emoji: string;
  category: 'exercise' | 'lifestyle' | 'biological' | 'environment';
  effectSummary: string; // Ej. "Subida inicial leve → Sensibilidad alta 12-24h (↓ Glucosa)"
  directionTone: 'amber' | 'rose' | 'teal' | 'indigo';
  defaultDoseAdjustmentPercent: {
    minPercent: number; // negativo = reducir insulina, positivo = aumentar insulina
    maxPercent: number;
  };
  physiologicalExplanation: string;
  clinicalAdviceTemplate: (baseBolus: number, roundStep: number) => {
    headline: string;
    recommendedRangeText: string;
    detailedWarning: string;
  };
}

export interface BolusFactorAdvisory {
  id: string;
  factorId: ActiveGlycemicFactorId;
  name: string;
  emoji: string;
  tone: 'amber' | 'rose' | 'teal' | 'indigo';
  badgeText: string;
  physiologicalExplanation: string;
  headline: string;
  recommendedRangeText: string;
  detailedWarning: string;
  isAutoLinkedFromWorkout?: boolean;
}

export interface Factor42CatalogItem {
  number: number;
  name: string;
  effectArrow: '↑' | '↓' | '↑↓' | '⚡';
  effectLabel: string;
  explanation: string;
  practicalTip: string;
}

export interface Factor42CategoryGroup {
  id: string;
  title: string;
  emoji: string;
  description: string;
  factors: Factor42CatalogItem[];
}

/**
 * Catálogo de los 12 factores accionables principales que el usuario puede confirmar
 * haber hecho o estar atravesando hoy para recibir un aviso orientativo al aplicar insulina.
 */
export const ACTIONABLE_GLYCEMIC_FACTORS: ActionableGlycemicFactor[] = [
  {
    id: 'strength_training',
    name: 'Entrenamiento de Fuerza / Pesas / Boxeo Explosivo',
    shortName: 'Fuerza / Pesas',
    emoji: '🏋️',
    category: 'exercise',
    effectSummary: '1º Sube un poco por adrenalina → 2º Aumenta sensibilidad a la insulina por 12-24h',
    directionTone: 'amber',
    defaultDoseAdjustmentPercent: { minPercent: -25, maxPercent: -15 },
    physiologicalExplanation:
      'Al entrenar fuerza o deportes explosivos, el cuerpo libera adrenalina y lactato que le piden al hígado soltar glucosa (por eso al principio puede subir un poco). Pero después, el músculo abre sus receptores GLUT4 para rellenar sus depósitos de glucógeno, volviéndote mucho más sensible a la insulina durante las siguientes 12 a 24 horas.',
    clinicalAdviceTemplate: (baseBolus, roundStep) => {
      if (baseBolus <= 0) {
        return {
          headline: 'Aviso por Entrenamiento de Fuerza',
          recommendedRangeText: 'Recomendable considerar un 15% a 25% MENOS de insulina en la comida post-entreno.',
          detailedWarning:
            'Si ves la glucosa un poco alta apenas terminás de entrenar, tené cuidado con corregirla de más porque es glucogenólisis temporal por adrenalina. En la comida posterior al entrenamiento, tus músculos van a absorber glucosa rápidamente.',
        };
      }
      const cutMin = Math.max(0.5, roundToStep(baseBolus * 0.15, roundStep === 1 ? 0.5 : roundStep));
      const cutMax = Math.max(cutMin, roundToStep(baseBolus * 0.25, roundStep === 1 ? 0.5 : roundStep));
      const suggestedLow = Math.max(0, roundToStep(baseBolus - cutMax, roundStep));
      const suggestedHigh = Math.max(0, roundToStep(baseBolus - cutMin, roundStep));
      return {
        headline: 'Consejo para tu Bolo tras Entrenar Fuerza',
        recommendedRangeText:
          suggestedLow === suggestedHigh
            ? `Sobre tu bolo normal de ${baseBolus} U, es recomendable considerar aplicar aprox. ${cutMin} U MENOS (alrededor de ${suggestedLow} U).`
            : `Sobre tu bolo normal de ${baseBolus} U, es recomendable considerar aplicar entre ${cutMin} U y ${cutMax} U MENOS (quedando aprox. entre ${suggestedLow} U y ${suggestedHigh} U).`,
        detailedWarning:
          'Si recién terminaste de entrenar y te subió un poco la glucosa por la adrenalina del esfuerzo, no la sobre-corrijas. En las horas siguientes tus músculos tienen alta sensibilidad a la insulina para reponer glucógeno.',
      };
    },
  },
  {
    id: 'aerobic_exercise',
    name: 'Ejercicio Aeróbico (Natación, Correr, Fútbol, Bici, Caminata)',
    shortName: 'Deporte Aeróbico',
    emoji: '🏃',
    category: 'exercise',
    effectSummary: 'Baja la glucosa durante el ejercicio y aumenta la sensibilidad por 6-18h',
    directionTone: 'teal',
    defaultDoseAdjustmentPercent: { minPercent: -35, maxPercent: -20 },
    physiologicalExplanation:
      'El ejercicio aeróbico continuo hace que los músculos consuman glucosa directamente de la sangre sin siquiera necesitar tanta insulina, y acelera la absorción de la insulina inyectada por mayor circulación sanguínea.',
    clinicalAdviceTemplate: (baseBolus, roundStep) => {
      if (baseBolus <= 0) {
        return {
          headline: 'Aviso por Deporte Aeróbico',
          recommendedRangeText: 'Recomendable considerar un 20% a 35% MENOS de insulina antes o después del deporte.',
          detailedWarning:
            'El ejercicio aeróbico consume glucosa circulante de forma directa y multiplica el efecto de la insulina activa.',
        };
      }
      const cutMin = Math.max(0.5, roundToStep(baseBolus * 0.20, roundStep === 1 ? 0.5 : roundStep));
      const cutMax = Math.max(cutMin, roundToStep(baseBolus * 0.35, roundStep === 1 ? 0.5 : roundStep));
      const suggestedLow = Math.max(0, roundToStep(baseBolus - cutMax, roundStep));
      const suggestedHigh = Math.max(0, roundToStep(baseBolus - cutMin, roundStep));
      return {
        headline: 'Consejo para tu Bolo por Ejercicio Aeróbico',
        recommendedRangeText:
          suggestedLow === suggestedHigh
            ? `Sobre tu bolo habitual de ${baseBolus} U, es recomendable considerar aplicar aprox. ${cutMin} U MENOS (alrededor de ${suggestedLow} U).`
            : `Sobre tu bolo habitual de ${baseBolus} U, es recomendable considerar aplicar entre ${cutMin} U y ${cutMax} U MENOS (alrededor de ${suggestedLow} U a ${suggestedHigh} U).`,
        detailedWarning:
          'Tanto si comés antes de salir a entrenar como en la comida de recuperación posterior, tus músculos siguen captando glucosa de la sangre para reponer energía.',
      };
    },
  },
  {
    id: 'alcohol',
    name: 'Consumo de Alcohol (Cerveza, Vino, Tragos)',
    shortName: 'Tomé Alcohol',
    emoji: '🍺',
    category: 'lifestyle',
    effectSummary: 'El hígado se ocupa de limpiar el alcohol y deja vía libre a la insulina (Riesgo Hipo Tardía)',
    directionTone: 'rose',
    defaultDoseAdjustmentPercent: { minPercent: -30, maxPercent: -20 },
    physiologicalExplanation:
      'Un tiempo después de tomar alcohol, el hígado se centra al 100% en eliminar ese alcohol del cuerpo y bloquea su liberación natural de glucosa de emergencia (gluconeogénesis). Esto deja vía libre para que la insulina actúe sin control, pudiendo causar hipoglucemias fuertes horas después o mientras dormís.',
    clinicalAdviceTemplate: (baseBolus, roundStep) => {
      if (baseBolus <= 0) {
        return {
          headline: '¡Cuidado Importante por Consumo de Alcohol!',
          recommendedRangeText: 'Evitá aplicar correcciones de insulina aisladas y considerá reducir un 20% a 30% el bolo de comida.',
          detailedWarning:
            'Mientras tu hígado metaboliza el alcohol, no puede defenderte de un bajón de azúcar. Nunca cuentes los carbohidratos de bebidas alcohólicas al 100% como comida común.',
        };
      }
      const cutMin = Math.max(0.5, roundToStep(baseBolus * 0.20, roundStep === 1 ? 0.5 : roundStep));
      const cutMax = Math.max(cutMin, roundToStep(baseBolus * 0.30, roundStep === 1 ? 0.5 : roundStep));
      const suggestedLow = Math.max(0, roundToStep(baseBolus - cutMax, roundStep));
      const suggestedHigh = Math.max(0, roundToStep(baseBolus - cutMin, roundStep));
      return {
        headline: 'Aviso Crítico al Aplicar Insulina con Alcohol',
        recommendedRangeText:
          suggestedLow === suggestedHigh
            ? `Sobre tu bolo calculado de ${baseBolus} U, se aconseja considerar aplicar aprox. ${cutMin} U MENOS (alrededor de ${suggestedLow} U) y NO corregir de noche.`
            : `Sobre tu bolo calculado de ${baseBolus} U, se aconseja considerar aplicar entre ${cutMin} U y ${cutMax} U MENOS (alrededor de ${suggestedLow} U a ${suggestedHigh} U).`,
        detailedWarning:
          'No apliques insulina para cubrir el alcohol en sí (solo la comida sólida, y con prudencia). Antes de dormir, es más seguro acostarse con un valor un poco más alto (130-160 mg/dL) o comer algo con carbohidratos lentos sin insulina.',
      };
    },
  },
  {
    id: 'illness_fever',
    name: 'Enfermedad, Infección, Gripe o Fiebre',
    shortName: 'Enfermedad / Fiebre',
    emoji: '🤒',
    category: 'biological',
    effectSummary: 'Hormonas de defensa generan fuerte resistencia a la insulina (↑ Glucosa)',
    directionTone: 'amber',
    defaultDoseAdjustmentPercent: { minPercent: 15, maxPercent: 30 },
    physiologicalExplanation:
      'Cuando tenés una infección, resfrío fuerte o fiebre, el cuerpo libera cortisol y adrenalina para combatir el virus o bacteria. Esas hormonas bloquean la acción de la insulina y hacen que el hígado libere glucosa constantemente.',
    clinicalAdviceTemplate: (baseBolus, roundStep) => {
      if (baseBolus <= 0) {
        return {
          headline: 'Aviso por Enfermedad o Fiebre',
          recommendedRangeText: 'Suele requerirse considerar entre un 15% y 30% MÁS de insulina en días de fiebre o infección.',
          detailedWarning:
            'Tomá abundante agua y nunca suspendas tu insulina basal aunque comas poco.',
        };
      }
      const addMin = Math.max(0.5, roundToStep(baseBolus * 0.15, roundStep === 1 ? 0.5 : roundStep));
      const addMax = Math.max(addMin, roundToStep(baseBolus * 0.30, roundStep === 1 ? 0.5 : roundStep));
      const suggestedLow = roundToStep(baseBolus + addMin, roundStep);
      const suggestedHigh = roundToStep(baseBolus + addMax, roundStep);
      return {
        headline: 'Consejo por Resistencia durante Enfermedad / Fiebre',
        recommendedRangeText:
          suggestedLow === suggestedHigh
            ? `Sobre tu bolo habitual de ${baseBolus} U, suele ser recomendable considerar aprox. +${addMin} U MÁS (alrededor de ${suggestedLow} U).`
            : `Sobre tu bolo habitual de ${baseBolus} U, suele ser recomendable considerar entre +${addMin} U y +${addMax} U MÁS (alrededor de ${suggestedLow} U a ${suggestedHigh} U).`,
        detailedWarning:
          'Las hormonas de defensa frenan la insulina. Hidratate muy bien y controlá tu glucosa más seguido.',
      };
    },
  },
  {
    id: 'acute_stress',
    name: 'Estrés Fuerte, Nervios, Examen o Discusión',
    shortName: 'Estrés / Nervios',
    emoji: '😰',
    category: 'lifestyle',
    effectSummary: 'El cortisol y la adrenalina suben la glucosa y frenan la insulina (↑ Glucosa)',
    directionTone: 'amber',
    defaultDoseAdjustmentPercent: { minPercent: 10, maxPercent: 20 },
    physiologicalExplanation:
      'El estrés mental agudo o los nervios activan la respuesta de "lucha o huida": el cuerpo suelta adrenalina y cortisol, volcando glucosa del hígado a la sangre y restándole fuerza a tu insulina.',
    clinicalAdviceTemplate: (baseBolus, roundStep) => {
      if (baseBolus <= 0) {
        return {
          headline: 'Aviso por Estrés o Nervios',
          recommendedRangeText: 'Recomendable considerar entre un 10% y 20% MÁS de insulina si la subida por estrés se mantiene.',
          detailedWarning: 'Tené en cuenta que cuando pasa el momento de nervios (ej. tras rendir un examen), la glucosa puede bajar sola.',
        };
      }
      const addMin = Math.max(0.5, roundToStep(baseBolus * 0.10, roundStep === 1 ? 0.5 : roundStep));
      const addMax = Math.max(addMin, roundToStep(baseBolus * 0.20, roundStep === 1 ? 0.5 : roundStep));
      const suggestedLow = roundToStep(baseBolus + addMin, roundStep);
      const suggestedHigh = roundToStep(baseBolus + addMax, roundStep);
      return {
        headline: 'Consejo por Pico de Estrés / Cortisol',
        recommendedRangeText:
          suggestedLow === suggestedHigh
            ? `Sobre tu bolo de ${baseBolus} U, se puede considerar aplicar aprox. +${addMin} U MÁS (alrededor de ${suggestedLow} U).`
            : `Sobre tu bolo de ${baseBolus} U, se puede considerar aplicar entre +${addMin} U y +${addMax} U MÁS (alrededor de ${suggestedLow} U a ${suggestedHigh} U).`,
        detailedWarning:
          'Actuá con prudencia: si el estrés es pasajero (como antes de una competencia o examen), al relajarte vuelve la sensibilidad normal.',
      };
    },
  },
  {
    id: 'poor_sleep',
    name: 'Dormí Mal / Menos de 6 Horas de Sueño',
    shortName: 'Mal Sueño (<6h)',
    emoji: '😴',
    category: 'lifestyle',
    effectSummary: 'Dormir poco reduce la sensibilidad a la insulina un 15% a 25% al día siguiente (↑ Glucosa)',
    directionTone: 'indigo',
    defaultDoseAdjustmentPercent: { minPercent: 10, maxPercent: 20 },
    physiologicalExplanation:
      'Una sola noche durmiendo menos de 6 horas o con sueño cortado deja elevado el cortisol matutino y hace que las células respondan más lento a la insulina durante la mañana y el mediodía.',
    clinicalAdviceTemplate: (baseBolus, roundStep) => {
      if (baseBolus <= 0) {
        return {
          headline: 'Aviso por Falta de Sueño',
          recommendedRangeText: 'Suele ser recomendable considerar entre un 10% y 20% MÁS de insulina, sobre todo en desayuno y almuerzo.',
          detailedWarning: 'La falta de descanso genera resistencia a la insulina temporal durante el día.',
        };
      }
      const addMin = Math.max(0.5, roundToStep(baseBolus * 0.10, roundStep === 1 ? 0.5 : roundStep));
      const addMax = Math.max(addMin, roundToStep(baseBolus * 0.20, roundStep === 1 ? 0.5 : roundStep));
      const suggestedLow = roundToStep(baseBolus + addMin, roundStep);
      const suggestedHigh = roundToStep(baseBolus + addMax, roundStep);
      return {
        headline: 'Consejo por Resistencia tras Dormir Poco',
        recommendedRangeText:
          suggestedLow === suggestedHigh
            ? `Sobre tu bolo de ${baseBolus} U, es recomendable considerar aprox. +${addMin} U MÁS (alrededor de ${suggestedLow} U).`
            : `Sobre tu bolo de ${baseBolus} U, es recomendable considerar entre +${addMin} U y +${addMax} U MÁS (alrededor de ${suggestedLow} U a ${suggestedHigh} U).`,
        detailedWarning:
          'Dar unos 5 minutos extra de espera antes de empezar a comer también ayuda a compensar la lentitud de la insulina tras dormir mal.',
      };
    },
  },
  {
    id: 'menstrual_hormones',
    name: 'Ciclo Menstrual (Días previos / Fase Lútea) o Cambios Hormonales',
    shortName: 'Hormonas / Ciclo',
    emoji: '🩸',
    category: 'biological',
    effectSummary: 'La progesterona premenstrual genera resistencia a la insulina (↑ Glucosa)',
    directionTone: 'indigo',
    defaultDoseAdjustmentPercent: { minPercent: 10, maxPercent: 25 },
    physiologicalExplanation:
      'En los días previos a la menstruación (fase lútea), el aumento de progesterona disminuye la sensibilidad a la insulina. Al comenzar el sangrado, las hormonas bajan rápido y vuelve la sensibilidad de golpe.',
    clinicalAdviceTemplate: (baseBolus, roundStep) => {
      if (baseBolus <= 0) {
        return {
          headline: 'Aviso por Fase Hormonal / Premenstrual',
          recommendedRangeText: 'En días premenstruales suele requerirse un 10% a 25% MÁS de insulina.',
          detailedWarning: 'Apenas comienza el período, recordá volver a tu dosis habitual porque la sensibilidad regresa rápido.',
        };
      }
      const addMin = Math.max(0.5, roundToStep(baseBolus * 0.10, roundStep === 1 ? 0.5 : roundStep));
      const addMax = Math.max(addMin, roundToStep(baseBolus * 0.25, roundStep === 1 ? 0.5 : roundStep));
      const suggestedLow = roundToStep(baseBolus + addMin, roundStep);
      const suggestedHigh = roundToStep(baseBolus + addMax, roundStep);
      return {
        headline: 'Consejo por Resistencia Hormonal',
        recommendedRangeText:
          suggestedLow === suggestedHigh
            ? `Sobre tu bolo de ${baseBolus} U, en fase de resistencia hormonal se suele considerar aprox. +${addMin} U MÁS (${suggestedLow} U).`
            : `Sobre tu bolo de ${baseBolus} U, en fase de resistencia hormonal se suele considerar entre +${addMin} U y +${addMax} U MÁS (${suggestedLow} U a ${suggestedHigh} U).`,
        detailedWarning:
          'Si ya estás en el día 1 o 2 del sangrado menstrual, no aumentes la dosis porque la resistencia cae bruscamente.',
      };
    },
  },
  {
    id: 'steroids_meds',
    name: 'Corticoides o Medicación que Sube la Glucosa',
    shortName: 'Corticoides / Meds',
    emoji: '💊',
    category: 'biological',
    effectSummary: 'Fuerte resistencia a la insulina y liberación hepática de glucosa (↑↑ Glucosa)',
    directionTone: 'rose',
    defaultDoseAdjustmentPercent: { minPercent: 25, maxPercent: 50 },
    physiologicalExplanation:
      'Los corticoides (prednisona, dexametasona, betametasona, infiltraciones) bloquean la entrada de glucosa al músculo y obligan al hígado a fabricar más azúcar, sobre todo entre el mediodía y la noche.',
    clinicalAdviceTemplate: (baseBolus, roundStep) => {
      if (baseBolus <= 0) {
        return {
          headline: 'Aviso Importante por Uso de Corticoides',
          recommendedRangeText: 'Los corticoides suelen requerir entre un 25% y 50% MÁS de insulina (consultá tu pauta médica).',
          detailedWarning: 'El pico máximo de subida de los corticoides tomados a la mañana suele darse después del almuerzo y en la cena.',
        };
      }
      const addMin = Math.max(0.5, roundToStep(baseBolus * 0.25, roundStep === 1 ? 0.5 : roundStep));
      const addMax = Math.max(addMin, roundToStep(baseBolus * 0.45, roundStep === 1 ? 0.5 : roundStep));
      const suggestedLow = roundToStep(baseBolus + addMin, roundStep);
      const suggestedHigh = roundToStep(baseBolus + addMax, roundStep);
      return {
        headline: 'Consejo por Efecto de Corticoides',
        recommendedRangeText:
          suggestedLow === suggestedHigh
            ? `Sobre tu bolo normal de ${baseBolus} U, bajo efecto de corticoides suele requerirse considerar aprox. +${addMin} U MÁS (${suggestedLow} U).`
            : `Sobre tu bolo normal de ${baseBolus} U, bajo efecto de corticoides suele requerirse considerar entre +${addMin} U y +${addMax} U MÁS (${suggestedLow} U a ${suggestedHigh} U).`,
        detailedWarning:
          'Consultá siempre con tu médico diabetólogo el esquema de ajuste mientras dure el tratamiento con corticoides.',
      };
    },
  },
  {
    id: 'extreme_heat',
    name: 'Calor Extremo o Ducha Caliente tras Inyectar',
    shortName: 'Calor / Ducha Caliente',
    emoji: '🥵',
    category: 'environment',
    effectSummary: 'El calor dilata los vasos de la piel y acelera de golpe la insulina (⚡↓ Riesgo Hipo)',
    directionTone: 'teal',
    defaultDoseAdjustmentPercent: { minPercent: -15, maxPercent: -10 },
    physiologicalExplanation:
      'Las altas temperaturas o bañarse con agua caliente justo después de aplicarse insulina producen vasodilatación en la piel: la insulina entra a la sangre mucho más rápido de lo habitual y puede provocar un bajón brusco antes de que se digiera la comida.',
    clinicalAdviceTemplate: (baseBolus, roundStep) => {
      const cutMin = Math.max(0.5, roundToStep(baseBolus * 0.10, roundStep === 1 ? 0.5 : roundStep));
      const suggested = Math.max(0, roundToStep(baseBolus - cutMin, roundStep));
      return {
        headline: 'Consejo por Calor o Ducha Caliente',
        recommendedRangeText:
          baseBolus > 0
            ? `Evitá bañarte con agua caliente recién inyectado y considerá reducir ~10%-15% (aprox. -${cutMin} U, quedando en ${suggested} U) o esperar menos tiempo antes de comer.`
            : 'Evitá ducharte con agua caliente justo después de inyectar insulina y considerá un 10%-15% menos de dosis en días de calor extremo.',
        detailedWarning:
          'Con el calor la insulina hace pico antes de tiempo. No hagas esperas largas entre el pinchazo y el primer bocado.',
      };
    },
  },
  {
    id: 'dehydration',
    name: 'Deshidratación / Tomé Muy Poca Agua Hoy',
    shortName: 'Deshidratación',
    emoji: '💧',
    category: 'environment',
    effectSummary: 'Concentra el azúcar en sangre y retrasa la circulación de la insulina (↑ Glucosa)',
    directionTone: 'amber',
    defaultDoseAdjustmentPercent: { minPercent: 0, maxPercent: 10 },
    physiologicalExplanation:
      'Cuando te falta agua, hay menos volumen líquido en la sangre (por lo que la glucosa se concentra y marca más alto) y además la piel tiene menos riego sanguíneo, haciendo que la insulina inyectada tarde más en absorberse.',
    clinicalAdviceTemplate: () => ({
      headline: 'Consejo por Deshidratación: ¡Agua Antes de Sobre-corregir!',
      recommendedRangeText:
        'Antes de sumar insulina extra, tomá 2 vasos grandes de agua (400-500 ml). No apliques correcciones repetidas porque la insulina previa puede estar retenida y actuar toda junta al hidratarte.',
      detailedWarning:
        'Tomar agua diluye la concentración de glucosa por vía renal y reactiva el flujo sanguíneo subcutáneo para que tu bolo funcione bien.',
    }),
  },
  {
    id: 'caffeine_high',
    name: 'Exceso de Cafeína (Café Fuerte o mucho Mate en ayunas)',
    shortName: 'Mucha Cafeína',
    emoji: '☕',
    category: 'lifestyle',
    effectSummary: 'La cafeína alta libera adrenalina leve y frena un poco la insulina (↑ leve)',
    directionTone: 'indigo',
    defaultDoseAdjustmentPercent: { minPercent: 5, maxPercent: 12 },
    physiologicalExplanation:
      'El consumo alto de cafeína estimula una pequeña descarga de adrenalina que libera algo de glucosa del hígado y reduce temporalmente la sensibilidad a la insulina por 2 a 3 horas.',
    clinicalAdviceTemplate: (baseBolus, roundStep) => {
      const addUnits = Math.max(0.5, roundToStep(Math.max(0.5, baseBolus * 0.10), roundStep === 1 ? 0.5 : roundStep));
      return {
        headline: 'Consejo por Efecto de la Cafeína',
        recommendedRangeText:
          baseBolus > 0
            ? `Si notás que el café fuerte o el mate te suben la glucosa, suele considerarse sumar aprox. +${addUnits} U (un ~10% extra).`
            : 'En personas sensibles a la cafeína en ayunas, a veces se requiere considerar +0.5 U a +1.0 U para cubrir el estímulo hepático.',
        detailedWarning:
          'No a todas las personas les afecta igual, pero en ayunas su efecto hiperglucemiante suele ser más notorio.',
      };
    },
  },
  {
    id: 'dawn_phenomenon',
    name: 'Fenómeno del Alba / Subida al Despertar ("Pies en el Suelo")',
    shortName: 'Fenómeno del Alba',
    emoji: '🌅',
    category: 'biological',
    effectSummary: 'Pico natural de cortisol y hormona de crecimiento a la mañana (↑ Glucosa)',
    directionTone: 'indigo',
    defaultDoseAdjustmentPercent: { minPercent: 10, maxPercent: 20 },
    physiologicalExplanation:
      'Al despertar y poner los pies en el suelo, el cuerpo libera cortisol y hormona de crecimiento para darte energía para arrancar el día. Esto genera resistencia matutina a la insulina y sube la glucosa aunque estés en ayunas.',
    clinicalAdviceTemplate: (baseBolus, roundStep) => {
      const addMin = Math.max(0.5, roundToStep(baseBolus * 0.10, roundStep === 1 ? 0.5 : roundStep));
      const addMax = Math.max(addMin, roundToStep(baseBolus * 0.20, roundStep === 1 ? 0.5 : roundStep));
      return {
        headline: 'Consejo para el Fenómeno del Alba Matutino',
        recommendedRangeText:
          baseBolus > 0
            ? `En la primera comida de la mañana suele ser recomendable considerar entre +${addMin} U y +${addMax} U MÁS (10% a 20% extra) y respetar bien los minutos de espera pre-bolo.`
            : 'A la mañana temprano el cuerpo tiene más resistencia natural; suele requerirse un ratio más estricto o +10% a +20% en el desayuno.',
        detailedWarning:
          'Aplicar el bolo del desayuno unos 15-20 minutos antes de comer (si la glucemia está en rango) frena muy bien el pico matutino.',
      };
    },
  },
];

/**
 * Evalúa qué factores de los 42 están activos hoy (ya sea marcados manualmente por el usuario
 * o detectados automáticamente porque marcó "Hecho" en un deporte de su rutina de hoy)
 * y devuelve los avisos/consejos orientativos para mostrar al momento de calcular/aplicar insulina.
 */
export function evaluateActiveGlycemicFactorsForBolus(
  baseBolusUnits: number,
  settings: UserSettings
): BolusFactorAdvisory[] {
  const workout = settings.dailyWorkout;
  const manualFactors: ActiveGlycemicFactorId[] = workout?.activeGlycemicFactors || [];
  const customItems = workout?.customRoutineItems || [];
  const roundStep = settings.roundDoseTo || 0.5;

  // Detectar si completó deportes de fuerza o aeróbicos en su rutina personalizada
  let autoStrengthSportName: string | null = null;
  let autoAerobicSportName: string | null = null;

  for (const item of customItems) {
    if (item.doneStatus === true) {
      const sportDef = SPORTS_CATALOG.find((s) => s.id === item.sportId);
      const label = item.customLabel || sportDef?.name || 'Ejercicio';
      if (sportDef?.metabolicType === 'strength_anaerobic') {
        autoStrengthSportName = label;
      } else if (sportDef?.metabolicType === 'aerobic') {
        autoAerobicSportName = label;
      } else if (sportDef?.metabolicType === 'mixed') {
        autoStrengthSportName = autoStrengthSportName || label;
        autoAerobicSportName = autoAerobicSportName || label;
      }
    }
  }

  // Compatibilidad por si usó el estado anterior weightsDone / walkDone sin ítems personalizados
  if (customItems.length === 0 && workout) {
    if (workout.weightsDone === true) {
      autoStrengthSportName = 'Levantamiento de Pesas';
    }
    if (workout.walkDone === true || workout.weekendActivity === 'walk' || workout.weekendActivity === 'bike') {
      autoAerobicSportName = workout.weekendActivity === 'bike' ? 'Bicicleta' : 'Caminata';
    }
  }

  const effectiveFactorIds = new Set<ActiveGlycemicFactorId>(manualFactors);
  if (autoStrengthSportName) effectiveFactorIds.add('strength_training');
  if (autoAerobicSportName) effectiveFactorIds.add('aerobic_exercise');

  const advisories: BolusFactorAdvisory[] = [];

  for (const factorDef of ACTIONABLE_GLYCEMIC_FACTORS) {
    if (!effectiveFactorIds.has(factorDef.id)) continue;

    const isAutoStrength =
      factorDef.id === 'strength_training' &&
      !manualFactors.includes('strength_training') &&
      Boolean(autoStrengthSportName);
    const isAutoAerobic =
      factorDef.id === 'aerobic_exercise' &&
      !manualFactors.includes('aerobic_exercise') &&
      Boolean(autoAerobicSportName);

    const advice = factorDef.clinicalAdviceTemplate(baseBolusUnits, roundStep);

    let customName = factorDef.name;
    if (factorDef.id === 'strength_training' && autoStrengthSportName) {
      customName = `${factorDef.shortName} (${autoStrengthSportName} marcado Hecho hoy)`;
    } else if (factorDef.id === 'aerobic_exercise' && autoAerobicSportName) {
      customName = `${factorDef.shortName} (${autoAerobicSportName} marcado Hecho hoy)`;
    }

    const { minPercent, maxPercent } = factorDef.defaultDoseAdjustmentPercent;
    const badgeText =
      maxPercent < 0
        ? `Consejo: ${minPercent}% a ${maxPercent}% insulina`
        : minPercent > 0
        ? `Consejo: +${minPercent}% a +${maxPercent}% insulina`
        : 'Consejo de Hidratación / Precaución';

    advisories.push({
      id: `factor-adv-${factorDef.id}`,
      factorId: factorDef.id,
      name: customName,
      emoji: factorDef.emoji,
      tone: factorDef.directionTone,
      badgeText,
      physiologicalExplanation: factorDef.physiologicalExplanation,
      headline: advice.headline,
      recommendedRangeText: advice.recommendedRangeText,
      detailedWarning: advice.detailedWarning,
      isAutoLinkedFromWorkout: isAutoStrength || isAutoAerobic,
    });
  }

  return advisories;
}

/**
 * Guía completa e interactiva de los 42 Factores que afectan la diabetes (organizados en sus 7 categorías)
 * explicados en lenguaje simple y con su consejo práctico.
 */
export const ALL_42_FACTORS_BY_CATEGORY: Factor42CategoryGroup[] = [
  {
    id: 'food_nutrition',
    title: '1. Comida y Nutrición (Factores 1 al 10)',
    emoji: '🍽️',
    description: 'Cómo los nutrientes, horarios y bebidas impactan tu curva de glucosa.',
    factors: [
      {
        number: 1,
        name: 'Cantidad de Carbohidratos',
        effectArrow: '↑',
        effectLabel: 'Sube directo (↑↑)',
        explanation: 'Es el factor de mayor impacto directo en la glucemia post-comida.',
        practicalTip: 'Pesar o medir bien la porción reduce el margen de error del bolo.',
      },
      {
        number: 2,
        name: 'Tipo de Carbohidrato, Cocción y Temperatura (Índice Glucémico)',
        effectArrow: '↑↓',
        effectLabel: 'Cambia la velocidad de subida',
        explanation: 'Las harinas refinadas, puré de papas o comidas calientes recién hechas suben muy rápido. Si el arroz o la pasta se enfrían o recalientan, forman almidón resistente y se absorben más lento.',
        practicalTip: 'El puré o comida caliente exige 15-20 min de pre-bolo. Si comés arroz frío o pastas al dente, la subida es más lenta y suave.',
      },
      {
        number: 3,
        name: 'Grasas en la Comida (Efecto Pizza)',
        effectArrow: '↑↓',
        effectLabel: 'Frena al inicio → Sube tarde (3-5h)',
        explanation: 'Las grasas retrasan el vaciado del estómago y causan resistencia a la insulina horas después.',
        practicalTip: 'En comidas muy grasas (>25g grasa), usar Bolo Dividido evita hipo temprana e hiper tardía.',
      },
      {
        number: 4,
        name: 'Proteínas (Gluconeogénesis)',
        effectArrow: '↑',
        effectLabel: 'Subida lenta tardía (3-6h)',
        explanation: 'Cuando comés mucha proteína (especialmente con pocos carbohidratos), el hígado convierte parte de los aminoácidos en glucosa.',
        practicalTip: 'Respetar el límite de proteína protege los riñones y evita subidas nocturnas.',
      },
      {
        number: 5,
        name: 'Cafeína (Café fuerte / Mate cargado)',
        effectArrow: '↑',
        effectLabel: 'Sube leve a moderado (↑)',
        explanation: 'Estimula adrenalina leve y reduce temporalmente la sensibilidad a la insulina.',
        practicalTip: 'Podés activarlo arriba en los factores de hoy si tomaste mucho café en ayunas.',
      },
      {
        number: 6,
        name: 'Alcohol (Cerveza, Vino, Destilados)',
        effectArrow: '↓',
        effectLabel: 'Sube si tiene azúcar → Baja fuerte después (↓↓)',
        explanation: 'El hígado se concentra en eliminar el alcohol y deja de liberar glucosa de rescate, dejando vía libre a la insulina.',
        practicalTip: 'Activá el factor "Tomé Alcohol" para ver el consejo de reducción de bolo y prevención nocturna.',
      },
      {
        number: 7,
        name: 'Horario de las Comidas (Comer muy tarde)',
        effectArrow: '↑',
        effectLabel: 'Mayor resistencia nocturna (↑)',
        explanation: 'De noche el cuerpo suele tener menor sensibilidad a la insulina y digestión más lenta.',
        practicalTip: 'Cenar temprano da margen para verificar que la glucosa quede estable antes de dormir.',
      },
      {
        number: 8,
        name: 'Deshidratación (Falta de agua)',
        effectArrow: '↑',
        effectLabel: 'Concentra la glucosa (↑)',
        explanation: 'Menos líquido en sangre concentra el azúcar y enlentece la absorción de la insulina bajo la piel.',
        practicalTip: 'Tomar 2 vasos de agua ayuda a bajar la glucemia y activar la insulina inyectada.',
      },
      {
        number: 9,
        name: 'Microbioma Intestinal y Fibra Soluble',
        effectArrow: '↓',
        effectLabel: 'Aplana el pico (↓)',
        explanation: 'La fibra soluble (verduras, avena, chía, legumbres) forma un gel que frena la entrada brusca de azúcar.',
        practicalTip: 'Comer la ensalada o fibra primero ("Orden de ingesta") reduce el pico post-comida hasta un 30%.',
      },
      {
        number: 10,
        name: 'Edulcorantes y Polialcoholes (Maltitol, Sorbitol)',
        effectArrow: '↑',
        effectLabel: 'Polialcoholes suben al 50% (↑)',
        explanation: 'Productos "sin azúcar" con maltitol o sorbitol sí se transforman parcialmente en glucosa.',
        practicalTip: 'La app calcula automáticamente el 50% de impacto en polialcoholes como el maltitol.',
      },
    ],
  },
  {
    id: 'medication_insulin',
    title: '2. Insulina y Medicación (Factores 11 al 18)',
    emoji: '💉',
    description: 'Dosis, tiempos de espera, estado de la cánula/sitio de inyección y otros fármacos.',
    factors: [
      {
        number: 11,
        name: 'Dosis de Insulina Aplicada',
        effectArrow: '↓',
        effectLabel: 'Baja la glucosa (↓↓)',
        explanation: 'La cantidad de unidades de insulina basal y de bolo define cuánta glucosa entra a las células.',
        practicalTip: 'Verificá siempre tu Insulina Activa (IOB) antes de volver a corregir.',
      },
      {
        number: 12,
        name: 'Tiempo de Espera Pre-Bolo (Timing)',
        effectArrow: '↑↓',
        effectLabel: 'Evita el pico post-comida',
        explanation: 'La insulina rápida tarda 15-20 min en empezar a actuar en sangre; si comés enseguida, la comida le gana de mano.',
        practicalTip: 'Seguí el cartel de espera pre-bolo de la calculadora según tu glucosa y flecha.',
      },
      {
        number: 13,
        name: 'Interacciones con Otras Medicaciones',
        effectArrow: '↑↓',
        effectLabel: 'Variable según fármaco',
        explanation: 'Descongestivos con pseudoefedrina, ciertos antidepresivos o antibióticos alteran la glucemia.',
        practicalTip: 'Avisá siempre que tenés Diabetes Tipo 1 cuando te receten un medicamento nuevo.',
      },
      {
        number: 14,
        name: 'Corticoides (Prednisona, Dexametasona, Betametasona)',
        effectArrow: '↑',
        effectLabel: 'Subida muy fuerte (↑↑↑)',
        explanation: 'Bloquean la acción de la insulina y hacen que el hígado libere mucha glucosa.',
        practicalTip: 'Podés activar el factor "Corticoides" arriba para ver el aviso de ajuste.',
      },
      {
        number: 15,
        name: 'Niacina (Vitamina B3 en dosis altas)',
        effectArrow: '↑',
        effectLabel: 'Aumenta resistencia (↑)',
        explanation: 'En suplementos de dosis altas puede disminuir la sensibilidad a la insulina.',
        practicalTip: 'Revisar suplementos vitamínicos si notás subidas sin explicación.',
      },
      {
        number: 16,
        name: 'Sitio Anatómico de Inyección (Abdomen vs Muslo/Brazo) y Día de Cánula',
        effectArrow: '↑↓',
        effectLabel: 'Cambia velocidad de absorción',
        explanation: 'El abdomen absorbe más rápido; el muslo es más lento en reposo pero se acelera al caminar. En el día 3-4 del i-Port o cánula, la absorción se vuelve más lenta.',
        practicalTip: 'Rotá siempre el sitio para evitar durezas (lipohipertrofia) que frenan la insulina.',
      },
      {
        number: 17,
        name: 'Estado de la Insulina (Vencida o expuesta al calor/frío extremo)',
        effectArrow: '↑',
        effectLabel: 'Pierde potencia (↑)',
        explanation: 'Si la lapicera quedó al sol, en el auto caliente o lleva más de 28-30 días abierta, pierde efecto.',
        practicalTip: 'Si corregís y no baja nada, probá estrenar un cartucho o lapicera nueva.',
      },
      {
        number: 18,
        name: 'Hora de Aplicación de la Basal',
        effectArrow: '↑↓',
        effectLabel: 'Estabilidad de fondo',
        explanation: 'Atrasar u olvidar la insulina lenta deja huecos sin cobertura basal.',
        practicalTip: 'Aplicar la basal siempre a la misma hora mantiene estable la línea de base.',
      },
    ],
  },
  {
    id: 'activity_sports',
    title: '3. Actividad Física y Deporte (Factores 19 al 23)',
    emoji: '🏅',
    description: 'Cómo el tipo de deporte, la intensidad y el músculo entrenado cambian tu requerimiento.',
    factors: [
      {
        number: 19,
        name: 'Ejercicio Suave o Caminata Post-Comida',
        effectArrow: '↓',
        effectLabel: 'Baja suavemente (↓)',
        explanation: 'Caminar 15-30 minutos activa la entrada de glucosa al músculo sin elevar hormonas de estrés.',
        practicalTip: 'Excelente herramienta natural para bajar un pico después de comer sin inyectar de más.',
      },
      {
        number: 20,
        name: 'Ejercicio Aeróbico Moderado (Natación, Correr, Ciclismo, Fútbol)',
        effectArrow: '↓',
        effectLabel: 'Baja fuerte (↓↓) + Sensibilidad 6-18h',
        explanation: 'Consume mucha glucosa circulante y multiplica la potencia de la insulina activa.',
        practicalTip: 'Marcalo como "Hecho" en tu Rutina de Ejercicio para que la app te avise al calcular el bolo.',
      },
      {
        number: 21,
        name: 'Entrenamiento de Fuerza / Pesas / Boxeo / HIIT Intenso',
        effectArrow: '↑↓',
        effectLabel: '1º Sube un poco (↑) → 2º Sensibilidad alta 12-24h (↓↓)',
        explanation: 'La adrenalina del esfuerzo pesado sube un poco la glucosa al principio, pero luego el músculo chupa glucosa por hasta 24h para recuperarse.',
        practicalTip: 'No sobre-corrijas la subida inmediata post-pesas y considerá reducir el bolo de recuperación.',
      },
      {
        number: 22,
        name: 'Nivel de Entrenamiento y Masa Muscular',
        effectArrow: '↓',
        effectLabel: 'Mayor reserva y sensibilidad (↓)',
        explanation: 'Cuanta más masa muscular activa tenés, más capacidad tiene tu cuerpo de guardar glucosa como glucógeno.',
        practicalTip: 'Mantenerte activo reduce tu requerimiento total diario de insulina.',
      },
      {
        number: 23,
        name: 'Horario del Ejercicio y Conjunción con Insulina Activa (IOB)',
        effectArrow: '↓',
        effectLabel: 'Con IOB alto baja rapidísimo (↓↓↓)',
        explanation: 'Hacer deporte cuando tenés insulina rápida recién aplicada multiplica por 2 o 3 la velocidad de caída.',
        practicalTip: 'Si vas a entrenar con insulina activa, reducí el bolo previo o tené carbohidratos rápidos a mano.',
      },
    ],
  },
  {
    id: 'biological_health',
    title: '4. Factores Biológicos y Salud (Factores 24 al 32)',
    emoji: '🧬',
    description: 'Sueño, estrés, fiebre, hormonas y digestión.',
    factors: [
      {
        number: 24,
        name: 'Dormir Poco o Mal (<6 horas)',
        effectArrow: '↑',
        effectLabel: 'Resistencia al día siguiente (↑)',
        explanation: 'Eleva el cortisol y reduce hasta un 25% la sensibilidad a la insulina.',
        practicalTip: 'Activalo arriba cuando hayas dormido mal para tener presente el aviso en tus bolos.',
      },
      {
        number: 25,
        name: 'Estrés Mental, Ansiedad o Nervios',
        effectArrow: '↑',
        effectLabel: 'Sube por cortisol/adrenalina (↑↑)',
        explanation: 'El cerebro en alerta le pide al hígado que libere azúcar extra a la sangre.',
        practicalTip: 'En momentos de nervios o exámenes, la insulina parece "agua" hasta que pasa la tensión.',
      },
      {
        number: 26,
        name: 'Enfermedad, Infección o Fiebre',
        effectArrow: '↑',
        effectLabel: 'Subida fuerte sostenida (↑↑)',
        explanation: 'Las defensas del cuerpo generan resistencia fuerte a la insulina.',
        practicalTip: 'Activalo en el panel superior si estás engripado o con fiebre.',
      },
      {
        number: 27,
        name: 'Alergias Estacionales',
        effectArrow: '↑',
        effectLabel: 'Subida leve o por spray/antihistamínico (↑)',
        explanation: 'La inflamación alérgica y los sprays nasales con corticoides o descongestivos suben la glucosa.',
        practicalTip: 'Revisá si tu spray nasal contiene fluticasona, budesonida o pseudoefedrina.',
      },
      {
        number: 28,
        name: 'Nivel de Glucosa Inicial (Glucotoxicidad si >250 mg/dL)',
        effectArrow: '↑',
        effectLabel: 'Cuando está muy alta, cuesta más bajarla (↑)',
        explanation: 'Estar por encima de 250 mg/dL genera resistencia temporal ("glucotoxicidad"): cada unidad parece bajar menos de lo normal.',
        practicalTip: 'Tomar agua y caminar suave ayuda a destrabar una hiperglucemia rebelde.',
      },
      {
        number: 29,
        name: 'Fenómeno del Alba y "Pies en el Suelo"',
        effectArrow: '↑',
        effectLabel: 'Subida matutina (↑)',
        explanation: 'Liberación natural de hormona de crecimiento y cortisol entre las 04:00 y 09:00 AM.',
        practicalTip: 'Activalo en tus mañanas si notás que te sube apenas te levantás de la cama.',
      },
      {
        number: 30,
        name: 'Ciclo Menstrual (Progesterona / Estrógenos)',
        effectArrow: '↑↓',
        effectLabel: 'Sube antes de menstruar (↑) → Baja al iniciar (↓)',
        explanation: 'La fase lútea (premenstrual) da resistencia; al empezar el período vuelve la sensibilidad.',
        practicalTip: 'Podés activarlo arriba durante los días de resistencia hormonal.',
      },
      {
        number: 31,
        name: 'Pubertad, Crecimiento o Embarazo',
        effectArrow: '↑↓',
        effectLabel: 'Grandes cambios de requerimiento',
        explanation: 'La hormona de crecimiento y las hormonas placentarias modifican semana a semana la sensibilidad.',
        practicalTip: 'Requiere actualizar periódicamente el FSI y el Ratio ICR en Configuración.',
      },
      {
        number: 32,
        name: 'Celiaquía o Gastroparesia (Velocidad de vaciado gástrico)',
        effectArrow: '↑↓',
        effectLabel: 'Altera absorción intestinal',
        explanation: 'Las harinas sin TACC suben más rápido; la gastroparesia enlentece la digestión de la comida.',
        practicalTip: 'Podés activar ambas condiciones en el menú de Condiciones Médicas de la app.',
      },
    ],
  },
  {
    id: 'environmental',
    title: '5. Factores Ambientales (Factores 33 al 36)',
    emoji: '☀️',
    description: 'Temperatura, sol, duchas calientes y altitud.',
    factors: [
      {
        number: 33,
        name: 'Temperatura Exterior y Duchas Calientes',
        effectArrow: '⚡',
        effectLabel: 'Calor acelera la insulina (↓) / Frío la enlentece (↑)',
        explanation: 'El calor o una ducha caliente recién inyectado dilata los capilares de la piel y absorbe la insulina de golpe.',
        practicalTip: 'No te bañes con agua muy caliente justo después de aplicarte el bolo.',
      },
      {
        number: 34,
        name: 'Quemaduras de Sol',
        effectArrow: '↑',
        effectLabel: 'Sube por inflamación y dolor (↑)',
        explanation: 'Una quemadura solar genera inflamación sistémica y liberación de cortisol.',
        practicalTip: 'Usar protector solar e hidratarse evita hiperglucemias de verano.',
      },
      {
        number: 35,
        name: 'Altitud (Montaña / Viajes en altura)',
        effectArrow: '↑',
        effectLabel: 'Menor oxígeno puede subir la glucosa (↑)',
        explanation: 'En lugares de mucha altura el cuerpo libera adrenalina/cortisol para adaptarse y algunos glucómetros se ven afectados.',
        practicalTip: 'Controlar más seguido los primeros días en zonas de montaña.',
      },
      {
        number: 36,
        name: 'Cambios de Estación (Invierno vs Verano)',
        effectArrow: '↑↓',
        effectLabel: 'Verano más sensibilidad (↓) / Invierno más resistencia (↑)',
        explanation: 'En verano suele requerirse menos insulina por mayor circulación y actividad; en invierno un poco más.',
        practicalTip: 'Es normal ajustar levemente la basal o el ratio entre invierno y verano.',
      },
    ],
  },
  {
    id: 'behavioral_decisions',
    title: '6. Decisiones y Comportamiento (Factores 37 al 39)',
    emoji: '🧠',
    description: 'Frecuencia de escaneo, "stacking" por impaciencia y toma de decisiones.',
    factors: [
      {
        number: 37,
        name: 'Frecuencia de Escaneo / Chequeo del Sensor',
        effectArrow: '↓',
        effectLabel: 'Mejor tiempo en rango',
        explanation: 'Ver la tendencia antes de que dispare la alarma permite corregir a tiempo con menos insulina.',
        practicalTip: 'Usá el Conector en Vivo (LibreLinkUp / Dexcom / Nightscout) para traer tu glucosa en 1 toque.',
      },
      {
        number: 38,
        name: 'Acumulación de Insulina ("Stacking") por Impaciencia',
        effectArrow: '↓',
        effectLabel: 'Peligro de Hipoglucemia Severa (↓↓↓)',
        explanation: 'Si corregís dos veces seguidas en menos de 2 horas porque "todavía no bajó", las dos dosis se suman en su pico.',
        practicalTip: 'La calculadora te descuenta automáticamente la Insulina Activa (IOB) para protegerte.',
      },
      {
        number: 39,
        name: 'Fatiga de Decisiones y Rutina',
        effectArrow: '↑↓',
        effectLabel: 'Adivinar porciones genera variabilidad',
        explanation: 'Tener que tomar decenas de decisiones por día cansa; automatizar tus platos favoritos reduce errores.',
        practicalTip: 'Guardá tus comidas habituales en la barra de Favoritos Rápidos.',
      },
    ],
  },
  {
    id: 'outside_body_devices',
    title: '7. Dispositivos y Medición (Factores 40 al 42)',
    emoji: '📟',
    description: 'Precisión del sensor, latencia intersticial y compresión nocturna.',
    factors: [
      {
        number: 40,
        name: 'Precisión de las Tiras o del Sensor ( Día 1 del Sensor)',
        effectArrow: '↑↓',
        effectLabel: 'En las primeras 24h el sensor puede marcar de menos',
        explanation: 'Al recién colocar un sensor nuevo, el filamento tarda unas 12-24h en estabilizarse en el tejido.',
        practicalTip: 'Si en el Día 1 del sensor el valor no coincide con lo que sentís, corroborá en dedo.',
      },
      {
        number: 41,
        name: 'Manos con Restos de Fruta o Comida al pincharse el dedo',
        effectArrow: '↑',
        effectLabel: 'Falsa subida en glucómetro capilar',
        explanation: 'Tener una mínima traza de fruta o azúcar en el dedo puede hacer que la tira marque 300 mg/dL falsos.',
        practicalTip: 'Lavarse siempre las manos con agua y jabón antes de medir en dedo.',
      },
      {
        number: 42,
        name: 'Retraso del Sensor (Lag Time 5-10 min) y "Bajas por Compresión"',
        effectArrow: '↑↓',
        effectLabel: 'El sensor mide líquido intersticial, no sangre directa',
        explanation: 'Cuando la glucosa sube o baja rápido, el sensor viene 5 a 10 min atrás de la sangre. Y si dormís aplastando el brazo del sensor, marca una hipoglucemia falsa ("baja por compresión").',
        practicalTip: 'Si a la noche marca un bajón de golpe en línea recta y te sentís bien, girá de lado y esperá 10 min.',
      },
    ],
  },
];
