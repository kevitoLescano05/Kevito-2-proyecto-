import React, { useState } from 'react';
import {
  GlucoseMeasurementMode,
  InsulinApplicationMode,
  MedicalConditionsConfig,
  MedicalConditionId,
  SensorBrand,
  RapidInsulinBrand,
  DosingCalculationMode,
  FixedMealDosesConfig,
  FixedCorrectionMethod,
  CorrectionScaleBracket,
  AppInterfaceMode,
} from '../types';
import { MEDICAL_CONDITIONS_CATALOG } from '../utils/medicalConditions';
import { SENSOR_BRAND_CATALOG } from '../utils/cgmService';
import {
  RAPID_INSULIN_CATALOG,
  DEFAULT_FIXED_MEAL_DOSES,
  DEFAULT_CORRECTION_SCALE,
} from '../utils/insulinMath';
import { Activity, Syringe, Radio, Droplet, Shield, Cpu, CheckCircle2, Smartphone, AlertTriangle, HeartPulse, ChevronDown, ChevronUp, Circle, Globe, Calculator, ListChecks, Plus, Trash2 } from 'lucide-react';
import { getLanguageInfo } from '../utils/languageManager';

interface InitialSetupModalProps {
  currentLanguage?: string;
  onOpenLanguageSelector?: () => void;
  initialInterfaceMode?: AppInterfaceMode;
  initialGlucoseMode?: GlucoseMeasurementMode;
  initialInsulinMode?: InsulinApplicationMode;
  initialSensorBrand?: SensorBrand;
  initialRapidInsulinBrand?: RapidInsulinBrand;
  initialDosingMode?: DosingCalculationMode;
  initialFixedMealDoses?: FixedMealDosesConfig;
  initialFixedCorrectionMethod?: FixedCorrectionMethod;
  initialCorrectionScale?: CorrectionScaleBracket[];
  initialIcr?: number;
  initialIsf?: number;
  initialWeightKg?: number;
  initialMedicalConditions?: MedicalConditionsConfig;
  onSaveProfile: (
    glucoseMode: GlucoseMeasurementMode,
    insulinMode: InsulinApplicationMode,
    medicalConditions?: MedicalConditionsConfig,
    sensorBrand?: SensorBrand,
    extraParams?: {
      interfaceMode?: AppInterfaceMode;
      rapidInsulinBrand: RapidInsulinBrand;
      dosingMode: DosingCalculationMode;
      fixedMealDoses: FixedMealDosesConfig;
      fixedCorrectionMethod: FixedCorrectionMethod;
      correctionScale: CorrectionScaleBracket[];
      icr: number;
      isf: number;
      weightKg: number;
    }
  ) => void;
}

export const InitialSetupModal: React.FC<InitialSetupModalProps> = ({
  currentLanguage = 'es',
  onOpenLanguageSelector,
  initialGlucoseMode = 'cgm_nfc',
  initialInsulinMode = 'manual_pen',
  initialSensorBrand = 'freestyle_libre',
  initialRapidInsulinBrand = 'novorapid',
  initialDosingMode = 'carb_counting',
  initialFixedMealDoses = DEFAULT_FIXED_MEAL_DOSES,
  initialFixedCorrectionMethod = 'sliding_scale',
  initialCorrectionScale = DEFAULT_CORRECTION_SCALE,
  initialIcr = 10,
  initialIsf = 30,
  initialWeightKg = 65,
  initialMedicalConditions,
  onSaveProfile,
}) => {
  const [selectedGlucoseMode, setSelectedGlucoseMode] = useState<GlucoseMeasurementMode | null>(null);
  const [selectedInsulinMode, setSelectedInsulinMode] = useState<InsulinApplicationMode | null>(null);
  const [selectedSensorBrand, setSelectedSensorBrand] = useState<SensorBrand>(initialSensorBrand);
  const [selectedRapidBrand, setSelectedRapidBrand] = useState<RapidInsulinBrand>(initialRapidInsulinBrand);
  const [selectedDosingMode, setSelectedDosingMode] = useState<DosingCalculationMode>(initialDosingMode);
  const [fixedMealDoses, setFixedMealDoses] = useState<FixedMealDosesConfig>(
    initialFixedMealDoses || DEFAULT_FIXED_MEAL_DOSES
  );
  const [fixedCorrectionMethod, setFixedCorrectionMethod] = useState<FixedCorrectionMethod>(
    initialFixedCorrectionMethod || 'sliding_scale'
  );
  const [correctionScale, setCorrectionScale] = useState<CorrectionScaleBracket[]>(
    initialCorrectionScale && initialCorrectionScale.length > 0
      ? initialCorrectionScale
      : DEFAULT_CORRECTION_SCALE
  );
  const [icrInput, setIcrInput] = useState<string>('');
  const [isfInput, setIsfInput] = useState<string>('');
  const [weightInput, setWeightInput] = useState<string>('');
  const [showConditionsMenu, setShowConditionsMenu] = useState<boolean>(false);
  const [selectedConditions, setSelectedConditions] = useState<MedicalConditionsConfig>(
    initialMedicalConditions || {
      renal: false,
      celiac: false,
      gastroparesis: false,
      hypertension: false,
      dyslipidemia: false,
      lactose_intolerance: false,
    }
  );

  const toggleCondition = (id: MedicalConditionId) => {
    setSelectedConditions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleUpdateScaleBracket = (
    id: string,
    field: 'minGlucose' | 'maxGlucose' | 'units',
    val: number
  ) => {
    setCorrectionScale((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: Math.max(0, val) } : b))
    );
  };

  const handleAddScaleBracket = () => {
    const last = correctionScale[correctionScale.length - 1];
    const nextMin = last ? last.maxGlucose + 1 : 150;
    const nextMax = nextMin + 40;
    const nextUnits = last ? last.units + 1 : 1;
    setCorrectionScale((prev) => [
      ...prev,
      {
        id: `scale-${Date.now()}`,
        minGlucose: nextMin,
        maxGlucose: nextMax,
        units: nextUnits,
      },
    ]);
  };

  const handleRemoveScaleBracket = (id: string) => {
    if (correctionScale.length <= 1) return;
    setCorrectionScale((prev) => prev.filter((b) => b.id !== id));
  };

  const glucoseOptions = [
    {
      id: 'cgm_nfc' as GlucoseMeasurementMode,
      icon: Radio,
      title: 'Sensor continuo en el celular (NFC / Bluetooth)',
      subtitle: 'FreeStyle Libre 1/2/3, Dexcom G6/G7/ONE, Sibionics, Sinocare, Eversense o Medtrum leído con el teléfono (con opción de conectar LibreLinkUp / Dexcom / xDrip+).',
      badge: 'Celular + Nube',
      tone: 'teal',
    },
    {
      id: 'cgm_reader' as GlucoseMeasurementMode,
      icon: Smartphone,
      title: 'Sensor sin NFC en el celular (con Lector / Medidor FreeStyle)',
      subtitle: 'Escaneas el sensor con el aparatito lector oficial que te da FreeStyle (sin usar NFC del celular). Incluye las 5 flechas de tendencia.',
      badge: 'Lector FreeStyle',
      tone: 'cyan',
    },
    {
      id: 'capillary' as GlucoseMeasurementMode,
      icon: Droplet,
      title: 'Medición capilar tradicional (Glucómetro de tiras)',
      subtitle: 'Pinchazo en el dedo con tiras reactivas (o glucómetro con Bluetooth). Valor puntual exacto sin requerir flechas continuas.',
      badge: 'Glucómetro en dedo',
      tone: 'rose',
    },
    {
      id: 'pump_sensor' as GlucoseMeasurementMode,
      icon: Cpu,
      title: 'Sensor vinculado a Bomba de Insulina (Bluetooth / Nightscout)',
      subtitle: 'Sensor Guardian (Medtronic), Dexcom (Tandem/Omnipod) u otro sensor conectado a tu bomba o a Nightscout.',
      badge: 'Sensor de Bomba',
      tone: 'indigo',
    },
  ];

  const insulinOptions = [
    {
      id: 'manual_pen' as InsulinApplicationMode,
      icon: Syringe,
      title: 'Inyección manual (Pluma / Lapicera o Jeringa)',
      subtitle: 'Inyecciones directas en el tejido subcutáneo (abdomen, brazos, muslos o glúteos).',
      badge: 'Lapicera tradicional',
      tone: 'teal',
    },
    {
      id: 'iport' as InsulinApplicationMode,
      icon: Shield,
      title: 'Puerto subcutáneo i-Port Advance',
      subtitle: 'Dispositivo que se coloca en la piel cada 3 o 4 días para inyectar con la pluma sin pincharte la piel cada vez.',
      badge: 'Rotación cada 4 días',
      tone: 'amber',
    },
    {
      id: 'pump' as InsulinApplicationMode,
      icon: Cpu,
      title: 'Bomba de infusión continua de insulina',
      subtitle: 'Administración continua mediante microinfusor con catéter o parche de insulina.',
      badge: 'Microinfusión',
      tone: 'indigo',
    },
  ];

  const handleConfirm = () => {
    onSaveProfile(
      selectedGlucoseMode || initialGlucoseMode,
      selectedInsulinMode || initialInsulinMode,
      selectedConditions,
      selectedSensorBrand,
      {
        interfaceMode: 'simple',
        rapidInsulinBrand: selectedRapidBrand,
        dosingMode: selectedDosingMode,
        fixedMealDoses,
        fixedCorrectionMethod,
        correctionScale,
        icr: Math.max(1, Number(icrInput) || initialIcr),
        isf: Math.max(5, Number(isfInput) || initialIsf),
        weightKg: Math.max(20, Number(weightInput) || initialWeightKg),
      }
    );
  };

  const activeLangInfo = getLanguageInfo(currentLanguage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-5 text-slate-100 my-auto">
        

        {/* Aviso Importante apenas se entra */}
        <div className="rounded-xl border-2 border-amber-500/80 bg-gradient-to-r from-amber-950/90 via-slate-900 to-rose-950/80 p-3.5 shadow-lg">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-0.5 text-xs">
              <span className="font-black uppercase tracking-wider text-amber-300 block">
                ⚠️ Aviso Importante al Entrar
              </span>
              <p className="text-slate-100 leading-relaxed">
                <strong>La app puede cometer errores</strong> en algunos cálculos o búsquedas. Cualquier inconveniente o falla que notes,{' '}
                <strong className="text-amber-300 underline">
                  dígalo en la Caja de Comentarios (al pie de la app) y será arreglado
                </strong>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Encabezado */}
        <div className="text-center space-y-2 border-b border-slate-800 pb-4">
          <div className="inline-flex p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 mb-1">
            <Activity className="h-8 w-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Personaliza tu Tratamiento
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            Para ajustar los cálculos y asistirte de forma exacta y segura, indica cómo te mides y cómo calculas y aplicas tu insulina:
          </p>
        </div>

        {/* Sección 1: ¿Cómo mides tu glucosa? */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-teal-300 uppercase tracking-wider flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 text-xs">1</span>
              ¿Cómo mides tu glucosa?
            </h3>
            <span className="text-[11px] text-slate-400">Selecciona 1 opción</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {glucoseOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedGlucoseMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedGlucoseMode(opt.id)}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 relative ${
                    isSelected
                      ? 'bg-teal-950/40 border-teal-500/80 ring-2 ring-teal-500/40 shadow-lg'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    isSelected ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 pr-6">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                        {opt.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {opt.subtitle}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="absolute right-3.5 top-3.5 text-teal-400">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5">
            <label className="text-xs font-bold text-teal-300 block">
              Marca de tu Sensor o Medidor (compatible con todas las marcas):
            </label>
            <select
              value={selectedSensorBrand}
              onChange={(e) => setSelectedSensorBrand(e.target.value as SensorBrand)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 font-semibold"
            >
              {SENSOR_BRAND_CATALOG.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.emoji} {b.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              💡 Si usás bomba (ej. Medtronic) pero te medís con un sensor de otra marca (ej. FreeStyle Libre), podés combinar ambos libremente.
            </p>
          </div>
        </div>

        {/* Sección 2: ¿Cómo aplicas tu insulina? */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-teal-300 uppercase tracking-wider flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 text-xs">2</span>
              ¿Cómo aplicas tu insulina?
            </h3>
            <span className="text-[11px] text-slate-400">Selecciona 1 opción</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {insulinOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedInsulinMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedInsulinMode(opt.id)}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 relative ${
                    isSelected
                      ? 'bg-teal-950/40 border-teal-500/80 ring-2 ring-teal-500/40 shadow-lg'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    isSelected ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 pr-6">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                        {opt.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {opt.subtitle}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="absolute right-3.5 top-3.5 text-teal-400">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sección 3 NUEVA: ¿Hacés Conteo de Carbohidratos o tenés Dosis Fijas? */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-teal-300 uppercase tracking-wider flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 text-xs">3</span>
              ¿Cómo calculás tus dosis de comida?
            </h3>
            <span className="text-[11px] text-slate-400">Elige tu modalidad</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedDosingMode('carb_counting')}
              className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative ${
                selectedDosingMode === 'carb_counting'
                  ? 'bg-teal-950/50 border-teal-500/90 ring-2 ring-teal-500/40 shadow-lg'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-white">
                    <Calculator className="h-4 w-4 text-teal-400" />
                    <span>🥖 Conteo de Carbohidratos</span>
                  </span>
                  {selectedDosingMode === 'carb_counting' && (
                    <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Calculás la insulina según los gramos de carbohidratos del plato (usando tu Ratio ICR y Sensibilidad FSI).
                </p>
              </div>
              <span className="mt-2 inline-block text-[10px] font-bold text-teal-300 bg-teal-950/80 border border-teal-700/50 rounded-md px-2 py-0.5 w-fit">
                Ratio por gramos HC
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedDosingMode('fixed_doses')}
              className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative ${
                selectedDosingMode === 'fixed_doses'
                  ? 'bg-amber-950/45 border-amber-500/90 ring-2 ring-amber-500/40 shadow-lg'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-white">
                    <ListChecks className="h-4 w-4 text-amber-400" />
                    <span>📋 Tengo Dosis Fijas</span>
                  </span>
                  {selectedDosingMode === 'fixed_doses' && (
                    <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  No hacés conteo de carbohidratos: tenés unidades fijas para las comidas (ej. Cena = 4 U) y corregís según tu valor de glucosa (ej. 180 mg/dL = +3 U).
                </p>
              </div>
              <span className="mt-2 inline-block text-[10px] font-bold text-amber-300 bg-amber-950/80 border border-amber-700/50 rounded-md px-2 py-0.5 w-fit">
                Esquema Fijo + Escala de Glucosa
              </span>
            </button>
          </div>

          {/* Configuración personalizada según si eligió Conteo de HC o Dosis Fijas */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div>
              <span className="text-[11px] text-slate-300 font-bold block mb-1">
                Marca / Tipo de Insulina Rápida que usás:
              </span>
              <select
                value={selectedRapidBrand}
                onChange={(e) => setSelectedRapidBrand(e.target.value as RapidInsulinBrand)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 font-semibold"
              >
                {RAPID_INSULIN_CATALOG.map((ins) => (
                  <option key={ins.id} value={ins.id}>
                    💉 {ins.name} (Inicio: {ins.onsetMinutesText})
                  </option>
                ))}
              </select>
            </div>

            {selectedDosingMode === 'carb_counting' ? (
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-teal-300 block">
                  Tus Números de Conteo de Carbohidratos (podés cambiarlos cuando quieras en ⚙️):
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Ratio ICR (g por 1U)</label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      step="0.5"
                      value={icrInput}
                      placeholder={`Ej: ${initialIcr}`}
                      onChange={(e) => setIcrInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono font-bold text-slate-100 placeholder:text-slate-500 placeholder:font-normal"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Sensibilidad FSI (mg/dL)</label>
                    <input
                      type="number"
                      min={5}
                      max={200}
                      value={isfInput}
                      placeholder={`Ej: ${initialIsf}`}
                      onChange={(e) => setIsfInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono font-bold text-slate-100 placeholder:text-slate-500 placeholder:font-normal"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Tu Peso (kg)</label>
                    <input
                      type="number"
                      min={20}
                      max={220}
                      value={weightInput}
                      placeholder={`Ej: ${initialWeightKg}`}
                      onChange={(e) => setWeightInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono font-bold text-slate-100 placeholder:text-slate-500 placeholder:font-normal"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 pt-1 animate-fadeIn">
                {/* 1. Dosis fijas por comida */}
                <div className="space-y-2 bg-slate-900/90 border border-amber-500/40 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-extrabold text-amber-300">
                      🍽️ 1. Tus Dosis Fijas por Comida (Unidades):
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Si en alguna no tenés fija, poné 0
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-amber-200 font-bold block mb-1">🌅 Desayuno (U)</label>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        step="0.5"
                        value={fixedMealDoses.breakfastUnits}
                        onChange={(e) =>
                          setFixedMealDoses({
                            ...fixedMealDoses,
                            breakfastUnits: Math.max(0, parseFloat(e.target.value) || 0),
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono font-bold text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-amber-200 font-bold block mb-1">☀️ Almuerzo (U)</label>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        step="0.5"
                        value={fixedMealDoses.lunchUnits}
                        onChange={(e) =>
                          setFixedMealDoses({
                            ...fixedMealDoses,
                            lunchUnits: Math.max(0, parseFloat(e.target.value) || 0),
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono font-bold text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-amber-200 font-bold block mb-1">🧉 Merienda (U)</label>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        step="0.5"
                        value={fixedMealDoses.snackUnits}
                        onChange={(e) =>
                          setFixedMealDoses({
                            ...fixedMealDoses,
                            snackUnits: Math.max(0, parseFloat(e.target.value) || 0),
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono font-bold text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-amber-200 font-bold block mb-1">🌙 Cena (U)</label>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        step="0.5"
                        value={fixedMealDoses.dinnerUnits}
                        onChange={(e) =>
                          setFixedMealDoses({
                            ...fixedMealDoses,
                            dinnerUnits: Math.max(0, parseFloat(e.target.value) || 0),
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono font-bold text-slate-100"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Cómo corrige la glucosa alta */}
                <div className="space-y-2.5 bg-slate-900/90 border border-teal-500/40 rounded-xl p-3">
                  <span className="text-xs font-extrabold text-teal-300 block">
                    🩸 2. ¿Cómo corregís cuando tenés la glucosa alta?
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setFixedCorrectionMethod('sliding_scale')}
                      className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                        fixedCorrectionMethod === 'sliding_scale'
                          ? 'bg-teal-950/70 border-teal-400 text-white font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      📊 Por Tabla / Escala de Glucosa (ej. 150 a 180 = +2 U)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFixedCorrectionMethod('isf_formula')}
                      className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                        fixedCorrectionMethod === 'isf_formula'
                          ? 'bg-teal-950/70 border-teal-400 text-white font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      ➗ Por Sensibilidad FSI (ej. 1 U baja 30 mg/dL)
                    </button>
                  </div>

                  {fixedCorrectionMethod === 'sliding_scale' ? (
                    <div className="space-y-2 pt-1">
                      <p className="text-[11px] text-slate-300">
                        Ajustá los rangos de glucosa y cuántas unidades de corrección te indicó tu médico para cada rango:
                      </p>
                      <div className="space-y-1.5">
                        {correctionScale.map((b) => (
                          <div
                            key={b.id}
                            className="grid grid-cols-12 gap-1.5 items-center bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs"
                          >
                            <div className="col-span-4">
                              <span className="text-[9px] text-slate-400 block">Desde (mg/dL)</span>
                              <input
                                type="number"
                                value={b.minGlucose}
                                onChange={(e) =>
                                  handleUpdateScaleBracket(b.id, 'minGlucose', parseInt(e.target.value, 10) || 0)
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono font-bold text-slate-100 text-xs"
                              />
                            </div>
                            <div className="col-span-4">
                              <span className="text-[9px] text-slate-400 block">Hasta (mg/dL)</span>
                              <input
                                type="number"
                                value={b.maxGlucose}
                                onChange={(e) =>
                                  handleUpdateScaleBracket(b.id, 'maxGlucose', parseInt(e.target.value, 10) || 0)
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono font-bold text-slate-100 text-xs"
                              />
                            </div>
                            <div className="col-span-3">
                              <span className="text-[9px] text-amber-300 font-bold block">Sumar (+U)</span>
                              <input
                                type="number"
                                step="0.5"
                                value={b.units}
                                onChange={(e) =>
                                  handleUpdateScaleBracket(b.id, 'units', parseFloat(e.target.value) || 0)
                                }
                                className="w-full bg-slate-900 border border-amber-600/60 rounded p-1 font-mono font-bold text-amber-300 text-xs"
                              />
                            </div>
                            <div className="col-span-1 flex justify-end pt-3">
                              <button
                                type="button"
                                onClick={() => handleRemoveScaleBracket(b.id)}
                                disabled={correctionScale.length <= 1}
                                className="text-slate-500 hover:text-rose-400 disabled:opacity-30 cursor-pointer"
                                title="Quitar fila"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleAddScaleBracket}
                        className="text-[11px] font-bold text-teal-300 hover:text-teal-200 flex items-center gap-1 pt-1 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>+ Agregar otro rango de glucosa</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Sensibilidad FSI (mg/dL por 1U)</label>
                        <input
                          type="number"
                          min={5}
                          max={200}
                          value={isfInput}
                          placeholder={`Ej: ${initialIsf}`}
                          onChange={(e) => setIsfInput(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono font-bold text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Tu Peso (kg)</label>
                        <input
                          type="number"
                          min={20}
                          max={220}
                          value={weightInput}
                          placeholder={`Ej: ${initialWeightKg}`}
                          onChange={(e) => setWeightInput(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono font-bold text-slate-100"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sección 4: Menú desplegable de condiciones médicas y nutricionales (Celiaquía, Renal, etc.) */}
        <div className="space-y-2.5 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setShowConditionsMenu((p) => !p)}
            className="w-full p-3.5 rounded-xl bg-slate-950 border border-teal-500/40 hover:border-teal-500/70 transition flex items-center justify-between gap-2 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <HeartPulse className="h-5 w-5 text-teal-400 shrink-0" />
              <div>
                <span className="text-xs sm:text-sm font-bold text-slate-100 block">
                  4. Condiciones Médicas y Alimentarias (Opcional)
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Celiaquía (Sin TACC), Protección Renal, Gastroparesia, Presión, Colesterol o Lactosa
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-teal-300 flex items-center gap-1 shrink-0">
              <span>{showConditionsMenu ? 'Ocultar' : 'Elegir'}</span>
              {showConditionsMenu ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          </button>

          {showConditionsMenu && (
            <div className="grid grid-cols-1 gap-2 p-3 rounded-xl bg-slate-950/90 border border-slate-800 animate-fadeIn">
              {MEDICAL_CONDITIONS_CATALOG.map((cond) => {
                const isOn = Boolean(selectedConditions[cond.id]);
                return (
                  <div
                    key={cond.id}
                    onClick={() => toggleCondition(cond.id)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                      isOn
                        ? 'bg-teal-950/35 border-teal-500/70'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-base leading-none mt-0.5">{cond.emoji}</span>
                      <div>
                        <span className="text-xs font-bold text-slate-100 block">{cond.name}</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">{cond.summary}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 ${
                        isOn
                          ? 'bg-teal-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {isOn ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                      <span>{isOn ? 'Activo' : 'Inactivo'}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Nota simple y directa */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 flex items-start gap-2.5">
          <span className="text-base leading-none">💡</span>
          <p className="leading-relaxed text-[11px]">
            <strong className="text-slate-200 font-semibold">Cero complicaciones:</strong> El lugar de acción es el mismo (tejido celular subcutáneo). La app mantendrá los cálculos directos y transparentes en todas las modalidades. Puedes cambiar esto en cualquier momento desde los Ajustes (⚙️).
          </p>
        </div>

        {/* Botón de Confirmación */}
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-teal-950/50 hover:shadow-teal-900/60 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
        >
          <span>Confirmar y Comenzar</span>
          <CheckCircle2 className="h-5 w-5" />
        </button>

      </div>
    </div>
  );
};
