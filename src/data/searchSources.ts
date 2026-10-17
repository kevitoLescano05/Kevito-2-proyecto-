import { CountryCode } from '../types';

export interface SearchSource {
  id: string;
  name: string;
  shortName: string;
  category: 'official_arg' | 'official_country' | 'commercial_db' | 'scientific_ref' | 'web_search';
  badge: string;
  icon: string;
  description: string;
  urlLabel?: string;
  priorityOrder: number;
  countries?: CountryCode[]; // Si no se especifica, está disponible para todos
}

export interface CountryProfile {
  code: CountryCode;
  name: string;
  flag: string;
  officialAgencyLabel: string;
  labelingRuleSummary: string;
  carbsIncludeFiber: boolean; // true en US (Total Carbs incluye fibra), false en AR/ES/MX/CL/UY/CO/PE/BR
  fatSecretDomain: string;
  acceptLanguage: string;
  openFoodFactsSubdomain: string;
  popularBrandsExamples: string;
}

export const COUNTRY_PROFILES: Record<CountryCode, CountryProfile> = {
  AR: {
    code: 'AR',
    name: 'Argentina',
    flag: '🇦🇷',
    officialAgencyLabel: 'CAA / ANMAT / ARGENFOODS',
    labelingRuleSummary: 'Código Alimentario Argentino (MERCOSUR): Carbohidratos ya son asimilables (la fibra va aparte, no se resta).',
    carbsIncludeFiber: false,
    fatSecretDomain: 'https://www.fatsecret.com.ar/calor%C3%ADas-nutrici%C3%B3n/search',
    acceptLanguage: 'es-AR,es;q=0.9',
    openFoodFactsSubdomain: 'ar',
    popularBrandsExamples: 'Arcor, Bagley, La Serenísima, Granix, Fargo, Marolio, Havanna, Bimbo, Milkaut, Ilolay',
  },
  ES: {
    code: 'ES',
    name: 'España',
    flag: '🇪🇸',
    officialAgencyLabel: 'BEDCA / AESAN / Reg. UE',
    labelingRuleSummary: 'Normativa Europea (AESAN / BEDCA): Hidratos de carbono ya son asimilables (la fibra se declara aparte).',
    carbsIncludeFiber: false,
    fatSecretDomain: 'https://www.fatsecret.es/calor%C3%ADas-nutrici%C3%B3n/search',
    acceptLanguage: 'es-ES,es;q=0.9',
    openFoodFactsSubdomain: 'es',
    popularBrandsExamples: 'Hacendado (Mercadona), Carrefour ES, Pascual, Gullón, Danone ES, Campofrío, Bimbo ES, Alpro',
  },
  MX: {
    code: 'MX',
    name: 'México',
    flag: '🇲🇽',
    officialAgencyLabel: 'BAM (INCMNSZ) / SMAE / COFEPRIS',
    labelingRuleSummary: 'NOM-051 COFEPRIS / SMAE: Hidratos de carbono disponibles declarados aparte de la fibra dietética.',
    carbsIncludeFiber: false,
    fatSecretDomain: 'https://www.fatsecret.com.mx/calor%C3%ADas-nutrici%C3%B3n/search',
    acceptLanguage: 'es-MX,es;q=0.9',
    openFoodFactsSubdomain: 'mx',
    popularBrandsExamples: 'Bimbo MX, Lala, Alpura, Gamesa, Marinela, Sabritas, La Costeña, Herdez, Saníssimo',
  },
  CL: {
    code: 'CL',
    name: 'Chile',
    flag: '🇨🇱',
    officialAgencyLabel: 'INTA Chile / MINSAL',
    labelingRuleSummary: 'Reglamento Sanitario MINSAL / INTA: Hidratos de carbono disponibles (sin incluir fibra dietética).',
    carbsIncludeFiber: false,
    fatSecretDomain: 'https://www.fatsecret.cl/calor%C3%ADas-nutrici%C3%B3n/search',
    acceptLanguage: 'es-CL,es;q=0.9',
    openFoodFactsSubdomain: 'cl',
    popularBrandsExamples: 'Colun, Soprole, Carozzi, Lucchetti, McKay, Costa, Ideal, Watt\'s, Agrosuper',
  },
  CO: {
    code: 'CO',
    name: 'Colombia',
    flag: '🇨🇴',
    officialAgencyLabel: 'TCAC (ICBF) / INVIMA',
    labelingRuleSummary: 'Tabla de Composición de Alimentos Colombianos (ICBF / INVIMA): Carbohidratos biodisponibles.',
    carbsIncludeFiber: false,
    fatSecretDomain: 'https://www.fatsecret.com.co/calor%C3%ADas-nutrici%C3%B3n/search',
    acceptLanguage: 'es-CO,es;q=0.9',
    openFoodFactsSubdomain: 'co',
    popularBrandsExamples: 'Alpina, Colanta, Noel, Tosh, Zenú, Ramo, Postobón, Jet, Diana',
  },
  UY: {
    code: 'UY',
    name: 'Uruguay',
    flag: '🇺🇾',
    officialAgencyLabel: 'MSP Uruguay / MERCOSUR',
    labelingRuleSummary: 'Reglamento Bromatológico Nacional (MERCOSUR): Carbohidratos asimilables (fibra por separado).',
    carbsIncludeFiber: false,
    fatSecretDomain: 'https://www.fatsecret.com.ar/calor%C3%ADas-nutrici%C3%B3n/search',
    acceptLanguage: 'es-UY,es;q=0.9',
    openFoodFactsSubdomain: 'uy',
    popularBrandsExamples: 'Conaprole, El Trigal, Portezuelo, Pagnifique, Schneck, Centenario, Salus',
  },
  PE: {
    code: 'PE',
    name: 'Perú',
    flag: '🇵🇪',
    officialAgencyLabel: 'CENAN / INS / DIGESA',
    labelingRuleSummary: 'Tablas Peruanas de Composición de Alimentos (CENAN / MINSA): Carbohidratos disponibles.',
    carbsIncludeFiber: false,
    fatSecretDomain: 'https://www.fatsecret.com.mx/calor%C3%ADas-nutrici%C3%B3n/search',
    acceptLanguage: 'es-PE,es;q=0.9',
    openFoodFactsSubdomain: 'pe',
    popularBrandsExamples: 'Gloria, Alicorp, Laive, San Fernando, Field, D\'Onofrio, Unión, Costa Perú',
  },
  BR: {
    code: 'BR',
    name: 'Brasil',
    flag: '🇧🇷',
    officialAgencyLabel: 'TACO (UNICAMP) / TBCA / ANVISA',
    labelingRuleSummary: 'Normativa ANVISA / MERCOSUR: Carboidratos digeríveis separados da fibra alimentar.',
    carbsIncludeFiber: false,
    fatSecretDomain: 'https://www.fatsecret.com.br/calorias-nutri%C3%A7%C3%A3o/search',
    acceptLanguage: 'pt-BR,pt;q=0.9,es;q=0.8',
    openFoodFactsSubdomain: 'br',
    popularBrandsExamples: 'Bauducco, Nestlé BR, Sadia, Perdigão, Itambé, Piracanjuba, Wickbold, Pullman, Yoki',
  },
  US: {
    code: 'US',
    name: 'Estados Unidos',
    flag: '🇺🇸',
    officialAgencyLabel: 'USDA FoodData / FDA',
    labelingRuleSummary: 'Etiquetado FDA (EE.UU.): Calcula Carbohidratos Netos restando la fibra dietética de Total Carbohydrates.',
    carbsIncludeFiber: true,
    fatSecretDomain: 'https://www.fatsecret.com/calories-nutrition/search',
    acceptLanguage: 'en-US,en;q=0.9,es;q=0.8',
    openFoodFactsSubdomain: 'us',
    popularBrandsExamples: 'Chobani, Kraft, Quaker, Nabisco, Nature Valley, Kirkland, Trader Joe\'s, Whole Foods',
  },
  GLOBAL: {
    code: 'GLOBAL',
    name: 'Global / Internacional',
    flag: '🌎',
    officialAgencyLabel: 'FAO / INFOODS / USDA / OFF Mundial',
    labelingRuleSummary: 'Búsqueda internacional combinada en todas las bases de datos científicas y comerciales del mundo.',
    carbsIncludeFiber: false,
    fatSecretDomain: 'https://www.fatsecret.es/calor%C3%ADas-nutrici%C3%B3n/search',
    acceptLanguage: 'es,en;q=0.9',
    openFoodFactsSubdomain: 'world',
    popularBrandsExamples: 'Nestlé, Danone, Bimbo, Kellogg\'s, Barilla, Oreo, Quaker, Coca-Cola, Kraft',
  },
};

export const COUNTRY_LIST: CountryProfile[] = Object.values(COUNTRY_PROFILES);

export function getSearchSourcesForCountry(countryCode: CountryCode = 'AR'): SearchSource[] {
  const profile = COUNTRY_PROFILES[countryCode] || COUNTRY_PROFILES.AR;

  const countryOfficialSources: Record<CountryCode, SearchSource[]> = {
    AR: [
      {
        id: 'argenfoods',
        name: 'ARGENFOODS (UNLu Argentina)',
        shortName: 'ARGENFOODS',
        category: 'official_arg',
        badge: '🇦🇷 ARGENFOODS (UNLu)',
        icon: '🇦🇷',
        description: 'Tabla oficial de composición de alimentos de la Universidad Nacional de Luján y MINCyT.',
        urlLabel: 'unlu.edu.ar / argenfoods',
        priorityOrder: 1,
      },
      {
        id: 'sifega_anmat',
        name: 'SIFeGA / ANMAT (Rótulos CAA)',
        shortName: 'SIFeGA ANMAT',
        category: 'official_arg',
        badge: '🏛️ SIFeGA / ANMAT',
        icon: '🏛️',
        description: 'Sistema Federal de Gestión de Alimentos y Registro Nacional (RNPA) con rótulos oficiales del CAA.',
        urlLabel: 'anmat.gob.ar / sifega',
        priorityOrder: 2,
      },
      {
        id: 'infoalimentos',
        name: 'InfoAlimentos / Alimentos Argentinos',
        shortName: 'InfoAlimentos',
        category: 'official_arg',
        badge: '🌾 InfoAlimentos',
        icon: '🌾',
        description: 'Tablas de composición y valor nutricional de la Secretaría de Agricultura, Ganadería y Pesca.',
        urlLabel: 'alimentosargentinos.gob.ar',
        priorityOrder: 4,
      },
    ],
    ES: [
      {
        id: 'bedca_es',
        name: 'BEDCA (Base de Datos Española)',
        shortName: 'BEDCA España',
        category: 'official_country',
        badge: '🇪🇸 BEDCA Oficial',
        icon: '🇪🇸',
        description: 'Base de Datos Española de Composición de Alimentos avalada por AESAN y Ministerio de Sanidad.',
        urlLabel: 'bedca.net',
        priorityOrder: 1,
      },
      {
        id: 'aesan_es',
        name: 'AESAN / Supermercados España (Mercadona, Carrefour)',
        shortName: 'AESAN & Supers ES',
        category: 'official_country',
        badge: '🏛️ AESAN / Hacendado',
        icon: '🏛️',
        description: 'Rótulos oficiales de España: Hacendado (Mercadona), Carrefour ES, El Corte Inglés, Pascual, Gullón.',
        urlLabel: 'aesan.gob.es',
        priorityOrder: 2,
      },
    ],
    MX: [
      {
        id: 'bam_smae_mx',
        name: 'SMAE / BAM (INCMNSZ Salvador Zubirán)',
        shortName: 'SMAE / INCMNSZ',
        category: 'official_country',
        badge: '🇲🇽 SMAE / BAM México',
        icon: '🇲🇽',
        description: 'Sistema Mexicano de Alimentos Equivalentes y Base de Alimentos de México del Instituto Nacional de Ciencias Médicas.',
        urlLabel: 'incmnsz.mx',
        priorityOrder: 1,
      },
      {
        id: 'cofepris_mx',
        name: 'NOM-051 COFEPRIS (Rótulos México)',
        shortName: 'COFEPRIS NOM-051',
        category: 'official_country',
        badge: '🏛️ NOM-051 México',
        icon: '🏛️',
        description: 'Etiquetado oficial mexicano y sellos nutricionales de marcas locales (Bimbo MX, Lala, Gamesa, Alpura).',
        urlLabel: 'gob.mx/cofepris',
        priorityOrder: 2,
      },
    ],
    CL: [
      {
        id: 'inta_cl',
        name: 'INTA Universidad de Chile / MINSAL',
        shortName: 'INTA / MINSAL Chile',
        category: 'official_country',
        badge: '🇨🇱 INTA / MINSAL',
        icon: '🇨🇱',
        description: 'Tabla de Composición de Alimentos Chilenos del INTA y Ministerio de Salud de Chile.',
        urlLabel: 'inta.uchile.cl',
        priorityOrder: 1,
      },
    ],
    CO: [
      {
        id: 'tcac_co',
        name: 'TCAC (ICBF Colombia) / INVIMA',
        shortName: 'TCAC / INVIMA Col',
        category: 'official_country',
        badge: '🇨🇴 TCAC / INVIMA',
        icon: '🇨🇴',
        description: 'Tabla de Composición de Alimentos Colombianos del Instituto Colombiano de Bienestar Familiar e INVIMA.',
        urlLabel: 'icbf.gov.co',
        priorityOrder: 1,
      },
    ],
    UY: [
      {
        id: 'udelar_uy',
        name: 'Tabla Uruguaya (UdelaR / MSP Uruguay)',
        shortName: 'MSP / UdelaR Uy',
        category: 'official_country',
        badge: '🇺🇾 MSP / UdelaR',
        icon: '🇺🇾',
        description: 'Tabla de composición de alimentos de Uruguay (Escuela de Nutrición UdelaR y Ministerio de Salud Pública).',
        urlLabel: 'gub.uy/ministerio-salud-publica',
        priorityOrder: 1,
      },
    ],
    PE: [
      {
        id: 'cenan_pe',
        name: 'CENAN / INS (Tablas Peruanas MINSA)',
        shortName: 'CENAN / DIGESA',
        category: 'official_country',
        badge: '🇵🇪 CENAN / INS Perú',
        icon: '🇵🇪',
        description: 'Tablas Peruanas de Composición de Alimentos del Centro Nacional de Alimentación y Nutrición (INS).',
        urlLabel: 'ins.gob.pe',
        priorityOrder: 1,
      },
    ],
    BR: [
      {
        id: 'taco_tbca_br',
        name: 'TACO (UNICAMP) & TBCA (USP / ANVISA)',
        shortName: 'TACO / TBCA Brasil',
        category: 'official_country',
        badge: '🇧🇷 TACO / TBCA',
        icon: '🇧🇷',
        description: 'Tabela Brasileira de Composição de Alimentos (USP / UNICAMP) y rótulos oficiales ANVISA.',
        urlLabel: 'tbca.net.br',
        priorityOrder: 1,
      },
    ],
    US: [
      {
        id: 'usda_fda_us',
        name: 'USDA FoodData Central & FDA Labels',
        shortName: 'USDA & FDA (USA)',
        category: 'official_country',
        badge: '🇺🇸 USDA / FDA Oficial',
        icon: '🇺🇸',
        description: 'Base oficial del Departamento de Agricultura de EE.UU. (USDA) y etiquetas Nutrition Facts de la FDA.',
        urlLabel: 'fdc.nal.usda.gov',
        priorityOrder: 1,
      },
    ],
    GLOBAL: [
      {
        id: 'fao_infoods',
        name: 'FAO / INFOODS & LATINFOODS Mundial',
        shortName: 'FAO / INFOODS',
        category: 'official_country',
        badge: '🌎 FAO / INFOODS',
        icon: '🌎',
        description: 'Directorio Internacional de Composición de Alimentos de las Naciones Unidas (FAO) y LATINFOODS.',
        urlLabel: 'fao.org/infoods',
        priorityOrder: 1,
      },
    ],
  };

  const commonSources: SearchSource[] = [
    {
      id: 'openfoodfacts',
      name: `Open Food Facts (${profile.name})`,
      shortName: `Open Food Facts ${profile.flag}`,
      category: 'commercial_db',
      badge: `📦 Open Food Facts ${profile.flag}`,
      icon: '📦',
      description: `Base de datos de productos comerciales, códigos de barra y etiquetas en ${profile.name}.`,
      urlLabel: `${profile.openFoodFactsSubdomain}.openfoodfacts.org`,
      priorityOrder: 3,
    },
    {
      id: 'fatsecret',
      name: `FatSecret (${profile.name})`,
      shortName: `FatSecret ${profile.flag}`,
      category: 'commercial_db',
      badge: `🥑 FatSecret ${profile.flag}`,
      icon: '🥑',
      description: `Directorio nutricional de marcas comerciales y porciones de supermercado en ${profile.name}.`,
      urlLabel: profile.fatSecretDomain,
      priorityOrder: 5,
    },
    {
      id: 'myfitnesspal',
      name: `MyFitnessPal & Cronometer (${profile.name})`,
      shortName: 'MyFitnessPal / Crono',
      category: 'commercial_db',
      badge: '📱 MyFitnessPal / Crono',
      icon: '📱',
      description: `Catálogo regional de alimentos envasados y platos registrados en ${profile.name}.`,
      urlLabel: 'myfitnesspal.com',
      priorityOrder: 6,
    },
    {
      id: 'usda_latinfoods',
      name: 'USDA FoodData / LATINFOODS Internacional',
      shortName: 'USDA & LATINFOODS',
      category: 'scientific_ref',
      badge: '🔬 USDA / LATINFOODS',
      icon: '🔬',
      description: 'Bases de datos bioquímicas de referencia internacional para alimentos naturales e ingredientes puros.',
      urlLabel: 'fdc.nal.usda.gov',
      priorityOrder: 7,
    },
    {
      id: 'fabricantes',
      name: `Rótulos de Marcas Locales (${profile.name})`,
      shortName: `Marcas de ${profile.name}`,
      category: 'commercial_db',
      badge: `🏭 Marcas ${profile.flag}`,
      icon: '🏭',
      description: `Fichas técnicas de fabricantes en ${profile.name}: ${profile.popularBrandsExamples}.`,
      urlLabel: 'Sitios oficiales de marcas',
      priorityOrder: 8,
    },
    {
      id: 'google_search',
      name: 'Google Search (Web en vivo)',
      shortName: 'Google Search',
      category: 'web_search',
      badge: '🌐 Google Search',
      icon: '🌐',
      description: 'Búsqueda indexada en tiempo real para encontrar tablas nutricionales escaneadas y notas técnicas.',
      urlLabel: 'google.com',
      priorityOrder: 9,
    },
  ];

  return [...(countryOfficialSources[countryCode] || countryOfficialSources.AR), ...commonSources].sort(
    (a, b) => a.priorityOrder - b.priorityOrder
  );
}

export const AVAILABLE_SEARCH_SOURCES: SearchSource[] = getSearchSourcesForCountry('AR');

export const DEFAULT_SELECTED_SOURCES = AVAILABLE_SEARCH_SOURCES.map((s) => s.id);
