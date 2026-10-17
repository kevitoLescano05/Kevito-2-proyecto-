import React, { useState, useMemo } from 'react';
import {
  WORLD_LANGUAGES,
  detectDeviceLanguageCode,
  getLanguageInfo,
  applyAppLanguage,
} from '../utils/languageManager';
import { Globe, CheckCircle2, Search, Smartphone, ArrowRight, X } from 'lucide-react';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  currentLanguage?: string;
  isFirstTimeSetup?: boolean;
  onConfirmLanguage: (langCode: string) => void;
  onClose?: () => void;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  isOpen,
  currentLanguage,
  isFirstTimeSetup = false,
  onConfirmLanguage,
  onClose,
}) => {
  const detectedCode = useMemo(() => detectDeviceLanguageCode(), []);
  const detectedLang = useMemo(() => getLanguageInfo(detectedCode), [detectedCode]);

  const [selectedCode, setSelectedCode] = useState<string>(
    currentLanguage || detectedCode || 'es'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAllLanguages, setShowAllLanguages] = useState<boolean>(false);

  if (!isOpen) return null;

  const selectedLangInfo = getLanguageInfo(selectedCode);

  const featuredLanguages = WORLD_LANGUAGES.filter((l) => l.featured);
  const filteredLanguages = WORLD_LANGUAGES.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      l.nativeName.toLowerCase().includes(q) ||
      l.spanishName.toLowerCase().includes(q) ||
      l.englishName.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q)
    );
  });

  const handleSelectLanguage = (code: string) => {
    setSelectedCode(code);
    // Aplicamos inmediatamente para que vea el cambio en tiempo real
    applyAppLanguage(code, { allowReloadOnReset: false });
  };

  const handleConfirm = () => {
    const wasNonSpanish = currentLanguage && currentLanguage !== 'es';
    applyAppLanguage(selectedCode, { allowReloadOnReset: Boolean(wasNonSpanish && selectedCode === 'es') });
    onConfirmLanguage(selectedCode);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/95 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-teal-500/50 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-100 my-auto relative">
        
        {!isFirstTimeSetup && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title="Cerrar / Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Encabezado Bilingüe Universal (Español + English) */}
        <div className="text-center space-y-2 border-b border-slate-800 pb-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/15 border border-teal-500/40 text-teal-300 text-xs font-black uppercase tracking-wider mb-1">
            <Globe className="h-4 w-4" />
            <span className="notranslate" translate="no">Language / Idioma</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Elige tu Idioma • <span className="text-teal-300 notranslate" translate="no">Select Your Language</span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            {isFirstTimeSetup ? (
              <>
                Paso 1 antes de configurar tu glucómetro/sensor e insulina. La app detecta el idioma de tu celular o navegador, pero podés elegir el que prefieras:
              </>
            ) : (
              <>
                Cambia el idioma de toda la aplicación en cualquier momento / <span className="notranslate" translate="no">Change the app language at any time</span>:
              </>
            )}
          </p>
        </div>

        {/* Banner de Detección Automática del Navegador / Dispositivo */}
        <div className="rounded-xl bg-teal-950/40 border border-teal-500/40 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-300 shrink-0">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="text-xs">
              <span className="text-teal-300 font-bold block">
                Idioma detectado en tu dispositivo / <span className="notranslate" translate="no">Device language detected</span>:
              </span>
              <span className="text-slate-100 font-semibold notranslate" translate="no">
                {detectedLang.flag} {detectedLang.nativeName} ({detectedLang.englishName})
              </span>
            </div>
          </div>

          {selectedCode !== detectedLang.code && (
            <button
              type="button"
              onClick={() => handleSelectLanguage(detectedLang.code)}
              className="px-2.5 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/50 text-teal-200 text-[11px] font-bold shrink-0 cursor-pointer transition"
            >
              Usar detectado
            </button>
          )}
        </div>

        {/* Idiomas Principales Destacados */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Idiomas más usados / <span className="notranslate" translate="no">Popular Languages</span>
            </span>
            <span className="text-[11px] text-teal-300 font-semibold notranslate" translate="no">
              {WORLD_LANGUAGES.length}+ languages
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {featuredLanguages.map((lang) => {
              const isSelected = selectedCode === lang.code;
              const isDeviceDefault = detectedLang.code === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 notranslate ${
                    isSelected
                      ? 'bg-teal-950/60 border-teal-400 ring-2 ring-teal-500/40 shadow-lg'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                  translate="no"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base leading-none">{lang.flag}</span>
                      <span className={`text-xs sm:text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                        {lang.nativeName}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                      {lang.englishName} {isDeviceDefault ? '• Auto' : ''}
                    </span>
                  </div>
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Buscador y Lista Completa de Todos los Idiomas del Mundo */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowAllLanguages((p) => !p)}
              className="text-xs font-bold text-teal-300 hover:text-teal-200 underline cursor-pointer notranslate"
              translate="no"
            >
              {showAllLanguages
                ? '▲ Hide full language list / Ocultar lista completa'
                : `▼ More Languages / Ver todos los idiomas (${WORLD_LANGUAGES.length})`}
            </button>
          </div>

          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!showAllLanguages) setShowAllLanguages(true);
              }}
              placeholder="Search language / Buscar idioma (English, Português, Français, العربية, 中文...)"
              className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          {(showAllLanguages || searchQuery.trim().length > 0) && (
            <div className="max-h-52 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl p-2">
              {filteredLanguages.map((lang) => {
                const isSelected = selectedCode === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectLanguage(lang.code)}
                    className={`px-3 py-2 rounded-lg border text-left transition flex items-center justify-between gap-2 cursor-pointer notranslate ${
                      isSelected
                        ? 'bg-teal-950/70 border-teal-500 text-white'
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                    }`}
                    translate="no"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{lang.flag}</span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold block truncate">{lang.nativeName}</span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {lang.englishName} / {lang.spanishName}
                        </span>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />}
                  </button>
                );
              })}
              {filteredLanguages.length === 0 && (
                <p className="text-xs text-slate-400 col-span-2 text-center py-3">
                  No se encontró ese idioma / Language not found.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Botón de Confirmación Claro en Ambos Idiomas */}
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black text-sm sm:text-base rounded-xl shadow-lg shadow-teal-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
        >
          <span className="notranslate" translate="no">
            {isFirstTimeSetup
              ? `Continuar (${selectedLangInfo.nativeName}) • Continue →`
              : `Guardar Idioma (${selectedLangInfo.nativeName}) • Save Language`}
          </span>
          <ArrowRight className="h-5 w-5" />
        </button>

      </div>
    </div>
  );
};
