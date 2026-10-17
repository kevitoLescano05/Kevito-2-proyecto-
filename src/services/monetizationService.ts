import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  CreatorMonetizationConfig,
  SponsorItem,
  CountryCode,
  SponsorShippingScope,
  SponsorPlanTier,
  SponsorContextCategory,
} from '../types';

export const CREATOR_ADMIN_EMAIL = 'pirilescano@gmail.com';

const LOCAL_MONETIZATION_CONFIG_KEY = 'insu_calc_monetization_config_v1';
const LOCAL_SPONSORS_LIST_KEY = 'insu_calc_sponsors_list_v1';

export const DEFAULT_MONETIZATION_CONFIG: CreatorMonetizationConfig = {
  mercadoPagoEnabled: true,
  mercadoPagoAlias: 'kevin.lescano.05',
  mercadoPagoHolderName: 'Kevin Lescano',
  mercadoPagoLink: '',
  paypalEnabled: true,
  paypalLink: 'https://ko-fi.com/kevinlescano',
  paypalEmail: '',
  creatorContactEmail: CREATOR_ADMIN_EMAIL,
  creatorContactWhatsapp: '',
  showSponsorsSection: true,
};

export const SHIPPING_SCOPE_LABELS: Record<
  SponsorShippingScope,
  { badge: string; shortDesc: string; tone: 'emerald' | 'amber' | 'indigo' }
> = {
  national_shipping: {
    badge: '🚚 Envíos a todo el país',
    shortDesc: 'Despacha a todas las provincias / regiones de este país',
    tone: 'emerald',
  },
  local_only: {
    badge: '🛵 Solo envíos locales / Retiro en local',
    shortDesc: 'Entrega únicamente en su ciudad o zona indicada',
    tone: 'amber',
  },
  international: {
    badge: '🌍 Envíos / Servicio Internacional',
    shortDesc: 'Disponible desde cualquier país',
    tone: 'indigo',
  },
};

export const SPONSOR_PLAN_LABELS: Record<
  SponsorPlanTier,
  {
    name: string;
    shortBadge: string;
    visibilitySummary: string;
    features: string[];
  }
> = {
  directory_basic: {
    name: 'Plan 1: Presencia en Directorio del País',
    shortBadge: '🥉 Plan Directorio',
    visibilitySummary:
      'Tu comercio aparece en la sección de Comercios, Dietéticas e Insumos Recomendados para todos los usuarios de tu país.',
    features: [
      'Tarjeta con nombre de tu comercio, rubro y descripción',
      'Etiqueta clara de tu ciudad y alcance de envíos (todo el país o local)',
      'Botón directo a tu Instagram, WhatsApp o Tienda Online',
    ],
  },
  featured_context: {
    name: 'Plan 2: Destacado en Sección + Primero en Directorio',
    shortBadge: '🥈 Plan Destacado',
    visibilitySummary:
      'Aparecés primero de todo en el Directorio con insignia DESTACADO y además salís recomendado justo cuando el usuario busca alimentos o revisa sus sensores/dispositivos.',
    features: [
      'Ubicación prioritaria arriba de todo en el Directorio con borde destacado',
      'Cartel contextual en el Analizador de Comidas (ideal Dietéticas / Sin TACC / Keto) o en la Barra de Dispositivos (ideal Parches / Sensores / Insumos)',
      'Espacio para ofrecer un cupón o beneficio exclusivo para usuarios de la app',
    ],
  },
  vip_top: {
    name: 'Plan 3: Auspiciante Principal (Ubicación Superior VIP)',
    shortBadge: '🥇 Auspiciante Principal',
    visibilitySummary:
      'Máxima visualización en la parte superior de la pantalla principal al abrir la app para todo tu país, además de presencia destacada en todo el sitio.',
    features: [
      'Banner superior destacado visible apenas se abre la aplicación',
      'Presencia simultánea en la sección contextual y primero en el Directorio',
      'Insignia de Auspiciante Oficial de la Comunidad',
    ],
  },
};

export function loadLocalMonetizationConfig(): CreatorMonetizationConfig {
  if (typeof localStorage === 'undefined') return DEFAULT_MONETIZATION_CONFIG;
  try {
    const raw = localStorage.getItem(LOCAL_MONETIZATION_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_MONETIZATION_CONFIG,
        ...parsed,
        mercadoPagoEnabled: parsed.mercadoPagoEnabled ?? true,
        mercadoPagoAlias: parsed.mercadoPagoAlias?.trim() || DEFAULT_MONETIZATION_CONFIG.mercadoPagoAlias,
        mercadoPagoHolderName: parsed.mercadoPagoHolderName?.trim() || DEFAULT_MONETIZATION_CONFIG.mercadoPagoHolderName,
        paypalEnabled: parsed.paypalEnabled ?? true,
        paypalLink: parsed.paypalLink?.trim() || DEFAULT_MONETIZATION_CONFIG.paypalLink,
      };
    }
  } catch (e) {
    console.error('Error loading monetization config from localStorage:', e);
  }
  return DEFAULT_MONETIZATION_CONFIG;
}

export function saveLocalMonetizationConfig(config: CreatorMonetizationConfig): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_MONETIZATION_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving monetization config:', e);
  }
}

export function loadLocalSponsors(): SponsorItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_SPONSORS_LIST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error loading local sponsors:', e);
  }
  return [];
}

export function saveLocalSponsors(sponsors: SponsorItem[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_SPONSORS_LIST_KEY, JSON.stringify(sponsors));
  } catch (e) {
    console.error('Error saving local sponsors:', e);
  }
}

/**
 * Suscribe en tiempo real a la configuración de monetización (Mercado Pago, PayPal, Contacto Comercial)
 */
export function subscribeToMonetizationConfig(
  onUpdate: (config: CreatorMonetizationConfig) => void
): () => void {
  try {
    const docRef = doc(db, 'guests', 'monetization_hub', 'config', 'main');
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const remote = {
            ...DEFAULT_MONETIZATION_CONFIG,
            ...(snap.data() as Partial<CreatorMonetizationConfig>),
          };
          saveLocalMonetizationConfig(remote);
          onUpdate(remote);
        }
      },
      () => {
        // Fallback silencioso a localStorage si está offline
      }
    );
  } catch {
    return () => {};
  }
}

/**
 * Guarda la configuración de cuentas de donación y contacto comercial en Firestore y localStorage
 */
export async function saveMonetizationConfigEverywhere(
  config: CreatorMonetizationConfig
): Promise<void> {
  const updated: CreatorMonetizationConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  };
  saveLocalMonetizationConfig(updated);
  try {
    const docRef = doc(db, 'guests', 'monetization_hub', 'config', 'main');
    await setDoc(docRef, updated, { merge: true });
  } catch (e) {
    console.error('Error syncing monetization config to Firestore:', e);
  }
}

/**
 * Suscribe en tiempo real a la lista global de Auspiciantes
 */
export function subscribeToSponsors(
  onUpdate: (sponsors: SponsorItem[]) => void
): () => void {
  try {
    const colRef = collection(db, 'guests', 'monetization_hub', 'sponsors');
    return onSnapshot(
      colRef,
      (snap) => {
        const list: SponsorItem[] = [];
        snap.forEach((d) => {
          list.push(d.data() as SponsorItem);
        });
        saveLocalSponsors(list);
        onUpdate(list);
      },
      () => {
        // Fallback silencioso a localStorage
      }
    );
  } catch {
    return () => {};
  }
}

/**
 * Crea o actualiza un Auspiciante
 */
export async function upsertSponsorEverywhere(
  sponsor: SponsorItem,
  currentList: SponsorItem[]
): Promise<SponsorItem[]> {
  const existsIdx = currentList.findIndex((s) => s.id === sponsor.id);
  const nextList =
    existsIdx >= 0
      ? currentList.map((s) => (s.id === sponsor.id ? sponsor : s))
      : [sponsor, ...currentList];

  saveLocalSponsors(nextList);

  try {
    const docRef = doc(db, 'guests', 'monetization_hub', 'sponsors', sponsor.id);
    await setDoc(docRef, sponsor, { merge: true });
  } catch (e) {
    console.error('Error saving sponsor to Firestore:', e);
  }

  return nextList;
}

/**
 * Elimina un Auspiciante
 */
export async function deleteSponsorEverywhere(
  sponsorId: string,
  currentList: SponsorItem[]
): Promise<SponsorItem[]> {
  const nextList = currentList.filter((s) => s.id !== sponsorId);
  saveLocalSponsors(nextList);

  try {
    const docRef = doc(db, 'guests', 'monetization_hub', 'sponsors', sponsorId);
    await deleteDoc(docRef);
  } catch (e) {
    console.error('Error deleting sponsor from Firestore:', e);
  }

  return nextList;
}

/**
 * Registra 1 clic en el botón del Auspiciante para que el creador pueda mostrarle estadísticas reales al comercio
 */
export async function recordSponsorClick(
  sponsorId: string,
  currentList: SponsorItem[]
): Promise<SponsorItem[]> {
  const nextList = currentList.map((s) =>
    s.id === sponsorId ? { ...s, clicksCount: (s.clicksCount || 0) + 1 } : s
  );
  saveLocalSponsors(nextList);

  try {
    const docRef = doc(db, 'guests', 'monetization_hub', 'sponsors', sponsorId);
    await updateDoc(docRef, {
      clicksCount: increment(1),
    });
  } catch {
    // Ignorar si no existe en remoto aún
  }

  return nextList;
}

/**
 * Filtra los auspiciantes activos que corresponden al país actual del usuario
 * (o los marcados como GLOBAL / Internacional), ordenados por jerarquía de Plan (Plan 3 VIP -> Plan 2 Destacado -> Plan 1 Básico).
 */
export function getActiveSponsorsForCountry(
  allSponsors: SponsorItem[],
  userCountry: CountryCode = 'AR',
  filterContext?: SponsorContextCategory
): SponsorItem[] {
  const tierWeight: Record<SponsorPlanTier, number> = {
    vip_top: 3,
    featured_context: 2,
    directory_basic: 1,
  };

  return allSponsors
    .filter((s) => {
      if (!s.active) return false;
      const matchesCountry =
        s.countryCode === userCountry ||
        s.countryCode === 'GLOBAL' ||
        s.shippingScope === 'international';
      if (!matchesCountry) return false;

      if (filterContext) {
        return (
          s.contextCategory === filterContext &&
          (s.planTier === 'featured_context' || s.planTier === 'vip_top')
        );
      }
      return true;
    })
    .sort((a, b) => tierWeight[b.planTier] - tierWeight[a.planTier]);
}
