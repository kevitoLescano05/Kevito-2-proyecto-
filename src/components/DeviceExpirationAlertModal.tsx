import React, { useState } from 'react';
import { UserSettings } from '../types';
import {
  getExpiredDevicesList,
  computePlacedDateFromDayOfWear,
  ExpiredDeviceNotice,
  DEFAULT_SENSOR_DURATION_BY_BRAND,
} from '../utils/iportDayTracker';
import { getLogicalDateKey } from '../utils/dateCutoff';
import { SENSOR_BRAND_CATALOG } from '../utils/cgmService';
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Clock,
  Settings,
  Radio,
  Syringe,
  Cpu,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface DeviceExpirationAlertModalProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onOpenGlobalSettings?: () => void;
}

export const DeviceExpirationAlertModal: React.FC<DeviceExpirationAlertModalProps> = ({
  settings,
  onUpdateSettings,
  onOpenGlobalSettings,
}) => {
  const [sessionDismissed, setSessionDismissed] = useState<boolean>(false);
  const [isQuickConfigOpen, setIsQuickConfigOpen] = useState<boolean>(false);

  const cutoff = settings.dayCutoffHour ?? 2;
  const todayKey = getLogicalDateKey(cutoff, new Date());

  const expiredNotices = getExpiredDevicesList(settings, false);
  const allExpiredEvenIfDismissed = getExpiredDevicesList(settings, true);

  const activeSensorBrand =
    SENSOR_BRAND_CATALOG.find((b) => b.id === (settings.sensorBrand || 'freestyle_libre')) ||
    SENSOR_BRAND_CATALOG[0];

  const sensorTracker = settings.sensorTracker || {
    enabled:
      settings.glucoseMode === 'cgm_nfc' ||
      settings.glucoseMode === 'cgm_reader' ||
      settings.glucoseMode === 'pump_sensor',
    targetDurationDays:
      DEFAULT_SENSOR_DURATION_BY_BRAND[settings.sensorBrand || 'freestyle_libre'] || 14,
    currentDayOfWear: 1,
    placedDate: todayKey,
  };

  const pumpTracker = settings.pumpSetTracker || {
    enabled: settings.insulinMode === 'pump',
    targetDurationDays: 3,
    currentDayOfWear: 1,
    placedDate: todayKey,
  };

  const iPortState = settings.iPortState || {
    site: 'abdomen',
    subSite: 'abdomen_lower_fat',
    dayOfWear: 1,
    targetDurationDays: 4,
    placedDate: todayKey,
  };

  // Reiniciar un dispositivo a Día 1 (Colocado / Cambiado hoy)
  const handleResetDeviceToDayOne = (deviceType: 'sensor' | 'pump_set' | 'iport') => {
    if (deviceType === 'sensor') {
      onUpdateSettings({
        ...settings,
        sensorTracker: {
          ...sensorTracker,
          enabled: true,
          currentDayOfWear: 1,
          placedDate: todayKey,
          dismissedAlertForDate: undefined,
        },
      });
    } else if (deviceType === 'pump_set') {
      onUpdateSettings({
        ...settings,
        pumpSetTracker: {
          ...pumpTracker,
          enabled: true,
          currentDayOfWear: 1,
          placedDate: todayKey,
          dismissedAlertForDate: undefined,
        },
      });
    } else if (deviceType === 'iport') {
      onUpdateSettings({
        ...settings,
        iPortState: {
          ...iPortState,
          dayOfWear: 1,
          placedDate: todayKey,
          dismissedAlertForDate: undefined,
        },
      });
    }
  };

  // Posponer aviso por el resto de hoy (volverá a avisar mañana al abrir la app)
  const handleSnoozeDeviceForToday = (deviceType: 'sensor' | 'pump_set' | 'iport') => {
    if (deviceType === 'sensor') {
      onUpdateSettings({
        ...settings,
        sensorTracker: {
          ...sensorTracker,
          dismissedAlertForDate: todayKey,
        },
      });
    } else if (deviceType === 'pump_set') {
      onUpdateSettings({
        ...settings,
        pumpSetTracker: {
          ...pumpTracker,
          dismissedAlertForDate: todayKey,
        },
      });
    } else if (deviceType === 'iport') {
      onUpdateSettings({
        ...settings,
        iPortState: {
          ...iPortState,
          dismissedAlertForDate: todayKey,
        },
      });
    }
  };

  // Cambiar manualmente el día actual o los días estipulados desde la barra rápida
  const handleUpdateDeviceDays = (
    deviceType: 'sensor' | 'pump_set' | 'iport',
    newCurrentDay: number,
    newTargetDays: number,
    newEnabled: boolean = true
  ) => {
    const safeCurrent = Math.max(0, Math.round(newCurrentDay || 0));
    const safeTarget = Math.max(0, Math.round(newTargetDays || 0));
    const computedPlaced = computePlacedDateFromDayOfWear(Math.max(1, safeCurrent), cutoff);

    if (deviceType === 'sensor') {
      onUpdateSettings({
        ...settings,
        sensorTracker: {
          ...sensorTracker,
          enabled: newEnabled,
          currentDayOfWear: safeCurrent,
          targetDurationDays: safeTarget,
          placedDate: computedPlaced,
          dismissedAlertForDate: undefined,
        },
      });
    } else if (deviceType === 'pump_set') {
      onUpdateSettings({
        ...settings,
        pumpSetTracker: {
          ...pumpTracker,
          enabled: newEnabled,
          currentDayOfWear: safeCurrent,
          targetDurationDays: safeTarget,
          placedDate: computedPlaced,
          dismissedAlertForDate: undefined,
        },
      });
    } else if (deviceType === 'iport') {
      onUpdateSettings({
        ...settings,
        iPortState: {
          ...iPortState,
          dayOfWear: safeCurrent,
          targetDurationDays: safeTarget,
          placedDate: computedPlaced,
          dismissedAlertForDate: undefined,
        },
      });
    }
  };

  const getDeviceIcon = (type: ExpiredDeviceNotice['deviceType']) => {
    if (type === 'sensor') return <Radio className="h-5 w-5 text-cyan-400 shrink-0" />;
    if (type === 'pump_set') return <Cpu className="h-5 w-5 text-indigo-400 shrink-0" />;
    return <Syringe className="h-5 w-5 text-teal-400 shrink-0" />;
  };

  const showStartupModal =
    Boolean(settings.isProfileConfigured) &&
    !sessionDismissed &&
    expiredNotices.length > 0;

  return (
    <>
      {/* 1. MODAL AUTOMÁTICO AL ABRIR LA APP CUANDO SE CUMPLIERON LOS DÍAS ESTIPULADOS */}
      {showStartupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-amber-950/90 via-rose-950/70 to-slate-900 p-4 border-b border-amber-500/40 flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 shrink-0">
                <AlertTriangle className="h-6 w-6 animate-pulse" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Aviso Automático de Duración de Dispositivos
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-white mt-1">
                  ⏰ ¡Se cumplieron los días estipulados de cambio!
                </h3>
                <p className="text-xs text-amber-100/90 mt-0.5">
                  Detectamos al abrir la app que {expiredNotices.length === 1 ? 'uno de tus dispositivos llegó' : 'tus dispositivos llegaron'} a su fecha límite configurada:
                </p>
              </div>
            </div>

            <div className="p-4 space-y-3 max-h-[65vh] overflow-y-auto">
              {expiredNotices.map((notice) => (
                <div
                  key={notice.deviceType}
                  className="bg-slate-950/90 border border-amber-500/50 rounded-xl p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(notice.deviceType)}
                      <span className="text-sm font-bold text-white">{notice.title}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      Día {notice.currentDay} de {notice.targetDays} estipulados
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {notice.clinicalReason}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleResetDeviceToDayOne(notice.deviceType)}
                      className="flex-1 min-w-[200px] py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>¡Ya lo cambié hoy! (Reiniciar a Día 1)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSnoozeDeviceForToday(notice.deviceType)}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Clock className="h-3.5 w-3.5 text-amber-400" />
                      <span>Avisarme mañana</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
              {onOpenGlobalSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setSessionDismissed(true);
                    onOpenGlobalSettings();
                  }}
                  className="text-xs text-teal-300 hover:text-teal-200 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Cambiar días estipulados en Configuración</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSessionDismissed(true)}
                className="ml-auto px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                Entendido, cerrar aviso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. BARRA GLOBAL COMPACTA DE ESTADO Y DURACIÓN DE DISPOSITIVOS (SENSOR, PUERTO i-PORT Y BOMBA) */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-3 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-teal-400" />
              <span>Control de Días de Dispositivos:</span>
            </span>

            {/* Badge Sensor de Glucosa */}
            {sensorTracker.enabled && (
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${
                  sensorTracker.currentDayOfWear >= sensorTracker.targetDurationDays
                    ? 'bg-rose-950/60 border-rose-500/60 text-rose-200 font-bold animate-pulse'
                    : sensorTracker.currentDayOfWear >= sensorTracker.targetDurationDays - 1
                    ? 'bg-amber-950/50 border-amber-500/50 text-amber-200'
                    : 'bg-slate-950 border-cyan-800/50 text-cyan-200'
                }`}
              >
                <Radio className="h-3.5 w-3.5 text-cyan-400" />
                <span>
                  Sensor ({activeSensorBrand.shortName}):{' '}
                  <strong className="font-mono">
                    Día {sensorTracker.currentDayOfWear}/{sensorTracker.targetDurationDays}
                  </strong>
                </span>
                {sensorTracker.currentDayOfWear >= sensorTracker.targetDurationDays && (
                  <button
                    type="button"
                    onClick={() => handleResetDeviceToDayOne('sensor')}
                    className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 text-[10px] font-extrabold hover:bg-emerald-400 transition cursor-pointer"
                    title="Marcar sensor cambiado hoy (Día 1)"
                  >
                    ¡Cambiado hoy!
                  </button>
                )}
              </div>
            )}

            {/* Badge Puerto i-Port Advance (si usa i-Port) */}
            {settings.insulinMode === 'iport' && (
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${
                  iPortState.dayOfWear >= (iPortState.targetDurationDays || 4)
                    ? 'bg-rose-950/60 border-rose-500/60 text-rose-200 font-bold animate-pulse'
                    : 'bg-slate-950 border-teal-800/50 text-teal-200'
                }`}
              >
                <Syringe className="h-3.5 w-3.5 text-teal-400" />
                <span>
                  Puerto i-Port:{' '}
                  <strong className="font-mono">
                    Día {iPortState.dayOfWear}/{iPortState.targetDurationDays || 4}
                  </strong>
                </span>
                {iPortState.dayOfWear >= (iPortState.targetDurationDays || 4) && (
                  <button
                    type="button"
                    onClick={() => handleResetDeviceToDayOne('iport')}
                    className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 text-[10px] font-extrabold hover:bg-emerald-400 transition cursor-pointer"
                    title="Marcar puerto cambiado hoy (Día 1)"
                  >
                    ¡Cambiado hoy!
                  </button>
                )}
              </div>
            )}

            {/* Badge Set de Bomba de Insulina (si usa Bomba o lo activó) */}
            {(pumpTracker.enabled || settings.insulinMode === 'pump') && (
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${
                  pumpTracker.currentDayOfWear >= pumpTracker.targetDurationDays
                    ? 'bg-rose-950/60 border-rose-500/60 text-rose-200 font-bold animate-pulse'
                    : 'bg-slate-950 border-indigo-800/50 text-indigo-200'
                }`}
              >
                <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                <span>
                  Set de Bomba:{' '}
                  <strong className="font-mono">
                    Día {pumpTracker.currentDayOfWear}/{pumpTracker.targetDurationDays}
                  </strong>
                </span>
                {pumpTracker.currentDayOfWear >= pumpTracker.targetDurationDays && (
                  <button
                    type="button"
                    onClick={() => handleResetDeviceToDayOne('pump_set')}
                    className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 text-[10px] font-extrabold hover:bg-emerald-400 transition cursor-pointer"
                    title="Marcar set de bomba cambiado hoy (Día 1)"
                  >
                    ¡Cambiado hoy!
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {allExpiredEvenIfDismissed.length > 0 && (
              <button
                type="button"
                onClick={() => setSessionDismissed(false)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[11px] font-bold hover:bg-amber-500/30 transition cursor-pointer"
              >
                ⚠️ {allExpiredEvenIfDismissed.length}{' '}
                {allExpiredEvenIfDismissed.length === 1 ? 'cambio pendiente' : 'cambios pendientes'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsQuickConfigOpen(!isQuickConfigOpen)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5 text-teal-400" />
              <span>Configurar Duración / Días</span>
              {isQuickConfigOpen ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Panel desplegable de configuración global rápida de los 3 dispositivos */}
        {isQuickConfigOpen && (
          <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* 1. Configuración Sensor de Glucosa */}
            <div className="bg-slate-950 border border-cyan-900/50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Radio className="h-4 w-4 text-cyan-400" />
                  <span>Sensor de Glucosa</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateDeviceDays(
                      'sensor',
                      sensorTracker.currentDayOfWear,
                      sensorTracker.targetDurationDays,
                      !sensorTracker.enabled
                    )
                  }
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                    sensorTracker.enabled
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  {sensorTracker.enabled ? 'Activo' : 'Inactivo'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block">Día actual de uso</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    placeholder="Ej: 1"
                    value={sensorTracker.currentDayOfWear === 0 ? '' : sensorTracker.currentDayOfWear}
                    onChange={(e) =>
                      handleUpdateDeviceDays(
                        'sensor',
                        e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0,
                        sensorTracker.targetDurationDays,
                        true
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 font-mono text-white placeholder:text-slate-600 placeholder:font-normal mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">Duración estipulada (días)</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    placeholder="Ej: 14"
                    value={sensorTracker.targetDurationDays === 0 ? '' : sensorTracker.targetDurationDays}
                    onChange={(e) =>
                      handleUpdateDeviceDays(
                        'sensor',
                        sensorTracker.currentDayOfWear,
                        e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0,
                        true
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 font-mono text-cyan-300 placeholder:text-slate-600 placeholder:font-normal font-bold mt-0.5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-1 pt-1">
                <div className="flex gap-1">
                  {[7, 10, 14, 15].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() =>
                        handleUpdateDeviceDays('sensor', sensorTracker.currentDayOfWear, d, true)
                      }
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                        sensorTracker.targetDurationDays === d
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleResetDeviceToDayOne('sensor')}
                  className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Nuevo hoy (Día 1)</span>
                </button>
              </div>
            </div>

            {/* 2. Configuración Puerto de Inyección (i-Port) */}
            <div className="bg-slate-950 border border-teal-900/50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-teal-300 flex items-center gap-1.5">
                  <Syringe className="h-4 w-4 text-teal-400" />
                  <span>Puerto de Inyección (i-Port)</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {settings.insulinMode === 'iport' ? 'En uso' : 'Opcional'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block">Día actual de uso</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    placeholder="Ej: 1"
                    value={iPortState.dayOfWear === 0 ? '' : iPortState.dayOfWear}
                    onChange={(e) =>
                      handleUpdateDeviceDays(
                        'iport',
                        e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0,
                        iPortState.targetDurationDays ?? 4
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 font-mono text-white placeholder:text-slate-600 placeholder:font-normal mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">Duración estipulada (días)</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    placeholder="Ej: 4"
                    value={(iPortState.targetDurationDays ?? 4) === 0 ? '' : (iPortState.targetDurationDays ?? 4)}
                    onChange={(e) =>
                      handleUpdateDeviceDays(
                        'iport',
                        iPortState.dayOfWear,
                        e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 font-mono text-teal-300 placeholder:text-slate-600 placeholder:font-normal font-bold mt-0.5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-1 pt-1">
                <div className="flex gap-1">
                  {[3, 4, 5].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleUpdateDeviceDays('iport', iPortState.dayOfWear, d)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                        (iPortState.targetDurationDays || 4) === d
                          ? 'bg-teal-500/20 border-teal-500 text-teal-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {d} días
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleResetDeviceToDayOne('iport')}
                  className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Nuevo hoy (Día 1)</span>
                </button>
              </div>
            </div>

            {/* 3. Configuración Set de Infusión / Bomba de Insulina */}
            <div className="bg-slate-950 border border-indigo-900/50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <Cpu className="h-4 w-4 text-indigo-400" />
                  <span>Set / Cánula de Bomba</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateDeviceDays(
                      'pump_set',
                      pumpTracker.currentDayOfWear,
                      pumpTracker.targetDurationDays,
                      !pumpTracker.enabled
                    )
                  }
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                    pumpTracker.enabled || settings.insulinMode === 'pump'
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  {pumpTracker.enabled || settings.insulinMode === 'pump' ? 'Activo' : 'Inactivo'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block">Día actual de uso</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    placeholder="Ej: 1"
                    value={pumpTracker.currentDayOfWear === 0 ? '' : pumpTracker.currentDayOfWear}
                    onChange={(e) =>
                      handleUpdateDeviceDays(
                        'pump_set',
                        e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0,
                        pumpTracker.targetDurationDays,
                        true
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 font-mono text-white placeholder:text-slate-600 placeholder:font-normal mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">Duración estipulada (días)</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    placeholder="Ej: 3"
                    value={pumpTracker.targetDurationDays === 0 ? '' : pumpTracker.targetDurationDays}
                    onChange={(e) =>
                      handleUpdateDeviceDays(
                        'pump_set',
                        pumpTracker.currentDayOfWear,
                        e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0,
                        true
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 font-mono text-indigo-300 placeholder:text-slate-600 placeholder:font-normal font-bold mt-0.5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-1 pt-1">
                <div className="flex gap-1">
                  {[2, 3, 4, 7].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() =>
                        handleUpdateDeviceDays('pump_set', pumpTracker.currentDayOfWear, d, true)
                      }
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                        pumpTracker.targetDurationDays === d
                          ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleResetDeviceToDayOne('pump_set')}
                  className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Nuevo hoy (Día 1)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
