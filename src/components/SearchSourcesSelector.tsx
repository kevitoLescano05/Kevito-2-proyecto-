import React, { useState } from 'react';
import {
  COUNTRY_LIST,
  COUNTRY_PROFILES,
  getSearchSourcesForCountry,
  SearchSource,
} from '../data/searchSources';
import { CountryCode } from '../types';
import {
  Database,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Globe,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface SearchSourcesSelectorProps {
  countryCode?: CountryCode;
  onChangeCountry?: (countryCode: CountryCode) => void;
  selectedSourceIds: string[];
  onToggleSource: (id: string) => void;
  onSelectAll: () => void;
  onSelectOfficialOnly: () => void;
  onSelectCommercialOnly: () => void;
}

export const SearchSourcesSelector: React.FC<SearchSourcesSelectorProps> = ({
  countryCode = 'AR',
  onChangeCountry,
  selectedSourceIds,
  onToggleSource,
  onSelectAll,
  onSelectOfficialOnly,
  onSelectCommercialOnly,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);

  const activeCountryProfile = COUNTRY_PROFILES[countryCode] || COUNTRY_PROFILES.AR;
  const availableSources = getSearchSourcesForCountry(countryCode);

  const totalSources = availableSources.length;
  const selectedInCountry = availableSources.filter((s) => selectedSourceIds.includes(s.id));
  const selectedCount = selectedInCountry.length;
  const isAllSelected = selectedCount === totalSources;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-3 transition">
      {/* Selector de País Activo */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="text-2xl leading-none bg-slate-950 p-2 rounded-lg border border-slate-800 shrink-0">
            {activeCountryProfile.flag}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white">
                País / Catálogo Actual: {activeCountryProfile.name}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-700/60 font-semibold">
                {activeCountryProfile.officialAgencyLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {activeCountryProfile.labelingRuleSummary}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCountryPickerOpen(!isCountryPickerOpen)}
          id="btn-toggle-country-selector"
          className="px-3 py-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/50 text-teal-200 text-xs font-bold flex items-center justify-center gap-1.5 transition shrink-0 cursor-pointer"
        >
          <Globe className="h-3.5 w-3.5 text-teal-400" />
          <span>Cambiar País ({activeCountryProfile.flag})</span>
          {isCountryPickerOpen ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Grilla desplegable de países para cambiar en viajes o según residencia */}
      {isCountryPickerOpen && (
        <div className="bg-slate-900 border border-teal-800/60 rounded-xl p-3 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              Elige en qué país estás (adapta tablas oficiales y marcas de supermercado):
            </span>
            <button
              type="button"
              onClick={() => setIsCountryPickerOpen(false)}
              className="text-[11px] text-slate-400 hover:text-white"
            >
              Cerrar
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
            {COUNTRY_LIST.map((c) => {
              const isCurrent = c.code === countryCode;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    if (onChangeCountry) onChangeCountry(c.code);
                    setIsCountryPickerOpen(false);
                  }}
                  className={`p-2 rounded-lg border text-left transition flex items-center gap-2 cursor-pointer ${
                    isCurrent
                      ? 'bg-teal-950/80 border-teal-500 text-white ring-1 ring-teal-500/40 font-bold'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <span className="text-lg leading-none">{c.flag}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs truncate">{c.name}</div>
                    <div className="text-[9px] text-slate-400 truncate">
                      {c.officialAgencyLabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Header & Quick Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-950 text-teal-400 border border-teal-800/60">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">
                Bases de Datos Activas en {activeCountryProfile.name}:
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-950 text-teal-300 border border-teal-800/80">
                {selectedCount} de {totalSources} activas
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Marcas locales incluidas: <span className="text-slate-300">{activeCountryProfile.popularBrandsExamples}</span>
            </p>
          </div>
        </div>

        {/* Quick buttons */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <button
            type="button"
            onClick={onSelectAll}
            className={`px-2.5 py-1 rounded-lg font-medium border transition cursor-pointer ${
              isAllSelected
                ? 'bg-teal-600/30 text-teal-200 border-teal-500/50'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800'
            }`}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={onSelectOfficialOnly}
            className="px-2.5 py-1 rounded-lg font-medium bg-slate-900 text-slate-300 border border-slate-800 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            Solo Oficiales {activeCountryProfile.flag}
          </button>
          <button
            type="button"
            onClick={onSelectCommercialOnly}
            className="px-2.5 py-1 rounded-lg font-medium bg-slate-900 text-slate-300 border border-slate-800 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            Comerciales
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 transition ml-1 cursor-pointer"
            title={isExpanded ? 'Ver menos detalles' : 'Ver detalle completo de fuentes'}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Interactive Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 pt-1">
        {availableSources.map((source: SearchSource) => {
          const isSelected = selectedSourceIds.includes(source.id);
          return (
            <button
              key={source.id}
              type="button"
              onClick={() => onToggleSource(source.id)}
              className={`p-2 rounded-lg border text-left flex items-start gap-2 transition group relative cursor-pointer ${
                isSelected
                  ? 'bg-teal-950/40 border-teal-600/70 text-slate-200 shadow-sm'
                  : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-slate-300 hover:border-slate-700 opacity-60'
              }`}
            >
              <div className="mt-0.5 text-xs shrink-0">
                {isSelected ? (
                  <CheckSquare className="h-3.5 w-3.5 text-teal-400" />
                ) : (
                  <Square className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs">{source.icon}</span>
                  <span className="text-[11px] font-bold truncate block leading-tight">
                    {source.shortName}
                  </span>
                </div>
                {isExpanded && (
                  <p className="text-[10px] text-slate-400 leading-snug mt-1 font-normal line-clamp-2">
                    {source.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Fallback info note */}
      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
        <div className="flex items-center gap-1.5 truncate">
          <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span className="truncate">
            {selectedCount === 0 ? (
              <span className="text-amber-300 font-semibold">
                Sin fuentes seleccionadas: se buscará en todas las fuentes de {activeCountryProfile.name} y Google Search.
              </span>
            ) : isAllSelected ? (
              <span>
                <strong className="text-teal-300">Búsqueda omni-fuente ({activeCountryProfile.flag}):</strong> Priorizando {activeCountryProfile.officialAgencyLabel}, Open Food Facts y marcas locales.
              </span>
            ) : (
              <span>
                <strong className="text-teal-300">Búsqueda prioritaria activa:</strong> Se buscará primero en las {selectedCount} fuentes marcadas de {activeCountryProfile.name}.
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono shrink-0">
          <ShieldCheck className="h-3 w-3" />
          <span>{activeCountryProfile.flag} {activeCountryProfile.officialAgencyLabel}</span>
        </div>
      </div>
    </div>
  );
};
