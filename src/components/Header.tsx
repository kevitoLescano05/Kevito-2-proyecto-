import React from 'react';
import { UserSettings } from '../types';
import { getRapidInsulinInfo } from '../utils/insulinMath';
import { Activity, Settings, HeartPulse, HelpCircle, Video } from 'lucide-react';

interface HeaderProps {
  settings: UserSettings;
  onOpenSettings: () => void;
  iobValue: number;
  onOpenIobModal: () => void;
  onOpenTutorial?: () => void;
  onOpenVideoDemo?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onOpenSettings,
  iobValue,
  onOpenIobModal,
  onOpenTutorial,
  onOpenVideoDemo,
}) => {
  const rapidInfo = getRapidInsulinInfo(settings.rapidInsulinBrand);

  return (
    <header id="section-top-header" className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-3">
          
          {/* Logo & Clinical Info */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-inner shrink-0">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-100">
                  InsulinCalc T1D
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Calculadora y Comidas
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Insulina: <span className="text-teal-300 font-semibold">{rapidInfo.shortName}</span>
              </p>
            </div>
          </div>

          {/* Clean Controls: IOB Badge + Video Demo + Help (?) + Settings (⚙️) */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            
            {/* Active IOB Indicator */}
            <button
              onClick={onOpenIobModal}
              id="btn-active-iob-badge"
              className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-950/70 border border-indigo-700/60 hover:bg-indigo-900/80 transition text-xs text-indigo-200 shadow-sm cursor-pointer"
              title="Ver curva de insulina activa restante"
            >
              <HeartPulse className="h-4 w-4 text-indigo-400 animate-pulse shrink-0" />
              <span className="hidden xs:inline text-[11px] sm:text-xs">Insulina Activa:</span>
              <span className="font-bold text-indigo-300 text-xs sm:text-sm">
                {iobValue > 0 ? `${iobValue.toFixed(2)} U` : '0.0 U'}
              </span>
            </button>

            {/* Video Demo Button */}
            {onOpenVideoDemo && (
              <button
                onClick={onOpenVideoDemo}
                id="btn-open-video-demo"
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-gradient-to-r from-rose-500/20 to-teal-500/20 border border-teal-500/50 text-teal-200 hover:bg-teal-500/30 transition text-xs font-extrabold cursor-pointer shadow-sm flex items-center gap-1.5 animate-pulse"
                title="Ver Video Tutoriales de la App (Ejemplos Reales: Glucosa 180, FSI 28, ICR 8)"
                aria-label="Ver Video Demo"
              >
                <Video className="h-4 w-4 text-rose-400" />
                <span className="hidden sm:inline">📺 Video Demo</span>
              </button>
            )}

            {/* Tutorial / Guía Interactiva Button */}
            {onOpenTutorial && (
              <button
                onClick={onOpenTutorial}
                id="btn-open-tutorial-guide"
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-teal-500/15 border border-teal-500/40 text-teal-300 hover:bg-teal-500/25 transition text-xs font-bold cursor-pointer shadow-sm flex items-center gap-1.5"
                title="Abrir Guía Tutorial paso a paso"
                aria-label="Abrir Guía Tutorial"
              >
                <HelpCircle className="h-4 w-4 text-teal-400" />
                <span className="hidden sm:inline">Guía</span>
              </button>
            )}

            {/* Config Button (Tuerca ⚙️) */}
            <button
              onClick={onOpenSettings}
              id="btn-open-settings"
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer shadow-sm"
              title="Abrir Configuración (Mi Cuenta, Nube, Dosis, Dispositivos)"
              aria-label="Abrir Configuración"
            >
              <Settings className="h-5 w-5 text-teal-300" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
