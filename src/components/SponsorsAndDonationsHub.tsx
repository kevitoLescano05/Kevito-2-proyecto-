import React, { useState } from 'react';
import {
  CountryCode,
  CreatorMonetizationConfig,
  SponsorItem,
  SponsorPlanTier,
  SponsorShippingScope,
  SponsorContextCategory,
} from '../types';
import { COUNTRY_LIST, COUNTRY_PROFILES } from '../data/searchSources';
import {
  CREATOR_ADMIN_EMAIL,
  SHIPPING_SCOPE_LABELS,
  SPONSOR_PLAN_LABELS,
  getActiveSponsorsForCountry,
} from '../services/monetizationService';
import { useAuth } from '../context/AuthContext';
import {
  Heart,
  Store,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  MapPin,
  Truck,
  Megaphone,
  Crown,
  Plus,
  Trash2,
  Mail,
  MessageCircle,
  BarChart3,
  Globe,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

interface SponsorCardProps {
  sponsor: SponsorItem;
  onRecordClick: (sponsorId: string) => void;
  showAdminStats?: boolean;
  onDeleteSponsor?: (sponsorId: string) => void;
  onToggleActiveSponsor?: (sponsor: SponsorItem) => void;
}

export const SponsorCard: React.FC<SponsorCardProps> = ({
  sponsor,
  onRecordClick,
  showAdminStats = false,
  onDeleteSponsor,
  onToggleActiveSponsor,
}) => {
  const shippingMeta =
    SHIPPING_SCOPE_LABELS[sponsor.shippingScope] || SHIPPING_SCOPE_LABELS.national_shipping;
  const countryMeta =
    COUNTRY_PROFILES[sponsor.countryCode] || COUNTRY_PROFILES.AR;

  const isVip = sponsor.planTier === 'vip_top';
  const isFeatured = sponsor.planTier === 'featured_context';

  const handleOpenSponsorLink = () => {
    onRecordClick(sponsor.id);
  };

  return (
    <div
      className={`rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
        isVip
          ? 'bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-950 border-amber-500/70 shadow-lg ring-1 ring-amber-500/30'
          : isFeatured
          ? 'bg-gradient-to-br from-teal-950/40 via-slate-900 to-slate-950 border-teal-500/60 shadow-md'
          : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="space-y-2">
        {/* Badges Superiores: Plan + País/Ciudad + Alcance de Envíos */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isVip && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                🥇 Auspiciante Principal
              </span>
            )}
            {isFeatured && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/40">
                ⭐ Destacado
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-900 text-slate-300 border border-slate-700 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-teal-400" />
              <span>
                {sponsor.countryCode === 'GLOBAL' ? '🌍 Internacional' : `${countryMeta.flag} ${sponsor.cityOrProvince || countryMeta.name}`}
              </span>
            </span>
          </div>

          {/* Etiqueta obligatoria de Alcance de Envíos */}
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              shippingMeta.tone === 'emerald'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50'
                : shippingMeta.tone === 'indigo'
                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-600/50'
                : 'bg-amber-950/80 text-amber-300 border-amber-600/50'
            }`}
          >
            {shippingMeta.badge}
          </span>
        </div>

        {/* Nombre del Comercio y Rubro */}
        <div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="text-sm sm:text-base font-extrabold text-white">
              {sponsor.businessName}
            </h4>
            {sponsor.discountBadge && (
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                🎁 {sponsor.discountBadge}
              </span>
            )}
          </div>
          <p className="text-[11px] font-semibold text-teal-300 mt-0.5">
            {sponsor.categoryLabel}
          </p>
        </div>

        {/* Descripción y detalle de envío */}
        <p className="text-xs text-slate-300 leading-relaxed">
          {sponsor.description}
        </p>

        {sponsor.shippingDetailText && (
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 bg-slate-900/70 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <Truck className="h-3.5 w-3.5 text-teal-400 shrink-0" />
            <span>{sponsor.shippingDetailText}</span>
          </p>
        )}
      </div>

      {/* Botón de Contacto y Controles de Administrador */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
        <a
          href={sponsor.contactUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleOpenSponsorLink}
          className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition shadow-sm ${
            isVip
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              : 'bg-teal-500 hover:bg-teal-400 text-slate-950'
          }`}
        >
          <span>{sponsor.contactButtonLabel || 'Ver Comercio / Contactar'}</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>

        {showAdminStats && (
          <div className="flex items-center gap-1.5">
            <span
              className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] font-mono text-amber-300 flex items-center gap-1"
              title="Cantidad de veces que los usuarios tocaron este comercio"
            >
              <BarChart3 className="h-3.5 w-3.5 text-amber-400" />
              <span>{sponsor.clicksCount || 0} clics</span>
            </span>

            {onToggleActiveSponsor && (
              <button
                type="button"
                onClick={() => onToggleActiveSponsor(sponsor)}
                className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border cursor-pointer ${
                  sponsor.active
                    ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {sponsor.active ? 'Activo' : 'Pausado'}
              </button>
            )}

            {onDeleteSponsor && (
              <button
                type="button"
                onClick={() => onDeleteSponsor(sponsor.id)}
                className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-700/50 text-rose-300 cursor-pointer"
                title="Eliminar auspiciante"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * PLAN 3 (VIP TOP): Banner Superior de Auspiciante Principal filtrado por el país del usuario
 */
export const TopVipSponsorBanner: React.FC<{
  sponsors: SponsorItem[];
  countryCode?: CountryCode;
  onRecordClick: (sponsorId: string) => void;
}> = ({ sponsors, countryCode = 'AR', onRecordClick }) => {
  const vipSponsors = getActiveSponsorsForCountry(sponsors, countryCode).filter(
    (s) => s.planTier === 'vip_top'
  );

  if (vipSponsors.length === 0) return null;
  const topSponsor = vipSponsors[0];
  const shippingMeta =
    SHIPPING_SCOPE_LABELS[topSponsor.shippingScope] || SHIPPING_SCOPE_LABELS.national_shipping;
  const countryMeta =
    COUNTRY_PROFILES[topSponsor.countryCode] || COUNTRY_PROFILES.AR;

  return (
    <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-teal-950/50 border border-amber-500/50 rounded-2xl p-3 sm:px-4 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
              ✨ Auspiciante Principal
            </span>
            <span className="text-[11px] font-semibold text-slate-300">
              {topSponsor.countryCode === 'GLOBAL'
                ? '🌍 Internacional'
                : `${countryMeta.flag} ${topSponsor.cityOrProvince || countryMeta.name}`}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-600/40 font-bold">
              {shippingMeta.badge}
            </span>
            {topSponsor.discountBadge && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/40 font-extrabold">
                🎁 {topSponsor.discountBadge}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm font-bold text-white">
            {topSponsor.businessName}{' '}
            <span className="font-normal text-slate-300">
              — {topSponsor.description}
            </span>
          </p>
        </div>

        <a
          href={topSponsor.contactUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onRecordClick(topSponsor.id)}
          className="shrink-0 py-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
        >
          <span>{topSponsor.contactButtonLabel || 'Ver Beneficio'}</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
};

/**
 * PLAN 2 (DESTACADO CONTEXTUAL): Aparece dentro del Buscador de Alimentos o de Dispositivos
 */
export const ContextualFeaturedSponsorBanner: React.FC<{
  sponsors: SponsorItem[];
  countryCode?: CountryCode;
  contextCategory: SponsorContextCategory;
  onRecordClick: (sponsorId: string) => void;
}> = ({ sponsors, countryCode = 'AR', contextCategory, onRecordClick }) => {
  const matching = getActiveSponsorsForCountry(
    sponsors,
    countryCode,
    contextCategory
  );

  if (matching.length === 0) return null;
  const featured = matching[0];
  const shippingMeta =
    SHIPPING_SCOPE_LABELS[featured.shippingScope] || SHIPPING_SCOPE_LABELS.national_shipping;

  return (
    <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-teal-950/60 via-slate-900 to-slate-950 border border-teal-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-teal-500/20 text-teal-300 border border-teal-500/40">
            ⭐ Recomendado en tu País
          </span>
          <span className="text-[11px] font-semibold text-slate-300">
            📍 {featured.cityOrProvince}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-emerald-300 border border-emerald-700/40 font-semibold">
            {shippingMeta.badge}
          </span>
          {featured.discountBadge && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/40 font-bold">
              🎁 {featured.discountBadge}
            </span>
          )}
        </div>
        <p className="text-slate-100 font-bold">
          {featured.businessName}:{' '}
          <span className="font-normal text-slate-300">{featured.description}</span>
        </p>
      </div>

      <a
        href={featured.contactUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onRecordClick(featured.id)}
        className="shrink-0 py-1.5 px-3 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1 transition"
      >
        <span>{featured.contactButtonLabel || 'Conocer Tienda'}</span>
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
};

interface SponsorsAndDonationsHubProps {
  countryCode: CountryCode;
  monetizationConfig: CreatorMonetizationConfig;
  sponsors: SponsorItem[];
  onSaveMonetizationConfig: (newConfig: CreatorMonetizationConfig) => void;
  onUpsertSponsor: (sponsor: SponsorItem) => void;
  onDeleteSponsor: (sponsorId: string) => void;
  onRecordSponsorClick: (sponsorId: string) => void;
}

export const SponsorsAndDonationsHub: React.FC<SponsorsAndDonationsHubProps> = ({
  countryCode,
  monetizationConfig,
  sponsors,
  onSaveMonetizationConfig,
  onUpsertSponsor,
  onDeleteSponsor,
  onRecordSponsorClick,
}) => {
  const { user } = useAuth();
  const isCreatorAdmin =
    Boolean(user?.email && user.email.toLowerCase() === CREATOR_ADMIN_EMAIL.toLowerCase());

  const [copiedMpAlias, setCopiedMpAlias] = useState(false);
  const [copiedPitchTemplate, setCopiedPitchTemplate] = useState(false);
  const [isAdvertiseModalOpen, setIsAdvertiseModalOpen] = useState(false);
  const [isCreatorPanelOpen, setIsCreatorPanelOpen] = useState(false);
  const [selectedPlanForInquiry, setSelectedPlanForInquiry] =
    useState<SponsorPlanTier>('featured_context');
  const [inquiryBusinessName, setInquiryBusinessName] = useState('');
  const [inquiryCityCountry, setInquiryCityCountry] = useState('');
  const [shippingFilter, setShippingFilter] = useState<'all' | 'national_only'>('all');

  // Estado del formulario del Panel del Creador (para cuando cargue sus cuentas o auspiciantes)
  const [mpEnabled, setMpEnabled] = useState(monetizationConfig.mercadoPagoEnabled);
  const [mpAlias, setMpAlias] = useState(monetizationConfig.mercadoPagoAlias || '');
  const [mpHolder, setMpHolder] = useState(monetizationConfig.mercadoPagoHolderName || '');
  const [mpLink, setMpLink] = useState(monetizationConfig.mercadoPagoLink || '');
  const [ppEnabled, setPpEnabled] = useState(monetizationConfig.paypalEnabled);
  const [ppLink, setPpLink] = useState(monetizationConfig.paypalLink || '');
  const [contactEmail, setContactEmail] = useState(
    monetizationConfig.creatorContactEmail || CREATOR_ADMIN_EMAIL
  );
  const [contactWhatsapp, setContactWhatsapp] = useState(
    monetizationConfig.creatorContactWhatsapp || ''
  );
  const [adminSavedMsg, setAdminSavedMsg] = useState(false);

  // Formulario para agregar un nuevo Auspiciante
  const [newBizName, setNewBizName] = useState('');
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [newContextCat, setNewContextCat] =
    useState<SponsorContextCategory>('nutrition_food');
  const [newDesc, setNewDesc] = useState('');
  const [newDiscount, setNewDiscount] = useState('');
  const [newCountry, setNewCountry] = useState<CountryCode>(countryCode || 'AR');
  const [newCity, setNewCity] = useState('');
  const [newShippingScope, setNewShippingScope] =
    useState<SponsorShippingScope>('national_shipping');
  const [newShippingDetail, setNewShippingDetail] = useState('');
  const [newPlanTier, setNewPlanTier] = useState<SponsorPlanTier>('featured_context');
  const [newContactUrl, setNewContactUrl] = useState('');
  const [newButtonLabel, setNewButtonLabel] = useState('Ver Instagram / Tienda');

  const activeCountryProfile =
    COUNTRY_PROFILES[countryCode || 'AR'] || COUNTRY_PROFILES.AR;

  const countrySponsors = getActiveSponsorsForCountry(sponsors, countryCode).filter(
    (s) => {
      if (shippingFilter === 'national_only') {
        return (
          s.shippingScope === 'national_shipping' ||
          s.shippingScope === 'international'
        );
      }
      return true;
    }
  );

  const hasMpConfigured =
    Boolean(monetizationConfig.mercadoPagoEnabled) &&
    Boolean(
      monetizationConfig.mercadoPagoAlias?.trim() ||
        monetizationConfig.mercadoPagoLink?.trim()
    );

  const hasPaypalConfigured =
    Boolean(monetizationConfig.paypalEnabled) &&
    Boolean(monetizationConfig.paypalLink?.trim());

  const handleCopyAlias = () => {
    if (!monetizationConfig.mercadoPagoAlias) return;
    navigator.clipboard.writeText(monetizationConfig.mercadoPagoAlias.trim());
    setCopiedMpAlias(true);
    setTimeout(() => setCopiedMpAlias(false), 3000);
  };

  const handleSaveAccountsConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveMonetizationConfig({
      ...monetizationConfig,
      mercadoPagoEnabled: mpEnabled,
      mercadoPagoAlias: mpAlias.trim(),
      mercadoPagoHolderName: mpHolder.trim(),
      mercadoPagoLink: mpLink.trim(),
      paypalEnabled: ppEnabled,
      paypalLink: ppLink.trim(),
      creatorContactEmail: contactEmail.trim() || CREATOR_ADMIN_EMAIL,
      creatorContactWhatsapp: contactWhatsapp.trim(),
    });
    setAdminSavedMsg(true);
    setTimeout(() => setAdminSavedMsg(false), 3000);
  };

  const handleAddSponsor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName.trim() || !newContactUrl.trim()) return;

    const cleanUrl =
      newContactUrl.trim().startsWith('http://') ||
      newContactUrl.trim().startsWith('https://')
        ? newContactUrl.trim()
        : `https://${newContactUrl.trim()}`;

    const newSponsor: SponsorItem = {
      id: `sponsor-${Date.now()}`,
      businessName: newBizName.trim(),
      categoryLabel: newCategoryLabel.trim() || 'Insumos y Alimentación Saludable',
      contextCategory: newContextCat,
      description: newDesc.trim() || 'Comercio recomendado para la comunidad.',
      discountBadge: newDiscount.trim() || undefined,
      countryCode: newCountry,
      cityOrProvince: newCity.trim() || COUNTRY_PROFILES[newCountry]?.name || 'Todo el país',
      shippingScope: newShippingScope,
      shippingDetailText: newShippingDetail.trim() || undefined,
      planTier: newPlanTier,
      contactUrl: cleanUrl,
      contactButtonLabel: newButtonLabel.trim() || 'Ver Tienda',
      active: true,
      clicksCount: 0,
      createdAt: new Date().toISOString(),
    };

    onUpsertSponsor(newSponsor);
    setNewBizName('');
    setNewCategoryLabel('');
    setNewDesc('');
    setNewDiscount('');
    setNewCity('');
    setNewShippingDetail('');
    setNewContactUrl('');
  };

  const buildCommercialInquiryMailto = () => {
    const planInfo = SPONSOR_PLAN_LABELS[selectedPlanForInquiry];
    const subject = encodeURIComponent(
      `Consulta para Publicitar en InsulinCalc T1D - ${inquiryBusinessName || 'Mi Comercio'}`
    );
    const body = encodeURIComponent(
      `Hola! Me interesa publicitar mi marca/comercio en la app InsulinCalc T1D.\n\n` +
        `• Nombre del Comercio / Marca: ${inquiryBusinessName || '(Completar)'}\n` +
        `• País y Ciudad: ${inquiryCityCountry || activeCountryProfile.name}\n` +
        `• Nivel de visualización de interés: ${planInfo.name}\n\n` +
        `Quedo a disposición para conocer la propuesta comercial. ¡Gracias!`
    );
    const emailTarget =
      monetizationConfig.creatorContactEmail || CREATOR_ADMIN_EMAIL;
    return `mailto:${emailTarget}?subject=${subject}&body=${body}`;
  };

  const buildCommercialInquiryWhatsapp = () => {
    const rawPhone = (monetizationConfig.creatorContactWhatsapp || '').replace(
      /[^0-9]/g,
      ''
    );
    if (!rawPhone) return null;
    const planInfo = SPONSOR_PLAN_LABELS[selectedPlanForInquiry];
    const text = encodeURIComponent(
      `¡Hola! Te escribo desde la app InsulinCalc T1D. Me interesa consultar para publicitar mi comercio "${
        inquiryBusinessName || 'Mi Marca'
      }" (${inquiryCityCountry || activeCountryProfile.name}) en el ${planInfo.name}.`
    );
    return `https://wa.me/${rawPhone}?text=${text}`;
  };

  const readyToCopyInstagramPitch = `¡Hola! ¿Cómo están? Soy el creador de InsulinCalc T1D, una aplicación para personas con diabetes tipo 1 donde calculan sus comidas, carbohidratos, sensores e insulina todos los días. Vi los productos que ofrecen y como el 100% de los usuarios de la app buscan exactamente lo que ustedes venden, quería invitarlos a aparecer como Comercio Recomendado en su país (con etiqueta de ciudad, alcance de envíos y botón directo a su Instagram/WhatsApp con contador de visitas). Si les interesa, les puedo dar unos días de prueba sin cargo para que vean cómo queda su marca en la app y después conversamos un plan a su medida. ¡Avisame y te muestro!`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden p-5 md:p-6 space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-100">
                Comercios Recomendados y Apoyo al Proyecto
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-teal-300 border border-slate-700">
                {activeCountryProfile.flag} Viendo opciones para {activeCountryProfile.name}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tiendas de insumos para diabetes, alimentos Sin TACC / Sin Azúcar y farmacias filtradas según tu país y alcance de envío
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsAdvertiseModalOpen(!isAdvertiseModalOpen)}
            className="py-2 px-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Megaphone className="h-4 w-4 text-amber-400" />
            <span>¿Tenés un Comercio? Publicitá acá</span>
          </button>

          {isCreatorAdmin && (
            <button
              type="button"
              onClick={() => setIsCreatorPanelOpen(!isCreatorPanelOpen)}
              className="py-2 px-3.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/50 text-indigo-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Crown className="h-4 w-4 text-indigo-400" />
              <span>👑 Panel del Creador</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. MODAL / DESPLEGABLE PARA COMERCIOS INTERESADOS EN PUBLICITAR (SIN PRECIOS PÚBLICOS) */}
      {isAdvertiseModalOpen && (
        <div className="bg-slate-950 border-2 border-amber-500/60 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Espacio Publicitario para Marcas, Farmacias y Emprendimientos
              </span>
              <h3 className="text-base sm:text-lg font-extrabold text-white mt-1.5">
                📢 Llegá directo a personas que usan sensores, insulina y buscan alimentos saludables en tu país
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Tu comercio aparece <strong>filtrado exclusivamente para los usuarios de tu país</strong> y con una etiqueta clara que indica tu ciudad y si hacés <strong>envíos a todo el país</strong> o <strong>entregas locales en tu zona</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAdvertiseModalOpen(false)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-900"
            >
              Cerrar ✕
            </button>
          </div>

          {/* Los 3 Planes de Visibilidad (Sin mostrar precios para que el creador negocie libremente) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(
              ['directory_basic', 'featured_context', 'vip_top'] as SponsorPlanTier[]
            ).map((tierKey) => {
              const plan = SPONSOR_PLAN_LABELS[tierKey];
              const isSelected = selectedPlanForInquiry === tierKey;
              return (
                <div
                  key={tierKey}
                  onClick={() => setSelectedPlanForInquiry(tierKey)}
                  className={`rounded-xl p-3.5 border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-950/30 border-amber-400 ring-2 ring-amber-500/30'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-amber-300">
                        {plan.shortBadge}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                          Elegido para consultar
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">
                      {plan.name}
                    </h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {plan.visibilitySummary}
                    </p>
                    <ul className="space-y-1 pt-1">
                      {plan.features.map((f, idx) => (
                        <li
                          key={idx}
                          className="text-[11px] text-slate-400 flex items-start gap-1.5"
                        >
                          <span className="text-teal-400 font-bold">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] font-semibold text-amber-200">
                    💬 Propuesta comercial personalizada según tu rubro y alcance
                  </div>
                </div>
              );
            })}
          </div>

          {/* Formulario rápido para contactar al creador */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <h4 className="text-xs font-bold text-slate-200">
              Escribinos directo para consultar disponibilidad y armar un plan a la medida de tu comercio:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Nombre de tu Comercio / Marca:
                </label>
                <input
                  type="text"
                  value={inquiryBusinessName}
                  onChange={(e) => setInquiryBusinessName(e.target.value)}
                  placeholder="Ej: Dietética Sin TACC / Parches Sensor..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Ciudad, Provincia y País (y si hacés envíos):
                </label>
                <input
                  type="text"
                  value={inquiryCityCountry}
                  onChange={(e) => setInquiryCityCountry(e.target.value)}
                  placeholder={`Ej: Córdoba, ${activeCountryProfile.name} (Envíos a todo el país)`}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <a
                href={buildCommercialInquiryMailto()}
                className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md transition"
              >
                <Mail className="h-4 w-4" />
                <span>
                  Enviar Consulta por Correo ({monetizationConfig.creatorContactEmail || CREATOR_ADMIN_EMAIL})
                </span>
              </a>

              {buildCommercialInquiryWhatsapp() && (
                <a
                  href={buildCommercialInquiryWhatsapp()!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md transition"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Consultar por WhatsApp Directo</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. LISTADO DE COMERCIOS Y AUSPICIANTES ACTIVOS PARA EL PAÍS DEL USUARIO */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-teal-400" />
            <span>
              Directorio de Comercios e Insumos en {activeCountryProfile.flag}{' '}
              {activeCountryProfile.name}
            </span>
          </h3>

          {countrySponsors.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => setShippingFilter('all')}
                className={`px-2.5 py-1 rounded-lg border cursor-pointer ${
                  shippingFilter === 'all'
                    ? 'bg-teal-500/20 border-teal-400 text-teal-200 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Todos ({countrySponsors.length})
              </button>
              <button
                type="button"
                onClick={() => setShippingFilter('national_only')}
                className={`px-2.5 py-1 rounded-lg border cursor-pointer ${
                  shippingFilter === 'national_only'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                🚚 Solo con envíos a todo el país
              </button>
            </div>
          )}
        </div>

        {countrySponsors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {countrySponsors.map((sp) => (
              <SponsorCard
                key={sp.id}
                sponsor={sp}
                onRecordClick={onRecordSponsorClick}
                showAdminStats={isCreatorAdmin}
                onDeleteSponsor={isCreatorAdmin ? onDeleteSponsor : undefined}
                onToggleActiveSponsor={
                  isCreatorAdmin
                    ? (s) => onUpsertSponsor({ ...s, active: !s.active })
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-center space-y-2">
            <p className="text-xs text-slate-300 font-semibold">
              Todavía no hay comercios ni tiendas registradas para{' '}
              <span className="text-teal-300">
                {activeCountryProfile.flag} {activeCountryProfile.name}
              </span>
              .
            </p>
            <p className="text-[11px] text-slate-400 max-w-xl mx-auto">
              ¿Tenés o conocés una farmacia, dietética Sin TACC / Keto o emprendimiento de parches e insumos para sensores en {activeCountryProfile.name}? Tocá el botón{' '}
              <button
                type="button"
                onClick={() => setIsAdvertiseModalOpen(true)}
                className="text-amber-300 underline font-bold cursor-pointer"
              >
                «¿Tenés un Comercio? Publicitá acá»
              </button>{' '}
              para sumarlo.
            </p>
          </div>
        )}
      </div>

      {/* 3. SECCIÓN DE APOYO VOLUNTARIO / DONACIONES (MERCADO PAGO ARGENTINA + PAYPAL INTERNACIONAL) */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950/30 to-slate-950 border border-indigo-800/50 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0 mt-0.5">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                ☕ Apoyar el Desarrollo de InsulinCalc T1D
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Esta aplicación es gratuita para toda la comunidad. Si te ayuda en tu día a día con el cálculo de bolos, sensores y comidas, podés colaborar con un aporte voluntario:
              </p>
            </div>
          </div>
        </div>

        {hasMpConfigured || hasPaypalConfigured ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Opción 1: Mercado Pago (Destacada para Argentina) */}
            {hasMpConfigured && (
              <div
                className={`p-3.5 rounded-xl border space-y-2 ${
                  countryCode === 'AR'
                    ? 'bg-sky-950/40 border-sky-500/60 ring-1 ring-sky-500/30'
                    : 'bg-slate-900/90 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-sky-300 flex items-center gap-1.5">
                    <span>🇦🇷 Mercado Pago (Argentina - Pesos)</span>
                  </span>
                  {countryCode === 'AR' && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-200 font-bold">
                      Recomendado en tu país
                    </span>
                  )}
                </div>

                {monetizationConfig.mercadoPagoAlias && (
                  <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Alias de Mercado Pago:
                      </span>
                      <strong className="font-mono text-white text-sm">
                        {monetizationConfig.mercadoPagoAlias}
                      </strong>
                      {monetizationConfig.mercadoPagoHolderName && (
                        <span className="text-[10px] text-slate-400 block">
                          Titular: {monetizationConfig.mercadoPagoHolderName}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyAlias}
                      className="px-2.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedMpAlias ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar Alias</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {monetizationConfig.mercadoPagoLink && (
                  <a
                    href={monetizationConfig.mercadoPagoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <span>Ir al Link de Mercado Pago / Cafecito</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            )}

            {/* Opción 2: PayPal Internacional (Destacada para el exterior) */}
            {hasPaypalConfigured && (
              <div
                className={`p-3.5 rounded-xl border space-y-2 flex flex-col justify-between ${
                  countryCode !== 'AR'
                    ? 'bg-indigo-950/50 border-indigo-500/60 ring-1 ring-indigo-500/30'
                    : 'bg-slate-900/90 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-indigo-300 flex items-center gap-1.5">
                      <Globe className="h-4 w-4 text-indigo-400" />
                      <span>🌍 PayPal Internacional (Todos los países)</span>
                    </span>
                    {countryCode !== 'AR' && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200 font-bold">
                        Recomendado en {activeCountryProfile.name}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Podés aportar desde {activeCountryProfile.name} o cualquier país en tu moneda local (PayPal realiza la conversión automáticamente).
                  </p>
                </div>

                <a
                  href={monetizationConfig.paypalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
                >
                  <span>Donar con PayPal Internacional</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2 flex-wrap text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <Info className="h-4 w-4 text-indigo-400 shrink-0" />
              <span>
                Enlaces de aporte voluntario (🇦🇷 Mercado Pago y 🌍 PayPal Internacional) listos para activarse en cuanto el creador vincule sus cuentas.
              </span>
            </span>
            {isCreatorAdmin && (
              <button
                type="button"
                onClick={() => setIsCreatorPanelOpen(true)}
                className="px-3 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 font-bold text-[11px] cursor-pointer"
              >
                Vincular mis cuentas ahora
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. PANEL PRIVADO EXCLUSIVO PARA EL CREADOR (pirilescano@gmail.com) */}
      {isCreatorAdmin && isCreatorPanelOpen && (
        <div className="bg-slate-950 border-2 border-indigo-500/70 rounded-2xl p-4 sm:p-5 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-indigo-900/60 pb-3">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-indigo-400" />
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-white">
                  👑 Panel Privado del Creador ({CREATOR_ADMIN_EMAIL})
                </h3>
                <p className="text-[11px] text-indigo-300">
                  Este panel solo lo podés ver vos. Desde acá podés cargar tus cuentas cuando las tengas y agregar o administrar tus auspiciantes por país.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCreatorPanelOpen(false)}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-900"
            >
              Ocultar Panel
            </button>
          </div>

          {/* A. Formulario para vincular Mercado Pago, PayPal y WhatsApp comercial */}
          <form onSubmit={handleSaveAccountsConfig} className="space-y-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 text-xs">
            <h4 className="font-bold text-indigo-300 uppercase tracking-wider text-[11px]">
              1. Vincular mis Cuentas de Donación (Mercado Pago y PayPal) y Contacto Comercial
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Mercado Pago */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-300">🇦🇷 Mercado Pago (Argentina)</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mpEnabled}
                      onChange={(e) => setMpEnabled(e.target.checked)}
                    />
                    <span className="text-[11px] text-slate-300">Mostrar en la app</span>
                  </label>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">Tu Alias de Mercado Pago:</label>
                  <input
                    type="text"
                    value={mpAlias}
                    onChange={(e) => setMpAlias(e.target.value)}
                    placeholder="Ej: piri.lescano.mp"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">Nombre del titular (opcional):</label>
                  <input
                    type="text"
                    value={mpHolder}
                    onChange={(e) => setMpHolder(e.target.value)}
                    placeholder="Para que confirmen al transferir"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">Link de pago o Cafecito (opcional):</label>
                  <input
                    type="text"
                    value={mpLink}
                    onChange={(e) => setMpLink(e.target.value)}
                    placeholder="https://link.mercadopago.com.ar/..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white mt-0.5"
                  />
                </div>
              </div>

              {/* PayPal + Contacto Comercial */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-300">🌍 PayPal Internacional</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ppEnabled}
                      onChange={(e) => setPpEnabled(e.target.checked)}
                    />
                    <span className="text-[11px] text-slate-300">Mostrar en la app</span>
                  </label>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">Tu Link de PayPal.me:</label>
                  <input
                    type="text"
                    value={ppLink}
                    onChange={(e) => setPpLink(e.target.value)}
                    placeholder="https://paypal.me/tunombre"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">Correo para recibir propuestas de Auspiciantes:</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">WhatsApp comercial (opcional, con código de país):</label>
                  <input
                    type="text"
                    value={contactWhatsapp}
                    onChange={(e) => setContactWhatsapp(e.target.value)}
                    placeholder="Ej: 5491122334455"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono mt-0.5"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              {adminSavedMsg && (
                <span className="text-emerald-400 font-bold text-xs">
                  ✓ ¡Cuentas guardadas y actualizadas!
                </span>
              )}
              <button
                type="submit"
                className="py-2 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-xs cursor-pointer"
              >
                Guardar Configuración de Cuentas
              </button>
            </div>
          </form>

          {/* B. Formulario para Cargar un Auspiciante Nuevo (con País, Ciudad, Alcance de Envíos y Plan 1/2/3) */}
          <form onSubmit={handleAddSponsor} className="space-y-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 text-xs">
            <h4 className="font-bold text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>2. Agregar un Comercio Auspiciante (Filtrado por País y Alcance de Envíos)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-400 block">Nombre del Comercio / Marca *</label>
                <input
                  type="text"
                  required
                  value={newBizName}
                  onChange={(e) => setNewBizName(e.target.value)}
                  placeholder="Ej: Dietética Natural / Parches Libre"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">Rubro visible *</label>
                <input
                  type="text"
                  value={newCategoryLabel}
                  onChange={(e) => setNewCategoryLabel(e.target.value)}
                  placeholder="Ej: Alimentos Sin TACC y Keto"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">Plan contratado (Visibilidad)</label>
                <select
                  value={newPlanTier}
                  onChange={(e) => setNewPlanTier(e.target.value as SponsorPlanTier)}
                  className="w-full bg-slate-950 border border-amber-600/60 rounded-lg p-2 text-amber-200 font-bold mt-0.5"
                >
                  <option value="directory_basic">🥉 Plan 1: Básico (En Directorio)</option>
                  <option value="featured_context">🥈 Plan 2: Destacado (Comidas/Sensores + 1º Directorio)</option>
                  <option value="vip_top">🥇 Plan 3: Auspiciante Principal (Banner Arriba + Todo)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-400 block">País donde aparece este comercio</label>
                <select
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value as CountryCode)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white mt-0.5"
                >
                  {COUNTRY_LIST.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} Solo en {c.name}
                    </option>
                  ))}
                  <option value="GLOBAL">🌍 Todos los países (Internacional)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">Ciudad / Provincia (aparece en la etiqueta)</label>
                <input
                  type="text"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="Ej: Bogotá, Colombia / Córdoba, Arg"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">Alcance de Envíos (Cartel obligatorio)</label>
                <select
                  value={newShippingScope}
                  onChange={(e) => setNewShippingScope(e.target.value as SponsorShippingScope)}
                  className="w-full bg-slate-950 border border-emerald-700/60 rounded-lg p-2 text-emerald-200 font-bold mt-0.5"
                >
                  <option value="national_shipping">🚚 Envíos a todo ese país</option>
                  <option value="local_only">🛵 Solo envíos en su ciudad / Retiro en local</option>
                  <option value="international">🌍 Envíos / Servicio Internacional</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-400 block">Sección donde se destaca (en Plan 2/3)</label>
                <select
                  value={newContextCat}
                  onChange={(e) => setNewContextCat(e.target.value as SponsorContextCategory)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white mt-0.5"
                >
                  <option value="nutrition_food">🥗 Buscador de Alimentos (Dietéticas / Sin TACC)</option>
                  <option value="devices_sensors">📡 Barra de Dispositivos (Parches / Sensores / Bombas)</option>
                  <option value="pharmacy_general">🏥 Farmacia / General</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">Cartel de Descuento (opcional)</label>
                <input
                  type="text"
                  value={newDiscount}
                  onChange={(e) => setNewDiscount(e.target.value)}
                  placeholder="Ej: 10% OFF mencionando la App"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">Aclaración de envíos (opcional)</label>
                <input
                  type="text"
                  value={newShippingDetail}
                  onChange={(e) => setNewShippingDetail(e.target.value)}
                  placeholder="Ej: Envíos por Correo Argentino a todas las provincias"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white mt-0.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-1">
                <label className="text-[10px] text-slate-400 block">Descripción breve *</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Ej: Panificados sin azúcar, harinas de almendras..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">Link a Instagram, WhatsApp o Web *</label>
                <input
                  type="text"
                  required
                  value={newContactUrl}
                  onChange={(e) => setNewContactUrl(e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">Texto del botón</label>
                <input
                  type="text"
                  value={newButtonLabel}
                  onChange={(e) => setNewButtonLabel(e.target.value)}
                  placeholder="Ver Instagram / Pedir por WhatsApp"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white mt-0.5"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Publicar Comercio Auspiciante</span>
              </button>
            </div>
          </form>

          {/* C. Plantilla lista para copiar y mandar por Instagram a tiendas/dietéticas */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-bold text-teal-300">
                💬 3. Mensaje listo para copiar y mandarle por Instagram/WhatsApp a comercios:
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(readyToCopyInstagramPitch);
                  setCopiedPitchTemplate(true);
                  setTimeout(() => setCopiedPitchTemplate(false), 3000);
                }}
                className="px-3 py-1 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                {copiedPitchTemplate ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>¡Mensaje copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copiar mensaje para Instagram</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 italic">
              "{readyToCopyInstagramPitch}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
