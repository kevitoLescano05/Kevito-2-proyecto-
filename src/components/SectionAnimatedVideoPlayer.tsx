import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Video, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';

interface SimulationScene {
  badge: string;
  title: string;
  description: string;
  mockItems: { label: string; value: string; highlight?: boolean }[];
}

const SECTION_SIMULATIONS: Record<string, { title: string; emoji: string; scenes: SimulationScene[] }> = {
  insulin_calculator: {
    title: 'Demostración en Video Amplio: Calculadora (Glucemia 180, FSI 28, ICR 8 y Pizza)',
    emoji: '🍕',
    scenes: [
      {
        badge: '🩸 Glucemia: 180 mg/dL',
        title: 'Paso 1: Ingreso de Glucemia Actual y Tendencia',
        description: 'Ingresás 180 mg/dL con flecha estable. El sistema aplica automáticamente tu FSI de 28 y objetivo de 110.',
        mockItems: [
          { label: 'Glucemia Actual', value: '180 mg/dL (Estable ➡️)', highlight: true },
          { label: 'Sensibilidad FSI', value: '28 mg/dL por 1 U' },
        ],
      },
      {
        badge: '🍕 35g HC + Grasa/Proteína',
        title: 'Paso 2: Carga de Porción de Pizza',
        description: 'Agregás 1 porción de pizza (35g Carbs) con tu ICR base de 8 g HC por 1 U.',
        mockItems: [
          { label: 'Carbohidratos Netos', value: '35.0 g Carbs', highlight: true },
          { label: 'Ratio ICR Aplicado', value: '8.0 g HC por 1 U' },
        ],
      },
      {
        badge: '⚙️ Corrección y IOB',
        title: 'Paso 3: Resta de Insulina Activa (IOB)',
        description: 'Calcula la corrección (+2.50 U) y resta 0.50 U de insulina activa presente en tu cuerpo.',
        mockItems: [
          { label: 'Insulina Activa (IOB)', value: '-0.50 U en cuerpo', highlight: true },
          { label: 'Dosis Neta Calculada', value: '6.5 U Total' },
        ],
      },
      {
        badge: '📍 Abdomen Bajo + Bolo Dividido',
        title: 'Paso 4: Sugerencia 60/40 y Zona de Pinchazo',
        description: 'Sugiere 60% ahora (4.0 U) en Abdomen Bajo y 40% en 1.5 horas (2.5 U).',
        mockItems: [
          { label: '1ª Dosis (Ahora)', value: '4.0 U (Abdomen Bajo)', highlight: true },
          { label: '2ª Dosis (En 1h 30m)', value: '2.5 U (Programada)' },
        ],
      },
    ],
  },
  food_analyzer: {
    title: 'Demostración en Video Amplio: Buscador y Analizador IA de Comidas',
    emoji: '📸',
    scenes: [
      {
        badge: '⭐ Favoritos de 1 Clic',
        title: 'Paso 1: Acceso Instantáneo a Favoritos',
        description: 'Tocás tu favorito guardado ("Café con leche + 2 tostadas") y se carga al plato al instante.',
        mockItems: [
          { label: 'Alimento Favorito', value: 'Café con leche + Tostadas', highlight: true },
          { label: 'Carbohidratos', value: '30.0 g HC' },
        ],
      },
      {
        badge: '📸 IA con Ciencia de Absorción',
        title: 'Paso 2: Análisis Fotográfico del Plato',
        description: 'Sacás foto a tu plato y la IA detecta almidones y grasas ajustando el pre-bolo automáticamente.',
        mockItems: [
          { label: 'Análisis IA', value: 'Plato procesado con éxito', highlight: true },
          { label: 'Envío', value: 'Directo a la Calculadora' },
        ],
      },
    ],
  },
  workout_routine: {
    title: 'Demostración en Video Amplio: Rutina de Ejercicio y Factor 42',
    emoji: '🏋️‍♂️',
    scenes: [
      {
        badge: '⚖️ Peso: 70 kg',
        title: 'Paso 1: Selección de Deporte y Peso',
        description: 'Elegís Pesas o Caminata (60 min) y tu peso corporal para calcular calorías exactas.',
        mockItems: [
          { label: 'Actividad Física', value: 'Pesas (Moderada) - 60 min', highlight: true },
          { label: 'Calorías Quemadas', value: '+340 kcal estimadas' },
        ],
      },
      {
        badge: '⚡ Factor Sensibilidad Activo',
        title: 'Paso 2: Botón Hecho y Ajuste',
        description: 'Al marcarlo como hecho, se activa la mejora en tu sensibilidad a la insulina.',
        mockItems: [
          { label: 'Factor 42', value: 'Sensibilidad mejorada activa', highlight: true },
          { label: 'Protección', value: 'Prevención de hipoglucemias' },
        ],
      },
    ],
  },
  devices_tracker: {
    title: 'Demostración en Video Amplio: Control de Días de Sensor y Puerto',
    emoji: '⏱️',
    scenes: [
      {
        badge: '⏱️ Sensor Día 10 / 14',
        title: 'Paso 1: Vida Útil en Vivo del Sensor',
        description: 'La app cuenta automáticamente los días transcurridos de tu sensor FreeStyle Libre o puerto i-Port.',
        mockItems: [
          { label: 'Dispositivo', value: 'FreeStyle Libre 2/3', highlight: true },
          { label: 'Días Restantes', value: '4 días para recambio' },
        ],
      },
    ],
  },
  daily_tracker: {
    title: 'Demostración en Video Amplio: Monitor Diario y Protección Renal',
    emoji: '🛡️',
    scenes: [
      {
        badge: '🛡️ Renal y Proteínas',
        title: 'Paso 1: Control de Macros y Renal',
        description: 'Vigila el límite estricto de proteínas animales y el balance de calorías diarias consumidas.',
        mockItems: [
          { label: 'Proteína Animal', value: 'Bajo control renal estricto', highlight: true },
          { label: 'Calorías Totales', value: '1,650 / 2,000 kcal' },
        ],
      },
    ],
  },
};

export const SectionAnimatedVideoPlayer: React.FC<{ sectionKey: string }> = ({ sectionKey }) => {
  const data = SECTION_SIMULATIONS[sectionKey] || SECTION_SIMULATIONS['insulin_calculator'];
  const [sceneIdx, setSceneIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setSceneIdx((prev) => (prev + 1) % data.scenes.length);
    }, 3600);
    return () => clearInterval(timer);
  }, [isPlaying, data.scenes.length]);

  const currentScene = data.scenes[sceneIdx] || data.scenes[0];

  return (
    <div className="w-full max-w-4xl mx-auto bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/60 border-2 border-teal-500/70 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6 mb-8">
      {/* Top Video Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="h-3.5 w-3.5 rounded-full bg-rose-500 animate-ping" />
          <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-teal-300 flex items-center gap-2">
            <Video className="h-5 w-5 text-teal-400" />
            <span>{data.title}</span>
          </span>
        </div>
        <span className="text-xs font-mono px-3 py-1 rounded-xl bg-teal-950 border border-teal-600 text-teal-300 font-bold shadow-inner">
          {currentScene.badge}
        </span>
      </div>

      {/* Simulated Large Screen Box */}
      <div className="w-full bg-slate-950 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-inner">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h4 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <span>{currentScene.title}</span>
          </h4>
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800">
            Escena {sceneIdx + 1} de {data.scenes.length}
          </span>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
          {currentScene.description}
        </p>

        {/* Large Mock UI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {currentScene.mockItems.map((item, mIdx) => (
            <div
              key={mIdx}
              className={`p-3.5 rounded-xl border text-xs sm:text-sm transition duration-300 ${
                item.highlight
                  ? 'bg-teal-950/80 border-teal-500 text-teal-200 shadow-lg ring-1 ring-teal-500/40'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              <span className="text-xs text-slate-400 block font-mono uppercase tracking-wider">
                {item.label}
              </span>
              <strong className="text-white text-sm sm:text-base block font-extrabold mt-1">
                {item.value}
              </strong>
            </div>
          ))}
        </div>
      </div>

      {/* Large Player Controls */}
      <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer shadow-md"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{isPlaying ? 'Pausar Reproducción' : 'Reproducir Demostración'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setSceneIdx(0);
            }}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title="Reiniciar video"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Scene Dots */}
        <div className="flex items-center gap-1.5">
          {data.scenes.map((_, sIdx) => (
            <button
              key={sIdx}
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setSceneIdx(sIdx);
              }}
              className={`h-2.5 rounded-full transition-all cursor-pointer ${
                sIdx === sceneIdx
                  ? 'w-8 bg-teal-400'
                  : 'w-2.5 bg-slate-700 hover:bg-slate-600'
              }`}
              title={`Ir a escena ${sIdx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
