import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  X,
  Video,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import {
  RealisticMiniAppScreen,
  TutorialSectionId,
  getSectionSimulation,
  getSensorDisplayName,
  SECTION_VIDEO_SIMULATIONS,
} from './AppTutorialAndHelp';
import { UserSettings } from '../types';
import { loadUserSettings } from '../utils/storage';

export interface VideoDemoChapter {
  id: TutorialSectionId;
  title: string;
  emoji: string;
  subtitle: string;
}

export function getDemoChapters(settings?: UserSettings): VideoDemoChapter[] {
  const s = settings || loadUserSettings();
  const isPump = s.insulinMode === 'pump';
  const isIport = s.insulinMode === 'iport';
  const isf = s.isf || 28;
  const icr = s.icr || 8;
  const weight = s.weightKg || 70;
  const sensorName = getSensorDisplayName(s.sensorBrand);
  const deliveryLabel = isPump ? 'Bomba de Insulina' : isIport ? 'Puerto i-Port' : 'Pluma Manual';
  const glucoseLabel = s.glucoseMode === 'cgm_nfc'
    ? 'Sensor NFC'
    : s.glucoseMode === 'pump_sensor'
    ? 'Sensor Bomba'
    : s.glucoseMode === 'capillary'
    ? 'Glucómetro Capilar'
    : 'Lector';

  return [
    {
      id: 'insulin_calculator',
      title: `Calculadora: Glucemia 180, FSI ${isf}, ICR ${icr} (${deliveryLabel})`,
      emoji: '💉',
      subtitle: `Simulación matemática paso a paso con tus datos (FSI ${isf}, ICR ${icr}, ${glucoseLabel}), resta de IOB y bolo dividido para grasas adaptado a ${deliveryLabel}.`,
    },
    {
      id: 'food_analyzer',
      title: 'Buscador y Analizador IA: Yogur (120g a 150g), Hamburguesa con Desglose y Empanadas',
      emoji: '🔍',
      subtitle: 'Buscador oficial con ajuste de gramos, análisis fotográfico con desglose nutricional y envío directo a la calculadora.',
    },
    {
      id: 'workout_routine',
      title: `Ejercicio y Sensibilidad: Rutina de Pesas (${weight} kg) y ${isPump ? 'Basal Temporal en Bomba' : 'Factor 42'}`,
      emoji: '🏋️‍♂️',
      subtitle: `Cómo registrar tu peso (${weight} kg), marcar ejercicios hechos, sumar calorías y ${isPump ? 'ajustar la basal en tu bomba' : 'activar la protección de sensibilidad'}.`,
    },
    {
      id: 'devices_tracker',
      title: `Dispositivos: Sensor ${sensorName} y ${isPump ? 'Cánula de Bomba' : isIport ? 'Puerto i-Port' : 'Rotación de Pluma'}`,
      emoji: '⏱️',
      subtitle: `Monitoreo automático de días de sensor y ${isPump ? 'set de infusión de bomba' : isIport ? 'puerto subcutáneo' : 'rotación de sitios de aplicación'}.`,
    },
    {
      id: 'daily_tracker',
      title: 'Monitor Diario: Calorías Ingeridas/Quemadas y Protección Renal',
      emoji: '🔥',
      subtitle: 'Balance diario de macros y control estricto de proteína animal para salud renal.',
    },
    {
      id: 'permanent_history',
      title: 'Historial Permanente: Búsqueda de Comidas Pasadas y Dosis',
      emoji: '📊',
      subtitle: 'Archivo histórico con búsqueda instantánea de comidas anteriores y dosis que te aplicaste.',
    },
    {
      id: 'community_reviews',
      title: `Comunidad y Reseñas: Pacientes Reales (${sensorName} + ${deliveryLabel})`,
      emoji: '💬',
      subtitle: 'Mural abierto donde personas con diabetes tipo 1 comparten experiencias y consejos prácticos.',
    },
    {
      id: 'glycemic_factors',
      title: 'Los 42 Factores: Ducha Caliente / Calor y Absorción Rápida',
      emoji: '🧬',
      subtitle: 'Cómo factores ambientales como el calor aceleran la absorción de la insulina rápida.',
    },
    {
      id: 'top_header_bar',
      title: 'Barra Superior: Selector de País, Insulina Activa (IOB) y Nube',
      emoji: '🌎',
      subtitle: 'Selector de bases de datos por país, medidor continuo de IOB en cuerpo y respaldo en la nube.',
    },
  ];
}

export const DEMO_CHAPTERS: VideoDemoChapter[] = getDemoChapters();

interface LiveAppVideoDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialChapterId?: string;
  settings?: UserSettings;
}

export const LiveAppVideoDemoModal: React.FC<LiveAppVideoDemoModalProps> = ({
  isOpen,
  onClose,
  initialChapterId = 'insulin_calculator',
  settings,
}) => {
  const activeSettings = settings || loadUserSettings();
  const chapters = getDemoChapters(activeSettings);

  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed] = useState<number>(3400); // ms por escena

  // Manejar el capítulo inicial si se abre desde algún botón específico
  useEffect(() => {
    if (initialChapterId) {
      // Normalizar identificadores viejos como calculator_pizza
      const normalizedId =
        initialChapterId === 'calculator_pizza'
          ? 'insulin_calculator'
          : initialChapterId === 'food_analyzer_ai'
          ? 'food_analyzer'
          : initialChapterId === 'workout_factor42'
          ? 'workout_routine'
          : initialChapterId === 'renal_protection'
          ? 'daily_tracker'
          : initialChapterId;

      const idx = chapters.findIndex((c) => c.id === normalizedId);
      if (idx !== -1) {
        setActiveChapterIndex(idx);
        setCurrentStepIndex(0);
        setIsPlaying(false);
      }
    }
  }, [initialChapterId, chapters]);

  const chapter = chapters[activeChapterIndex] || chapters[0];
  const simulation =
    getSectionSimulation(chapter.id, activeSettings) ||
    SECTION_VIDEO_SIMULATIONS[chapter.id] ||
    SECTION_VIDEO_SIMULATIONS.insulin_calculator;
  const currentStep =
    simulation.frames[currentStepIndex] || simulation.frames[0];

  // Avance automático de escenas cuando está en reproducción
  useEffect(() => {
    if (!isOpen || !isPlaying) return;
    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev >= simulation.frames.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, playbackSpeed);
    return () => clearInterval(timer);
  }, [isOpen, isPlaying, simulation.frames.length, playbackSpeed]);

  if (!isOpen) return null;

  const isPump = activeSettings.insulinMode === 'pump';
  const isIport = activeSettings.insulinMode === 'iport';
  const sensorName = getSensorDisplayName(activeSettings.sensorBrand);
  const deliveryLabel = isPump ? '📟 Bomba de Insulina' : isIport ? '🛡️ Puerto i-Port' : '💉 Pluma Manual';
  const glucoseLabel = activeSettings.glucoseMode === 'cgm_nfc'
    ? '📲 Sensor NFC'
    : activeSettings.glucoseMode === 'pump_sensor'
    ? '📡 Sensor de Bomba'
    : activeSettings.glucoseMode === 'capillary'
    ? '🩸 Glucómetro Capilar'
    : '📟 Lector';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border-2 border-teal-500/70 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Reproductor */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-3 w-3 rounded-full bg-rose-500 animate-ping shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Video className="h-4.5 w-4.5 text-teal-400 shrink-0" />
                <h2 className="text-sm sm:text-base font-extrabold text-white truncate">
                  Video Tutoriales y Demostraciones de la App
                </h2>
              </div>
              <p className="text-[11px] sm:text-xs text-teal-300/90 font-medium truncate">
                {chapter.emoji} {chapter.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
            title="Cerrar video"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Indicador de Adaptación Automática al Perfil Real */}
        <div className="px-4 py-2 bg-gradient-to-r from-teal-950 via-slate-950 to-slate-900 border-b border-teal-500/30 flex items-center justify-between gap-2 flex-wrap text-xs text-teal-200">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-extrabold text-white">⚙️ Adaptado a tu perfil:</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-teal-500/40 text-teal-300 font-semibold text-[11px]">
              {deliveryLabel}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-teal-500/40 text-teal-300 font-semibold text-[11px]">
              {glucoseLabel} ({sensorName})
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-teal-500/40 text-amber-300 font-mono font-bold text-[11px]">
              FSI {activeSettings.isf || 28} • ICR {activeSettings.icr || 8} • Meta {activeSettings.targetGlucose || 110}
            </span>
          </div>
          <span className="text-[11px] text-teal-300/80 italic hidden md:inline">
            (Cambia automáticamente si modificas tu configuración)
          </span>
        </div>

        {/* Pestañas de Capítulos / Secciones de la App */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-3 sm:px-4 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
          {chapters.map((ch, idx) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => {
                setActiveChapterIndex(idx);
                setCurrentStepIndex(0);
                setIsPlaying(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer border ${
                idx === activeChapterIndex
                  ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md font-extrabold'
                  : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800'
              }`}
            >
              <span>{ch.emoji}</span>
              <span>{ch.title.split(':')[0]}</span>
            </button>
          ))}
        </div>

        {/* Contenido Principal del Reproductor */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
          {/* Subtítulo del Capítulo */}
          <div className="bg-teal-950/40 border border-teal-700/50 rounded-2xl p-3 flex items-start gap-2.5">
            <span className="text-xl sm:text-2xl shrink-0">{chapter.emoji}</span>
            <div className="text-xs text-slate-200 space-y-0.5 min-w-0">
              <span className="font-extrabold text-teal-300 block text-xs sm:text-sm break-words">
                {chapter.title}
              </span>
              <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed break-words">
                {chapter.subtitle}
              </p>
            </div>
          </div>

          {/* Caja del Video Simulado (Celular Real) */}
          <div className="bg-slate-950 border-2 border-teal-500/40 rounded-2xl p-3 sm:p-4 space-y-3.5 shadow-2xl relative overflow-hidden">
            {/* Barra Superior de la Escena Actual */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2.5 py-0.5 rounded-full bg-teal-950 border border-teal-700 text-teal-300 font-mono text-[11px] font-bold shrink-0">
                  {currentStep.visualBadge}
                </span>
                <span className="text-[11px] font-mono text-slate-400 shrink-0">
                  Escena {currentStepIndex + 1} de {simulation.frames.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {simulation.frames.map((_, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentStepIndex(sIdx);
                    }}
                    title={`Ir a escena ${sIdx + 1}`}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      sIdx === currentStepIndex
                        ? 'w-7 bg-teal-400'
                        : 'w-2 bg-slate-700 hover:bg-slate-600'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Pantalla Simulada del Celular (Mockup Real de la App) */}
            <RealisticMiniAppScreen
              sectionId={chapter.id}
              frameIndex={currentStepIndex}
              settings={activeSettings}
            />

            {/* Título y Explicación del Paso (Sin cortes de texto) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1.5 shadow-inner">
              <div className="flex items-start justify-between gap-2 flex-wrap sm:flex-nowrap">
                <h3 className="text-xs sm:text-sm font-extrabold text-white break-words leading-snug flex-1">
                  {currentStep.stepTitle}
                </h3>
                <span className="text-[10px] font-mono text-teal-400 bg-teal-950 px-2 py-0.5 rounded-full border border-teal-700 shrink-0">
                  Paso {currentStepIndex + 1}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed break-words">
                {currentStep.description}
              </p>
            </div>
          </div>
        </div>

        {/* Footer de Controles de Reproducción */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span>{isPlaying ? 'Pausar' : 'Reproducir'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIndex(0);
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Reiniciar video desde el inicio"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentStepIndex === 0}
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIndex((prev) => Math.max(0, prev - 1));
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 border transition ${
                currentStepIndex === 0
                  ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 cursor-pointer'
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Anterior</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                if (currentStepIndex < simulation.frames.length - 1) {
                  setCurrentStepIndex((prev) => prev + 1);
                } else {
                  // Si terminó este capítulo, pasar al siguiente
                  setActiveChapterIndex(
                    (cPrev) => (cPrev + 1) % chapters.length
                  );
                  setCurrentStepIndex(0);
                }
              }}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs flex items-center gap-1 transition cursor-pointer shadow-md"
            >
              <span>
                {currentStepIndex < simulation.frames.length - 1
                  ? 'Siguiente paso'
                  : 'Siguiente capítulo →'}
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
