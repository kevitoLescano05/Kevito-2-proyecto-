import { FoodItem, MedicalConditionId, MedicalConditionsConfig, UserSettings, MealPlateItem } from '../types';

export interface MedicalConditionDefinition {
  id: MedicalConditionId;
  name: string;
  shortName: string;
  emoji: string;
  badgeColor: 'rose' | 'amber' | 'teal' | 'emerald' | 'indigo' | 'cyan';
  summary: string;
  howItChangesApp: string[];
}

export const MEDICAL_CONDITIONS_CATALOG: MedicalConditionDefinition[] = [
  {
    id: 'renal',
    name: 'Protección Renal / Nefropatía (Control de Proteínas)',
    shortName: 'Protección Renal',
    emoji: '🛡️',
    badgeColor: 'rose',
    summary: 'Cuida el filtrado de los riñones limitando la proteína de origen animal y priorizando la proteína vegetal.',
    howItChangesApp: [
      'Activa en Metas del Día el límite máximo de Proteína Animal (ej. 25g/día) y el objetivo de Proteína Vegetal (25-35g/día).',
      'Muestra un cartel de alerta en las tarjetas de alimentos con alta carga de proteína animal.',
      'La IA evalúa el impacto renal de cada plato o foto analizada.',
    ],
  },
  {
    id: 'celiac',
    name: 'Celiaquía / Intolerancia al Gluten (Modo Sin TACC)',
    shortName: 'Celiaquía (Sin TACC)',
    emoji: '🌾',
    badgeColor: 'amber',
    summary: 'Identifica alimentos con Trigo, Avena, Cebada o Centeno y ajusta alertas de absorción glucémica de harinas Sin TACC.',
    howItChangesApp: [
      'Agrega un cartel visible en cada alimento del buscador: "✅ Libre de Gluten (Sin TACC)", "🚫 Contiene TACC (No apto)" o "🔍 Verificar logo Sin TACC".',
      'Habilita el botón rápido "🌾 Filtrar Solo Sin TACC" en el buscador de alimentos.',
      'En la Calculadora y la IA advierte cuando un panificado o harina Sin TACC (arroz, mandioca, maicena) tiene mayor Índice Glucémico y sube la glucosa más rápido.',
    ],
  },
  {
    id: 'gastroparesis',
    name: 'Gastroparesia Diabética (Digestión Lenta)',
    shortName: 'Gastroparesia',
    emoji: '🐢',
    badgeColor: 'indigo',
    summary: 'Adapta los tiempos de insulina cuando el estómago vacía la comida más lento para prevenir hipoglucemias tempranas.',
    howItChangesApp: [
      'En la Calculadora de Bolus alerta NO hacer pre-bolos largos antes de comer (sugiere inyectar al empezar o al terminar de comer).',
      'Marca en el buscador los alimentos con mucha fibra o grasa con el cartel "🐢 Digestión Lenta (Cuidado Gastroparesia)".',
      'Sugiere dividir el bolo con una espera más amplia para evitar que la insulina actúe antes que la comida.',
    ],
  },
  {
    id: 'hypertension',
    name: 'Hipertensión Arterial / Cuidado Presión (Sodio)',
    shortName: 'Hipertensión (Sodio)',
    emoji: '🧂',
    badgeColor: 'cyan',
    summary: 'Detecta alimentos ultraprocesados, embutidos, snacks y panificados con exceso de sodio oculto.',
    howItChangesApp: [
      'Muestra en cada alimento del buscador el cartel "🧂⚠️ Alto en Sodio (Cuidado Presión)" o "💚 Bajo en Sodio (Natural)".',
      'Agrega un indicador diario de Control de Sodio en el Balance del Día.',
      'La IA advierte si la comida analizada tiene exceso de sal o sodio oculto.',
    ],
  },
  {
    id: 'dyslipidemia',
    name: 'Colesterol y Triglicéridos Altos (Dislipidemia)',
    shortName: 'Colesterol y Grasas',
    emoji: '🩸',
    badgeColor: 'emerald',
    summary: 'Controla el tope diario de grasas saturadas y promueve la meta diaria de fibra soluble.',
    howItChangesApp: [
      'Agrega en Metas del Día la barra de Límite Diario de Grasas (máx 60g) y Meta de Fibra Soluble (mín 25g).',
      'Etiqueta los alimentos con "🩸⚠️ Alto en Grasas (Cuidado Colesterol + Retardo Glucémico)" o "🥑 Rico en Fibra / Cardio-saludable".',
      'La IA destaca el impacto lipídico y el efecto de las grasas en la resistencia tardía a la insulina.',
    ],
  },
  {
    id: 'lactose_intolerance',
    name: 'Intolerancia a la Lactosa (Lácteos)',
    shortName: 'Sin Lactosa',
    emoji: '🥛',
    badgeColor: 'teal',
    summary: 'Detecta lácteos con lactosa y advierte sobre el impacto glucémico más rápido de los productos deslactosados.',
    howItChangesApp: [
      'Muestra en el buscador el cartel "🥛⚠️ Contiene Lactosa (Usar Deslactosado)" en leches, yogures, helados y quesos blandos, o "🥛✅ Sin Lactosa".',
      'En la Calculadora y la IA advierte que los lácteos Deslactosados tienen la lactosa ya dividida en glucosa simple y suben la glucemia más rápido.',
    ],
  },
];

export function getActiveMedicalConditions(settings: UserSettings): Required<MedicalConditionsConfig> {
  const mc = settings.medicalConditions || {};
  const renalActive =
    mc.renal !== undefined
      ? mc.renal
      : settings.enableRenalProteinLimits !== false;

  return {
    renal: renalActive,
    celiac: Boolean(mc.celiac),
    gastroparesis: Boolean(mc.gastroparesis),
    hypertension: Boolean(mc.hypertension),
    dyslipidemia: Boolean(mc.dyslipidemia),
    lactose_intolerance: Boolean(mc.lactose_intolerance),
  };
}

export function countActiveMedicalConditions(settings: UserSettings): number {
  const active = getActiveMedicalConditions(settings);
  return Object.values(active).filter(Boolean).length;
}

export interface FoodConditionBadge {
  conditionId: MedicalConditionId;
  text: string;
  tone: 'emerald' | 'amber' | 'rose' | 'indigo' | 'cyan';
  tooltip?: string;
}

/**
 * Clasifica si un alimento contiene gluten (TACC), es naturalmente libre de gluten / certificado Sin TACC,
 * o requiere verificar el sello en el envase por posible contaminación cruzada.
 */
export function classifyFoodGlutenStatus(food: FoodItem): {
  status: 'gluten_free' | 'contains_tacc' | 'verify_label';
  reason: string;
} {
  const text = `${food.name} ${food.brand || ''} ${food.category || ''} ${food.portionName || ''}`.toLowerCase();

  // Si explícitamente dice sin tacc / libre de gluten / maizena / arroz / mandioca
  if (
    /sin tacc|libre de gluten|gluten free|galleta de arroz|galletita de arroz|alfajor de arroz|maizena|almid[oó]n de ma[ií]z|chip[aá]|mandioca|polenta|harina de ma[ií]z|quinoa|mijo|trigo sarraceno/i.test(
      text
    ) &&
    !/pan rallado|harina de trigo/i.test(text)
  ) {
    return {
      status: 'gluten_free',
      reason: 'Alimento libre de gluten / Sin TACC',
    };
  }

  // Alimentos que contienen Trigo, Avena, Cebada o Centeno (TACC) de forma directa
  if (
    /pan\b|panificado|galletita|masita|factur|medialuna|bizcoch|fideo|pasta\b|tallar[ií]n|raviol|[nñ]oqui|capeletti|pizza|empanada|tarta|milanesa|rebozad|harina|trigo|avena|cebada|centeno|cerveza|alfajor|bud[ií]n|torta|churro|galleta|salvado|integral|prepizza|tapas de|s[aá]ndwich|pebete|baguette|fajita|rapidita/i.test(
      text
    )
  ) {
    return {
      status: 'contains_tacc',
      reason: 'Elaborado con trigo, avena, cebada o centeno (Contiene TACC)',
    };
  }

  // Alimentos naturalmente libres de gluten (frutas, verduras, huevos, carnes frescas, arroz, papa, legumbres, frutos secos puros, leche fluida)
  if (
    /manzana|banana|naranja|mandarina|pera|durazno|frutilla|arándano|uva|kiwi|sandía|melón|palta|tomate|lechuga|zanahoria|zapallo|calabaza|papa\b|batata|boniato|choclo|espinaca|acelga|brócoli|cebolla|huevo|pollo|pechuga|carne|vacuno|bife|asado|pescado|merluza|atún|salmón|cerdo|arroz\b|lenteja|garbanzo|poroto|soja texturizada|maní\b|almendra|nuez|avellana|aceite|agua\b|mate\b|café en grano/i.test(
      text
    ) &&
    !food.isCommercial
  ) {
    return {
      status: 'gluten_free',
      reason: 'Alimento natural libre de gluten (cuidar no contaminar al cocinar)',
    };
  }

  // Arroz, legumbres, frutas, verduras, carnes, huevos aunque tengan marca si no son rebozados
  if (
    /arroz\b|lenteja|garbanzo|poroto|huevo|manzana|banana|naranja|papa\b|batata|pechuga|bife|asado|atún al natural/i.test(
      text
    ) &&
    !/rebozad|milanesa|empanad|salsa/i.test(text)
  ) {
    return {
      status: 'gluten_free',
      reason: 'Ingrediente base naturalmente Sin TACC',
    };
  }

  // Procesados comerciales (yogures, quesos, fiambres, dulces, chocolates, aderezos) -> verificar logo oficial Sin TACC
  return {
    status: 'verify_label',
    reason: 'Producto procesado: verificar logo oficial Sin TACC (ANMAT / RNPA) en el envase',
  };
}

/**
 * Clasifica si un alimento contiene lactosa.
 */
export function classifyFoodLactoseStatus(food: FoodItem): {
  status: 'lactose_free' | 'contains_lactose' | 'deslactosado_fast_gi';
} {
  const text = `${food.name} ${food.brand || ''} ${food.category || ''}`.toLowerCase();

  if (/deslactosad|sin lactosa|0% lactosa|vegetal de almendra|bebida de soja|bebida de avena/i.test(text)) {
    return { status: 'deslactosado_fast_gi' };
  }

  if (
    /leche|yogur|queso|ricota|muzzarella|mozzarella|crema de leche|manteca|dulce de leche|helado|chocolatada|chocolate con leche|postrecito|flan/i.test(
      text
    )
  ) {
    return { status: 'contains_lactose' };
  }

  return { status: 'lactose_free' };
}

/**
 * Clasifica nivel estimado de Sodio para Hipertensión Arterial.
 */
export function classifyFoodSodiumStatus(food: FoodItem): 'high_sodium' | 'moderate_sodium' | 'low_sodium' {
  const text = `${food.name} ${food.brand || ''} ${food.category || ''}`.toLowerCase();

  if (/sin sal|bajo en sodio/i.test(text)) {
    return 'low_sodium';
  }

  if (
    /fiambre|jamón|salame|mortadela|salchicha|chorizo|panceta|queso rallado|provolone|roquefort|sardo|regianito|snack|papas fritas|chizito|palito salado|maní salado|caldo|sopa instant|salsa de soja|ketchup|mayonesa|mostaza|pizza|empanada|hamburguesa|pancho|galletitas saladas|cracker|bizcochito|don satur|9 de oro|tostada|pan francés/i.test(
      text
    )
  ) {
    return 'high_sodium';
  }

  if (
    /manzana|banana|naranja|pera|frutilla|uva|durazno|kiwi|tomate|lechuga|zanahoria|zapallo|papa|batata|arroz|lenteja|garbanzo|poroto|avena|huevo|pechuga|bife|maní natural|nuez|almendra/i.test(
      text
    ) &&
    !food.isCommercial
  ) {
    return 'low_sodium';
  }

  return 'moderate_sodium';
}

/**
 * Evalúa un alimento según todas las condiciones médicas activas del usuario
 * y devuelve las etiquetas/carteles visuales que deben mostrarse en la tarjeta del alimento.
 */
export function evaluateFoodForMedicalConditions(
  food: FoodItem,
  settings: UserSettings,
  quantity: number = 1
): FoodConditionBadge[] {
  const active = getActiveMedicalConditions(settings);
  const badges: FoodConditionBadge[] = [];

  const animProt = Math.round(food.animalProteinGrams * quantity * 10) / 10;
  const plantProt = Math.round(food.plantProteinGrams * quantity * 10) / 10;
  const fat = Math.round(food.fatGrams * quantity * 10) / 10;
  const fiber = Math.round((food.fiberGrams || 0) * quantity * 10) / 10;
  const carbs = Math.round(food.carbsGrams * quantity * 10) / 10;

  // 1. CELIAQUÍA (SIN TACC)
  if (active.celiac) {
    const gluten = classifyFoodGlutenStatus(food);
    if (gluten.status === 'gluten_free') {
      badges.push({
        conditionId: 'celiac',
        text: '🌾✅ Libre de Gluten / Sin TACC',
        tone: 'emerald',
        tooltip: gluten.reason,
      });
    } else if (gluten.status === 'contains_tacc') {
      badges.push({
        conditionId: 'celiac',
        text: '🌾🚫 CONTIENE TACC / GLUTEN (No apto Celíacos)',
        tone: 'rose',
        tooltip: gluten.reason,
      });
    } else {
      badges.push({
        conditionId: 'celiac',
        text: '🌾🔍 Verificar sello Sin TACC en envase',
        tone: 'amber',
        tooltip: gluten.reason,
      });
    }
  }

  // 2. INTOLERANCIA A LA LACTOSA
  if (active.lactose_intolerance) {
    const lactose = classifyFoodLactoseStatus(food);
    if (lactose.status === 'contains_lactose') {
      badges.push({
        conditionId: 'lactose_intolerance',
        text: '🥛⚠️ Contiene Lactosa (Elegir versión Deslactosada)',
        tone: 'amber',
        tooltip: 'Producto lácteo con lactosa. Si usás versión Deslactosada, recordá que absorbe más rápido.',
      });
    } else if (lactose.status === 'deslactosado_fast_gi') {
      badges.push({
        conditionId: 'lactose_intolerance',
        text: '🥛✅ Deslactosado (⚡ Absorción glucémica más rápida)',
        tone: 'cyan',
        tooltip: 'Libre de lactosa: la enzima lactasa divide el azúcar en glucosa y galactosa simple, subiendo antes la glucemia.',
      });
    } else {
      badges.push({
        conditionId: 'lactose_intolerance',
        text: '🥛✅ Naturalmente Sin Lactosa',
        tone: 'emerald',
      });
    }
  }

  // 3. PROTECCIÓN RENAL
  if (active.renal) {
    if (animProt >= 12) {
      badges.push({
        conditionId: 'renal',
        text: `🛡️⚠️ Renal: Alta Prot. Animal (${animProt}g de ${settings.maxAnimalProtein}g máx)`,
        tone: 'rose',
      });
    } else if (animProt === 0 && plantProt >= 3) {
      badges.push({
        conditionId: 'renal',
        text: `🌱✅ Renal: Aporta Prot. Vegetal (${plantProt}g) sin carga animal`,
        tone: 'emerald',
      });
    }
  }

  // 4. GASTROPARESIA DIABÉTICA
  if (active.gastroparesis) {
    if (fat >= 10 || fiber >= 4) {
      badges.push({
        conditionId: 'gastroparesis',
        text: `🐢⚠️ Gastroparesia: Digestión Lenta (${fat}g grasa / ${fiber}g fibra)`,
        tone: 'indigo',
        tooltip: 'Retrasa el vaciado del estómago: evitar pre-bolo anticipado largo y considerar dividir dosis.',
      });
    } else if (carbs > 5 && fat <= 3 && fiber <= 2) {
      badges.push({
        conditionId: 'gastroparesis',
        text: '⚡✅ Gastroparesia: Digestión gástrica liviana',
        tone: 'emerald',
      });
    }
  }

  // 5. HIPERTENSIÓN ARTERIAL (SODIO)
  if (active.hypertension) {
    const sodium = classifyFoodSodiumStatus(food);
    if (sodium === 'high_sodium') {
      badges.push({
        conditionId: 'hypertension',
        text: '🧂⚠️ Alto en Sodio / Ultraprocesado (Cuidado Presión)',
        tone: 'rose',
      });
    } else if (sodium === 'low_sodium') {
      badges.push({
        conditionId: 'hypertension',
        text: '💚✅ Bajo en Sodio (Natural)',
        tone: 'emerald',
      });
    }
  }

  // 6. DISLIPIDEMIA (COLESTEROL Y TRIGLICÉRIDOS)
  if (active.dyslipidemia) {
    if (fat >= 9) {
      badges.push({
        conditionId: 'dyslipidemia',
        text: `🩸⚠️ Alto en Grasas (${fat}g) • Cuidado Colesterol y Retardo Glucémico`,
        tone: 'amber',
      });
    } else if (fiber >= 3 && fat <= 5) {
      badges.push({
        conditionId: 'dyslipidemia',
        text: `🥑✅ Rico en Fibra (${fiber}g) • Ayuda a reducir Colesterol`,
        tone: 'emerald',
      });
    }
  }

  return badges;
}

export interface CalculatorConditionAlert {
  conditionId: MedicalConditionId;
  title: string;
  message: string;
  tone: 'amber' | 'rose' | 'indigo' | 'teal' | 'emerald';
}

/**
 * Genera alertas clínicas activas para mostrar dentro de la Calculadora de Insulina
 * según los alimentos cargados en el plato y las condiciones médicas activas del usuario.
 */
export function evaluatePlateForCalculatorConditions(
  plateItems: MealPlateItem[],
  totalCarbs: number,
  totalFat: number,
  totalFiber: number,
  totalAnimalProtein: number,
  settings: UserSettings
): CalculatorConditionAlert[] {
  const active = getActiveMedicalConditions(settings);
  const alerts: CalculatorConditionAlert[] = [];

  const combinedNames = plateItems.map((i) => `${i.foodItem.name} ${i.foodItem.brand || ''}`).join(' ').toLowerCase();

  // 1. Celiaquía en la calculadora
  if (active.celiac) {
    const hasTacc = plateItems.some((i) => classifyFoodGlutenStatus(i.foodItem).status === 'contains_tacc');
    const hasGlutenFreeFlour = /sin tacc|arroz|maizena|mandioca|chip[aá]|polenta|premezcla/i.test(combinedNames);

    if (hasTacc) {
      alerts.push({
        conditionId: 'celiac',
        title: '🌾🚫 Alerta Celiaquía: Alimento con TACC en el plato',
        message:
          'Uno o más alimentos seleccionados contienen Trigo/Avena/Cebada/Centeno común. Si vas a consumir su versión certificada Sin TACC (hecha con harina de arroz, maicena o mandioca), recordá que tiene mayor Índice Glucémico y sube la glucosa más rápido.',
        tone: 'rose',
      });
    } else if (hasGlutenFreeFlour || totalCarbs >= 20) {
      alerts.push({
        conditionId: 'celiac',
        title: '🌾⚡ Modo Celíaco Activo: Curva de Harinas Sin TACC',
        message:
          'Las harinas y premezclas Sin TACC (almidón de maíz, arroz y mandioca) tienen menos fibra proteica que el trigo y se absorben más rápido en sangre. Cuidá el tiempo de pre-bolo para evitar un pico alto inicial.',
        tone: 'amber',
      });
    }
  }

  // 2. Gastroparesia en la calculadora
  if (active.gastroparesis && totalCarbs > 0) {
    if (totalFat >= 10 || totalFiber >= 4) {
      alerts.push({
        conditionId: 'gastroparesis',
        title: '🐢⚠️ Alerta Gastroparesia: Comida de Vaciado Lento',
        message: `Este plato aporta ${totalFat.toFixed(1)}g de grasa y ${totalFiber.toFixed(1)}g de fibra. Con Gastroparesia el estómago tarda más en pasar los carbohidratos al intestino: evitá inyectarte mucho antes de comer (para no sufrir hipoglucemia temprana) y usá Bolo Dividido.`,
        tone: 'indigo',
      });
    } else {
      alerts.push({
        conditionId: 'gastroparesis',
        title: '🐢 Modo Gastroparesia: Precaución con el Pre-Bolo',
        message:
          'Por tu condición de digestión lenta, aplicá la insulina justo al empezar a comer (o al terminar si tu glucosa actual está por debajo de 100 mg/dL) para que el pico de Novorapid coincida con tu digestión.',
        tone: 'indigo',
      });
    }
  }

  // 3. Intolerancia a la Lactosa en la calculadora
  if (active.lactose_intolerance && plateItems.length > 0) {
    const hasDairy = plateItems.some((i) => classifyFoodLactoseStatus(i.foodItem).status !== 'lactose_free');
    if (hasDairy) {
      alerts.push({
        conditionId: 'lactose_intolerance',
        title: '🥛⚡ Modo Sin Lactosa: Impacto de Lácteos Deslactosados',
        message:
          'Al consumir leche o yogur Deslactosado, la lactosa ya viene dividida en glucosa y galactosa simples. Los gramos de carbohidratos son los mismos, pero entran a la sangre más rápido (mayor Índice Glucémico) que en el lácteo común.',
        tone: 'teal',
      });
    }
  }

  // 4. Protección Renal en la calculadora
  if (active.renal && totalAnimalProtein > 15) {
    alerts.push({
      conditionId: 'renal',
      title: `🛡️⚠️ Alerta Protección Renal: ${totalAnimalProtein.toFixed(1)}g de Proteína Animal en una sola comida`,
      message: `Esta comida representa más de la mitad de tu límite diario renal (${settings.maxAnimalProtein}g máx). Considerá reducir la porción animal o reemplazar parte por proteína vegetal.`,
      tone: 'rose',
    });
  }

  // 5. Dislipidemia en la calculadora
  if (active.dyslipidemia && totalFat >= 18) {
    alerts.push({
      conditionId: 'dyslipidemia',
      title: `🩸⚠️ Cuidado Colesterol y Triglicéridos: ${totalFat.toFixed(1)}g de Grasa en este plato`,
      message:
        'Las comidas altas en grasas saturadas no solo impactan el perfil lipídico sino que generan resistencia a la insulina entre 2 y 4 horas después de comer. Se recomienda usar la estrategia de Bolo Dividido.',
      tone: 'amber',
    });
  }

  return alerts;
}
