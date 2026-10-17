import React, { useState, useRef, useMemo, useEffect } from 'react';
import { FoodItem, StructuredMealAnalysis, UserSettings, EatingSequencingMode, GlucoseTrend, CountryCode } from '../types';
import { AVAILABLE_SEARCH_SOURCES, getSearchSourcesForCountry } from '../data/searchSources';
import { SearchSourcesSelector } from './SearchSourcesSelector';
import { QuickFavoritesBar } from './QuickFavoritesBar';
import { MedicalConditionsDropdown } from './MedicalConditionsDropdown';
import {
  evaluateFoodForMedicalConditions,
  getActiveMedicalConditions,
  classifyFoodGlutenStatus,
} from '../utils/medicalConditions';
import { matchLocalDatabaseWithFuzzy } from '../utils/foodMatcher';
import { useAuth } from '../context/AuthContext';
import { InAppCameraModal } from './InAppCameraModal';
import { getDriveAccessToken, uploadImageToDrive } from '../services/googleDriveService';
import {
  getCachedFoodSearch,
  saveCachedFoodSearch,
  getUserFavorites,
  toggleFavoriteFood,
  isFavoriteFood,
  FAVORITES_UPDATED_EVENT,
} from '../utils/foodCacheAndFavorites';
import {
  Search,
  Sparkles,
  Camera,
  Plus,
  Check,
  Loader2,
  Info,
  ShoppingBag,
  Utensils,
  AlertTriangle,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  Trash2,
  ArrowDown,
  CornerDownRight,
  Calculator,
  Layers,
  Send,
  X,
  Star,
  Zap,
  Clipboard,
  Split,
  Clock,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';

interface FoodSearchAndAnalyzerProps {
  settings: UserSettings;
  currentGlucose: number;
  trendArrow?: GlucoseTrend;
  iobValue?: number;
  onAddFoodToPlate: (food: FoodItem, quantity: number) => void;
  onApplyAiAnalysisToPlate: (analysis: StructuredMealAnalysis) => void;
  onChangeCountry?: (countryCode: CountryCode) => void;
  onUpdateSettings?: (newSettings: UserSettings) => void;
}

export const FoodSearchAndAnalyzer: React.FC<FoodSearchAndAnalyzerProps> = ({
  settings,
  currentGlucose,
  trendArrow = 'flat',
  iobValue = 0,
  onAddFoodToPlate,
  onApplyAiAnalysisToPlate,
  onChangeCountry,
  onUpdateSettings,
}) => {
  const { user } = useAuth();
  // Sequencing & Dynamic Trend state (inherits sensor trend directly from main calculator)
  const [selectedSequencing, setSelectedSequencing] = useState<EatingSequencingMode>('standard');
  const activeTrend = trendArrow || 'flat';

  // Search & Catalog State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [onlyGlutenFreeFilter, setOnlyGlutenFreeFilter] = useState<boolean>(false);
  const [isCatalogExpanded, setIsCatalogExpanded] = useState<boolean>(true);
  const [aiSearchResults, setAiSearchResults] = useState<FoodItem[]>([]);
  const [isSearchingAi, setIsSearchingAi] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);

  const activeConditions = useMemo(() => getActiveMedicalConditions(settings), [settings]);

  // Favorites state for toggling star
  const [favoriteFoods, setFavoriteFoods] = useState<FoodItem[]>(() =>
    getUserFavorites()
  );

  useEffect(() => {
    const handleFavsUpdate = () => {
      setFavoriteFoods(getUserFavorites());
    };
    window.addEventListener(FAVORITES_UPDATED_EVENT, handleFavsUpdate);
    return () => window.removeEventListener(FAVORITES_UPDATED_EVENT, handleFavsUpdate);
  }, []);

  // AI Multimodal Prompt & Photos State with Persistent Draft Auto-Recovery
  const DRAFT_STORAGE_KEY = 't1d_ai_meal_query_draft_v1';

  const [aiTextQuery, setAiTextQuery] = useState<string>(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.query || '';
      }
    } catch {
      // Ignore error
    }
    return '';
  });

  const [selectedImages, setSelectedImages] = useState<string[]>(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.images)) return parsed.images;
      }
    } catch {
      // Ignore error
    }
    return [];
  });

  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);
  const [isAnalyzingAiMeal, setIsAnalyzingAiMeal] = useState<boolean>(false);
  const [aiMealAnalysis, setAiMealAnalysis] = useState<StructuredMealAnalysis | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  // Auto-retry states and countdowns
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [retryStatusText, setRetryStatusText] = useState<string | null>(null);
  const retryCountRef = useRef<number>(0);
  const lastAnalyzeParamsRef = useRef<{ autoApply: boolean; query?: string } | null>(null);

  const [searchRetryCountdown, setSearchRetryCountdown] = useState<number | null>(null);
  const searchRetryCountRef = useRef<number>(0);
  const lastSearchQueryRef = useRef<string>('');

  // Auto-retry countdown effect for meal analysis
  useEffect(() => {
    if (retryCountdown === null) return;

    if (retryCountdown <= 0) {
      setRetryCountdown(null);
      if (lastAnalyzeParamsRef.current) {
        const { autoApply, query } = lastAnalyzeParamsRef.current;
        handleAnalyzeMeal(autoApply, query, true);
      }
      return;
    }

    const timer = setTimeout(() => {
      setRetryCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [retryCountdown]);

  // Auto-retry countdown effect for food search
  useEffect(() => {
    if (searchRetryCountdown === null) return;

    if (searchRetryCountdown <= 0) {
      setSearchRetryCountdown(null);
      if (lastSearchQueryRef.current) {
        handleAiFoodSearch(lastSearchQueryRef.current, true, true);
      }
      return;
    }

    const timer = setTimeout(() => {
      setSearchRetryCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [searchRetryCountdown]);

  // Auto-save draft so state is never lost even if user switches apps
  useEffect(() => {
    try {
      if (aiTextQuery || selectedImages.length > 0) {
        sessionStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({ query: aiTextQuery, images: selectedImages })
        );
      } else {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    } catch {
      // Ignore error
    }
  }, [aiTextQuery, selectedImages]);

  const activeCountryCode: CountryCode = settings.countryCode || 'AR';
  const currentCountrySources = useMemo(
    () => getSearchSourcesForCountry(activeCountryCode),
    [activeCountryCode]
  );

  // Dynamic search sources selected by user
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(() =>
    getSearchSourcesForCountry(settings.countryCode || 'AR').map((s) => s.id)
  );

  // When country changes, select all sources for that country automatically
  useEffect(() => {
    setSelectedSourceIds(getSearchSourcesForCountry(activeCountryCode).map((s) => s.id));
  }, [activeCountryCode]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const aiTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 3. LISTEN TO PASTE EVENTS (Ctrl+V or Paste from clipboard anywhere or on textarea)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      const items = clipboardData.items;
      let hasImage = false;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            hasImage = true;
            compressAndAddImage(file);
          }
        }
      }

      if (hasImage) {
        setAiSuccessMessage('📸 ¡Foto pegada exitosamente desde el portapapeles!');
        setTimeout(() => setAiSuccessMessage(null), 3500);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleToggleFavorite = (food: FoodItem) => {
    const updated = toggleFavoriteFood(food, user?.uid);
    setFavoriteFoods(updated);
  };

  const handleToggleSource = (id: string) => {
    setSelectedSourceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllSources = () => {
    setSelectedSourceIds(currentCountrySources.map((s) => s.id));
  };

  const handleSelectOfficialOnly = () => {
    const officialIds = currentCountrySources
      .filter((s) => s.category === 'official_arg' || s.category === 'official_country' || s.id === 'openfoodfacts')
      .map((s) => s.id);
    setSelectedSourceIds(officialIds);
  };

  const handleSelectCommercialOnly = () => {
    setSelectedSourceIds(['fatsecret', 'myfitnesspal', 'openfoodfacts', 'fabricantes', 'google_search']);
  };

  // Memory-safe ultra-light compression before adding image to state
  const compressAndAddImage = (file: File) => {
    try {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement('canvas');
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;
        const maxDim = 1024;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          setSelectedImages((prev) => [...prev, compressed].slice(0, 10));
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        // Fallback to FileReader if objectURL fails
        const reader = new FileReader();
        reader.onload = () => {
          setSelectedImages((prev) => [...prev, reader.result as string].slice(0, 10));
        };
        reader.readAsDataURL(file);
      };
      img.src = objectUrl;
    } catch (e) {
      console.error('Error compressing image:', e);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (file) {
          compressAndAddImage(file);
        }
      }
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Send a food item from the search results directly into the AI prompt for unit / portion adjustment
  const handleSendFoodToAiPrompt = (food: FoodItem, targetUnits?: number) => {
    const unitCount = targetUnits || 1;
    const isMasita = /gallet|masit|cracker|snack|biscoch/i.test(food.name) || /gallet|masit/i.test(food.portionName);
    
    let promptTemplate = `Producto: "${food.name}"`;
    if (food.brand) promptTemplate += ` (Marca: ${food.brand})`;
    if (food.source) promptTemplate += ` [Fuente de referencia: ${food.source}]`;
    promptTemplate += `.\nPorción estándar del rótulo: ${food.portionName} (${food.carbsGrams}g HC, ${food.plantProteinGrams}g Prot. Veg, ${food.animalProteinGrams}g Prot. Anim, ${food.calories} kcal).\n`;

    if (isMasita) {
      promptTemplate += `👉 Consulta específica: He comido ${unitCount} masita(s) individuales. Por favor, desglosa el cálculo exacto por unidad física según el rótulo oficial y calcula los macronutrientes totales y el bolus exacto.`;
    } else {
      promptTemplate += `👉 Consulta específica: He comido ${unitCount} ${food.portionName.toLowerCase().includes('g') ? 'porción(es)' : 'unidad(es)'}. Ajusta y calcula los macronutrientes exactos para esta cantidad.`;
    }

    setAiTextQuery((prev) => {
      if (prev.trim()) {
        return `${prev}\n\n${promptTemplate}`;
      }
      return promptTemplate;
    });

    setAiSuccessMessage(`¡"${food.name}" enviado al mensaje de la IA! Puedes detallar las unidades o adjuntar fotos.`);
    setTimeout(() => setAiSuccessMessage(null), 4000);

    // Scroll to AI text area smoothly
    setTimeout(() => {
      aiTextareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      aiTextareaRef.current?.focus();
    }, 100);
  };

  // Remove hallucinated or incorrect item from AI results
  const handleRemoveAnalysisItem = (itemIdx: number) => {
    if (!aiMealAnalysis || !aiMealAnalysis.items) return;
    const updatedItems = aiMealAnalysis.items.filter((_, idx) => idx !== itemIdx);

    const newCarbs = updatedItems.reduce((acc, i) => acc + (i.carbsGrams || 0), 0);
    const newFiber = updatedItems.reduce((acc, i) => acc + (i.fiberGrams || 0), 0);
    const newAnimalProtein = updatedItems.reduce((acc, i) => acc + (i.animalProteinGrams || 0), 0);
    const newPlantProtein = updatedItems.reduce((acc, i) => acc + (i.plantProteinGrams || 0), 0);
    const newFat = updatedItems.reduce((acc, i) => acc + (i.fatGrams || 0), 0);
    const newCalories = updatedItems.reduce((acc, i) => acc + (i.calories || 0), 0);
    const newBolus = Number((newCarbs / (settings.icr || 8)).toFixed(2));

    setAiMealAnalysis({
      ...aiMealAnalysis,
      items: updatedItems,
      totals: {
        carbsGrams: Math.round(newCarbs * 10) / 10,
        fiberGrams: Math.round(newFiber * 10) / 10,
        netCarbsGrams: Math.round(newCarbs * 10) / 10,
        animalProteinGrams: Math.round(newAnimalProtein * 10) / 10,
        plantProteinGrams: Math.round(newPlantProtein * 10) / 10,
        fatGrams: Math.round(newFat * 10) / 10,
        calories: Math.round(newCalories),
      },
      theoreticalMealBolus: newBolus,
    });
  };

  const categories = [
    'Todos',
    'Carnes y Platos',
    'Galletitas y Snacks',
    'Panadería',
    'Cereales y Granos',
    'Pastas',
    'Lácteos',
    'Legumbres',
    'Frutas',
    'Verduras',
    'Frutos Secos',
  ];

  // Search filtered local database with smart normalized scoring & typo tolerance
  const filteredLocalFoods = useMemo(() => {
    const base = matchLocalDatabaseWithFuzzy(searchQuery, selectedCategory);
    if (onlyGlutenFreeFilter) {
      return base.filter((f) => classifyFoodGlutenStatus(f).status !== 'contains_tacc');
    }
    return base;
  }, [searchQuery, selectedCategory, onlyGlutenFreeFilter]);

  const displayedAiSearchResults = useMemo(() => {
    if (onlyGlutenFreeFilter) {
      return aiSearchResults.filter((f) => classifyFoodGlutenStatus(f).status !== 'contains_tacc');
    }
    return aiSearchResults;
  }, [aiSearchResults, onlyGlutenFreeFilter]);

  // Helper for resilient fetch that retries automatically with strict timeout and progressive backoff
  const resilientFetch = async (
    url: string,
    options: RequestInit,
    retries = 3,
    timeoutMs = 28000,
    onRetry?: (attempt: number, max: number) => void
  ): Promise<Response> => {
    let lastErr: any = null;
    for (let i = 0; i <= retries; i++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        if (i > 0 && onRetry) {
          onRetry(i, retries);
        }
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timer);
        if (res.ok) return res;

        // If status >= 400 (e.g. 404 container cold start, 502/503/504, 429), retry with progressive backoff
        if (res.status >= 400 && i < retries) {
          const delays = [500, 1200, 2200];
          await new Promise((resolve) => setTimeout(resolve, delays[i] || 1500));
          continue;
        }
        return res;
      } catch (err: any) {
        clearTimeout(timer);
        lastErr = err;
        if (err?.name === 'AbortError') {
          lastErr = new Error('La consulta tomó más tiempo del esperado. Reintentando automáticamente...');
        }
        if (i < retries) {
          const delays = [500, 1200, 2200];
          await new Promise((resolve) => setTimeout(resolve, delays[i] || 1500));
          continue;
        }
      }
    }
    throw lastErr || new Error('No se pudo establecer conexión con el servidor. Reintentando...');
  };

  // Trigger Gemini AI Search querying selected sources & fallback (with Instant Local Cache and Auto-Retry)
  const handleAiFoodSearch = async (overrideQuery?: string, forceRefresh = false, isAutoRetry = false) => {
    const q = overrideQuery || searchQuery;
    if (!q.trim()) return;

    if (!isAutoRetry) {
      searchRetryCountRef.current = 0;
      setSearchRetryCountdown(null);
    }
    lastSearchQueryRef.current = q;

    // 1. Check local instant cache first if not forced (scoped by country)
    const cacheKey = `${activeCountryCode}:${q}`;
    if (!forceRefresh) {
      const cached = getCachedFoodSearch(cacheKey);
      if (cached && cached.length > 0) {
        setAiSearchResults(cached);
        setIsFromCache(true);
        setSearchError(null);
        return;
      }
    }

    setIsSearchingAi(true);
    setIsFromCache(false);
    setSearchError(null);

    try {
      const res = await resilientFetch(
        '/api/food-search',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: q,
            selectedSources: selectedSourceIds,
            countryCode: activeCountryCode,
          }),
        },
        3,
        25000
      );

      let data: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        // Fallback gracefully to local database search without crashing
        const localMatches = matchLocalDatabaseWithFuzzy(q);
        if (localMatches.length > 0) {
          data = {
            foods: localMatches.slice(0, 20).map((f) => ({
              ...f,
              source: f.source || 'Base de datos verificada local (Modo seguro/offline)',
            })),
            isFallback: true,
          };
        } else {
          throw new Error('No se pudo conectar temporalmente con los servidores de búsqueda.');
        }
      }

      if (!res.ok && !data.foods) throw new Error(data.error || 'Error al buscar producto');

      const items: FoodItem[] = (data.foods || []).map((item: any, idx: number) => ({
        id: item.id || `ai-food-${Date.now()}-${idx}`,
        name: item.name,
        brand: item.brand || 'Fuente verificada',
        portionName: item.portionName || '1 porción',
        gramsPerPortion: item.gramsPerPortion || 100,
        carbsGrams: item.carbsGrams ?? 0,
        animalProteinGrams: item.animalProteinGrams ?? 0,
        plantProteinGrams: item.plantProteinGrams ?? 0,
        fatGrams: item.fatGrams ?? 0,
        calories: item.calories ?? 0,
        gi: item.gi || 'Medio',
        cg: item.cg ?? 10,
        absorption: item.absorption || 'Mixta',
        isCommercial: item.isCommercial ?? true,
        category: item.category || 'Producto Comercial',
        source: item.source || 'Fuente verificada',
      }));

      searchRetryCountRef.current = 0;
      setSearchRetryCountdown(null);
      setAiSearchResults(items);
      // Save in instant cache for future searches scoped by country
      saveCachedFoodSearch(`${activeCountryCode}:${q}`, items);
    } catch (err: any) {
      console.error(err);
      // Even if network completely dropped, attempt local database matches before displaying error
      const localMatches = matchLocalDatabaseWithFuzzy(q);
      if (localMatches.length > 0) {
        setAiSearchResults(localMatches.slice(0, 20).map((f) => ({
          ...f,
          source: f.source || 'Base de datos local verificada (ARGENFOODS)',
        })));
        setSearchError(null);
        searchRetryCountRef.current = 0;
        setSearchRetryCountdown(null);
      } else {
        setSearchError(err.message || 'Error en la búsqueda con las bases de datos');
        if (searchRetryCountRef.current < 2) {
          searchRetryCountRef.current += 1;
          setSearchRetryCountdown(3);
        }
      }
    } finally {
      setIsSearchingAi(false);
    }
  };

  // Debounced auto-search (450ms) so user gets instant search results as they type without needing manual button clicks
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      if (trimmed.length === 0) {
        setAiSearchResults([]);
        setIsFromCache(false);
      }
      return;
    }

    const timer = setTimeout(() => {
      handleAiFoodSearch(trimmed);
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Trigger Full AI Meal & Photo Analysis (/api/analyze-food) with Auto-Retry
  const handleAnalyzeMeal = async (autoApplyToPlate = false, customQuery?: string, isAutoRetry = false) => {
    const rawQuery = (customQuery !== undefined ? customQuery : (aiTextQuery.trim() || searchQuery.trim())).trim();
    if (!rawQuery && selectedImages.length === 0) {
      setAiError('Por favor escribe una descripción de la comida, ajusta un producto o adjunta al menos una foto.');
      aiTextareaRef.current?.focus();
      return;
    }

    if (!isAutoRetry) {
      retryCountRef.current = 0;
      setRetryCountdown(null);
    }
    lastAnalyzeParamsRef.current = { autoApply: autoApplyToPlate, query: rawQuery };

    // Auto-sync query to the textarea if user typed in search bar
    if (!aiTextQuery.trim() && rawQuery) {
      setAiTextQuery(rawQuery);
    }

    setIsAnalyzingAiMeal(true);
    setAiError(null);
    setRetryStatusText(null);

    try {
      const res = await resilientFetch(
        '/api/analyze-food',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: rawQuery,
            imagesBase64: selectedImages,
            currentGlucose,
            trendArrow: activeTrend,
            eatingSequencing: selectedSequencing,
            isf: settings.isf,
            icr: settings.icr,
            targetGlucose: settings.targetGlucose,
            selectedSources: selectedSourceIds,
            iob: iobValue,
            countryCode: activeCountryCode,
            medicalConditions: activeConditions,
          }),
        },
        3,
        50000,
        (attempt, max) => {
          setRetryStatusText(`Reintentando automáticamente (intento ${attempt} de ${max})...`);
        }
      );

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        throw new Error('Respuesta no válida del servidor.');
      }

      if (!data?.analysis) {
        throw new Error(data?.error || 'No se pudo obtener el análisis nutricional de la comida.');
      }

      // Success: reset auto-retry counters
      retryCountRef.current = 0;
      setRetryCountdown(null);
      setRetryStatusText(null);

      setAiMealAnalysis(data.analysis);
      if (data.analysis.eatingSequencing) {
        setSelectedSequencing(data.analysis.eatingSequencing);
      }

      // Hybrid Storage: If user has Google Drive connected, backup photos automatically to Drive folder
      const driveToken = getDriveAccessToken();
      if (driveToken && selectedImages.length > 0) {
        // Run in background without slowing down clinical UI
        (async () => {
          try {
            const timestampStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            for (let idx = 0; idx < selectedImages.length; idx++) {
              const photoName = `Foto_Comida_${timestampStr}_p${idx + 1}.jpg`;
              await uploadImageToDrive(driveToken, photoName, selectedImages[idx]);
            }
            console.info(`[Google Drive] ${selectedImages.length} fotos guardadas en Drive exitosamente.`);
          } catch (driveErr) {
            console.warn('[Google Drive] No se pudo guardar foto en Drive:', driveErr);
          }
        })();
      }

      if (autoApplyToPlate && data.analysis) {
        onApplyAiAnalysisToPlate(data.analysis);
        setAiSuccessMessage('¡Comida analizada y cargada directamente en la Calculadora de Bolus!');
        setTimeout(() => setAiSuccessMessage(null), 6000);
      } else {
        // Scroll to results
        setTimeout(() => {
          document.getElementById('ai-meal-analysis-result-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    } catch (err: any) {
      console.error(err);
      const friendlyMsg = err.message?.includes('Ruta API no encontrada')
        ? 'El servidor se estaba reiniciando.'
        : (err.message || 'Ocurrió un error al analizar la comida con la IA.');
      setAiError(friendlyMsg);

      // Auto-retry countdown if fewer than 2 automatic reload cycles
      if (retryCountRef.current < 2) {
        retryCountRef.current += 1;
        setRetryCountdown(3); // Recarga automáticamente tras 3 segundos!
      }
    } finally {
      setIsAnalyzingAiMeal(false);
      setRetryStatusText(null);
    }
  };

  const handleManualApplyToPlate = (analysis: StructuredMealAnalysis) => {
    onApplyAiAnalysisToPlate(analysis);
    setAiSuccessMessage('¡Comida cargada directamente en la Calculadora de Bolus!');
    setTimeout(() => setAiSuccessMessage(null), 6000);
  };

  return (
    <div ref={containerRef} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-5">
      
      {/* Unified Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Utensils className="h-5 w-5 text-teal-400" />
              Buscador de Alimentos & Asistente IA Unificado
            </h2>
            <p className="text-xs text-slate-400">
              Búsqueda en bases de datos con memoria instantánea, ajuste exacto de masitas con IA y soporte para pegar fotos con Ctrl+V.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-950/80 border border-teal-800 text-teal-300 text-[11px] font-medium font-mono">
              <Zap className="h-3.5 w-3.5 text-amber-300" />
              Caché Rápida & Portapapeles Activo
            </span>
          </div>
        </div>
      </div>

      {/* 1. BARRA DE ACCESO RÁPIDO / ALIMENTOS HABITUALES (FAVORITOS) */}
      <QuickFavoritesBar
        onAddFood={onAddFoodToPlate}
        onSendToAi={(food, q) => handleSendFoodToAiPrompt(food, q)}
      />

      {/* 2. SELECCIÓN DINÁMICA DE PAÍS, FUENTES WEB Y BASES DE DATOS */}
      <SearchSourcesSelector
        countryCode={activeCountryCode}
        onChangeCountry={onChangeCountry}
        selectedSourceIds={selectedSourceIds}
        onToggleSource={handleToggleSource}
        onSelectAll={handleSelectAllSources}
        onSelectOfficialOnly={handleSelectOfficialOnly}
        onSelectCommercialOnly={handleSelectCommercialOnly}
      />

      {/* 2.B MENÚ DESPLEGABLE DE CONDICIONES MÉDICAS (CELIAQUÍA SIN TACC, RENAL, LACTOSA, PRESIÓN, ETC.) */}
      {onUpdateSettings && (
        <MedicalConditionsDropdown
          settings={settings}
          onUpdateSettings={onUpdateSettings}
        />
      )}

      {/* 3. SECCIÓN SUPERIOR: BUSCADOR MANUAL & CATÁLOGO */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 md:p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-teal-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              1. Búsqueda Rápida & Catálogo de Productos
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Podés añadir directo a la calculadora o enviarlo a la IA para afinar unidades
          </span>
        </div>

        {/* Search Input Bar */}
        <div className="flex flex-col gap-2">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              id="input-food-search-query"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (aiError) setAiError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleAiFoodSearch()}
              placeholder="Escribe el alimento o marca: masitas, yogur, pizza, maní, milanesa, Doninas, Milkaut..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-9 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setAiSearchResults([]);
                  setIsFromCache(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-200 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => handleAiFoodSearch()}
              id="btn-ai-search-food"
              disabled={isSearchingAi || !searchQuery.trim()}
              className="py-2.5 px-3.5 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold border border-teal-500 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50"
            >
              {isSearchingAi ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Search className="h-4 w-4 text-white" />
              )}
              <span>Buscar en Catálogos y Web</span>
            </button>

            <button
              onClick={() => {
                setAiTextQuery(searchQuery);
                handleAnalyzeMeal(true, searchQuery);
              }}
              id="btn-ai-analyze-from-search"
              disabled={isAnalyzingAiMeal || !searchQuery.trim()}
              className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-teal-300 font-bold border border-teal-500/50 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50"
              title="Analizar esta descripción y cargarla directamente a la Calculadora de Bolus"
            >
              {isAnalyzingAiMeal ? (
                <Loader2 className="h-4 w-4 animate-spin text-teal-300" />
              ) : (
                <Zap className="h-4 w-4 text-teal-300 fill-teal-300" />
              )}
              <span>⚡ Analizar y Cargar al Plato</span>
            </button>
          </div>
        </div>

        {/* Category Filter Chips + Celiac Sin TACC Quick Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {activeConditions.celiac && (
            <button
              type="button"
              onClick={() => setOnlyGlutenFreeFilter((p) => !p)}
              className={`px-3 py-1 rounded-lg transition whitespace-nowrap text-[11px] font-bold border flex items-center gap-1 cursor-pointer ${
                onlyGlutenFreeFilter
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                  : 'bg-amber-950/60 text-amber-300 border-amber-600/60 hover:bg-amber-900/60'
              }`}
            >
              <span>🌾</span>
              <span>{onlyGlutenFreeFilter ? '✅ Mostrando Solo Sin TACC' : 'Filtrar Solo Sin TACC'}</span>
            </button>
          )}
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap text-[11px] font-medium border ${
                selectedCategory === cat
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {searchError && (
          <div className="p-3.5 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-fadeIn">
            <div className="flex items-start sm:items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5 sm:mt-0" />
              <div>
                <p className="font-semibold text-rose-200">{searchError}</p>
                {searchRetryCountdown !== null && searchRetryCountdown > 0 && (
                  <p className="text-[11px] text-amber-300 font-bold mt-1 flex items-center gap-1.5 animate-pulse">
                    <RefreshCw className="h-3 w-3 animate-spin text-amber-400" />
                    <span>Recargando búsqueda automáticamente en {searchRetryCountdown}s (intento {searchRetryCountRef.current} de 2)...</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {searchRetryCountdown !== null && (
                <button
                  type="button"
                  onClick={() => setSearchRetryCountdown(null)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition cursor-pointer"
                >
                  Detener
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSearchRetryCountdown(null);
                  handleAiFoodSearch(undefined, true);
                }}
                disabled={isSearchingAi || !searchQuery.trim()}
                className="px-3 py-1.5 bg-rose-900 hover:bg-rose-800 text-rose-100 hover:text-white rounded-lg font-bold text-[11px] border border-rose-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSearchingAi ? 'animate-spin' : ''}`} />
                <span>Reintentar Ahora</span>
              </button>
            </div>
          </div>
        )}

        {/* External Web & Database Search Results Panel (with Instant Memory indicator) */}
        {aiSearchResults.length > 0 && (
          <div className="bg-slate-900 border border-teal-500/40 rounded-xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Resultados encontrados para "{searchQuery}":
                </span>
                {isFromCache && (
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono font-bold flex items-center gap-1">
                    <Zap className="h-3 w-3 text-emerald-400" />
                    Caché Instantánea
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isFromCache && (
                  <button
                    onClick={() => handleAiFoodSearch(undefined, true)}
                    className="text-[10px] text-teal-400 hover:text-teal-200 underline"
                  >
                    Actualizar online
                  </button>
                )}
                <span className="text-[11px] font-mono text-slate-400">{displayedAiSearchResults.length} productos</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayedAiSearchResults.map((food) => (
                <FoodCardItem
                  key={food.id}
                  food={food}
                  settings={settings}
                  isFavorite={isFavoriteFood(food, favoriteFoods)}
                  onToggleFavorite={() => handleToggleFavorite(food)}
                  onAdd={(q) => onAddFoodToPlate(food, q)}
                  onSendToAi={(units) => handleSendFoodToAiPrompt(food, units)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Local / Preloaded Catalog Dropdown */}
        <div className="border-t border-slate-800/80 pt-3 space-y-3">
          <div
            onClick={() => setIsCatalogExpanded(!isCatalogExpanded)}
            className="flex items-center justify-between cursor-pointer select-none"
          >
            <div className="flex items-center space-x-2">
              <ShoppingBag className="h-4 w-4 text-teal-400" />
              <h4 className="text-xs font-bold text-slate-300">
                {searchQuery ? `Coincidencias en Catálogo Local (${filteredLocalFoods.length})` : `Catálogo Rápido Registrado (${filteredLocalFoods.length})`}
              </h4>
              <span className="text-[10px] text-teal-400 font-medium px-2 py-0.5 rounded bg-teal-950 border border-teal-800">
                {isCatalogExpanded ? '▲ Plegar' : '▼ Desplegar'}
              </span>
            </div>
            <button
              type="button"
              className="text-slate-400 hover:text-slate-200 transition"
            >
              {isCatalogExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {(isCatalogExpanded || Boolean(searchQuery.trim())) && (
            <div className="space-y-3 animate-fadeIn">
              {filteredLocalFoods.length === 0 ? (
                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-center space-y-2">
                  <p className="text-xs text-slate-400">
                    No se encontraron resultados en el catálogo local para "{searchQuery}".
                  </p>
                  <button
                    onClick={() => handleAiFoodSearch()}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition shadow-md"
                  >
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    Buscar "{searchQuery}" en ARGENFOODS, SIFeGA, Open Food Facts y Fabricantes
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1">
                  {filteredLocalFoods.map((food) => (
                    <FoodCardItem
                      key={food.id}
                      food={food}
                      settings={settings}
                      isFavorite={isFavoriteFood(food, favoriteFoods)}
                      onToggleFavorite={() => handleToggleFavorite(food)}
                      onAdd={(q) => onAddFoodToPlate(food, q)}
                      onSendToAi={(units) => handleSendFoodToAiPrompt(food, units)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* 4. SECCIÓN INFERIOR: MENSAJE A LA IA, AJUSTE DE PORCIONES & FOTOS */}
      <div className="bg-slate-950/90 border border-teal-500/30 rounded-xl p-4 md:p-5 space-y-4 shadow-md">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              2. Consulta, Ajuste por Masitas/Unidades y Fotos con IA
            </h3>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-teal-400 font-medium">
            <Clipboard className="h-3.5 w-3.5 text-amber-300" />
            <span>Pega fotos directamente con <strong>Ctrl + V</strong></span>
          </div>
        </div>

        {/* Success toast when food is sent from search to AI prompt or image pasted */}
        {aiSuccessMessage && (
          <div className="p-3 bg-teal-950/90 border border-teal-600 text-teal-200 text-xs rounded-xl flex items-center justify-between gap-2 animate-fadeIn shadow-md">
            <div className="flex items-center gap-2">
              <CornerDownRight className="h-4 w-4 text-teal-400 shrink-0" />
              <span>{aiSuccessMessage}</span>
            </div>
            <button
              onClick={() => setAiSuccessMessage(null)}
              className="text-teal-400 hover:text-white p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Quick prompt suggestions */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-400 font-medium mr-1 text-[10px] uppercase tracking-wider">Atajos:</span>
          <button
            type="button"
            onClick={() => setAiTextQuery((p) => (p ? `${p}\nComí 4 masitas individuales de las galletitas.` : 'Comí 4 masitas individuales de galletitas.'))}
            className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 hover:border-teal-600 hover:text-teal-200 transition"
          >
            🍪 Calcular masitas individuales
          </button>
          <button
            type="button"
            onClick={() => setAiTextQuery((p) => (p ? `${p}\nDos milanesas de ternera al horno con ensalada mixta.` : 'Dos milanesas de ternera al horno con ensalada mixta.'))}
            className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 hover:border-teal-600 hover:text-teal-200 transition"
          >
            🥩 Plato con carne y ensalada
          </button>
          <button
            type="button"
            onClick={() => setAiTextQuery((p) => (p ? `${p}\nAdjunto foto de la tabla nutricional de mi paquete para calcular por unidad.` : 'Adjunto foto de la tabla nutricional de mi paquete para calcular por unidad.'))}
            className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 hover:border-teal-600 hover:text-teal-200 transition"
          >
            🏷️ Cruzar con foto de etiqueta
          </button>
        </div>

        {/* Selector Fisiológico de Secuenciación y Orden de Ingesta */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-amber-400" />
              <span>Orden / Secuenciación Fisiológica del Plato:</span>
            </span>
            <span className="text-[10px] text-amber-300 font-mono">
              {selectedSequencing === 'veggies_first' ? '⏱️ Retraso absorción (+40 min)' : selectedSequencing === 'mixed' ? '🥣 Absorción modulada / mixta' : '🍽️ Absorción habitual'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setSelectedSequencing('standard')}
              id="btn-seq-standard"
              className={`p-2.5 rounded-xl text-left border transition text-xs cursor-pointer ${
                selectedSequencing === 'standard'
                  ? 'bg-teal-950/70 border-teal-500 text-teal-200 ring-1 ring-teal-500/40 shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="font-bold block text-slate-100">🍽️ Estándar</span>
              <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">Consumo directo o plato único habitual</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedSequencing('mixed')}
              id="btn-seq-mixed"
              className={`p-2.5 rounded-xl text-left border transition text-xs cursor-pointer ${
                selectedSequencing === 'mixed'
                  ? 'bg-amber-950/70 border-amber-500 text-amber-200 ring-1 ring-amber-500/40 shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="font-bold block text-slate-100">🥣 Mezclado / Untado</span>
              <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">ej. Pan untado con pasta de maní o salsas grasas</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedSequencing('veggies_first')}
              id="btn-seq-veggies-first"
              className={`p-2.5 rounded-xl text-left border transition text-xs cursor-pointer ${
                selectedSequencing === 'veggies_first'
                  ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/40 shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="font-bold block text-slate-100">🥗 Fibra / Grasas Primero</span>
              <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">ej. Ensalada antes de pizza o fideos</span>
            </button>
          </div>
        </div>

        {/* Text Prompt Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center justify-between">
            <span>Mensaje / Descripción de la Comida para la IA:</span>
            {aiTextQuery && (
              <button
                type="button"
                onClick={() => setAiTextQuery('')}
                className="text-[10px] text-slate-400 hover:text-rose-300"
              >
                Limpiar texto
              </button>
            )}
          </label>
          <textarea
            ref={aiTextareaRef}
            id="textarea-ai-meal-query"
            rows={3}
            value={aiTextQuery}
            onChange={(e) => {
              setAiTextQuery(e.target.value);
              if (aiError) setAiError(null);
            }}
            placeholder="Ej: Arroz frío recalentado (almidón resistente), puré de papas casero, fideos al dente, marca o cantidad de masitas..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5">
            <Info className="h-3.5 w-3.5 text-teal-400 shrink-0" />
            <span>
              <strong className="text-slate-300">Consejo de precisión:</strong> Detallá si la comida está fría o recién hecha, si es puré o al dente, la marca o el corte. La IA ajusta la absorción, el índice glucémico y la espera pre-bolo con esos datos.
            </span>
          </p>
        </div>

        {/* Multi-Photo Attachment Section */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Camera className="h-4 w-4 text-teal-400" />
              <span>Fotos del Plato / Etiquetas ({selectedImages.length}):</span>
            </label>
            <span className="text-[11px] text-teal-400 font-medium">
              Sube fotos, usa la cámara o pega con <strong>Ctrl + V</strong>
            </span>
          </div>

          <input
            id="multi-food-photo-input"
            type="file"
            accept="image/*"
            multiple
            ref={fileInputRef}
            onChange={handleImageSelect}
            className="hidden"
          />

          {/* Quick Capture Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsCameraModalOpen(true)}
              id="btn-open-inapp-camera"
              className="py-2.5 px-3.5 bg-teal-600/90 hover:bg-teal-500 active:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-teal-400/40 shadow-sm transition"
            >
              <Camera className="h-4 w-4 text-teal-200" />
              <span>Sacar Foto (Cámara en Pantalla)</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              id="btn-upload-gallery-photo"
              className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 shadow-sm transition"
            >
              <ImageIcon className="h-4 w-4 text-slate-400" />
              <span>Elegir de Galería o Archivo</span>
            </button>
          </div>

          {/* Photos thumbnails grid */}
          {selectedImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
              {selectedImages.map((img, idx) => (
                <div key={idx} className="relative rounded-xl overflow-hidden border-2 border-teal-500/40 bg-slate-900 aspect-video shadow-md group">
                  <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-slate-950/90 text-[10px] font-bold text-teal-300 border border-teal-500/30 shadow">
                    Foto #{idx + 1}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1.5 right-1.5 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-md transition shadow"
                    title="Quitar esta foto"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trigger Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            onClick={() => handleAnalyzeMeal(true)}
            id="btn-run-ai-meal-direct-plate"
            disabled={isAnalyzingAiMeal || (!aiTextQuery.trim() && !searchQuery.trim() && selectedImages.length === 0)}
            className="py-3 px-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center space-x-2 transition shadow-lg disabled:opacity-50 cursor-pointer"
          >
            {isAnalyzingAiMeal ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                <span>{retryStatusText || 'Analizando con IA...'}</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 text-slate-950 fill-slate-950" />
                <span>⚡ Analizar y Cargar Directo al Plato</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleAnalyzeMeal(false)}
            id="btn-run-ai-meal-analysis"
            disabled={isAnalyzingAiMeal || (!aiTextQuery.trim() && !searchQuery.trim() && selectedImages.length === 0)}
            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center space-x-2 transition shadow disabled:opacity-50 cursor-pointer"
          >
            {isAnalyzingAiMeal ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
                <span>{retryStatusText || 'Analizando con IA...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span>Analizar y Ver Desglose Primero</span>
              </>
            )}
          </button>
        </div>

        {aiSuccessMessage && (
          <div className="p-3.5 bg-teal-950/90 border border-teal-500/80 rounded-xl text-teal-200 text-xs flex items-center justify-between gap-3 shadow-lg ring-1 ring-teal-500/50 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="font-bold">{aiSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const calc = document.getElementById('section-insulin-calculator');
                calc?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="px-2.5 py-1 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg font-bold text-[11px] shrink-0 transition shadow cursor-pointer"
            >
              Ver Calculadora ↑
            </button>
          </div>
        )}

        {aiError && (
          <div className="p-3.5 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-fadeIn">
            <div className="flex items-start sm:items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5 sm:mt-0" />
              <div>
                <p className="font-semibold text-rose-200">{aiError}</p>
                {retryCountdown !== null && retryCountdown > 0 && (
                  <p className="text-[11px] text-amber-300 font-bold mt-1 flex items-center gap-1.5 animate-pulse">
                    <RefreshCw className="h-3 w-3 animate-spin text-amber-400" />
                    <span>Reintentando automáticamente en {retryCountdown}s (intento {retryCountRef.current} de 2)...</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {retryCountdown !== null && (
                <button
                  type="button"
                  onClick={() => setRetryCountdown(null)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition cursor-pointer"
                >
                  Detener
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setRetryCountdown(null);
                  handleAnalyzeMeal(false);
                }}
                disabled={isAnalyzingAiMeal}
                className="px-3 py-1.5 bg-rose-900 hover:bg-rose-800 text-rose-100 hover:text-white rounded-lg font-bold text-[11px] border border-rose-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isAnalyzingAiMeal ? 'animate-spin' : ''}`} />
                <span>Reintentar Ahora</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 5. RESULTADO ESTRUCTURADO DEL ANÁLISIS IA (T1D + RENAL) */}
      {aiMealAnalysis && (
        <div id="ai-meal-analysis-result-container" className="mt-6 space-y-4 border-t border-slate-800 pt-5 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold text-teal-300 flex items-center gap-2">
              <Check className="h-5 w-5 text-emerald-400" />
              Resultado del Análisis Nutricional Estructurado
            </h3>

            <button
              onClick={() => handleManualApplyToPlate(aiMealAnalysis)}
              id="btn-apply-ai-meal-to-plate"
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-md self-start sm:self-auto cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Cargar este Análisis en la Calculadora de Bolus
            </button>
          </div>

          {/* Itemized Detected Elements with Delete Option */}
          {aiMealAnalysis.items && aiMealAnalysis.items.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400">
                  Platos / Ingredientes Detectados ({aiMealAnalysis.items.length})
                </h4>
                <span className="text-[11px] text-slate-400">
                  Si la IA detectó un ingrediente incorrecto, puedes eliminarlo con el botón rojo
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {aiMealAnalysis.items.map((item, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-start justify-between gap-2 shadow-sm">
                    <div className="space-y-1 text-xs">
                      <span className="font-bold text-slate-100 block">{item.name}</span>
                      <span className="text-[11px] text-slate-400 block">{item.portionText}</span>
                      <div className="flex flex-wrap gap-1.5 text-[10px] font-mono pt-1">
                        <span className="bg-teal-950 text-teal-300 px-1.5 py-0.5 rounded border border-teal-800/50">
                          {item.carbsGrams}g HC (Rótulo CAA)
                        </span>
                        {item.fiberGrams ? (
                          <span className="bg-emerald-950/60 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800/40">
                            {item.fiberGrams}g Fibra (sep.)
                          </span>
                        ) : null}
                        <span className="bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800/50">
                          {item.animalProteinGrams}g Prot. Anim
                        </span>
                        <span className="bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800/50">
                          {item.plantProteinGrams}g Prot. Veg
                        </span>
                        <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                          {item.calories} kcal
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAnalysisItem(idx)}
                      className="p-1.5 bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg transition border border-rose-800/60 shrink-0"
                      title="Quitar este ingrediente de la lista"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. Desglose de Macros */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 border-b border-slate-800 pb-1 flex items-center justify-between">
                <span>1. Desglose de Macronutrientes y Calorías</span>
                {aiMealAnalysis.totals.polyolsGrams ? (
                  <span className="text-[10px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-800/60 font-sans">
                    Polioles Detectados
                  </span>
                ) : null}
              </h4>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between font-bold text-teal-300 bg-teal-950/40 p-1.5 rounded border border-teal-800/40">
                  <span>Carbohidratos para Novorapid (Rótulo Argentino):</span>
                  <span>{aiMealAnalysis.totals.carbsGrams.toFixed(1)} g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fibra Alimentaria (separada en CAA, no se descuenta):</span>
                  <strong className="text-emerald-400">{(aiMealAnalysis.totals.fiberGrams || 0).toFixed(1)} g</strong>
                </div>

                {/* Desglose Explícito de Polioles / Endulzantes si existen */}
                {(aiMealAnalysis.totals.polyolsGrams !== undefined && aiMealAnalysis.totals.polyolsGrams > 0) || (aiMealAnalysis.totals.sweetenersDetected && aiMealAnalysis.totals.sweetenersDetected.length > 0) ? (
                  <div className="bg-purple-950/30 border border-purple-800/40 p-2 rounded text-[11px] font-sans space-y-1 my-1">
                    <div className="flex justify-between text-purple-300 font-bold">
                      <span>🍬 Endulzantes / Polioles:</span>
                      <span>{aiMealAnalysis.totals.polyolsGrams || 0} g</span>
                    </div>
                    {aiMealAnalysis.totals.sweetenersDetected && aiMealAnalysis.totals.sweetenersDetected.length > 0 && (
                      <div className="text-purple-200/90 text-[10px]">
                        <strong>Detectados:</strong> {aiMealAnalysis.totals.sweetenersDetected.join(', ')}
                      </div>
                    )}
                    {aiMealAnalysis.totals.polyolsCalculationNote && (
                      <div className="text-purple-300/80 text-[10px] italic">
                        💡 {aiMealAnalysis.totals.polyolsCalculationNote}
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="flex justify-between">
                  <span className="text-slate-400">Proteína ANIMAL (g) (Máx 25g/día):</span>
                  <strong className={aiMealAnalysis.totals.animalProteinGrams > 25 ? 'text-rose-400' : 'text-amber-300'}>
                    {aiMealAnalysis.totals.animalProteinGrams} g
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Proteína VEGETAL (g) (Meta 25-35g/día):</span>
                  <strong className="text-emerald-300">{aiMealAnalysis.totals.plantProteinGrams} g</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Grasas totales (g):</span>
                  <strong className="text-slate-200">{aiMealAnalysis.totals.fatGrams} g</strong>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1 font-sans">
                  <span className="text-slate-300 font-bold">Calorías totales:</span>
                  <strong className="text-teal-400 font-bold">{aiMealAnalysis.totals.calories} kcal</strong>
                </div>
              </div>
            </div>

            {/* 2. Índice y Carga Glucémica */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 border-b border-slate-800 pb-1">
                2. Índice y Carga Glucémica de la Comida
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Índice Glucémico (IG):</span>
                  <strong className="text-slate-200">{aiMealAnalysis.glycemicIndex}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Carga Glucémica (CG):</span>
                  <strong className="text-slate-200">{aiMealAnalysis.glycemicLoad}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Absorción esperada:</span>
                  <strong className="text-teal-300">{aiMealAnalysis.absorptionSpeed}</strong>
                </div>
              </div>
            </div>

            {/* 3. Dosis Teórica */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 border-b border-slate-800 pb-1">
                3. Cálculo de Dosis Teórica de Bolus (Ratio 1:{settings.icr})
              </h4>
              <div className="space-y-1.5 text-xs">
                <p className="text-slate-300">
                  • Bolus por carbohidratos ({aiMealAnalysis.totals.carbsGrams}g ÷ {settings.icr}):{' '}
                  <strong className="text-teal-300">{aiMealAnalysis.theoreticalMealBolus.toFixed(2)} U</strong>
                </p>
                {currentGlucose > 0 && (
                  <p className="text-slate-300">
                    • Corrección glucemia ({currentGlucose} mg/dL vs {settings.targetGlucose} mg/dL):{' '}
                    <strong className="text-amber-300">{aiMealAnalysis.correctionBolus.toFixed(2)} U</strong>
                  </p>
                )}
              </div>
            </div>

            {/* 4. Factores e Involucrados */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 border-b border-slate-800 pb-1">
                4. Factores Glucémicos y Renal
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                {aiMealAnalysis.glycemicFactors.map((factor, idx) => (
                  <li key={idx}>{factor}</li>
                ))}
              </ul>
              <p className="text-[11px] text-amber-300/90 pt-1 border-t border-slate-800">
                {aiMealAnalysis.renalSafetyNote}
              </p>
            </div>

            {/* 5. Estrategia de Bolo Dividido & Secuenciación Fisiológica */}
            {aiMealAnalysis.splitStrategyAdvice && (
              <div className="bg-slate-950 border border-amber-500/60 rounded-xl p-4 md:col-span-2 space-y-3 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Split className="h-4 w-4 text-amber-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      5. Estrategia de Bolo Dividido & Secuenciación Fisiológica
                    </h4>
                  </div>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold self-start sm:self-auto ${
                    aiMealAnalysis.splitStrategyAdvice.requiresSplit
                      ? 'bg-amber-950 text-amber-300 border border-amber-500/60'
                      : 'bg-teal-950 text-teal-300 border border-teal-500/60'
                  }`}>
                    {aiMealAnalysis.splitStrategyAdvice.requiresSplit ? '⚡ Requiere Bolo Dividido' : 'Bolo Único Estándar'}
                  </span>
                </div>

                {aiMealAnalysis.eatingSequencingAdvice && (
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 flex items-start gap-2.5">
                    <Sparkles className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <strong className="text-teal-300 block font-semibold">Impacto en Vaciado Gástrico y Secuenciación:</strong>
                      <span className="leading-relaxed">{aiMealAnalysis.eatingSequencingAdvice}</span>
                    </div>
                  </div>
                )}

                {aiMealAnalysis.splitStrategyAdvice.requiresSplit ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="bg-slate-900/80 p-3.5 rounded-xl border border-teal-500/40 space-y-1">
                      <span className="text-[11px] text-teal-400 font-bold uppercase tracking-wider block">1ª Dosis Inmediata</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black font-mono text-teal-300">
                          {aiMealAnalysis.splitStrategyAdvice.firstDoseUnits}
                        </span>
                        <span className="text-xs font-bold text-teal-400">U Novorapid</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
                        🕒 <strong>Momento:</strong> {aiMealAnalysis.splitStrategyAdvice.firstDoseTiming}
                      </p>
                    </div>

                    <div className="bg-slate-900/80 p-3.5 rounded-xl border border-amber-500/40 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider block">2ª Dosis Programada</span>
                        <span className="text-[10px] text-amber-300 font-mono font-bold">+{aiMealAnalysis.splitStrategyAdvice.secondDoseDelayFormatted}</span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black font-mono text-amber-300">
                          {aiMealAnalysis.splitStrategyAdvice.secondDoseUnits}
                        </span>
                        <span className="text-xs font-bold text-amber-400">U Novorapid</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
                        🕒 <strong>Momento:</strong> {aiMealAnalysis.splitStrategyAdvice.secondDoseTiming}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs text-slate-300">
                    <strong className="text-teal-300 block">Aplicar {aiMealAnalysis.suggestedTotalBolus.toFixed(1)} U en una sola inyección:</strong>
                    <span className="text-[11px] text-slate-400">{aiMealAnalysis.splitStrategyAdvice.firstDoseTiming}</span>
                  </div>
                )}

                <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{aiMealAnalysis.splitStrategyAdvice.clinicalExplanation || aiMealAnalysis.splitStrategyAdvice.reason}</span>
                </p>
              </div>
            )}

            {/* 6. Fuentes Oficiales Consultadas */}
            {aiMealAnalysis.sourcesCited && aiMealAnalysis.sourcesCited.length > 0 && (
              <div className="bg-slate-950 border border-teal-900/60 rounded-xl p-3.5 space-y-1.5 md:col-span-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5 border-b border-slate-800 pb-1">
                  <span>🏛️</span> Fuentes Oficiales y Referencias Consultadas
                </h4>
                <ul className="space-y-1 text-[11px] text-slate-300">
                  {aiMealAnalysis.sourcesCited.map((src, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-teal-400 font-bold">•</span>
                      <span>{src}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        </div>
      )}

      {/* In-App Live Camera Viewfinder Modal (Zero app-switching, zero memory reloads) */}
      <InAppCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCaptureImage={(dataUrl) => {
          setSelectedImages((prev) => [...prev, dataUrl].slice(0, 10));
          setAiSuccessMessage('📸 ¡Foto capturada exitosamente con la cámara!');
          setTimeout(() => setAiSuccessMessage(null), 3500);
        }}
        onOpenFallbackFilePicker={() => fileInputRef.current?.click()}
      />

    </div>
  );
};

// Subcomponent: Individual Food Card with portion selector, Send to AI Button & Star Favorite toggle (Mobile-Optimized)
interface FoodCardItemProps {
  food: FoodItem;
  settings: UserSettings;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onAdd: (quantity: number) => void;
  onSendToAi: (quantity: number) => void;
}

const FoodCardItem: React.FC<FoodCardItemProps> = ({
  food,
  settings,
  isFavorite = false,
  onToggleFavorite,
  onAdd,
  onSendToAi,
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const [added, setAdded] = useState<boolean>(false);

  const effectiveQuantity = quantity > 0 ? quantity : 1;

  const conditionBadges = useMemo(
    () => evaluateFoodForMedicalConditions(food, settings, effectiveQuantity),
    [food, settings, effectiveQuantity]
  );

  const handleAddClick = () => {
    onAdd(effectiveQuantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const isSingleUnit = /^(1\s*(unidad|u|masita|galletita|rebanada|empanada|pote|huevo|fruta|milanesa)|1\s*mas\b)/i.test(food.portionName) ||
    food.name.toLowerCase().includes('(1 masita') ||
    food.name.toLowerCase().includes('(1 unidad') ||
    food.name.toLowerCase().includes('(1 rebanada');

  const isMasita = /gallet|masit/i.test(food.name) || /gallet|masit/i.test(food.portionName);
  const isPaquete = /paquete/i.test(food.portionName) || /paquete/i.test(food.name);

  // Stepper unit label
  let unitLabel = 'u';
  if (isPaquete) {
    unitLabel = 'paq.';
  } else if (isSingleUnit && isMasita) {
    unitLabel = 'mas.';
  } else if (food.portionName.toLowerCase().includes('porci') || food.portionName.toLowerCase().includes('masitas') || food.portionName.toLowerCase().includes('galletitas')) {
    unitLabel = 'porc.';
  } else if (isMasita) {
    unitLabel = 'porc.';
  }
  
  const totalCarbs = Math.round(food.carbsGrams * quantity * 10) / 10;
  const totalAnim = Math.round(food.animalProteinGrams * quantity * 10) / 10;
  const totalVeg = Math.round(food.plantProteinGrams * quantity * 10) / 10;
  const totalCals = Math.round(food.calories * quantity);

  return (
    <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 sm:p-4 space-y-3 flex flex-col justify-between transition shadow-sm">
      <div className="space-y-2">
        {/* Title and Favorite Button */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-slate-100 break-words leading-tight">
              {food.name}
            </h4>
            {food.brand && (
              <span className="text-xs text-teal-400 block font-medium mt-0.5 break-words">
                {food.brand}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onToggleFavorite && (
              <button
                type="button"
                onClick={onToggleFavorite}
                className={`p-2 rounded-xl border transition ${
                  isFavorite
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-amber-300'
                }`}
                title={isFavorite ? 'Quitar de Favoritos' : 'Guardar en Favoritos'}
              >
                <Star className={`h-4 w-4 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
              </button>
            )}
            {food.source?.includes('Open Food Facts') && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 rounded-md whitespace-nowrap">
                Open Food Facts
              </span>
            )}
            {food.isCommercial && !food.source?.includes('Open Food Facts') && (
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/80 rounded-md">
                Comercial
              </span>
            )}
          </div>
        </div>

        {/* Portion description */}
        <div className="text-xs text-slate-300 bg-slate-950/60 border border-slate-800/60 rounded-lg px-2.5 py-1.5 break-words">
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Porción declarada:</span>
          <span className="text-slate-200 font-medium">{food.portionName}</span>
        </div>

        {food.source && (
          <div className={`px-2 py-1 rounded border text-[10px] font-medium flex items-start gap-1.5 break-words ${
            food.source.includes('Open Food Facts')
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              : 'bg-slate-950 border-slate-800/60 text-teal-300/90'
          }`}>
            <span className="shrink-0">{food.source.includes('Open Food Facts') ? '🌿' : '🏛️'}</span>
            <span className="break-words"><strong>Fuente:</strong> {food.source}</span>
          </div>
        )}

        {/* Carteles de Condiciones Médicas Activas (Celiaquía Sin TACC, Lactosa, Sodio, Gastroparesia, Renal, Colesterol) */}
        {conditionBadges.length > 0 && (
          <div className="flex flex-col gap-1.5 pt-1">
            {conditionBadges.map((badge, idx) => {
              const toneClasses =
                badge.tone === 'emerald'
                  ? 'bg-emerald-950/70 border-emerald-600/60 text-emerald-200'
                  : badge.tone === 'rose'
                  ? 'bg-rose-950/80 border-rose-500/80 text-rose-200 font-bold'
                  : badge.tone === 'amber'
                  ? 'bg-amber-950/70 border-amber-500/60 text-amber-200'
                  : badge.tone === 'indigo'
                  ? 'bg-indigo-950/70 border-indigo-500/60 text-indigo-200'
                  : 'bg-cyan-950/70 border-cyan-500/60 text-cyan-200';

              return (
                <div
                  key={`${badge.conditionId}-${idx}`}
                  title={badge.tooltip}
                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] leading-snug flex items-center justify-between gap-1.5 ${toneClasses}`}
                >
                  <span>{badge.text}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Macro Badges */}
        <div className="grid grid-cols-4 gap-1.5 mt-2 text-[10px] font-mono">
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-center">
            <span className="text-slate-400 block text-[9px]">HC</span>
            <strong className="text-teal-300 text-xs">{totalCarbs}g</strong>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-center">
            <span className="text-slate-400 block text-[9px]">P. Anim</span>
            <strong className={totalAnim > 25 ? 'text-rose-400 text-xs' : 'text-amber-300 text-xs'}>
              {totalAnim}g
            </strong>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-center">
            <span className="text-slate-400 block text-[9px]">P. Veg</span>
            <strong className="text-emerald-300 text-xs">{totalVeg}g</strong>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-center">
            <span className="text-slate-400 block text-[9px]">Kcal</span>
            <strong className="text-slate-200 text-xs">{totalCals}</strong>
          </div>
        </div>
      </div>

      {/* Quantity, Add Button & Send to AI Button */}
      <div className="space-y-2 pt-2 border-t border-slate-800/80">
        
        {/* Quantity Controls & Quick Add */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => {
                const next = Math.max(0.5, Math.round(((quantity || 1) - 1) * 10) / 10);
                setQuantity(next);
                setQuantityInput(String(next));
              }}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-sm font-bold flex items-center justify-center shrink-0 border border-slate-700 transition"
              title="Restar 1"
            >
              -
            </button>
            <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 min-w-[55px] justify-center">
              <input
                type="number"
                step="1"
                min="0.1"
                placeholder="1"
                value={quantityInput}
                onChange={(e) => {
                  const raw = e.target.value;
                  setQuantityInput(raw);
                  const val = parseFloat(raw);
                  setQuantity(isNaN(val) || val <= 0 ? 1 : val);
                }}
                className="w-8 bg-transparent text-xs font-mono font-bold text-teal-300 placeholder:text-slate-600 placeholder:font-normal text-center focus:outline-none"
              />
              <span className="text-[10px] text-teal-300 font-sans font-bold ml-0.5 whitespace-nowrap">
                {unitLabel}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = Math.round(((quantity || 1) + 1) * 10) / 10;
                setQuantity(next);
                setQuantityInput(String(next));
              }}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-sm font-bold flex items-center justify-center shrink-0 border border-slate-700 transition"
              title="Sumar 1"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleAddClick}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm ${
              added
                ? 'bg-emerald-600 text-white'
                : 'bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-slate-950'
            }`}
            title="Añadir directo a la calculadora"
          >
            {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span>{added ? '¡Añadido!' : `Cargar ${quantity > 1 ? `(${quantity} ${unitLabel})` : `(${unitLabel})`}`}</span>
          </button>
        </div>

        {/* Send to AI prompt button */}
        <button
          type="button"
          onClick={() => onSendToAi(quantity)}
          className="w-full py-2 px-2.5 bg-slate-950 hover:bg-slate-800 text-teal-300 border border-teal-800/60 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm active:bg-teal-950"
          title="Pasar este alimento al mensaje de la IA para ajustar por masitas o plato"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          <span>Ajustar {quantity > 1 ? `${quantity} unidades` : 'unidades'} con la IA</span>
        </button>

      </div>
    </div>
  );
};
