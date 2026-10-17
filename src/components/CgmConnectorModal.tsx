import React, { useState, useEffect } from 'react';
import {
  CgmCloudProvider,
  CgmConnectionConfig,
  LiveCgmReading,
  SensorBrand,
  UserSettings,
} from '../types';
import {
  SENSOR_BRAND_CATALOG,
  fetchLiveGlucoseFromConfiguredSource,
  formatReadingAgeMinutes,
} from '../utils/cgmService';
import {
  Radio,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Wifi,
  Smartphone,
  Bluetooth,
  Globe,
  ShieldCheck,
  Save,
  Info,
} from 'lucide-react';

interface CgmConnectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (updated: UserSettings) => void;
  onApplyLiveReading?: (reading: LiveCgmReading) => void;
}

export const CgmConnectorModal: React.FC<CgmConnectorModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onApplyLiveReading,
}) => {
  const [selectedBrand, setSelectedBrand] = useState<SensorBrand>(
    settings.sensorBrand || 'freestyle_libre'
  );
  const [config, setConfig] = useState<CgmConnectionConfig>(() => ({
    provider: settings.cgmConnection?.provider || 'none',
    autoSyncOnOpen: settings.cgmConnection?.autoSyncOnOpen ?? true,
    autoPollEvery5Min: settings.cgmConnection?.autoPollEvery5Min ?? false,
    libreLinkUpEmail: settings.cgmConnection?.libreLinkUpEmail || '',
    libreLinkUpPassword: settings.cgmConnection?.libreLinkUpPassword || '',
    libreLinkUpRegion: settings.cgmConnection?.libreLinkUpRegion || 'Auto',
    dexcomUsername: settings.cgmConnection?.dexcomUsername || '',
    dexcomPassword: settings.cgmConnection?.dexcomPassword || '',
    dexcomRegion: settings.cgmConnection?.dexcomRegion || 'ous',
    nightscoutUrl: settings.cgmConnection?.nightscoutUrl || '',
    nightscoutToken: settings.cgmConnection?.nightscoutToken || '',
    xdripLocalPort: settings.cgmConnection?.xdripLocalPort || 17580,
    lastReading: settings.cgmConnection?.lastReading,
  }));

  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testSuccess, setTestSuccess] = useState<LiveCgmReading | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedBrand(settings.sensorBrand || 'freestyle_libre');
      setConfig({
        provider: settings.cgmConnection?.provider || 'none',
        autoSyncOnOpen: settings.cgmConnection?.autoSyncOnOpen ?? true,
        autoPollEvery5Min: settings.cgmConnection?.autoPollEvery5Min ?? false,
        libreLinkUpEmail: settings.cgmConnection?.libreLinkUpEmail || '',
        libreLinkUpPassword: settings.cgmConnection?.libreLinkUpPassword || '',
        libreLinkUpRegion: settings.cgmConnection?.libreLinkUpRegion || 'Auto',
        dexcomUsername: settings.cgmConnection?.dexcomUsername || '',
        dexcomPassword: settings.cgmConnection?.dexcomPassword || '',
        dexcomRegion: settings.cgmConnection?.dexcomRegion || 'ous',
        nightscoutUrl: settings.cgmConnection?.nightscoutUrl || '',
        nightscoutToken: settings.cgmConnection?.nightscoutToken || '',
        xdripLocalPort: settings.cgmConnection?.xdripLocalPort || 17580,
        lastReading: settings.cgmConnection?.lastReading,
      });
      setTestSuccess(null);
      setTestError(null);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const activeBrandInfo =
    SENSOR_BRAND_CATALOG.find((b) => b.id === selectedBrand) || SENSOR_BRAND_CATALOG[0];

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestError(null);
    setTestSuccess(null);
    try {
      const reading = await fetchLiveGlucoseFromConfiguredSource(config);
      setTestSuccess(reading);
      const updatedConfig: CgmConnectionConfig = {
        ...config,
        lastReading: reading,
      };
      setConfig(updatedConfig);
      if (onApplyLiveReading) {
        onApplyLiveReading(reading);
      }
    } catch (err: any) {
      setTestError(err?.message || 'Error al probar la conexión con el sensor.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserSettings = {
      ...settings,
      sensorBrand: selectedBrand,
      cgmConnection: config,
    };
    onSaveSettings(updated);
    onClose();
  };

  const providerOptions: {
    id: CgmCloudProvider;
    title: string;
    subtitle: string;
    badge: string;
    icon: any;
  }[] = [
    {
      id: 'librelinkup',
      title: 'FreeStyle LibreLinkUp (Nube Oficial Abbott)',
      subtitle: 'Ideal si escaneás tu FreeStyle Libre 1, 2 o 3 con el celular. Trae glucosa y flecha solas.',
      badge: 'FreeStyle con Celular',
      icon: Wifi,
    },
    {
      id: 'dexcom_share',
      title: 'Dexcom Share (Nube Oficial Dexcom)',
      subtitle: 'Para sensores Dexcom G6, G7, ONE y ONE+ (solos o vinculados a bombas Tandem / Omnipod).',
      badge: 'Dexcom en Vivo',
      icon: Radio,
    },
    {
      id: 'nightscout',
      title: 'Puente Universal Nightscout (Medtronic / Cualquier Marca)',
      subtitle: 'Conecta bombas Medtronic (CareLink), Sibionics, Sinocare, Eversense, xDrip+, Loop y AndroidAPS.',
      badge: 'Universal Nube',
      icon: Globe,
    },
    {
      id: 'xdrip_local',
      title: 'Directo del Celular: xDrip+ / Juggluco / Diabox (Sin internet)',
      subtitle: 'Lee directo de la app xDrip+ o Juggluco abierta en este mismo teléfono Android para cualquier marca de sensor.',
      badge: 'Universal en el Celular',
      icon: Smartphone,
    },
    {
      id: 'web_bluetooth',
      title: 'Bluetooth Directo (Glucómetros con Bluetooth)',
      subtitle: 'Para medidores con Bluetooth estándar (Accu-Chek Guide, Contour Plus One, OneTouch) desde Chrome.',
      badge: 'Bluetooth BLE',
      icon: Bluetooth,
    },
    {
      id: 'none',
      title: 'Ingreso Manual Rápido (Sin conexión automática)',
      subtitle: 'Para quienes usan el aparatito Lector FreeStyle (que no tiene Wi-Fi) o glucómetro tradicional de tiras.',
      badge: 'Escribir a mano',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-5 text-slate-100 my-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/15 border border-teal-500/40 text-teal-400 shrink-0">
              <Radio className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Centro Universal de Sensores y Glucosa en Vivo
              </h2>
              <p className="text-xs text-slate-400">
                Conecta tu sensor (FreeStyle, Dexcom, Medtronic, Sibionics, Sinocare y más) para cargar tu glucosa sin escribirla
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5 text-xs">
          {/* Paso 1: Elegir Marca del Sensor */}
          <div className="space-y-2.5 bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <label className="font-bold text-teal-300 uppercase tracking-wider text-[11px] block">
              1. ¿Qué marca de sensor o medidor usás actualmente?
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value as SensorBrand)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-semibold text-xs focus:ring-2 focus:ring-teal-500"
            >
              {SENSOR_BRAND_CATALOG.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.emoji} {brand.name}
                </option>
              ))}
            </select>

            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 space-y-1">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="font-bold text-teal-300">
                  {activeBrandInfo.emoji} {activeBrandInfo.shortName}:
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-300 font-mono">
                  {activeBrandInfo.technology}
                </span>
              </div>
              <p className="leading-relaxed text-slate-300">{activeBrandInfo.description}</p>
            </div>
          </div>

          {/* Paso 2: Elegir Puerta de Conexión Automática */}
          <div className="space-y-2.5">
            <label className="font-bold text-teal-300 uppercase tracking-wider text-[11px] block">
              2. ¿Cómo querés que la app reciba tu glucosa?
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {providerOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = config.provider === opt.id;
                const isRecommended = activeBrandInfo.recommendedProviders.includes(opt.id);

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setConfig({ ...config, provider: opt.id });
                      setTestError(null);
                      setTestSuccess(null);
                    }}
                    className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'bg-teal-950/40 border-teal-500 ring-2 ring-teal-500/30 shadow-md'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-teal-400' : 'text-slate-400'}`} />
                          <span className="font-bold text-slate-100 text-xs leading-tight">
                            {opt.title}
                          </span>
                        </div>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">{opt.subtitle}</p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-medium">
                        {opt.badge}
                      </span>
                      {isRecommended && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold">
                          ⭐ Recomendado para {activeBrandInfo.shortName}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paso 3: Datos de Configuración según la opción elegida */}
          {config.provider === 'librelinkup' && (
            <div className="space-y-3 bg-slate-950 border border-teal-800/60 rounded-xl p-4 animate-fadeIn">
              <div className="flex items-start gap-2 text-teal-300">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-slate-300">
                  <strong className="text-teal-300">¿Cómo funciona LibreLinkUp?:</strong> En tu app oficial <em>FreeStyle LibreLink</em> del celular, entrá al menú <strong>"Aplicaciones conectadas" → "LibreLinkUp"</strong> y agregá tu propio correo. Luego poné ese correo y contraseña acá abajo:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Correo de LibreLinkUp</label>
                  <input
                    type="email"
                    value={config.libreLinkUpEmail || ''}
                    onChange={(e) => setConfig({ ...config, libreLinkUpEmail: e.target.value })}
                    placeholder="tucorreo@ejemplo.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Contraseña de LibreLinkUp</label>
                  <input
                    type="password"
                    value={config.libreLinkUpPassword || ''}
                    onChange={(e) => setConfig({ ...config, libreLinkUpPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Región del Servidor Abbott</label>
                <select
                  value={config.libreLinkUpRegion || 'Auto'}
                  onChange={(e) => setConfig({ ...config, libreLinkUpRegion: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100"
                >
                  <option value="Auto">🌎 Automático (Detecta solo Argentina, América o Europa)</option>
                  <option value="LA">🇦🇷 Latinoamérica (Argentina, Chile, México, Colombia, Brasil)</option>
                  <option value="EU">🇪🇸 Europa (España, Italia, resto de UE)</option>
                  <option value="US">🇺🇸 Estados Unidos</option>
                  <option value="CA">🇨🇦 Canadá</option>
                  <option value="DE">🇩🇪 Alemania</option>
                  <option value="FR">🇫🇷 Francia</option>
                  <option value="AU">🇦🇺 Australia</option>
                </select>
              </div>
            </div>
          )}

          {config.provider === 'dexcom_share' && (
            <div className="space-y-3 bg-slate-950 border border-teal-800/60 rounded-xl p-4 animate-fadeIn">
              <div className="flex items-start gap-2 text-teal-300">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-slate-300">
                  <strong className="text-teal-300">¿Cómo funciona Dexcom Share?:</strong> Asegurate de tener activada la opción <strong>"Share / Compartir"</strong> en la app de tu Dexcom (G6, G7, ONE+) y al menos 1 seguidor activo. Ingresá tu usuario y clave de Dexcom:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Usuario / Correo / Teléfono Dexcom</label>
                  <input
                    type="text"
                    value={config.dexcomUsername || ''}
                    onChange={(e) => setConfig({ ...config, dexcomUsername: e.target.value })}
                    placeholder="Usuario o email de Dexcom"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Contraseña de Dexcom</label>
                  <input
                    type="password"
                    value={config.dexcomPassword || ''}
                    onChange={(e) => setConfig({ ...config, dexcomPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Ubicación de tu cuenta Dexcom</label>
                <select
                  value={config.dexcomRegion || 'ous'}
                  onChange={(e) => setConfig({ ...config, dexcomRegion: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100"
                >
                  <option value="ous">🌍 Fuera de EE.UU. (Argentina, Latinoamérica, España, Europa, Canadá)</option>
                  <option value="us">🇺🇸 Estados Unidos (US)</option>
                  <option value="jp">🇯🇵 Japón</option>
                </select>
              </div>
            </div>
          )}

          {config.provider === 'nightscout' && (
            <div className="space-y-3 bg-slate-950 border border-teal-800/60 rounded-xl p-4 animate-fadeIn">
              <div className="flex items-start gap-2 text-teal-300">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-slate-300">
                  <strong className="text-teal-300">Puente Universal Nightscout:</strong> Ideal si usás bomba <strong>Medtronic</strong> (con CareLink-to-Nightscout o xDrip+), <strong>Sibionics</strong>, <strong>Sinocare</strong>, <strong>Eversense</strong>, <strong>AndroidAPS</strong> o <strong>Loop</strong>. Pegá la dirección de tu web Nightscout:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">URL de tu sitio Nightscout</label>
                  <input
                    type="url"
                    value={config.nightscoutUrl || ''}
                    onChange={(e) => setConfig({ ...config, nightscoutUrl: e.target.value })}
                    placeholder="https://mi-glucosa.herokuapp.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Token o API Secret (Opcional)</label>
                  <input
                    type="password"
                    value={config.nightscoutToken || ''}
                    onChange={(e) => setConfig({ ...config, nightscoutToken: e.target.value })}
                    placeholder="Solo si tu sitio es privado"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {config.provider === 'xdrip_local' && (
            <div className="space-y-3 bg-slate-950 border border-teal-800/60 rounded-xl p-4 animate-fadeIn">
              <div className="flex items-start gap-2 text-teal-300">
                <Smartphone className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed text-slate-300 space-y-1">
                  <strong className="text-teal-300 block">
                    Conexión Directa en el Celular (Sin subir datos a internet):
                  </strong>
                  <p>
                    Si en tu teléfono Android usás <strong>xDrip+</strong>, <strong>Juggluco</strong> o <strong>Diabox</strong> para leer cualquier marca de sensor (FreeStyle, Medtronic CareLink, Sibionics, Sinocare, Dexcom, MiaoMiao):
                  </p>
                  <ul className="list-disc list-inside text-slate-400 space-y-0.5">
                    <li>En <strong>xDrip+</strong>: entrá a <em>Ajustes → Ajustes Inter-App → Servicio Web de xDrip (Activar)</em> y desmarcá "Solo con contraseña".</li>
                    <li>En <strong>Juggluco</strong>: entrá a <em>Menú izquierdo → Ajustes → Servidor Web → Activar (Puerto 17580)</em>.</li>
                  </ul>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Puerto Local (Por defecto 17580)</label>
                <input
                  type="number"
                  value={config.xdripLocalPort || 17580}
                  onChange={(e) => setConfig({ ...config, xdripLocalPort: parseInt(e.target.value, 10) || 17580 })}
                  className="w-40 bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono"
                />
              </div>
            </div>
          )}

          {config.provider === 'web_bluetooth' && (
            <div className="space-y-2 bg-slate-950 border border-teal-800/60 rounded-xl p-4 animate-fadeIn text-[11px] text-slate-300">
              <strong className="text-teal-300 block">Bluetooth Directo desde el Navegador (Chrome):</strong>
              <p>
                Funciona con glucómetros Bluetooth abiertos (como <em>Accu-Chek Guide</em>, <em>Contour Plus One</em>, <em>OneTouch Verio</em>). Al tocar <strong>"Probar y Leer Ahora"</strong> abajo, tu navegador te mostrará la lista de dispositivos Bluetooth cercanos para vincularlo.
              </p>
            </div>
          )}

          {/* Opciones de Auto-Sincronización y Botón de Prueba */}
          {config.provider !== 'none' && (
            <div className="space-y-3 bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.autoSyncOnOpen !== false}
                    onChange={(e) => setConfig({ ...config, autoSyncOnOpen: e.target.checked })}
                    className="rounded border-slate-700 text-teal-500 focus:ring-teal-500"
                  />
                  <span className="text-slate-200 font-medium">
                    Cargar glucosa automáticamente al abrir la app
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(config.autoPollEvery5Min)}
                    onChange={(e) => setConfig({ ...config, autoPollEvery5Min: e.target.checked })}
                    className="rounded border-slate-700 text-teal-500 focus:ring-teal-500"
                  />
                  <span className="text-slate-200 font-medium">
                    Actualizar sola cada 5 minutos
                  </span>
                </label>
              </div>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold border border-teal-500/50 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isTesting ? 'animate-spin' : ''}`} />
                <span>
                  {isTesting ? 'Conectando con el sensor...' : '⚡ Probar Conexión y Traer Glucosa Ahora'}
                </span>
              </button>

              {testSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/70 text-emerald-200 flex items-center justify-between gap-3 animate-fadeIn">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                      ✅ ¡Conexión Exitosa! ({testSuccess.sourceLabel})
                    </span>
                    <span className="text-base font-black font-mono text-white">
                      {testSuccess.glucoseMgDl} mg/dL
                    </span>
                    <span className="ml-2 text-xs text-emerald-300">
                      ({formatReadingAgeMinutes(testSuccess.timestamp).text})
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40">
                    Ya cargado en calculadora
                  </span>
                </div>
              )}

              {testError && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/70 text-rose-200 flex items-start gap-2.5 animate-fadeIn">
                  <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">{testError}</p>
                </div>
              )}
            </div>
          )}

          {/* Guardar */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-lg transition cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Guardar Configuración de Sensor</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
