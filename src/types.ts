export type DayType = 'weekday' | 'weekend';

export type GlucoseTrend = 'falling_fast' | 'falling' | 'flat' | 'rising' | 'rising_fast';

export type EatingSequencingMode = 
  | 'standard'      // 🥖 Carbohidratos directos / consumo habitual simultáneo
  | 'mixed'         // 🥜 Mezclados / Untados a la vez (ej. pan con pasta de maní, fideos con salsa)
  | 'veggies_first'; // 🥗 Fibra / Proteína / Grasa primero y HC al final (ej. ensalada antes de pizza o arroz)

export interface SecondDoseSensorCheckResult {
  currentGlucose: number;
  trendArrow: GlucoseTrend;
  originalUnits: number;
  recommendedAction: 'apply_original' | 'apply_adjusted' | 'postpone' | 'cancel_safe';
  recommendedUnits: number;
  correctionUnits: number;
  grossCorrectionUnits?: number;
  netCorrectionUnits?: number;
  roundStep?: number;
  iobUnits: number;
  clinicalMessage: string;
  actionTitle: string;
  tone: 'emerald' | 'amber' | 'rose' | 'cyan';
  deltaGlucose?: number; // Diferencia respecto a glucemia inicial
  isCreepingRise?: boolean; // Detectó subida lenta sostenida a pesar de flecha plana
}

export type TissueConsistencyType = 'adipose' | 'neutral' | 'lean_athletic';

export interface ZoneTissueCompositionConfig {
  abdomen?: TissueConsistencyType; // Default: 'neutral'
  thigh?: TissueConsistencyType;   // Default: 'neutral'
  arm?: TissueConsistencyType;     // Default: 'neutral'
  glute?: TissueConsistencyType;   // Default: 'adipose'
}

export interface IPortAdvanceState {
  site: 'abdomen' | 'thigh' | 'arm' | 'glute';
  subSite: 
    | 'abdomen_lower_fat'     // Abdomen Bajo / Flanco (Más tejido adiposo / Estable)
    | 'abdomen_upper_lean'    // Abdomen Alto / Centro (Zona magra / Músculo definido / Fascia dura)
    | 'thigh_inner_soft'      // Muslo / Cara Interna (Blanda / Más tejido)
    | 'thigh_anterior_firm'   // Muslo / Cara Delantera (Firme / Cuádriceps)
    | 'thigh_lateral_firm'    // Muslo / Costado Lateral (Tensor fascia lata / Firme)
    | 'arm_standard'          // Brazo (Tríceps / Cara posterior)
    | 'glute_standard';       // Glúteo / Cuadrante superior externo
  dayOfWear: number;        // Día actual de uso (ej. 1 al 4)
  targetDurationDays?: number; // Días estipulados de duración (ej. 3 o 4 días)
  placedDate?: string;      // YYYY-MM-DD
  dismissedAlertForDate?: string; // YYYY-MM-DD si pospuso el aviso hoy
  tissueConsistency?: TissueConsistencyType; // Consistencia específica de la zona actual
}

export interface DeviceWearTrackerState {
  enabled: boolean;
  targetDurationDays: number; // ej. 14 días (FreeStyle), 15 días (Libre 2 Plus), 10 días (Dexcom), 7 días (Guardian), 3 días (Set Bomba)
  currentDayOfWear: number;   // Día actual de uso (1 a targetDurationDays+)
  placedDate?: string;        // YYYY-MM-DD (fecha en que se colocó)
  dismissedAlertForDate?: string; // YYYY-MM-DD si cerró el aviso por hoy
}

export type WorkoutRoutineType = 
  | 'chest_back'   // Pecho y Espalda (Lunes y Jueves)
  | 'arms'         // Brazos (Martes y Viernes)
  | 'legs'         // Pierna (Miércoles)
  | 'weekend_extra' // Fin de semana / Extra (Caminata larga, Bicicleta, etc.)
  | 'rest';        // Descanso

export type SportId =
  | 'gym_weights'
  | 'walking'
  | 'running'
  | 'swimming'
  | 'boxing_martial_arts'
  | 'football'
  | 'cycling'
  | 'tennis_padel'
  | 'basketball_volleyball'
  | 'crossfit_hiit'
  | 'dancing_zumba'
  | 'yoga_pilates'
  | 'rowing_kayak'
  | 'hockey_skating'
  | 'hiking_climbing'
  | 'calisthenics'
  | 'jump_rope'
  | 'rugby'
  | 'golf'
  | 'physical_work';

export type ExerciseIntensity = 'light' | 'moderate' | 'intense';

export interface CustomExerciseItem {
  id: string;
  sportId: SportId;
  customLabel?: string; // ej. "Pesas (Pecho/Espalda, Brazos o Pierna)" o "Clases de Natación"
  muscleGroup?: WorkoutRoutineType; // opcional si es gym_weights
  durationMinutes: number; // ej. 45, 60
  intensity: ExerciseIntensity;
  customCaloriesOverride?: number; // si el usuario quiere fijar kcal exactas (ej. 350 kcal)
  doneStatus: boolean | null; // true = Hecho, false = No hecho, null = Sin marcar hoy
  isLowerBody?: boolean; // para alerta de i-Port en muslo
}

export type CalorieAccountingMode =
  | 'add_when_done'       // Meta base de descanso + Suma calorías al marcar "Hecho" (ideal para la mayoría)
  | 'subtract_when_missed'; // Meta base ya incluye la rutina + Resta calorías al marcar "No hecho"

export type ActiveGlycemicFactorId =
  | 'strength_training'    // Entrenamiento de Fuerza / Pesas / Boxeo explosivo
  | 'aerobic_exercise'     // Ejercicio Aeróbico (Natación, Correr, Fútbol, Bici, Caminata larga)
  | 'alcohol'              // Consumo de Alcohol (bloqueo hepático de glucógeno -> riesgo hipo tardía)
  | 'illness_fever'        // Enfermedad / Infección / Fiebre (resistencia insulínica alta)
  | 'acute_stress'         // Estrés Fuerte / Examen / Nervios (cortisol y adrenalina)
  | 'poor_sleep'           // Dormí mal / Menos de 6 horas (resistencia matutina y diurna)
  | 'menstrual_hormones'   // Ciclo Menstrual / Fase lútea / Hormonas
  | 'steroids_meds'        // Corticoides / Medicación hiperglucemiante
  | 'extreme_heat'         // Calor extremo / Ducha caliente post-inyección (absorción acelerada)
  | 'dehydration'          // Deshidratación (concentración de glucosa en sangre y menor flujo)
  | 'caffeine_high'        // Exceso de Cafeína / Mate / Café fuerte en ayunas
  | 'dawn_phenomenon';     // Fenómeno del Alba / Pies en el suelo (pico hormonal matutino)

export interface DailyWorkoutState {
  dateKey?: string; // YYYY-MM-DD
  routineType: WorkoutRoutineType;
  weightsDone: boolean | null; // true = Hecho, false = No hecho, null = Sin marcar
  walkDone: boolean | null;    // true = Hecho, false = No hecho, null = Sin marcar
  weekendActivity?: 'none' | 'walk' | 'bike'; // Para fines de semana si sale a caminar o andar en bici
  // Nuevo sistema inclusivo donde cada usuario arma su propia rutina de deportes
  calorieAccountingMode?: CalorieAccountingMode;
  customRoutineItems?: CustomExerciseItem[];
  activeGlycemicFactors?: ActiveGlycemicFactorId[];
}

export type GlucoseMeasurementMode = 
  | 'cgm_nfc'       // Sensor continuo con NFC/Bluetooth en el celular (FreeStyle Libre, Dexcom, Sibionics, Sinocare, etc.)
  | 'cgm_reader'    // Sensor continuo sin NFC usando el Lector/Medidor externo (ej. Lector FreeStyle Libre)
  | 'capillary'     // Medición capilar tradicional (Glucómetro en dedo con tiras)
  | 'pump_sensor';  // Bomba de insulina con sensor continuo integrado o vinculado (Medtronic Guardian, Dexcom, etc.)

export type SensorBrand =
  | 'freestyle_libre' // Abbott FreeStyle Libre 1 / 2 / 3
  | 'dexcom'          // Dexcom G6 / G7 / ONE / ONE+
  | 'medtronic'       // Medtronic Guardian Connect / 780G / 770G / 640G
  | 'sibionics'       // Sibionics GS1 CGM
  | 'sinocare'        // Sinocare iCan i3 CGM
  | 'eversense'       // Senseonics Eversense E3
  | 'medtrum'         // Medtrum TouchCare / A7+ / Nano
  | 'accu_chek'       // Accu-Chek SmartGuide / Guide Bluetooth
  | 'other_cgm';      // Otra marca de sensor o glucómetro

export type CgmCloudProvider =
  | 'none'            // Ingreso manual tradicional
  | 'librelinkup'     // Conector directo a FreeStyle LibreLinkUp (Abbott Cloud)
  | 'dexcom_share'    // Conector directo a Dexcom Share (Dexcom Cloud)
  | 'nightscout'      // Conector Universal Nightscout (Medtronic CareLink, xDrip+, Loop, AndroidAPS, Sibionics, Sinocare)
  | 'xdrip_local'     // Conector Directo en el mismo celular (xDrip+ / Juggluco / Diabox servidor local 127.0.0.1:17580)
  | 'web_bluetooth';  // Lectura directa por Bluetooth BLE (Glucómetros y sensores Bluetooth abiertos)

export interface LiveCgmReading {
  glucoseMgDl: number;
  trendArrow: GlucoseTrend;
  timestamp: string; // ISO string
  sourceLabel: string; // ej. "LibreLinkUp (FreeStyle)"
  deltaMgDl?: number;
}

export interface CgmConnectionConfig {
  provider: CgmCloudProvider;
  autoSyncOnOpen?: boolean;
  autoPollEvery5Min?: boolean;
  // LibreLinkUp credentials
  libreLinkUpEmail?: string;
  libreLinkUpPassword?: string;
  libreLinkUpRegion?: string; // 'Auto' | 'LA' | 'US' | 'EU' | 'EU2' | 'DE' | 'FR' | 'CA' | 'AP' | 'AU' | 'AE' | 'JP'
  // Dexcom Share credentials
  dexcomUsername?: string;
  dexcomPassword?: string;
  dexcomRegion?: 'ous' | 'us' | 'jp'; // 'ous' = Fuera de EE.UU. (Latinoamérica, Europa, etc.)
  // Nightscout Universal Bridge
  nightscoutUrl?: string;
  nightscoutToken?: string;
  // xDrip+ / Juggluco local phone bridge
  xdripLocalPort?: number; // default 17580
  // Last synced value cache
  lastReading?: LiveCgmReading;
}

export type InsulinApplicationMode = 
  | 'manual_pen'    // Inyección manual con pluma / lapicera o jeringa
  | 'iport'         // Puerto subcutáneo i-Port Advance
  | 'pump';         // Bomba de infusión continua de insulina

export type CountryCode =
  | 'AR' // Argentina
  | 'ES' // España
  | 'MX' // México
  | 'CL' // Chile
  | 'CO' // Colombia
  | 'UY' // Uruguay
  | 'PE' // Perú
  | 'BR' // Brasil
  | 'US' // Estados Unidos
  | 'GLOBAL'; // Internacional / Global

export type CommunityPostCategory =
  | 'review'     // Reseña / Opinión general
  | 'bug_report' // Reporte de falla o error
  | 'idea'       // Sugerencia o idea de mejora
  | 'question';  // Pregunta / Charla entre usuarios

export interface CommunityReply {
  id: string;
  authorName: string;
  authorId: string;
  countryCode?: CountryCode;
  text: string;
  stickerId?: string;
  createdAt: string; // ISO string
  reportedBy?: string[];
  reportsCount?: number;
}

export interface CommunityReview {
  id: string;
  authorName: string;
  authorId: string;
  countryCode: CountryCode;
  treatmentBadge?: string; // ej. "FreeStyle + i-Port"
  rating?: number; // 1 a 5 estrellas (opcional, 0 o undefined si comenta sin calificar)
  category?: CommunityPostCategory; // Opcional
  title: string;
  text: string;
  stickerId?: string; // Sticker visual elegido de la galería de la comunidad
  imageDataUrl?: string; // Captura de pantalla / foto adjunta comprimida (data URL)
  createdAt: string; // ISO string
  likesCount: number;
  likedBy: string[];
  replies: CommunityReply[];
  status?: 'open' | 'resolved';
  reportedBy?: string[]; // IDs de usuarios/dispositivos que denunciaron el comentario
  reportsCount?: number; // Cantidad de denuncias acumuladas
  reportReasons?: string[]; // Motivos de denuncia (spam, ofensa, consejo peligroso, etc.)
  autoHidden?: boolean; // Ocultado/eliminado prudente al llegar al umbral de denuncias (ej. 3)
}

export type MedicalConditionId =
  | 'renal'               // 1. Protección Renal / Nefropatía (Límite estricto de proteínas animales)
  | 'celiac'              // 2. Celiaquía / Intolerancia al Gluten (Modo Sin TACC + alerta IG harinas sin gluten)
  | 'gastroparesis'       // 3. Gastroparesia Diabética (Digestión lenta / Cuidado pre-bolo y fibra/grasa)
  | 'hypertension'        // 4. Hipertensión Arterial / Cuidado Cardiovascular (Control de sodio y ultraprocesados)
  | 'dyslipidemia'        // 5. Colesterol y Triglicéridos Altos (Límite de grasas saturadas y meta de fibra)
  | 'lactose_intolerance'; // 6. Intolerancia a la Lactosa (Alerta lácteos + IG más rápido en deslactosados)

export interface MedicalConditionsConfig {
  renal?: boolean;
  celiac?: boolean;
  gastroparesis?: boolean;
  hypertension?: boolean;
  dyslipidemia?: boolean;
  lactose_intolerance?: boolean;
}

export type RapidInsulinBrand =
  | 'novorapid' // NovoRapid / NovoLog (Insulina Aspart estándar)
  | 'humalog'   // Humalog (Insulina Lispro estándar)
  | 'apidra'    // Apidra (Insulina Glulisina estándar)
  | 'fiasp'     // Fiasp (Insulina Aspart Ultra-rápida con niacinamida)
  | 'lyumjev'   // Lyumjev (Insulina Lispro Ultra-rápida)
  | 'regular';  // Insulina Humana Regular / Cristalina (acción más lenta)

export type MealTimeSlot = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export type DosingCalculationMode =
  | 'carb_counting' // 🥖 Conteo de Carbohidratos tradicional (gramos HC ÷ Ratio ICR)
  | 'fixed_doses';  // 📋 Esquema de Dosis Fijas por comida + Escala de corrección por glucosa

export type FixedCorrectionMethod =
  | 'sliding_scale' // 📊 Tabla / Escala fija por rangos de glucosa (ej. 150-180 = 1u, 181-220 = 2u...)
  | 'isf_formula';  // ➗ Fórmula de Sensibilidad FSI ((Glucosa - Meta) ÷ FSI)

export interface FixedMealDosesConfig {
  breakfastUnits: number; // 🌅 Desayuno (ej. 3 U)
  lunchUnits: number;     // ☀️ Almuerzo (ej. 5 U)
  snackUnits: number;     // 🧉 Merienda (ej. 3 U)
  dinnerUnits: number;    // 🌙 Cena (ej. 4 U)
  extraUnits?: number;    // 🍎 Colación / Extra (ej. 0 U)
}

export interface CorrectionScaleBracket {
  id: string;
  minGlucose: number; // ej. 150 mg/dL
  maxGlucose: number; // ej. 180 mg/dL
  units: number;      // ej. 2 U
}

export interface MealTimeRatiosConfig {
  breakfastIcr: number; // Desayuno (05:00 - 11:29)
  lunchIcr: number;     // Almuerzo (11:30 - 15:29)
  snackIcr: number;     // Merienda (15:30 - 19:29)
  dinnerIcr: number;    // Cena (19:30 - 04:59)
}

export interface BasalInsulinConfig {
  enabled: boolean;
  brandName: string; // 'Tresiba' | 'Toujeo' | 'Lantus' | 'Basaglar' | 'Levemir' | 'NPH'
  defaultUnits: number;
  scheduledTime: string; // ej. '22:00'
  lastAppliedDateKey?: string; // YYYY-MM-DD
  lastAppliedAtTime?: string;  // HH:MM
  lastAppliedUnits?: number;
}

export type AppInterfaceMode = 'simple' | 'complete';

export interface UserSettings {
  appLanguage?: string; // Idioma activo de la aplicación (ej. 'es', 'en', 'pt', etc.)
  hasSelectedLanguage?: boolean; // Ha confirmado el paso 1 de idioma al abrir la app por primera vez
  interfaceMode?: AppInterfaceMode; // 'simple' (limpio, directo, sin dispositivos/fórmulas complejas) o 'complete' (avanzado)
  countryCode?: CountryCode; // País actual del usuario para bases de datos nutricionales
  glucoseMode?: GlucoseMeasurementMode; // Modalidad de medición de glucosa
  sensorBrand?: SensorBrand; // Marca de sensor o glucómetro (FreeStyle, Dexcom, Medtronic, Sibionics, Sinocare, etc.)
  cgmConnection?: CgmConnectionConfig; // Configuración de lectura automática de glucosa en la nube / local / Bluetooth
  insulinMode?: InsulinApplicationMode; // Modalidad de aplicación de insulina
  rapidInsulinBrand?: RapidInsulinBrand; // Marca/tipo de insulina rápida (Novorapid, Humalog, Fiasp, Lyumjev, Apidra)
  dosingMode?: DosingCalculationMode; // 'carb_counting' (Conteo de HC) o 'fixed_doses' (Dosis fijas por comida/escala)
  fixedMealDoses?: FixedMealDosesConfig; // Unidades fijas para Desayuno, Almuerzo, Merienda y Cena
  fixedCorrectionMethod?: FixedCorrectionMethod; // 'sliding_scale' (Tabla por rangos) o 'isf_formula' (Sensibilidad FSI)
  correctionScale?: CorrectionScaleBracket[]; // Rangos personalizados de corrección por glucemia
  isProfileConfigured?: boolean; // Ha completado la pantalla inicial obligatoria
  hasSeenTutorial?: boolean; // Ha visto o cerrado el tutorial interactivo de bienvenida
  isf: number; // Factor de Sensibilidad a la Insulina (mg/dL por unidad, ej. 28)
  icr: number; // Ratio Carbohidratos/Insulina (g por unidad, ej. 8)
  enableMealTimeRatios?: boolean; // Activar distinto Ratio ICR según la hora/comida del día
  mealTimeRatios?: MealTimeRatiosConfig; // Ratios personalizados por Desayuno, Almuerzo, Merienda y Cena
  basalConfig?: BasalInsulinConfig; // Recordatorio y confirmación diaria de Insulina Basal / Lenta
  targetGlucose: number; // Métrica objetivo de glucemia (mg/dL, ej. 100)
  diaHours: number; // Duración de la insulina activa DIA en horas (ej. 3.5 o 4)
  dayType: DayType;
  weightKg?: number; // Peso corporal en kg (ej. 58 kg)
  kcalPerKg?: number; // Factor calórico (ej. 40 kcal/kg)
  weekdayCalorieGoal: number; // 2350 kcal Lunes a Viernes
  weekendCalorieGoal: number; // 1850 kcal Sábados y Domingos
  maxAnimalProtein: number; // 25g
  minPlantProtein: number; // 25g
  maxPlantProtein: number; // 35g
  maxDailyFat?: number; // Límite diario de grasas totales en Dislipidemia (ej. 60g)
  minDailyFiber?: number; // Meta diaria sugerida de fibra soluble en Dislipidemia (ej. 25g)
  roundDoseTo: 0.5 | 1.0 | 0.1; // Redondeo de pluma/i-Port
  dayCutoffHour: number; // Hora de corte del día (ej. 2 = 02:00 AM, 3 = 03:00 AM, 0 = medianoche)
  cameraPermissionGranted?: boolean; // Persistencia de permiso de cámara (para no preguntar repetidamente)
  showCaloriesAndMacros?: boolean; // Alternar visibilidad de calorías y macros
  enableRenalProteinLimits?: boolean; // Alternar límites estrictos de proteína renal
  medicalConditions?: MedicalConditionsConfig; // Las 6 condiciones médicas y nutricionales activables
  iPortState?: IPortAdvanceState; // Estado, duración y rotación del Puerto de Inyección i-Port Advance
  zoneTissueComposition?: ZoneTissueCompositionConfig; // Consistencia tisular personalizada por zona (abdomen, muslo, brazo, glúteo)
  sensorTracker?: DeviceWearTrackerState; // Estado y duración en días del Sensor Continuo (FreeStyle, Dexcom, Medtronic, Sibionics, etc.)
  pumpSetTracker?: DeviceWearTrackerState; // Estado y duración en días del Set de Infusión / Catéter de Bomba
  dailyWorkout?: DailyWorkoutState; // Estado diario de entrenamiento y caminata
}

export interface BolusRecord {
  id: string;
  timestamp: string; // ISO string
  units: number;
  carbUnits: number;
  correctionUnits: number;
  carbsGrams: number;
  glucoseMgDl: number;
  trendArrow?: GlucoseTrend;
  mealDescription?: string;
  notes?: string;
  splitInfo?: {
    isSplit: boolean;
    part: 1 | 2;
    parentBolusId?: string;
    totalDose: number;
    delayHours?: number;
  };
}

export interface PendingSplitBolus {
  id: string;
  parentBolusId: string;
  createdAt: string; // ISO string
  dueAt: string; // ISO string (timestamp when dose is due)
  delayHours: number;
  delayMinutes?: number;
  absorptionWindowText?: string; // ej. "Ventana estimada: min 75 a 95 post-comida"
  units: number;
  totalPlannedUnits: number;
  firstDoseUnits: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  mealDescription: string;
  status: 'pending' | 'applied' | 'dismissed';
  part?: 1 | 2; // 1: 1ª Dosis Pendiente, 2: 2ª Dosis Pendiente (default 2)
  timingNote?: string;
  startingGlucose?: number; // Glucemia al momento de la comida para calcular delta acumulado
  isPaused?: boolean; // Puesto en espera/pausado a demanda del usuario
  pausedAt?: string; // ISO string del momento en que se pausó
  notifiedAt?: string; // ISO string de cuándo se disparó la última notificación
}

export interface AntiStackingRecommendation {
  hasRisk: boolean;
  riskLevel: 'high' | 'moderate' | 'safe';
  recentBolus: BolusRecord | null;
  elapsedMinutes: number;
  minutesUntilDue: number;
  suggestedPostponeMinutes: number;
  newScheduledTimeText: string;
  headline: string;
  clinicalExplanation: string;
  fatProtectionNote: string;
  actionButtonText: string;
}

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  portionName: string; // ej. "1 milanesa (120g)", "1/2 plato", "4 galletitas (30g)"
  gramsPerPortion: number;
  carbsGrams: number;
  fiberGrams?: number;
  animalProteinGrams: number;
  plantProteinGrams: number;
  fatGrams: number;
  calories: number;
  totalProteinGrams?: number;
  gi: 'Bajo' | 'Medio' | 'Alto';
  cg: number;
  absorption: 'Rápida' | 'Lenta' | 'Mixta';
  isCommercial?: boolean;
  category?: string;
  source?: string; // ej. "Rótulo Oficial Bagley Arcor / SIFeGA ANMAT"
}

export interface MealPlateItem {
  id: string;
  foodItem: FoodItem;
  quantity: number; // número de porciones (ej. 2 para 2 milanesas, 0.5 para medio plato)
}

export interface StructuredMealAnalysis {
  items: {
    name: string;
    portionText: string;
    carbsGrams: number;
    fiberGrams?: number;
    netCarbsGrams?: number;
    animalProteinGrams: number;
    plantProteinGrams: number;
    fatGrams: number;
    calories: number;
  }[];
  totals: {
    carbsGrams: number;
    fiberGrams?: number;
    netCarbsGrams?: number;
    polyolsGrams?: number;
    sweetenersDetected?: string[];
    polyolsCalculationNote?: string;
    animalProteinGrams: number;
    plantProteinGrams: number;
    fatGrams: number;
    calories: number;
  };
  glycemicIndex: 'Bajo' | 'Medio' | 'Alto';
  glycemicLoad: number;
  absorptionSpeed: 'Rápida' | 'Lenta' | 'Mixta';
  theoreticalMealBolus: number; // Carbs / ICR
  correctionBolus: number; // (Glucose - 100) / FSI
  suggestedTotalBolus: number;
  glycemicFactors: string[];
  renalSafetyNote: string;
  sourcesCited?: string[];
  eatingSequencing?: EatingSequencingMode;
  eatingSequencingAdvice?: string;
  splitStrategyAdvice?: {
    requiresSplit: boolean;
    firstDoseUnits: number;
    firstDoseTiming: string;
    secondDoseUnits: number;
    secondDoseDelayHours: number;
    secondDoseDelayFormatted: string;
    secondDoseTiming: string;
    slowCarbDoseUnits?: number;
    clinicalExplanation?: string;
    sequencingMode?: EatingSequencingMode;
    reason?: string;
  };
  summaryFormatted: {
    desgloseMacros: string;
    indiceCargaGlucemica: string;
    calculoDosisBolus: string;
    factoresGlucemia: string;
    balanceAcumulado: string;
  };
}

export interface DailyMealLogItem {
  id: string;
  time: string; // HH:MM
  date?: string; // YYYY-MM-DD
  timestamp?: string; // ISO string
  description: string;
  carbsGrams: number;
  fiberGrams?: number;
  animalProteinGrams: number;
  plantProteinGrams: number;
  fatGrams: number;
  calories: number;
  bolusUnits: number;
  isArchived?: boolean; // Para historial histórico sin perder nunca datos
}

export interface DailyTotals {
  calories: number;
  animalProtein: number;
  plantProtein: number;
  carbs: number;
  fat: number;
}

export type SponsorPlanTier =
  | 'directory_basic'   // Plan 1: Básico (Aparece en el Directorio de Comercios Recomendados del país)
  | 'featured_context'  // Plan 2: Destacado (Aparece primero en Directorio + Banner en Comidas o Sensores)
  | 'vip_top';          // Plan 3: Auspiciante Principal / Exclusivo (Banner superior en la pantalla principal + Todo lo anterior)

export type SponsorShippingScope =
  | 'national_shipping' // 🚚 Envíos a todo el país (todas las provincias/regiones de ese país)
  | 'local_only'        // 🛵 Solo envíos en su ciudad/provincia o retiro en local
  | 'international';    // 🌍 Envíos o servicio internacional (todos los países)

export type SponsorContextCategory =
  | 'nutrition_food'    // Dietética, Alimentos Sin TACC, Keto, Sin Azúcar (aparece en Analizador de Alimentos en Plan 2/3)
  | 'devices_sensors'   // Parches para Sensores, Porta-insulinas térmicos, Insumos (aparece en Barra de Dispositivos en Plan 2/3)
  | 'pharmacy_general'; // Farmacia, Laboratorio, Centro Médico o Servicio General

export interface SponsorItem {
  id: string;
  businessName: string;           // Ej. "Dietética Vida Sana" o "Parches LibreStick"
  categoryLabel: string;          // Ej. "Alimentos Sin TACC y Keto" o "Parches para Sensor FreeStyle y Dexcom"
  contextCategory: SponsorContextCategory;
  description: string;            // Descripción breve del comercio o producto
  discountBadge?: string;         // Ej. "10% OFF mencionando la App" (opcional)
  countryCode: CountryCode;       // País donde opera ('AR', 'CL', 'CO', 'MX', 'ES', 'UY', 'PE', 'BR', 'US', o 'GLOBAL')
  cityOrProvince: string;         // Ej. "Córdoba, Argentina" o "Bogotá, Colombia" o "CABA y GBA"
  shippingScope: SponsorShippingScope;
  shippingDetailText?: string;    // Ej. "Envíos por Correo Argentino a todo el país" o "Solo entregas en Medellín"
  planTier: SponsorPlanTier;
  contactUrl: string;             // Link a Instagram, WhatsApp (https://wa.me/...) o Tienda Web
  contactButtonLabel?: string;    // Ej. "Ver Instagram", "Pedir por WhatsApp", "Ir a la Tienda"
  active: boolean;
  clicksCount: number;            // Contador de toques para mostrar métricas al cliente
  createdAt: string;
}

export interface CreatorMonetizationConfig {
  // Cuentas de Donación (se activan apenas el creador cargue sus datos o nos avise)
  mercadoPagoEnabled: boolean;
  mercadoPagoAlias?: string;      // Ej. "tu.alias.mp"
  mercadoPagoHolderName?: string; // Nombre del titular opcional
  mercadoPagoLink?: string;       // Link de pago o Cafecito opcional (https://mpago.la/... o https://cafecito.app/...)
  paypalEnabled: boolean;
  paypalLink?: string;            // Ej. "https://paypal.me/tunombre"
  paypalEmail?: string;           // Email de PayPal opcional
  // Contacto comercial para empresas que quieran publicitar en la app (sin mostrar precios públicos)
  creatorContactEmail: string;    // Por defecto "pirilescano@gmail.com"
  creatorContactWhatsapp?: string; // Número opcional para que comercios escriban directo por WhatsApp
  showSponsorsSection: boolean;
  updatedAt?: string;
}

