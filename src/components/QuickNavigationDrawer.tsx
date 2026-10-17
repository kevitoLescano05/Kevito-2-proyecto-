import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  X,
  Syringe,
  Search,
  Dumbbell,
  ShieldAlert,
  History,
  MessageSquareHeart,
  Handshake,
  Dna,
  Cpu,
  Sliders,
  HelpCircle,
  HeartPulse,
} from 'lucide-react';

export interface QuickNavSectionItem {
  id: string;
  domId: string;
  numberLabel: string;
  emoji: string;
  shortTitle: string;
  subtitle: string;
  accentColor: string;
  badgeBg: string;
}

export const QUICK_NAV_SECTIONS: QuickNavSectionItem[] = [
  {
    id: 'devices',
    domId: 'section-devices-tracker',
    numberLabel: '1',
    emoji: '⏱️',
    shortTitle: 'Mis Dispositivos (Sensor / Bomba / i-Port)',
    subtitle: 'Días de uso y alertas de vencimiento',
    accentColor: 'text-cyan-300',
    badgeBg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
  },
  {
    id: 'calculator',
    domId: 'section-insulin-calculator',
    numberLabel: '2',
    emoji: '💉',
    shortTitle: 'Calculadora de Insulina y Bolos',
    subtitle: 'Conteo de HC, Dosis Fijas, Comida Reciente y Bolo Dividido',
    accentColor: 'text-teal-300',
    badgeBg: 'bg-teal-500/15 border-teal-500/30 text-teal-300',
  },
  {
    id: 'food_analyzer',
    domId: 'section-food-analyzer',
    numberLabel: '3',
    emoji: '📸',
    shortTitle: 'Buscador de Alimentos, IA y Escáner',
    subtitle: 'Tablas oficiales, foto con IA y lector de código de barras',
    accentColor: 'text-emerald-300',
    badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
  },
  {
    id: 'workout',
    domId: 'section-daily-workout',
    numberLabel: '4',
    emoji: '🏋️',
    shortTitle: 'Ejercicio y Rutina Diaria',
    subtitle: 'Pesas, caminata y ajuste automático de calorías',
    accentColor: 'text-amber-300',
    badgeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
  },
  {
    id: 'daily_tracker',
    domId: 'section-daily-tracker',
    numberLabel: '5',
    emoji: '🛡️',
    shortTitle: 'Monitor Renal y Calorías de Hoy',
    subtitle: 'Proteínas g/kg, calorías del día y registro de comidas',
    accentColor: 'text-sky-300',
    badgeBg: 'bg-sky-500/15 border-sky-500/30 text-sky-300',
  },
  {
    id: 'history',
    domId: 'section-permanent-history',
    numberLabel: '6',
    emoji: '📚',
    shortTitle: 'Historial Permanente y Reporte PDF',
    subtitle: 'Archivo por fecha, buscador y exportación para el médico',
    accentColor: 'text-indigo-300',
    badgeBg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300',
  },
  {
    id: 'community',
    domId: 'section-community-reviews',
    numberLabel: '7',
    emoji: '💬',
    shortTitle: 'Comunidad y Comentarios',
    subtitle: 'Dejá tu comentario, duda o sugerencia con 1 toque',
    accentColor: 'text-pink-300',
    badgeBg: 'bg-pink-500/15 border-pink-500/30 text-pink-300',
  },
  {
    id: 'sponsors',
    domId: 'section-sponsors-donations',
    numberLabel: '8',
    emoji: '🤝',
    shortTitle: 'Comercios Recomendados y Apoyo',
    subtitle: 'Directorio por país y colaboración con la app',
    accentColor: 'text-purple-300',
    badgeBg: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
  },
  {
    id: 'glycemic_factors',
    domId: 'section-glycemic-factors',
    numberLabel: '9',
    emoji: '🧬',
    shortTitle: 'Los 42 Factores de la Glucosa',
    subtitle: 'Guía interactiva de todo lo que sube o baja el azúcar',
    accentColor: 'text-rose-300',
    badgeBg: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
  },
];

/**
 * Realiza un scroll suave hacia la sección indicada, compensando la altura de la barra superior fija
 * y aplicando un breve destello visual para que el usuario identifique la sección al instante.
 */
export function scrollToAppSection(domId: string) {
  if (domId === 'top') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const targetEl = document.getElementById(domId);
  if (!targetEl) return;

  const headerEl = document.getElementById('section-top-header');
  const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 76;
  const elementPosition = targetEl.getBoundingClientRect().top + window.scrollY;
  const offsetPosition = Math.max(0, elementPosition - headerHeight - 14);

  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth',
  });

  // Efecto visual de destello breve para ubicar la sección
  targetEl.classList.add(
    'ring-2',
    'ring-teal-400/80',
    'ring-offset-4',
    'ring-offset-slate-950',
    'rounded-2xl',
    'transition-all',
    'duration-500'
  );
  window.setTimeout(() => {
    targetEl.classList.remove(
      'ring-2',
      'ring-teal-400/80',
      'ring-offset-4',
      'ring-offset-slate-950'
    );
  }, 1600);
}

interface HeaderQuickNavDropdownProps {
  onOpenSettings?: () => void;
  onOpenIobModal?: () => void;
  onOpenTutorial?: () => void;
}

/**
 * Botón y menú desplegable integrado en la Barra Superior (siempre visible arriba de todo)
 */
export const HeaderQuickNavDropdown: React.FC<HeaderQuickNavDropdownProps> = ({
  onOpenSettings,
  onOpenIobModal,
  onOpenTutorial,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectSection = (domId: string) => {
    setIsOpen(false);
    scrollToAppSection(domId);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        id="btn-quick-nav-header"
        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer shadow-sm ${
          isOpen
            ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-teal-500/20'
            : 'bg-teal-500/20 border-teal-400/60 text-teal-200 hover:bg-teal-500/30 hover:text-white'
        }`}
        title="Menú desplegable de atajos rápidos para ir a cualquier sección con un toque"
      >
        <Compass className={`h-4 w-4 shrink-0 ${isOpen ? 'text-slate-950' : 'text-teal-300'}`} />
        <span>Ir a Sección</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-slate-950' : 'text-teal-300'
          }`}
        />
      </button>

      {isOpen && (
        <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 mt-2 sm:w-96 max-h-[82vh] overflow-y-auto rounded-2xl bg-slate-900/98 backdrop-blur-xl border border-teal-500/40 shadow-2xl shadow-black/80 z-50 divide-y divide-slate-800 animate-in fade-in zoom-in-95 duration-150">
          {/* Encabezado del menú desplegable */}
          <div className="p-3.5 bg-slate-950/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-teal-400" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-teal-300">
                  Atajos Rápidos de la App
                </h3>
                <p className="text-[11px] text-slate-400">
                  Tocá cualquier sección para saltar directo sin scrollear
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white"
              aria-label="Cerrar menú de atajos"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Lista de las 9 secciones */}
          <div className="p-2 space-y-1">
            {QUICK_NAV_SECTIONS.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => handleSelectSection(sec.domId)}
                className="w-full flex items-center justify-between gap-2.5 p-2.5 rounded-xl hover:bg-slate-800/90 active:bg-slate-800 transition text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center text-sm shrink-0 font-bold ${sec.badgeBg}`}
                  >
                    {sec.emoji}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-100 group-hover:text-teal-300 transition truncate">
                      {sec.numberLabel}. {sec.shortTitle}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {sec.subtitle}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-0.5 transition shrink-0" />
              </button>
            ))}
          </div>

          {/* Accesos rápidos extra a ventanas clave */}
          <div className="p-2.5 bg-slate-950/60 flex flex-wrap items-center justify-between gap-1.5">
            <button
              type="button"
              onClick={() => handleSelectSection('top')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 transition cursor-pointer"
            >
              <ArrowUp className="h-3.5 w-3.5 text-teal-400" />
              <span>Subir al Inicio</span>
            </button>

            <div className="flex items-center gap-1.5">
              {onOpenIobModal && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenIobModal();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-950/70 border border-indigo-700/50 hover:bg-indigo-900/70 text-[11px] font-semibold text-indigo-200 transition cursor-pointer"
                >
                  <HeartPulse className="h-3.5 w-3.5 text-indigo-400" />
                  <span>IOB</span>
                </button>
              )}
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenSettings();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 transition cursor-pointer"
                >
                  <Sliders className="h-3.5 w-3.5 text-teal-400" />
                  <span>Configuración</span>
                </button>
              )}
              {onOpenTutorial && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenTutorial();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-950/70 border border-teal-700/50 hover:bg-teal-900/70 text-[11px] font-semibold text-teal-200 transition cursor-pointer"
                >
                  <HelpCircle className="h-3.5 w-3.5 text-teal-400" />
                  <span>Tutorial</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface FloatingQuickNavMenuProps {
  onOpenSettings?: () => void;
  onOpenIobModal?: () => void;
  onOpenTutorial?: () => void;
}

/**
 * Pestaña / Menú Lateral Desplegable Flotante a un costado de la pantalla
 * Siempre a mano mientras scrolleás para saltar con 1 toque a cualquier sección o volver arriba.
 */
export const FloatingQuickNavMenu: React.FC<FloatingQuickNavMenuProps> = ({
  onOpenSettings,
  onOpenIobModal,
  onOpenTutorial,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string>('section-insulin-calculator');
  const [showScrollTopBtn, setShowScrollTopBtn] = useState(false);

  // Detectar en qué sección está parado el usuario al scrollear
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setShowScrollTopBtn(scrollY > 420);

      const viewportCheckPoint = scrollY + 180;
      let currentId = QUICK_NAV_SECTIONS[0].domId;

      for (const sec of QUICK_NAV_SECTIONS) {
        const el = document.getElementById(sec.domId);
        if (el) {
          const top = el.offsetTop;
          if (viewportCheckPoint >= top) {
            currentId = sec.domId;
          }
        }
      }
      setActiveSectionId(currentId);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleJumpTo = (domId: string) => {
    setIsDrawerOpen(false);
    scrollToAppSection(domId);
  };

  const activeSectionObj =
    QUICK_NAV_SECTIONS.find((s) => s.domId === activeSectionId) ||
    QUICK_NAV_SECTIONS[1];

  return (
    <>
      {/* Botones flotantes discretos pegados al borde derecho de la pantalla */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-end gap-2 pointer-events-none">
        {/* Pestaña lateral principal "🧭 Secciones" */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Abrir menú lateral de atajos a secciones"
          title="Abrir menú de atajos para saltar a cualquier sección de la app"
          className="pointer-events-auto flex items-center gap-1.5 pl-3 pr-2.5 py-2.5 rounded-l-2xl bg-slate-900/95 hover:bg-teal-950/95 text-teal-300 border-y border-l border-teal-500/50 shadow-xl shadow-black/70 transition-all duration-200 hover:pr-4 cursor-pointer group"
        >
          <Compass className="h-4 w-4 text-teal-400 group-hover:rotate-45 transition-transform shrink-0" />
          <div className="flex flex-col items-start leading-none">
            <span className="text-[11px] font-extrabold tracking-tight text-teal-200">
              Secciones
            </span>
            <span className="text-[9px] text-slate-400 hidden sm:inline">
              {activeSectionObj.emoji} #{activeSectionObj.numberLabel}
            </span>
          </div>
        </button>

        {/* Botón rápido para volver arriba del todo cuando scrolleaste hacia abajo */}
        {showScrollTopBtn && (
          <button
            type="button"
            onClick={() => scrollToAppSection('top')}
            aria-label="Volver arriba de todo"
            title="Subir al inicio de la app"
            className="pointer-events-auto flex items-center gap-1 pl-2.5 pr-2 py-2 rounded-l-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-teal-300 border-y border-l border-slate-700/80 shadow-lg transition cursor-pointer"
          >
            <ArrowUp className="h-3.5 w-3.5 text-teal-400" />
            <span className="text-[10px] font-bold">Arriba</span>
          </button>
        )}
      </div>

      {/* Cajón Lateral Desplegable (Side Drawer) cuando se toca la pestaña "Secciones" */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Fondo oscurecido clickeable para cerrar */}
          <div
            className="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Panel lateral derecho */}
          <aside className="relative w-full max-w-sm bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between z-10 shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Cabecera del panel lateral */}
            <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/40 flex items-center justify-center text-teal-300">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-100">
                    Menú Rápido de Secciones
                  </h2>
                  <p className="text-xs text-slate-400">
                    Tocá una sección para ir directo sin scrollear
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                aria-label="Cerrar menú lateral"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Listado de todas las secciones con indicador de sección actual */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {QUICK_NAV_SECTIONS.map((sec) => {
                const isCurrent = activeSectionId === sec.domId;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => handleJumpTo(sec.domId)}
                    className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
                      isCurrent
                        ? 'bg-teal-950/60 border-teal-500/60 shadow-md shadow-teal-950/40'
                        : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center text-base shrink-0 ${sec.badgeBg}`}
                      >
                        {sec.emoji}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-100 truncate">
                            {sec.numberLabel}. {sec.shortTitle}
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-teal-500/20 text-teal-300 border border-teal-500/40 shrink-0">
                              Aquí
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {sec.subtitle}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 ${
                        isCurrent ? 'text-teal-400' : 'text-slate-500'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Pie del panel lateral con botones de Inicio, IOB, Configuración y Tutorial */}
            <div className="p-3.5 bg-slate-950 border-t border-slate-800 space-y-2">
              <button
                type="button"
                onClick={() => handleJumpTo('top')}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-teal-300 transition cursor-pointer"
              >
                <ArrowUp className="h-4 w-4" />
                <span>Subir al Inicio de la App</span>
              </button>

              <div className="grid grid-cols-3 gap-2">
                {onOpenIobModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onOpenIobModal();
                    }}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-indigo-950/50 border border-indigo-700/40 hover:bg-indigo-900/60 text-[11px] font-semibold text-indigo-200 transition cursor-pointer"
                  >
                    <HeartPulse className="h-4 w-4 text-indigo-400" />
                    <span>Ver IOB</span>
                  </button>
                )}
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onOpenSettings();
                    }}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-slate-800/80 border border-slate-700 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 transition cursor-pointer"
                  >
                    <Sliders className="h-4 w-4 text-teal-400" />
                    <span>Ajustes</span>
                  </button>
                )}
                {onOpenTutorial && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onOpenTutorial();
                    }}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-teal-950/50 border border-teal-700/40 hover:bg-teal-900/60 text-[11px] font-semibold text-teal-200 transition cursor-pointer"
                  >
                    <HelpCircle className="h-4 w-4 text-teal-400" />
                    <span>Tutorial</span>
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
