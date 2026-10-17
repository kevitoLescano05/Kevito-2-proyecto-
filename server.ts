import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";
import { POPULAR_FOODS_DATABASE } from "./src/data/foodDatabase";
import { COUNTRY_PROFILES, getSearchSourcesForCountry } from "./src/data/searchSources";
import { CountryCode } from "./src/types";
import { matchLocalDatabaseWithFuzzy, normalizeAndCorrectText, SPECIFIC_FLAVORS } from "./src/utils/foodMatcher";
import { auditFoodItem, auditMealTotals } from "./src/utils/clinicalAuditor";
import { searchOpenFoodFacts } from "./src/utils/openFoodFactsService";
import { searchFatSecretArgentina } from "./src/utils/fatSecretService";
import {
  compressPromptContext,
  calculateDynamicTimeoutMs,
  callOpenAiFallback,
  callAnthropicFallback,
  callOpenRouterMultiModel,
  callGroqFreeFallback,
} from "./src/utils/omniRouteEngine";
import { pushRouter } from "./server/webPushService";
import { communityReviewsRouter } from "./server/communityReviewsService";
import {
  fetchLibreLinkUpGlucose,
  fetchDexcomShareGlucose,
  fetchNightscoutGlucose,
} from "./server/cgmCloudConnectors";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "30mb" }));

// Lazy Server-side Gemini initialization
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required for AI operations");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Helper delay function
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper for model generation with strict timeout
async function generateWithTimeout(
  ai: GoogleGenAI,
  model: string,
  contents: any,
  config: any,
  timeoutMs: number = 10000
) {
  let timer: NodeJS.Timeout | null = null;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Timeout de ${timeoutMs}ms alcanzado para el modelo ${model}`));
      }, timeoutMs);
      if (timer.unref) timer.unref();
    });

    const callPromise = ai.models.generateContent({
      model,
      contents,
      config,
    });

    return await Promise.race([callPromise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Helper function for Gemini & OmniRoute generation with dynamic timeout per ingredient, resilient failovers and no hallucinations
async function generateContentWithFallback(params: {
  contents: any;
  config?: any;
  queryHint?: string;
  imagesCount?: number;
  timeoutMs?: number;
}) {
  // 1. OmniRoute Token Compression: compress text prompt if contents is string or simple prompt
  let finalContents = params.contents;
  let rawTextForCount = params.queryHint || "";
  if (typeof params.contents === "string") {
    rawTextForCount = params.contents;
    const { compressedPrompt, savingsRatio } = compressPromptContext(params.contents);
    if (savingsRatio > 0) {
      console.info(`[OmniRoute Compression] Prompt context compressed by ${savingsRatio}% tokens.`);
    }
    finalContents = compressedPrompt;
  } else if (params.contents?.parts && Array.isArray(params.contents.parts)) {
    for (const p of params.contents.parts) {
      if (p.text) rawTextForCount += " " + p.text;
    }
  }

  // Regla universal: calcular tiempo dinámico según los ingredientes (5 a 6s por ingrediente)
  const imagesCount = params.imagesCount || (Array.isArray(params.contents?.parts) ? params.contents.parts.filter((p: any) => p.inlineData).length : 0);
  const { ingredientCount, timeoutMs: dynamicTimeoutMs } = calculateDynamicTimeoutMs(rawTextForCount, imagesCount);
  const effectiveTimeout = params.timeoutMs || dynamicTimeoutMs;
  console.info(`[Dynamic AI Timing] Detected ~${ingredientCount} ingredients. Universal dynamic timeout: ${effectiveTimeout}ms (${(effectiveTimeout / 1000).toFixed(1)}s) per model/provider.`);

  const ai = getAiClient();
  // Modelos ordenados con prioridad a gemini-3.8-flash (disponible y estable) seguido de los demás
  const models = [
    { name: "gemini-3.8-flash", thinking: ThinkingLevel.LOW },
    { name: "gemini-3.6-flash", thinking: ThinkingLevel.LOW },
    { name: "gemini-3-flash-preview", thinking: ThinkingLevel.LOW },
    { name: "gemini-3.1-flash-lite", thinking: ThinkingLevel.MINIMAL },
    { name: "gemini-flash-latest", thinking: ThinkingLevel.MINIMAL },
  ];
  let lastError: any = null;

  for (const m of models) {
    try {
      const mergedConfig = {
        ...params.config,
        thinkingConfig: { thinkingLevel: m.thinking },
      };
      const response = await generateWithTimeout(
        ai,
        m.name,
        finalContents,
        mergedConfig,
        effectiveTimeout
      );
      if (response && response.text) {
        return response;
      }
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || err);
      console.warn(`[AI Failover] Model ${m.name} failed (${msg.slice(0, 90)}), switching immediately to next AI...`);
    }
  }

  // Fast schema-free fallback con el mismo tiempo dinámico
  if (params.config?.responseSchema) {
    console.info("Falling back to schema-free generation with JSON formatting prompt...");
    const schemaFreeConfig = {
      ...params.config,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      responseMimeType: "application/json",
    };
    delete schemaFreeConfig.responseSchema;

    for (const modelName of ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3-flash-preview"]) {
      try {
        const response = await generateWithTimeout(
          ai,
          modelName,
          finalContents,
          schemaFreeConfig,
          effectiveTimeout
        );
        if (response && response.text) {
          return response;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Schema-free fallback on ${modelName} failed:`, err?.message || err);
      }
    }
  }

  // 2. OmniRoute Multi-AI Resilient Fallback Pipeline (OpenAI, Anthropic, OpenRouter, Groq)
  // Extracts text prompt and any base64 images from finalContents
  let promptText = "";
  const imagesBase64: string[] = [];

  if (typeof finalContents === "string") {
    promptText = finalContents;
  } else if (finalContents?.parts && Array.isArray(finalContents.parts)) {
    for (const part of finalContents.parts) {
      if (part.text) {
        promptText += (promptText ? "\n\n" : "") + part.text;
      }
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || "image/jpeg";
        imagesBase64.push(`data:${mime};base64,${part.inlineData.data}`);
      }
    }
  }

  if (promptText) {
    const omniParams = {
      promptText,
      systemInstruction: params.config?.systemInstruction,
      imagesBase64,
      timeoutMs: effectiveTimeout,
    };

    // Escalón 2: OpenAI (GPT-4o-mini / GPT-4o) con visión
    try {
      console.info("[OmniRoute] Attempting Escalón 2: OpenAI (GPT-4o Vision)...");
      const openAiRes = await callOpenAiFallback(omniParams);
      if (openAiRes?.text) {
        console.info(`[OmniRoute] Responded successfully via OpenAI (${openAiRes.modelUsed}, ${openAiRes.latencyMs}ms)`);
        return { text: openAiRes.text };
      }
    } catch (openAiErr) {
      console.warn("[OmniRoute] OpenAI fallback skipped/error:", openAiErr);
    }

    // Escalón 3: Anthropic Claude (Claude 3.5 Haiku / Sonnet) con visión
    try {
      console.info("[OmniRoute] Attempting Escalón 3: Anthropic Claude (Claude 3.5 Vision)...");
      const anthropicRes = await callAnthropicFallback(omniParams);
      if (anthropicRes?.text) {
        console.info(`[OmniRoute] Responded successfully via Anthropic (${anthropicRes.modelUsed}, ${anthropicRes.latencyMs}ms)`);
        return { text: anthropicRes.text };
      }
    } catch (anthropicErr) {
      console.warn("[OmniRoute] Anthropic fallback skipped/error:", anthropicErr);
    }

    // Escalón 4: OpenRouter Malla Multi-Modelo (Qwen 2.5 VL, Pixtral 12B, DeepSeek, etc.)
    try {
      console.info("[OmniRoute] Attempting Escalón 4: OpenRouter Multi-Model Mesh...");
      const openRouterRes = await callOpenRouterMultiModel(omniParams);
      if (openRouterRes?.text) {
        console.info(`[OmniRoute] Responded successfully via OpenRouter (${openRouterRes.modelUsed}, ${openRouterRes.latencyMs}ms)`);
        return { text: openRouterRes.text };
      }
    } catch (orErr) {
      console.warn("[OmniRoute] OpenRouter multi-model fallback skipped/error:", orErr);
    }

    // Escalón 5: Groq Cloud (Llama 3.3 70B rápido)
    try {
      console.info("[OmniRoute] Attempting Escalón 5: Groq Cloud (Llama 3.3 70B)...");
      const groqRes = await callGroqFreeFallback(omniParams);
      if (groqRes?.text) {
        console.info(`[OmniRoute] Responded successfully via Groq (${groqRes.modelUsed}, ${groqRes.latencyMs}ms)`);
        return { text: groqRes.text };
      }
    } catch (groqErr) {
      console.warn("[OmniRoute] Groq free fallback skipped/error:", groqErr);
    }
  }

  throw lastError || new Error("No se pudo obtener respuesta de los modelos de IA.");
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "Insulin & Food Calculator API" });
});

// Helper to safely parse JSON from Gemini (with or without markdown fences from tools)
function parseJsonSafely(text: string) {
  if (!text) return null;
  const clean = text.replace(/```json\n?|\n?```/gi, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      return JSON.parse(clean.slice(firstBrace, lastBrace + 1));
    }
    const firstBracket = clean.indexOf("[");
    const lastBracket = clean.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket !== -1) {
      return JSON.parse(clean.slice(firstBracket, lastBracket + 1));
    }
    throw new Error("No se pudo procesar la respuesta JSON de la IA.");
  }
}

// Helper to search relevant ground-truth verified foods ONLY if explicitly mentioned in query
function findRelevantVerifiedFoods(queryText: string) {
  if (!queryText) return [];
  const normalizedQ = queryText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Use fuzzy and semantic matching from foodMatcher
  const fuzzyMatches = matchLocalDatabaseWithFuzzy(queryText);
  if (fuzzyMatches.length > 0) {
    // Only return items where at least one distinctive keyword (length >= 4) matches the query text
    return fuzzyMatches.filter(food => {
      const foodNameNorm = food.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const brandNorm = (food.brand || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const words = [...foodNameNorm.split(/\s+/), ...brandNorm.split(/\s+/)].filter(w => w.length >= 4);
      return words.some(w => normalizedQ.includes(w));
    }).slice(0, 4);
  }
  return [];
}



const SEARCH_SOURCES_LABELS: Record<string, string> = {
  argenfoods: "ARGENFOODS (UNLu - Universidad Nacional de Luján / Tabla Argentina)",
  sifega_anmat: "SIFeGA / ANMAT (Rótulos Oficiales CAA / Registro Nacional RNPA)",
  bedca_es: "BEDCA (Base de Datos Española de Composición de Alimentos) / AESAN España",
  aesan_es: "AESAN / Supermercados de España (Hacendado Mercadona, Carrefour ES, El Corte Inglés)",
  bam_smae_mx: "SMAE (Sistema Mexicano de Alimentos Equivalentes) y BAM (INCMNSZ Salvador Zubirán México)",
  cofepris_mx: "COFEPRIS NOM-051 (Rótulos Oficiales de México y marcas mexicanas)",
  inta_cl: "INTA Universidad de Chile / MINSAL (Tabla de Composición de Alimentos Chilenos)",
  tcac_co: "TCAC (ICBF Colombia) / INVIMA (Tabla de Composición de Alimentos Colombianos)",
  udelar_uy: "Tabla Uruguaya (Escuela de Nutrición UdelaR / MSP Uruguay)",
  cenan_pe: "CENAN / INS / DIGESA (Tablas Peruanas de Composición de Alimentos)",
  taco_tbca_br: "TACO (UNICAMP) & TBCA (USP / ANVISA Brasil)",
  usda_fda_us: "USDA FoodData Central & FDA Nutrition Facts (Estados Unidos)",
  fao_infoods: "FAO / INFOODS & LATINFOODS (Tablas Internacionales de Naciones Unidas)",
  openfoodfacts: "Open Food Facts (Fotos de rótulos oficiales y código de barras del país seleccionado)",
  infoalimentos: "InfoAlimentos / Alimentos Argentinos (Sec. de Agricultura de la Nación)",
  fatsecret: "FatSecret Regional (Marcas comerciales locales y porciones exactas del país seleccionado)",
  myfitnesspal: "MyFitnessPal & Cronometer (Base regional del país seleccionado)",
  usda_latinfoods: "USDA FoodData Central / LATINFOODS (Tablas científicas de referencia)",
  fabricantes: "Webs y Fichas Técnicas Oficiales de Fabricantes del país seleccionado",
  google_search: "Google Search (Búsqueda web en vivo)",
};

function formatSearchSourcesInstruction(selectedSources?: string[], countryCode: CountryCode = 'AR') {
  const profile = COUNTRY_PROFILES[countryCode] || COUNTRY_PROFILES.AR;
  const countrySources = getSearchSourcesForCountry(countryCode);
  const defaultKeys = countrySources.map(s => s.id);

  const activeKeys = Array.isArray(selectedSources) && selectedSources.length > 0
    ? selectedSources
    : defaultKeys;

  const selectedDescriptions = activeKeys.map(k => {
    const found = countrySources.find(cs => cs.id === k);
    return found ? `${found.name} (${found.description})` : (SEARCH_SOURCES_LABELS[k] || k);
  });
  const unselectedKeys = defaultKeys.filter(k => !activeKeys.includes(k));
  const fallbackDescriptions = unselectedKeys.map(k => SEARCH_SOURCES_LABELS[k] || k);

  return `
PAÍS / REGIÓN ACTIVA SELECCIONADA POR EL USUARIO: ${profile.flag} ${profile.name} (${profile.officialAgencyLabel})
- Normativa de etiquetado local: ${profile.labelingRuleSummary}
- Marcas locales frecuentes en ${profile.name}: ${profile.popularBrandsExamples}

JERARQUÍA Y FUENTES SELECCIONADAS POR EL USUARIO EN ${profile.name.toUpperCase()} (PRIORIDAD N° 1):
${selectedDescriptions.map((s, i) => `${i + 1}. ${s}`).join("\n")}

REGLA DE FALLBACK DINÁMICO (OBLIGATORIA):
1. Investiga y contrasta OBLIGATORIAMENTE primero en las fuentes prioritarias de ${profile.name} seleccionadas arriba.
2. Si el producto, plato o ingrediente NO se encuentra en las fuentes seleccionadas o sus datos son incompletos, activa automáticamente el FALLBACK buscando en las restantes fuentes (${fallbackDescriptions.length > 0 ? fallbackDescriptions.join(", ") : "Google Search y demás bases"}) o en la web general.
3. Cita obligatoriamente en la respuesta (en el campo 'source' o 'sourcesCited') cuál fue la fuente específica verificada de ${profile.name} donde se obtuvieron los datos.
`;
}

// Endpoint: Search foods or commercial products using Gemini + Google Search (supports POST & GET)
app.all(["/api/food-search", "/api/food-search/"], async (req, res) => {
  try {
    const rawParams = req.method === "GET" ? { ...req.query, ...req.body } : req.body || {};
    const query = typeof rawParams.query === "string" ? rawParams.query : "";
    const countryCode: CountryCode = (typeof rawParams.countryCode === "string" && rawParams.countryCode in COUNTRY_PROFILES)
      ? (rawParams.countryCode as CountryCode)
      : "AR";
    let selectedSources = rawParams.selectedSources;
    if (typeof selectedSources === "string") {
      try {
        selectedSources = JSON.parse(selectedSources);
      } catch {
        selectedSources = selectedSources.split(",").map((s: string) => s.trim());
      }
    }

    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Se requiere un término de búsqueda válido." });
    }

    const sourcesInstruction = formatSearchSourcesInstruction(selectedSources, countryCode);

    const systemInstruction = `
Eres un nutricionista cuantitativo y analista bioquímico de máxima precisión especializado en Diabetes Tipo 1 y nefrología nutricional (control de insuficiencia renal en Argentina y Latinoamérica).

SEGURIDAD CLÍNICA CRÍTICA EN DIABETES TIPO 1:
Un error en el conteo de carbohidratos provoca hiperglucemia severa o hipoglucemia potencialmente letal por sobredosificación o subdosificación de insulina. Por tanto, debes aplicar RIGOR ABSOLUTO en la búsqueda y extracción de datos nutricionales reales.

FLEXIBILIDAD LINGÜÍSTICA Y TOLERANCIA A TYPOS / VARIACIONES (COMPRENSIÓN SEMÁNTICA):
- La IA DEBE SER FLEXIBLE ante errores tipográficos comunes, erratas de teclado o flexiones del lenguaje:
  * Ejemplos de variaciones y sinónimos: "balanceado" = línea "Balance" (ej. Yogur Milkaut Balance), "descremada" = "descremado", "yogurth" = "yogur", "marbé" = "Marbe".
  * Ejemplos de typos comunes: "nilanesa" = "milanesa", "huebo" = "huevo", "arros" = "arroz", "fideis" = "fideos", "poyo" = "pollo".
  * Siempre interpreta la intención real del alimento o producto comercial que el usuario quiso decir, sin trabarte por una letra errónea.

${sourcesInstruction}

REGLAS OBLIGATORIAS DE BÚSQUEDA Y CLASIFICACIÓN:
1. NOMBRES BASADOS PURAMENTE EN LAS FUENTES Y BÚSQUEDA (PROHIBIDO IMPONER O INVENTAR NOMBRES):
   - El nombre del alimento ('name'), la marca ('brand') y la porción ('portionName') DEBEN basarse fielmente en la denominación oficial del producto tal como figura en los rótulos de los fabricantes, Google Search, Open Food Facts, SIFeGA/ANMAT o ARGENFOODS.
   - NUNCA inventes nombres artificiosos ni impongas plantillas forzadas. Usa la denominación comercial auténtica de la marca y del sabor específico encontrado.

2. COBERTURA TOTAL DE TODAS LAS MARCAS Y TODOS LOS SABORES:
   - El buscador DEBE reconocer e incluir CUALQUIER sabor y variedad que comercialice la marca buscada (Marbe, Doninas, Hogareñas, Frutigran, Bagley, Cereal Mix, Granix, Traviata, Express, Criollitas, etc.):
     * Sabores: Coco, Vainilla, Chocolate, Cacao, Limón, Naranja, Frutilla, Avena, Salvado, Chía, Sésamo, Lino, Arándanos, Frutos Rojos, etc.
   - Si el usuario busca un sabor específico de una marca (ej: "marbe sabor coco", "masitas doninas limon", "hogareñas salvado"), identifica y devuelve la información nutricional de esa marca en ese sabor exacto.

3. FIDELIDAD ESTRICTA A LAS FUENTES (PROHIBIDO IMPONER O INVENTAR VALORES):
   - ESTÁ TERMINANTEMENTE PROHIBIDO inventar, forzar, suponer o imponer valores nutricionales o macros predeterminados.
   - La aplicación debe ser un extractor fiel y objetivo de la información oficial de los fabricantes y bases de datos nutricionales:
     * Si la fuente oficial declara X calorías (kcal), transcribe exactamente X.
     * Si la fuente oficial declara X proteínas (g), transcribe exactamente X (clasificando en Proteína VEGETAL si proviene de harinas, avena, semillas o coco, y Proteína ANIMAL = 0 a menos que contenga ingredientes de origen animal como leche, suero lácteo o huevo real).
     * Si la fuente oficial declara X grasas (g) y X carbohidratos (g), transcribe exactamente esos valores.
   - Si el alimento se comercializa en porciones divisibles (ej. masitas o galletitas):
     * Incluye la porción oficial declarada en el rótulo del fabricante (ej: "Porción de 5 masitas (30g)").
     * Incluye también la versión por unidad individual (ej: "1 masita / unidad (~6g)"), dividiendo con precisión matemática los valores oficiales de la porción entre las unidades que la integran.
   - Cita textualmente en el campo 'source' el rótulo o la fuente de donde se extrajeron los datos nutricionales.

4. REGLA DE COHERENCIA CON DATOS DEL USUARIO:
   - Si el usuario declara un valor de referencia o dato específico de la etiqueta (ej: "la etiqueta dice 115 kcal" o "recuerdo que tenía 12g de carbohidratos"), el sistema DEBE contrastar prioritariamente contra la variante comercial cuyo rótulo coincida con esa especificación.

5. PROHIBICIÓN TOTAL DE SUPOSICIONES O VALORES PREDILECTOS DE PORCIONES:
   - "Masita" en Argentina = "Galletita" (1 sola unidad física individual). NUNCA interpretes "N masitas" como "N porciones de paquete".
   - METODOLOGÍA OBLIGATORIA:
     1. Busca la porción oficial declarada por el fabricante (en gramos) y la CANTIDAD EXACTA DE UNIDADES que componen esa porción (ej: "30g = 7 galletitas" en Hogareñas, "30g = 5 masitas" en Marbe o Doninas, "33g = 3 galletitas" en Frutigran, "180g = 1 pote" en Yogur).
     2. Divide los carbohidratos, proteínas y calorías entre el número exacto de unidades para obtener el valor unitario real.
     3. Cita obligatoriamente la fuente y el rótulo encontrado en el campo 'source'.

6. DISCRIMINACIÓN EXACTA DE PROTEÍNA ANIMAL VS VEGETAL Y MACROS DE EMBUTIDOS/ADEREZOS:
   - REGLA VEGETAL: Galletitas hechas con harina de trigo, salvado de avena, coco rallado, aceite vegetal, semillas o lecitina de soja son 100% VEGETALES. Toda su proteína debe asignarse a "plantProteinGrams" y "animalProteinGrams" DEBE SER 0.
   - REGLA ANIMAL / EMBUTIDOS Y CARNES (Chorizo, salchicha, morcilla, carne vacuna, cerdo, pollo, fiambres): Son 100% proteína de origen ANIMAL (plantProteinGrams = 0, animalProteinGrams = valor total de proteína). Los chorizos y carnes tienen 0 a 1g de carbohidratos (NUNCA 10g de carbohidratos).
   - ADEREZOS Y MAYONESA: La mayonesa es una emulsión de aceite y huevo; tiene 0 a 1g de carbohidratos por cucharada sopera (NUNCA 10g de carbohidratos). Es grasa pura.
   - ADVERTENCIAS DE TRAZAS ("Puede contener leche/huevo"): Las advertencias de contaminación cruzada NO constituyen ingredientes proteicos y NO suman gramos de proteína animal (animalProteinGrams = 0).

7. NORMATIVA DE ROTULADO EN ARGENTINA / MERCOSUR (CAA / RES. GMC 46/03) - CARBOHIDRATOS Y FIBRA:
   - En Argentina y el MERCOSUR (según el Código Alimentario Argentino), el renglón de "Carbohidratos" del rótulo declara ÚNICAMENTE los carbohidratos asimilables/digeribles.
   - La "Fibra alimentaria" se declara en un renglón SEPARADO e INDEPENDIENTE, y NO ESTÁ INCLUIDA dentro del número de Carbohidratos.
   - REGLA CRÍTICA PARA DIABETES TIPO 1:
     * El valor de Carbohidratos (carbsGrams) del rótulo argentino ya es el valor asimilable para el cálculo del bolus de insulina (Novorapid) según el ratio ICR (1U cada 8g de HC).
     * ESTÁ ESTRICTAMENTE PROHIBIDO RESTAR LA FIBRA de los carbohidratos declarados en el rótulo argentino (hacerlo provocaría subdosificación peligrosa de insulina).
     * Si contiene polioles (ej. Maltitol o Isomalt), acláralo en la descripción.

8. Devuelve TODAS las opciones y variantes que encuentres para este alimento o marca (hasta 12 alternativas en el JSON si existen opciones por porción de paquete, por 100 gramos, por unidad individual o variantes de sabor/línea comercial).
   - Si encuentras valores declarados por 100 gramos, indícalo claramente en 'portionName' (ej: "100 gramos") para que el usuario pueda saber que son valores cada 100g.
   - Si encuentras valores por porción de paquete (ej: "Porción de 30g (3 galletitas)"), inclúyelo también como opción separada.
   - PROHIBIDO INVENTAR O MODIFICAR NÚMEROS: Copia exactamente los carbohidratos, proteínas, grasas y calorías de las fuentes reales.
`;

    const prompt = `Investiga la información nutricional oficial EXACTA en fuentes oficiales o Google Search para el producto y variante: "${query}".
Presta atención meticulosa a cada palabra (marca, línea, variante como 'Sin Azúcar' / 'Light' / 'Diet', sabor específico y tamaño de porción).
Extrae los nombres auténticos de las fuentes (no inventes nombres ni impongas fórmulas estimadas) y transcribe con fidelidad absoluta los valores exactos declarados en los rótulos o bases de datos: calorías reales (kcal), proteínas reales (g), carbohidratos (g) y grasas (g), tanto por porción de paquete como por 100 gramos o por unidad individual. Si encuentras datos para 100g o para porciones de paquete, devuélvelos como opciones separadas para que el usuario vea todas las opciones disponibles. PROHIBIDO INVENTAR O FORZAR VALORES.`;

    // Concurrently trigger direct official database connectors for the selected country:
    // 1. FatSecret Regional (real-time official brand labels, exact manufacturer portions)
    const fatSecretPromise = searchFatSecretArgentina(query, 12, countryCode).catch(() => []);

    // 2. Open Food Facts (with strict relevance and country subdomain filtering)
    const offPromise = searchOpenFoodFacts(query, 12, countryCode).catch(() => []);

    let foods: any[] = [];
    try {
      const response = await generateContentWithFallback({
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Nombre completo del alimento" },
                brand: { type: Type.STRING, description: "Marca o comercial si aplica (ej. Integralia, Bagley, Fargo, Casero)" },
                portionName: { type: Type.STRING, description: "Descripción de la porción (ej. 'Porción de 3 galletas (30g)')" },
                gramsPerPortion: { type: Type.NUMBER, description: "Peso en gramos de la porción" },
                carbsGrams: { type: Type.NUMBER, description: "Gramos totales de carbohidratos" },
                animalProteinGrams: { type: Type.NUMBER, description: "Gramos de proteína de origen ANIMAL" },
                plantProteinGrams: { type: Type.NUMBER, description: "Gramos de proteína de origen VEGETAL" },
                fatGrams: { type: Type.NUMBER, description: "Gramos de grasas totales" },
                calories: { type: Type.NUMBER, description: "Calorías totales (kcal)" },
                gi: { type: Type.STRING, description: "Índice Glucémico: 'Bajo', 'Medio', o 'Alto'" },
                cg: { type: Type.NUMBER, description: "Carga Glucémica estimada" },
                absorption: { type: Type.STRING, description: "Absorción esperada: 'Rápida', 'Lenta', o 'Mixta'" },
                isCommercial: { type: Type.BOOLEAN, description: "Indica si es un producto comercial empaquetado" },
                category: { type: Type.STRING, description: "Categoría de alimento" },
                source: { type: Type.STRING, description: "Fuente oficial verificada (ej. FatSecret Argentina / Rótulo Oficial Bagley Arcor / SIFeGA ANMAT)" },
              },
              required: [
                "name",
                "portionName",
                "gramsPerPortion",
                "carbsGrams",
                "animalProteinGrams",
                "plantProteinGrams",
                "fatGrams",
                "calories",
                "gi",
                "cg",
                "absorption",
              ],
            },
          },
        },
      });

      const jsonText = response.text || "[]";
      foods = parseJsonSafely(jsonText) || [];
    } catch (aiErr: any) {
      console.warn("AI generation in /api/food-search skipped or rate-limited:", aiErr?.message || aiErr);
    }

    // Filter out contradictory foods if query had "sin azucar" / "light" but AI returned sugary version
    const lowerQ = query.toLowerCase();
    if (lowerQ.includes("sin azucar") || lowerQ.includes("0% azucar") || lowerQ.includes("cero azucar")) {
      foods = foods.filter((f: any) => {
        const name = (f.name || '').toLowerCase();
        if (name.includes("con azucar") || (f.gramsPerPortion <= 35 && f.carbsGrams > 22)) return false;
        return true;
      });
    }

    // Await FatSecret Argentina and Open Food Facts results
    const [fatSecretResults, offResults] = await Promise.all([fatSecretPromise, offPromise]);

    // Merge verified local items so official verified brand products are NEVER missed or hidden
    const localMatches = matchLocalDatabaseWithFuzzy(query);
    const topLocalMatches = localMatches.slice(0, 15).map((f) => ({
      ...f,
      source: f.source || "Base de datos local verificada (ARGENFOODS / Rótulo oficial)",
    }));

    // Combine verified FatSecret Argentina, local database, Open Food Facts, and AI search results
    // FatSecret and local verified database take top priority!
    const combinedRaw = [...fatSecretResults, ...topLocalMatches, ...offResults, ...foods];
    const mergedFoods: any[] = [];

    for (const item of combinedRaw) {
      const isDuplicate = mergedFoods.some(
        (existing) => existing.name.trim().toLowerCase() === (item.name || '').trim().toLowerCase()
      );
      if (!isDuplicate) {
        // Clinically audit each item to ensure protein separation without altering label numbers or portions
        const audited = auditFoodItem(item);
        mergedFoods.push({
          ...item,
          name: item.name || audited.name,
          portionName: item.portionName || audited.portionName,
          gramsPerPortion: item.gramsPerPortion || audited.gramsPerPortion,
          carbsGrams: item.carbsGrams ?? audited.carbsGrams,
          fiberGrams: item.fiberGrams ?? audited.fiberGrams,
          animalProteinGrams: item.animalProteinGrams ?? audited.animalProteinGrams,
          plantProteinGrams: item.plantProteinGrams ?? audited.plantProteinGrams,
          totalProteinGrams: item.totalProteinGrams ?? audited.totalProteinGrams,
          fatGrams: item.fatGrams ?? audited.fatGrams,
          calories: item.calories ?? audited.calories,
          source: item.source || audited.source,
          isClinicallyAudited: true,
        });
      }
    }

    if (mergedFoods.length > 0) {
      // Return ALL found options (up to 30) so the user can select their exact packaging/portion
      return res.json({ foods: mergedFoods.slice(0, 30), isFallback: foods.length === 0 });
    }

    return res.json({ foods: [], isFallback: false });
  } catch (error: any) {
    console.warn("Fallback in /api/food-search using direct connectors:", error?.message || error);
    const [fatSecretFallback, offFallback] = await Promise.all([
      searchFatSecretArgentina(req.body?.query || "").catch(() => []),
      searchOpenFoodFacts(req.body?.query || "", 12).catch(() => []),
    ]);
    const localMatches = matchLocalDatabaseWithFuzzy(req.body?.query || "");
    const fallbackCombined = [...fatSecretFallback, ...localMatches.slice(0, 15), ...offFallback];
    const auditedFallback = fallbackCombined.map((f: any) => {
      const audited = auditFoodItem(f);
      return {
        ...f,
        name: f.name || audited.name,
        portionName: f.portionName || audited.portionName,
        gramsPerPortion: f.gramsPerPortion || audited.gramsPerPortion,
        carbsGrams: f.carbsGrams ?? audited.carbsGrams,
        fiberGrams: f.fiberGrams ?? audited.fiberGrams,
        animalProteinGrams: f.animalProteinGrams ?? audited.animalProteinGrams,
        plantProteinGrams: f.plantProteinGrams ?? audited.plantProteinGrams,
        totalProteinGrams: f.totalProteinGrams ?? audited.totalProteinGrams,
        fatGrams: f.fatGrams ?? audited.fatGrams,
        calories: f.calories ?? audited.calories,
        source: f.source || "Base de datos local verificada (ARGENFOODS / Rótulo oficial)",
        isClinicallyAudited: true,
      };
    });
    return res.json({
      foods: auditedFallback.slice(0, 30),
      isFallback: true,
    });
  }
});

// Endpoint: Complete AI Meal & Photo Analyzer (supports POST & GET)
app.all(["/api/analyze-food", "/api/analyze-food/"], async (req, res) => {
  try {
    const rawParams = req.method === "GET" ? { ...req.query, ...req.body } : req.body || {};
    const {
      query,
      imageBase64,
      imagesBase64,
      currentGlucose: rawBg,
      trendArrow = 'flat',
      eatingSequencing,
      isf: rawIsf,
      icr: rawIcr,
      targetGlucose: rawTarget,
      selectedSources,
      iob: rawIob,
      countryCode: rawCountryCode,
      medicalConditions: rawMedicalConditions,
    } = rawParams;

    const countryCode: CountryCode = (typeof rawCountryCode === "string" && rawCountryCode in COUNTRY_PROFILES)
      ? (rawCountryCode as CountryCode)
      : "AR";

    const activeConds = rawMedicalConditions && typeof rawMedicalConditions === "object"
      ? rawMedicalConditions
      : { renal: true };

    const currentGlucose = rawBg !== undefined && rawBg !== null ? Number(rawBg) : undefined;
    const isf = rawIsf !== undefined && rawIsf !== null ? Number(rawIsf) : 28;
    const icr = rawIcr !== undefined && rawIcr !== null ? Number(rawIcr) : 8;
    const targetGlucose = rawTarget !== undefined && rawTarget !== null ? Number(rawTarget) : 100;
    const iob = rawIob !== undefined && rawIob !== null ? Number(rawIob) : 0;

    const allImages: string[] = [];
    if (Array.isArray(imagesBase64) && imagesBase64.length > 0) {
      allImages.push(...imagesBase64);
    } else if (imageBase64) {
      allImages.push(imageBase64);
    }

    if (!query && allImages.length === 0) {
      return res.status(400).json({ error: "Debes ingresar una descripción de la comida o adjuntar al menos una foto." });
    }

    // Deduce or enforce active eating sequencing
    let activeSequencing = eatingSequencing;
    if (!activeSequencing && query) {
      const qLower = query.toLowerCase();
      if (
        qLower.includes("ensalada antes") ||
        qLower.includes("primero la ensalada") ||
        qLower.includes("primero ensalada") ||
        qLower.includes("primero verduras") ||
        qLower.includes("primero la fibra") ||
        qLower.includes("fibra primero") ||
        qLower.includes("verdura primero") ||
        qLower.includes("antes de la pizza")
      ) {
        activeSequencing = "veggies_first";
      } else if (
        qLower.includes("pasta de maní") ||
        qLower.includes("untar") ||
        qLower.includes("untado") ||
        qLower.includes("mezclado") ||
        qLower.includes("junto") ||
        qLower.includes("juntar")
      ) {
        activeSequencing = "mixed";
      } else {
        activeSequencing = "standard";
      }
    } else if (!activeSequencing) {
      activeSequencing = "standard";
    }

    // Consultar bases de datos oficiales en tiempo real según el país seleccionado
    let verifiedMatches: any[] = [];
    if (query) {
      const [fatSecretRes, offRes] = await Promise.all([
        searchFatSecretArgentina(query, 6, countryCode).catch(() => []),
        searchOpenFoodFacts(query, 6, countryCode).catch(() => []),
      ]);
      const localMatches = matchLocalDatabaseWithFuzzy(query).slice(0, 6);
      const combined = [...localMatches, ...fatSecretRes, ...offRes];
      const seen = new Set<string>();
      for (const item of combined) {
        const key = `${(item.name || '').toLowerCase()}-${(item.brand || '').toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          verifiedMatches.push(auditFoodItem(item));
        }
      }
    }

    const sourcesInstruction = formatSearchSourcesInstruction(selectedSources, countryCode);

    const activeCondNotes: string[] = [];
    if (activeConds.celiac) {
      activeCondNotes.push(
        "- CELIAQUÍA / MODO SIN TACC ACTIVO: Indica claramente en 'glycemicFactors' si los alimentos contienen TACC (Trigo, Avena, Cebada, Centeno) o si son Libres de Gluten / Sin TACC. Además, si son panificados o pastas Sin TACC (harina de arroz, almidón de maíz, mandioca), advierte que tienen un Índice Glucémico más alto y absorción más rápida que el trigo."
      );
    }
    if (activeConds.gastroparesis) {
      activeCondNotes.push(
        "- GASTROPARESIA DIABÉTICA ACTIVA: Advierte sobre el vaciado gástrico lento (especialmente si hay grasa o fibra), recomendando evitar pre-bolos largos antes de comer para prevenir hipoglucemia temprana y priorizar bolo dividido."
      );
    }
    if (activeConds.hypertension) {
      activeCondNotes.push(
        "- HIPERTENSIÓN ARTERIAL ACTIVA: Evalúa el contenido estimado de Sodio / sal oculta de la comida e incluye una recomendación de cuidado de presión arterial en 'glycemicFactors'."
      );
    }
    if (activeConds.dyslipidemia) {
      activeCondNotes.push(
        "- DISLIPIDEMIA (COLESTEROL Y TRIGLICÉRIDOS) ACTIVA: Evalúa el aporte de grasas saturadas y fibra soluble del plato y su efecto tanto lipídico como de resistencia tardía a la insulina."
      );
    }
    if (activeConds.lactose_intolerance) {
      activeCondNotes.push(
        "- INTOLERANCIA A LA LACTOSA ACTIVA: Identifica si el plato contiene lactosa. Si el usuario consume versión Deslactosada, advierte que la lactosa hidrolizada (glucosa + galactosa) se absorbe más rápido (mayor Índice Glucémico)."
      );
    }
    if (activeConds.renal !== false) {
      activeCondNotes.push(
        "- PROTECCIÓN RENAL ACTIVA: Evalúa estrictamente la carga de proteína animal frente al límite diario de 25g y destaca el aporte vegetal en 'renalSafetyNote'."
      );
    }
    const medicalConditionsPromptBlock =
      activeCondNotes.length > 0
        ? `\nCONDICIONES MÉDICAS Y NUTRICIONALES ACTIVAS DEL PACIENTE (OBLIGATORIO INCLUIR EN EL ANÁLISIS):\n${activeCondNotes.join("\n")}\n`
        : "";
    
    const verifiedContext =
      verifiedMatches.length > 0
        ? `\nTABLA NUTRICIONAL OFICIAL VERIFICADA DE BASE DE DATOS (MÁXIMA PRIORIDAD - FATSECRET ARGENTINA / OPEN FOOD FACTS / ARGENFOODS):
${verifiedMatches
  .map(
    (m) =>
      `• ${m.name} (${m.brand || 'General'}): "${m.portionName}" (${m.gramsPerPortion}g) -> Carbohidratos Totales: ${m.carbsGrams}g, Prot. Animal: ${m.animalProteinGrams}g, Prot. Vegetal: ${m.plantProteinGrams}g, Grasas: ${m.fatGrams}g, Calorías: ${m.calories} kcal. Fuente oficial: ${m.source || 'Rótulo verificado'}`
  )
  .join("\n")}
METODOLOGÍA DE CÁLCULO DESDE LA BASE DE DATOS:
- Si los alimentos descritos o visibles en la foto corresponden a los de la tabla verificada de arriba, UTILIZA DIRECTAMENTE ESTOS VALORES OFICIALES para calcular las porciones y carbohidratos consumidos.
- Si un ingrediente o plato NO está en la tabla de arriba, recurre a la búsqueda web o fichas de fabricantes para obtener el rótulo oficial antes de calcular.
`
        : "";

    const systemInstruction = `
Eres un médico nutriólogo cuantitativo y especialista en Diabetes Tipo 1 y control de función renal estricta.
Analiza la comida descrita en texto o en las imágenes adjuntas.
${verifiedContext}

SEGURIDAD CLÍNICA Y PREVENCIÓN DE ERRORES EN DIABETES TIPO 1:
Un error en el conteo de carbohidratos (por confundir una versión estándar con una reducida o viceversa) descalibra la dosis de insulina e induce hipoglucemias severas o hiperglucemias graves.
1. REGLA ESTRICTA DE VARIANTES COMERCIALES (CERO OMISIONES) Y TOLERANCIA A TYPOS / FLEXIONES:
   - Nunca omitas palabras que indiquen la línea específica del producto, como: "Balance" (o "Balanceado"), "Light", "Descremado", "0%", "Entero", "Sin Azúcar", "Zero", "Cero", "Diet", "Proteico", "Firme", "Cremoso", "Con Chips", "Con Avena".
   - La IA debe ser inteligente y flexible ante errores ortográficos y flexiones (ej. "balanceado" = línea "Balance", "nilanesa" = "milanesa", "huebo" = "huevo", "yogurth" = "yogur", "arros" = "arroz"), infiriendo con precisión el alimento real.
   - Si el usuario menciona "Yogur Milkaut Cremoso Balance" (o "balanceado"), analiza OBLIGATORIAMENTE la versión Balance (88 kcal, 12g Carbohidratos, 8.4g Proteína, 0.6g Grasa en 180g) y NUNCA la versión entera tradicional.
   - Si el usuario declara un valor de referencia o sospecha del rótulo (ej: "tenía 12g de carbohidratos" o "la etiqueta dice 88 kcal"), debes verificar y usar prioritariamente la variante oficial que coincida con esa composición.

${sourcesInstruction}
${medicalConditionsPromptBlock}
REGLAS DE DESGLOSE NUTRICIONAL, LINGÜÍSTICO Y CLÍNICO:
1. PROHIBICIÓN TOTAL DE ESTIMACIONES O PORCIONES PREDILECTAS ARBITRARIAS:
   - ESTÁ ESTRICTAMENTE PROHIBIDO asumir o inventar un peso estándar o contenido de carbohidratos genérico (como suponer que cualquier galleta pesa 10g o que 3 galletas son 30g).
   - "Masita" en Argentina = "Galletita" (1 unidad física individual). NUNCA calcules "N masitas" como "N porciones de paquete".
   - METODOLOGÍA OBLIGATORIA DE BÚSQUEDA Y CÁLCULO DESDE EL RÓTULO REAL:
     * Para cualquier alimento o producto empaquetado (galletitas, yogures, alfajores, panes, cereales), consulta en tiempo real en internet en las fuentes seleccionadas (o fallback en Open Food Facts Argentina, SIFeGA/ANMAT, ARGENFOODS, FatSecret, web del fabricante, Google Search) la tabla nutricional oficial del producto.
     * Identifica la porción oficial declarada por el fabricante (en gramos) y la CANTIDAD EXACTA DE UNIDADES FÍSICAS que componen esa porción (ej: "30g = 7 galletitas", "30g = 4 galletitas", "30g = 5 galletitas", "33g = 3 galletitas", "180g = 1 pote").
     * Obtén el valor de carbohidratos y macros por 1 unidad física dividiendo la porción declarada entre la cantidad exacta de unidades que la integran.
     * Multiplica matemáticamente por la cantidad exacta consumida por el usuario.
     * Cita OBLIGATORIAMENTE en 'sourcesCited' el rótulo y porción oficial encontrados y qué fuentes fueron utilizadas.

2. REGLA ESTRICTA ANTI-ALUCINACIÓN: Analiza ÚNICAMENTE los alimentos y platos que sean claramente VISIBLES en las fotos provistas o que el usuario haya especificado textualmente. NO inventes ingredientes invisibles, salsas extra, aderezos o quesos si no son evidentes.
3. Si se proveen MÚLTIPLES fotos (ej. Foto 1: plato de carne, Foto 2: fuente con fideos), analiza y desglosa CADA plato individualmente en la lista de ítems.
4. Desglosa los ingredientes o ítems individuales (ej. "Carne vacuna magra (200g)", "Fideos con salsa (180g)").
5. Calcula para cada ingrediente y para el TOTAL de la comida:
   - Carbohidratos (g) (según Rótulo Argentino / CAA: carbohidratos disponibles/asimilables).
   - Fibra alimentaria (g) (declarada por separado en la normativa argentina CAA / MERCOSUR).
   - REGLA CRÍTICA DE BOLUS EN DIABETES TIPO 1 (ARGENTINA / MERCOSUR):
     * En Argentina y MERCOSUR, la fibra YA está excluida del renglón de Carbohidratos por ley. Por lo tanto, los Carbohidratos a contar para la insulina (ratio ICR) son DIRECTAMENTE los carbohidratos declarados (carbsGrams).
     * ESTÁ ESTRICTAMENTE PROHIBIDO RESTAR LA FIBRA de los carbohidratos declarados (netCarbsGrams = carbsGrams, excepto deducción del 50% de polioles si los hubiera).
   - Proteína de origen ANIMAL (g) (Cualquier carne, pollo, cerdo, pescado, HUEVO, HUEVO EN POLVO, albúmina, queso, leche o derivados lácteos reales presentes en la masa o relleno).
   - Proteína de origen VEGETAL (g) (harinas, panificados, avena, arroz, legumbres, vegetales, semillas, frutos secos, coco).
   - REGLA RENAL CRÍTICA & CLASIFICACIÓN FACTUAL:
     * Si una galletita/producto es de origen vegetal (harina, salvado de avena, coco, aceite de girasol, lecitina de soja), su proteína es 100% VEGETAL y 'Proteína ANIMAL' DEBE SER 0g.
     * Las leyendas de advertencia de alérgenos ("Puede contener derivados de huevo/leche/maní" por compartir línea de envasado) NO son ingredientes y NO deben computarse como proteína animal (animalProteinGrams = 0g).
     * Solo computa como proteína animal si el producto contiene lácteos o huevo/huevo en polvo real entre sus ingredientes constitutivos.
   - Grasas totales (g)
   - Calorías totales (kcal)
6. MANEJO CLÍNICO DE POLIALCOHOLES / ENDULZANTES (Maltitol, Sorbitol, Isomalt, Eritritol, Xilitol):
   - Si el alimento contiene polialcoholes declarados en sus ingredientes o tabla:
     * Maltitol / Isomalt / Sorbitol: Contabiliza solo el 50% de sus gramos como carbohidratos absorbibles hacia netCarbsGrams.
     * Eritritol: Contabiliza 0% (no eleva glucemia ni requiere Novorapid).
     * Xilitol: Contabiliza el 60%.
   - Incluye en 'polyolsGrams', 'sweetenersDetected' (lista de edulcorantes/polioles detectados) y explica en 'polyolsCalculationNote' cómo se procesaron.
7. Estima Índice Glucémico (Bajo, Medio, Alto), Carga Glucémica (CG) y Velocidad de absorción (Rápida, Lenta, Mixta).
8. CÁLCULO CLÍNICO DE DOSIS DE BOLUS Y PROYECCIÓN FISIOLÓGICA DE INSULINA ACTIVA (IOB):
   - Dosis por carbohidratos = Carbohidratos (carbsGrams o netCarbsGrams) / ICR (usando ICR = ${icr} g por unidad de insulina).
   - Glucosa actual: ${currentGlucose ? `${currentGlucose} mg/dL` : "no provista"} (Objetivo: ${targetGlucose} mg/dL, FSI = ${isf} mg/dL por unidad). Corrección inicial = (Glucosa Actual - ${targetGlucose}) / ${isf}.
   - Insulina Activa (IOB) actual en cuerpo: ${Number(iob) > 0 ? `${Number(iob).toFixed(2)} U` : "0 U"}.
   ${Number(iob) > 0 ? `* ATENCIÓN CRÍTICA DE SEGURIDAD CON INSULINA ACTIVA (IOB = ${Number(iob).toFixed(2)} U):
     - La insulina activa descenderá la glucosa por sí sola en: ${Number(iob).toFixed(2)} U × ${isf} mg/dL = -${Math.round(Number(iob) * isf)} mg/dL.
     - Glucemia proyectada sin comida = ${currentGlucose ? `${currentGlucose} - ${Math.round(Number(iob) * isf)} = ${Number(currentGlucose) - Math.round(Number(iob) * isf)} mg/dL` : 'no determinada'}.
     - El IOB cubre primero cualquier corrección requerida, y el IOB residual cubre directamente los carbohidratos de esta comida.
     - Dosis neta de Novorapid sugerida = Dosis Carbohidratos + Corrección - IOB. Si la dosis neta ≤ 0, la dosis recomendada es 0 U y el IOB excedente previene hipoglucemia solo si se consumen carbohidratos de rescate.
     - En 'calculoDosisBolus' desglosa con exactitud esta deducción para que el usuario NUNCA aplique una sobredosis que cause hipoglucemia.` : ''}
9. Examina los factores glucémicos involucrados (presencia de grasas/proteínas que retrasan vaciado gástrico, fibra, etc.).
10. Revisa los límites de proteína renal estrictos:
   - Límite diario de Proteína ANIMAL: Máximo 25 g por día.
   - Rango diario de Proteína VEGETAL: Entre 25 g y 35 g por día.
11. BÚSQUEDA EN TIEMPO REAL: Si se menciona un producto empaquetado o de marca comercial o dietética (ej. "galletas Hogareñas", "alfajor Chocoarroz", etc.), consulta la tabla nutricional real publicada en las fuentes seleccionadas (o en el fallback de ARGENFOODS, SIFeGA ANMAT, FatSecret, MyFitnessPal, web del fabricante o Google Search) y calcula con máxima exactitud los carbohidratos y proteínas por unidad/porción.

12. REGLA CLÍNICA DE SENSIBILIDAD A LA ACTIVIDAD FÍSICA:
   - ATENCIÓN ESTRICTA: El usuario NO experimenta aumento perceptible de sensibilidad a la insulina con la actividad física. PROHIBIDO sugerir reducciones de dosis o atribuir descensos de glucosa a caminatas o pesas en los factores glucémicos analizados.

13. REGLAS CARDINALES DE SEGURIDAD PARA GLUCEMIA BAJA Y BOLO DIVIDIDO (MDI NOVORAPID):
   - GLUCEMIA BAJA O HIPOGLUCEMIA INICIAL (< 85 mg/dL, y muy especialmente < 70 mg/dL):
     * ESTÁ ESTRICTAMENTE PROHIBIDO indicar "0 unidades" en la comida y demorar toda la dosis a 3 horas. Eso es un error clínico fatal que induce hiperglucemia severa (>240 mg/dL) a la hora y media seguida de hipoglucemia severa tardía.
     * La presencia de grasa no hace que los carbohidratos se absorban "todos juntos a las 3 horas"; hace que se liberen GRADUALMENTE de a poco.
     * Si la glucemia está < 70 mg/dL: el usuario DEBE comer primero. La 1ª dosis (55-60% del bolo) se aplica a los 20-30 min de empezar a comer, tras confirmar en el FreeStyle Libre que la glucosa subió a >85-90 mg/dL.
     * Si la glucemia está entre 70 y 84 mg/dL: la 1ª dosis (55-60% del bolo) se aplica a los 15-20 min post-ingesta.
     * La 2ª dosis programada (35-45% restante) NUNCA debe demorarse más de 1h 30m a 2h (máximo 120 minutos). Demoras de 3 horas o más están PROHIBIDAS porque la Novorapid ya agotó su acción inicial y el alimento ya picó a los 90 minutos.

14. INTELIGENCIA DE SECUENCIACIÓN NUTRICIONAL Y COMBINACIÓN DE ALIMENTOS:
   - Modo de ingesta actual: "${activeSequencing}".
   - La IA DEBE razonar dinámicamente:
     * Si es 'veggies_first' (ej. ensalada antes de pizza o verduras antes de arroz):
       - La fibra de la entrada retrasa el inicio de la digestión.
       - Si la glucosa es normal/alta, 1ª dosis al comenzar los carbohidratos. Si la glucosa es baja (<85), 20-30m post-comida.
       - 2ª dosis programada a las 1 h 45m o 2 h (máximo 2 horas).
     * Si es 'mixed' (ej. pan con pasta de maní, salsa con fideos):
       - Los lípidos ralentizan el vaciado gástrico para que el almidón se absorba progresivamente.
       - 1ª dosis (55-60%): con el 1er bocado (si glucosa ≥85) o a los 20-30 min post-comida (si glucosa <85).
       - 2ª dosis (40-45%): a las 1 h 15m a 1 h 30m (+75 a +90 min) para acompañar la digestión lipídica sostenida.
     * Si es 'standard' (consumo directo):
       - 1ª dosis según glucemia actual (${currentGlucose || 100} mg/dL) y flecha (${trendArrow || '➡️'}).
       - Si grasas > 12g, dividir bolo: 1ª dosis 60%, 2ª dosis 40% a las 1 h 15m - 1 h 30m.

 15. IMPACTO DE COCCIÓN, TEMPERATURA Y PROCESADO DEL ALIMENTO EN EL ÍNDICE GLUCÉMICO (ALMIDÓN RESISTENTE):
    - La IA DEBE evaluar meticulosamente los detalles que el usuario indique sobre cocción, textura y temperatura:
      * Arroz / Pastas / Papas fríos o recalentados: Generan almidón retrógrado/resistente tipo 3 (RS3). Su Índice Glucémico baja de Alto a Medio, y su absorción es más lenta y gradual. En 'glycemicFactors', explica este efecto e indica que no requiere una espera pre-bolo tan larga para evitar hipoglucemia temprana.
      * Arroz / Pastas / Papas calientes y recién hechos: Almidón completamente gelatinizado. Absorción muy rápida (IG Alto). Requiere espera pre-bolo completa (15-20 min) si la glucemia es normal.
      * Textura / Corte de la papa: La papa pisada o puré rompe las paredes celulares y gelatiniza el almidón al máximo (IG muy alto, pico violento en 30-45 min). La papa hervida entera o en cubos al dente mantiene mayor estructura celular y se absorbe más pausadamente.
      * Punto de cocción en pastas: Pastas "al dente" tienen menor IG y absorción más lenta que pastas muy cocidas / pasadas.
      * Si el usuario especifica la marca, tipo de grano (ej. arroz blanco vs integral vs parboil/vaporizado) o método de cocción, utiliza estos datos para precisar el Índice Glucémico, la velocidad de absorción y los consejos en 'glycemicFactors'.
`;

    const parts: any[] = [];
    for (const imgStr of allImages) {
      const match = imgStr.match(/^data:(image\/\w+);base64,/);
      const mimeType = match ? match[1] : "image/jpeg";
      const cleanBase64 = imgStr.replace(/^data:[^;]+;base64,/, "");
      parts.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });
    }

    const textPrompt = `
Investiga en las fuentes seleccionadas por el usuario (o activa el fallback en ARGENFOODS, SIFeGA ANMAT, InfoAlimentos, FatSecret Argentina, MyFitnessPal, Webs de Fabricantes y Google Search si no se encuentra en las seleccionadas) para analizar con máxima exactitud la siguiente comida:
${query ? `Descripción: "${query}"` : `Se adjuntan ${allImages.length} foto(s) de los platos/comida para análisis conjunto.`}
${currentGlucose ? `Glucosa actual del usuario: ${currentGlucose} mg/dL.` : ""}
Flecha de tendencia actual: ${trendArrow}
Modo / Secuenciación de ingesta: ${activeSequencing}
ICR usuario: ${icr} g/U.
FSI usuario: ${isf} mg/dL por U.
Recuerda: Si el usuario menciona "masitas", equivale a "galletitas" individuales (1 masita = 1 galletita física individual, nunca una porción de varias galletitas).
Calcula con precisión clínica si conviene dividir el bolo y en qué momentos exactos colocar cada dosis según el modo de ingesta y la glucosa actual.
`;

    parts.push({ text: textPrompt });

    const response = await generateContentWithFallback({
      contents: { parts },
      queryHint: query,
      imagesCount: allImages.length,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  portionText: { type: Type.STRING },
                  carbsGrams: { type: Type.NUMBER },
                  fiberGrams: { type: Type.NUMBER },
                  netCarbsGrams: { type: Type.NUMBER },
                  animalProteinGrams: { type: Type.NUMBER },
                  plantProteinGrams: { type: Type.NUMBER },
                  fatGrams: { type: Type.NUMBER },
                  calories: { type: Type.NUMBER },
                },
                required: ["name", "portionText", "carbsGrams", "fiberGrams", "netCarbsGrams", "animalProteinGrams", "plantProteinGrams", "fatGrams", "calories"],
              },
            },
            totals: {
              type: Type.OBJECT,
              properties: {
                carbsGrams: { type: Type.NUMBER },
                fiberGrams: { type: Type.NUMBER },
                netCarbsGrams: { type: Type.NUMBER },
                polyolsGrams: { type: Type.NUMBER, description: "Gramos totales de polialcoholes declarados (maltitol, sorbitol, eritritol)" },
                sweetenersDetected: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Nombres de edulcorantes/polioles encontrados" },
                polyolsCalculationNote: { type: Type.STRING, description: "Explicación del cálculo del poliol/edulcorante y su tasa de absorción" },
                animalProteinGrams: { type: Type.NUMBER },
                plantProteinGrams: { type: Type.NUMBER },
                fatGrams: { type: Type.NUMBER },
                calories: { type: Type.NUMBER },
              },
              required: ["carbsGrams", "fiberGrams", "netCarbsGrams", "animalProteinGrams", "plantProteinGrams", "fatGrams", "calories"],
            },
            glycemicIndex: { type: Type.STRING, description: "'Bajo', 'Medio', o 'Alto'" },
            glycemicLoad: { type: Type.NUMBER },
            absorptionSpeed: { type: Type.STRING, description: "'Rápida', 'Lenta', o 'Mixta'" },
            theoreticalMealBolus: { type: Type.NUMBER },
            correctionBolus: { type: Type.NUMBER },
            suggestedTotalBolus: { type: Type.NUMBER },
            eatingSequencing: { type: Type.STRING, description: "'standard', 'mixed', o 'veggies_first'" },
            eatingSequencingAdvice: { type: Type.STRING, description: "Consejo clínico sobre el orden de ingesta y vaciamiento gástrico" },
            splitStrategyAdvice: {
              type: Type.OBJECT,
              properties: {
                requiresSplit: { type: Type.BOOLEAN },
                firstDoseUnits: { type: Type.NUMBER },
                firstDoseTiming: { type: Type.STRING },
                secondDoseUnits: { type: Type.NUMBER },
                secondDoseDelayHours: { type: Type.NUMBER },
                secondDoseDelayFormatted: { type: Type.STRING },
                secondDoseTiming: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ["requiresSplit", "firstDoseUnits", "firstDoseTiming", "secondDoseUnits", "secondDoseDelayHours", "secondDoseDelayFormatted", "secondDoseTiming", "reason"],
            },
            glycemicFactors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            renalSafetyNote: { type: Type.STRING },
            sourcesCited: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Fuentes oficiales y referencias nutricionales consultadas (ej. Rótulo Oficial Bagley Arcor / SIFeGA ANMAT / Open Food Facts)",
            },
            summaryFormatted: {
              type: Type.OBJECT,
              properties: {
                desgloseMacros: { type: Type.STRING },
                indiceCargaGlucemica: { type: Type.STRING },
                calculoDosisBolus: { type: Type.STRING },
                factoresGlucemia: { type: Type.STRING },
                balanceAcumulado: { type: Type.STRING },
              },
              required: ["desgloseMacros", "indiceCargaGlucemica", "calculoDosisBolus", "factoresGlucemia", "balanceAcumulado"],
            },
          },
          required: [
            "items",
            "totals",
            "glycemicIndex",
            "glycemicLoad",
            "absorptionSpeed",
            "theoreticalMealBolus",
            "correctionBolus",
            "suggestedTotalBolus",
            "glycemicFactors",
            "renalSafetyNote",
            "summaryFormatted",
          ],
        },
      },
    });

    const jsonText = response.text || "{}";
    const analysis = parseJsonSafely(jsonText);

    if (analysis && analysis.totals && analysis.items) {
      if (!analysis.eatingSequencing) analysis.eatingSequencing = activeSequencing;

      // Clinical Math & Consistency Audit on all items and meal totals
      analysis.items = (analysis.items || []).map((it: any) => auditFoodItem(it));
      const auditedTotals = auditMealTotals({
        carbsGrams: analysis.totals.carbsGrams,
        fiberGrams: analysis.totals.fiberGrams,
        animalProteinGrams: analysis.totals.animalProteinGrams,
        plantProteinGrams: analysis.totals.plantProteinGrams,
        fatGrams: analysis.totals.fatGrams,
        calories: analysis.totals.calories,
      });
      analysis.totals = {
        ...analysis.totals,
        carbsGrams: auditedTotals.carbsGrams,
        fiberGrams: auditedTotals.fiberGrams,
        animalProteinGrams: auditedTotals.animalProteinGrams,
        plantProteinGrams: auditedTotals.plantProteinGrams,
        totalProteinGrams: auditedTotals.totalProteinGrams,
        fatGrams: auditedTotals.fatGrams,
        calories: auditedTotals.calories,
      };
      if (auditedTotals.auditWarnings && auditedTotals.auditWarnings.length > 0) {
        if (!analysis.glycemicFactors) analysis.glycemicFactors = [];
        analysis.glycemicFactors.push(...auditedTotals.auditWarnings);
      }

      // GUARDARRAÍZ CLÍNICO ESTRICTO: Prevenir 0 U en 1ª dosis, ajustar IOB y retrasos excesivos (> 2h)
      const bgVal = currentGlucose ? Number(currentGlucose) : 100;
      const iobVal = Number(iob) || 0;
      const carbsVal = analysis.totals.carbsGrams || 0;
      const mealCarbBolus = Number((carbsVal / icr).toFixed(2));
      const correctionVal = Number(((bgVal - targetGlucose) / isf).toFixed(2));

      let totalBolus = mealCarbBolus;

      if (iobVal > 0) {
        const iobDrop = Math.round(iobVal * isf);
        const projectedBg = Math.round(bgVal - iobDrop);
        const netBolusRaw = Math.max(0, mealCarbBolus + correctionVal - iobVal);
        const suggestedDose = Math.round(netBolusRaw * 2) / 2; // redondear a 0.5U
        totalBolus = suggestedDose;
        analysis.suggestedTotalBolus = suggestedDose;

        let iobExplanation = `• Insulina Activa (IOB: ${iobVal.toFixed(2)} U) descendería tu glucosa por sí sola en -${iobDrop} mg/dL (proyección sin comida: ${projectedBg} mg/dL).`;
        if (netBolusRaw <= 0) {
          const excessIob = Number((iobVal - (mealCarbBolus + correctionVal)).toFixed(2));
          const rescueCarbs = Math.round(excessIob * icr);
          iobExplanation += ` Tu IOB cubre el 100% de la comida (${carbsVal}g HC). Dosis a inyectar: 0 U. ¡Atención! Sobran ${excessIob} U activas; necesitas consumir +${rescueCarbs}g de HC rápidos de rescate para no bajar de ${targetGlucose} mg/dL.`;
        } else {
          const surplusIobAfterCorrection = Math.max(0, iobVal - Math.max(0, correctionVal));
          const carbsCovered = Math.round(surplusIobAfterCorrection * icr);
          iobExplanation += ` El IOB cubre la corrección y amortiza ${carbsCovered}g de carbohidratos de la comida. La dosis neta para llegar a ${targetGlucose} mg/dL es de ${suggestedDose} U (en vez de ${mealCarbBolus} U).`;
        }

        if (analysis.summaryFormatted) {
          analysis.summaryFormatted.calculoDosisBolus = `${mealCarbBolus} U (comida) ${correctionVal >= 0 ? `+ ${correctionVal} U (corrección)` : `- ${Math.abs(correctionVal)} U`} - ${iobVal.toFixed(2)} U (IOB) = ${suggestedDose} U recomendadas.\n${iobExplanation}`;
        }
      } else {
        totalBolus = Number(analysis.suggestedTotalBolus || mealCarbBolus);
      }

      if (analysis.splitStrategyAdvice && analysis.splitStrategyAdvice.requiresSplit) {
        if (totalBolus <= 0) {
          analysis.splitStrategyAdvice.requiresSplit = false;
          analysis.splitStrategyAdvice.firstDoseUnits = 0;
          analysis.splitStrategyAdvice.secondDoseUnits = 0;
          analysis.splitStrategyAdvice.clinicalReasoning = 'El IOB activo cubre la totalidad de la comida. No se requiere inyección de bolo.';
        } else {
          let first = Number(analysis.splitStrategyAdvice.firstDoseUnits || 0);
          let second = Number(analysis.splitStrategyAdvice.secondDoseUnits || 0);

          // Si el totalBolus se redujo por el IOB, ajustar proporcionalmente
          const ratioFirst = analysis.totals.fatGrams > 30 ? 0.55 : 0.60;
          first = Math.round(totalBolus * ratioFirst * 2) / 2;
          second = Math.round((totalBolus - first) * 2) / 2;

          // Regla: si totalBolus >= 2.0U pero first queda < 0.5U, asegurar al menos 0.5U
          if (first < 0.5 && totalBolus >= 0.5) {
            first = 0.5;
            second = Math.max(0, Math.round((totalBolus - first) * 2) / 2);
          }

          // Timing según glucemia previa
          if (bgVal < 70) {
            analysis.splitStrategyAdvice.firstDoseTiming = 'A los 20-30 min de empezar a comer (Post-prandial diferido, tras confirmar >85 mg/dL en sensor)';
          } else if (bgVal < 85) {
            analysis.splitStrategyAdvice.firstDoseTiming = 'A los 15-20 min de empezar a comer (Post-prandial diferido)';
          }

          // Tope de seguridad para MDI Novorapid: máximo 2.0 horas (120 min)
          if (!analysis.splitStrategyAdvice.secondDoseDelayHours || analysis.splitStrategyAdvice.secondDoseDelayHours > 2.0) {
            analysis.splitStrategyAdvice.secondDoseDelayHours = activeSequencing === 'veggies_first' ? 2.0 : (analysis.totals.fatGrams > 30 ? 1.75 : 1.5);
            analysis.splitStrategyAdvice.secondDoseDelayFormatted = analysis.splitStrategyAdvice.secondDoseDelayHours === 2.0 ? '2 h 00 min' : analysis.splitStrategyAdvice.secondDoseDelayHours === 1.75 ? '1 h 45 min' : '1 h 30 min';
            analysis.splitStrategyAdvice.secondDoseTiming = `A los ${analysis.splitStrategyAdvice.secondDoseDelayFormatted} de haber comido (verificar sensor FreeStyle Libre)`;
          }

          analysis.splitStrategyAdvice.firstDoseUnits = first;
          analysis.splitStrategyAdvice.secondDoseUnits = second;
        }
      }

      return res.json({ analysis });
    }

    return res.status(500).json({ error: "El análisis en vivo de la IA no devolvió un resultado válido. Por favor, reintenta." });
  } catch (error: any) {
    console.error("Error in /api/analyze-food:", error?.message || error);
    return res.status(500).json({ error: "El análisis en vivo de la IA no pudo completarse en este momento. Por favor, reintenta." });
  }
});

// In-memory and file-backed sync store for user diabetes and meal logs (Shared Multi-App Bridge)
let serverBackupStore: {
  settings?: any;
  bolusHistory?: any[];
  dailyMeals?: any[];
  allMealsArchive?: any[];
  pendingSplits?: any[];
  lastUpdated?: string;
} = {};

// Cross-App Shared Storage Bridge (GET & POST)
app.get("/api/sync-data", (_req, res) => {
  res.json({ status: "ok", data: Object.keys(serverBackupStore).length > 0 ? serverBackupStore : null });
});

app.post("/api/sync-data", (req, res) => {
  if (req.body && typeof req.body === "object") {
    serverBackupStore = {
      ...serverBackupStore,
      ...req.body,
      lastUpdated: new Date().toISOString(),
    };
  }
  res.json({ status: "ok", lastUpdated: serverBackupStore.lastUpdated });
});

// Multi-Cloud Pool Connector (WebDAV / S3 / REST for MEGA, Koofr, pCloud, Box, Cloudflare R2, Backblaze B2)
app.post("/api/cloud-pool/sync", async (req, res) => {
  try {
    const { node, fileName, payload } = req.body || {};
    if (!node || !fileName || !payload) {
      return res.status(400).json({ error: "Faltan datos del nodo de nube o archivo." });
    }

    const jsonBody = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);

    // Save into shared cross-app bridge store
    serverBackupStore = {
      ...serverBackupStore,
      ...payload,
      lastUpdated: new Date().toISOString(),
    };

    // If user provided WebDAV / REST endpoint and credentials, attempt direct PUT/POST upload
    if (node.endpointUrl && node.secretOrToken && /^https?:\/\//i.test(node.endpointUrl)) {
      const cleanUrl = node.endpointUrl.replace(/\/+$/, "");
      const targetFileUrl = `${cleanUrl}/${encodeURIComponent(fileName)}`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (node.username) {
        const basicAuth = Buffer.from(`${node.username}:${node.secretOrToken}`).toString("base64");
        headers["Authorization"] = `Basic ${basicAuth}`;
      } else {
        headers["Authorization"] = `Bearer ${node.secretOrToken}`;
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        await fetch(targetFileUrl, {
          method: "PUT",
          headers,
          body: jsonBody,
          signal: controller.signal,
        });
        clearTimeout(timeout);
      } catch (remoteErr: any) {
        console.warn(`[CloudPool] Guardado en puente local completado; aviso remoto (${node.providerName}):`, remoteErr?.message || remoteErr);
      }
    }

    return res.json({
      status: "ok",
      provider: node.providerName,
      fileName,
      syncedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error en /api/cloud-pool/sync:", err?.message || err);
    return res.status(500).json({ error: "No se pudo sincronizar con el nodo de nube." });
  }
});

// Rutas de Web Push para notificaciones nativas en segundo plano y pantalla bloqueada
app.use("/api/push", pushRouter);

// Rutas de Comentarios y Reseñas de la Comunidad en tiempo real (sincronizado entre todos los dispositivos y cuentas)
app.use("/api/community-reviews", communityReviewsRouter);

// Endpoint universal de lectura de glucosa en vivo (LibreLinkUp / Dexcom Share / Nightscout)
app.post(["/api/cgm/fetch-glucose", "/api/cgm/fetch-glucose/"], async (req, res) => {
  try {
    const {
      provider,
      libreLinkUpEmail,
      libreLinkUpPassword,
      libreLinkUpRegion,
      dexcomUsername,
      dexcomPassword,
      dexcomRegion,
      nightscoutUrl,
      nightscoutToken,
    } = req.body || {};

    if (provider === "librelinkup") {
      const reading = await fetchLibreLinkUpGlucose({
        email: libreLinkUpEmail,
        password: libreLinkUpPassword,
        region: libreLinkUpRegion,
      });
      return res.json({ status: "ok", reading });
    }

    if (provider === "dexcom_share") {
      const reading = await fetchDexcomShareGlucose({
        username: dexcomUsername,
        password: dexcomPassword,
        region: dexcomRegion,
      });
      return res.json({ status: "ok", reading });
    }

    if (provider === "nightscout") {
      const reading = await fetchNightscoutGlucose({
        nightscoutUrl,
        token: nightscoutToken,
      });
      return res.json({ status: "ok", reading });
    }

    return res.status(400).json({ error: "Proveedor de sensor no válido o no seleccionado." });
  } catch (err: any) {
    console.warn("[CGM Cloud Connector]", err?.message || err);
    return res.status(400).json({
      error: err?.message || "No se pudo obtener la lectura del sensor en la nube.",
    });
  }
});

// Explicit JSON handler for any unmatched /api routes so they never return HTML
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `Ruta API no encontrada: ${req.method} ${req.path}` });
});

async function startServer() {
  // Vite middleware in dev mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
