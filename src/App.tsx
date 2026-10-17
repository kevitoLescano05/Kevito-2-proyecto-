import React, { useState, useEffect, useRef } from 'react';
import {
  UserSettings,
  BolusRecord,
  DailyMealLogItem,
  MealPlateItem,
  FoodItem,
  StructuredMealAnalysis,
  PendingSplitBolus,
  CountryCode,
  CreatorMonetizationConfig,
  SponsorItem,
} from './types';
import {
  loadUserSettings,
  saveUserSettings,
  loadBolusHistory,
  saveBolusHistory,
  loadDailyMealLog,
  saveDailyMealLog,
  loadAllMealsArchive,
  saveAllMealsArchive,
  loadPendingSplitBoluses,
  savePendingSplitBoluses,
  resetDailyLog,
  checkAndAutoResetDayIfNeeded,
} from './utils/storage';
import {
  syncIPortStateDay,
  syncAllDevicesWearDays,
  DEFAULT_SENSOR_DURATION_BY_BRAND,
} from './utils/iportDayTracker';
import {
  subscribeToMeals,
  syncMealToFirestore,
  deleteMealFromFirestore,
  subscribeToBoluses,
  syncBolusToFirestore,
  deleteBolusFromFirestore,
  resetDailyMealsInFirestore,
  subscribeToSettings,
  syncSettingsToFirestore,
} from './services/firestoreSync';
import { useAuth } from './context/AuthContext';
import { getLogicalDateKey } from './utils/dateCutoff';
import { calculateIOB } from './utils/insulinMath';
import { ChevronDown, ChevronUp, BookOpen, Dumbbell, Sparkles, MessageSquare } from 'lucide-react';
import { Header } from './components/Header';
import { InsulinCalculatorCard } from './components/InsulinCalculatorCard';
import { PendingSplitBolusBanner } from './components/PendingSplitBolusBanner';
import { FoodSearchAndAnalyzer } from './components/FoodSearchAndAnalyzer';
import { DailyRenalAndCalorieTracker } from './components/DailyRenalAndCalorieTracker';
import { DailyWorkoutTrackerCard } from './components/DailyWorkoutTrackerCard';
import { PermanentMealHistory } from './components/PermanentMealHistory';
import { GlycemicFactorsPanel } from './components/GlycemicFactorsPanel';
import { ActiveInsulinTrackerModal } from './components/ActiveInsulinTrackerModal';
import { SettingsModal } from './components/SettingsModal';
import { ResetDayModal } from './components/ResetDayModal';
import { AddMealModal } from './components/AddMealModal';
import { AuthModal } from './components/AuthModal';
import { GoogleDriveSyncModal } from './components/GoogleDriveSyncModal';
import { SecondDoseSafetyCheckModal } from './components/SecondDoseSafetyCheckModal';
import { InitialSetupModal } from './components/InitialSetupModal';
import { LanguageSelectorModal } from './components/LanguageSelectorModal';
import {
  installTranslationDomSafetyPatch,
  getInitialAppLanguage,
  applyAppLanguage,
} from './utils/languageManager';
import { CommunityReviewsAndFeedbackCard } from './components/CommunityReviewsAndFeedbackCard';
import { TopBetaDisclaimerBanner } from './components/TopBetaDisclaimerBanner';
import {
  InteractiveTutorialGuideModal,
  SectionHeaderBar,
} from './components/AppTutorialAndHelp';
import { LiveAppVideoDemoModal } from './components/LiveAppVideoDemoModal';
import { FloatingQuickNavMenu } from './components/QuickNavigationDrawer';
import {
  SponsorsAndDonationsHub,
  TopVipSponsorBanner,
  ContextualFeaturedSponsorBanner,
} from './components/SponsorsAndDonationsHub';
import {
  loadLocalMonetizationConfig,
  loadLocalSponsors,
  subscribeToMonetizationConfig,
  subscribeToSponsors,
  saveMonetizationConfigEverywhere,
  upsertSponsorEverywhere,
  deleteSponsorEverywhere,
  recordSponsorClick,
} from './services/monetizationService';

export default function App() {
  const { user } = useAuth();

  // Check if cutoff has passed (never silently wipes data)
  useEffect(() => {
    checkAndAutoResetDayIfNeeded();
  }, []);

  const [settings, setSettings] = useState<UserSettings>(loadUserSettings);
  const [bolusHistory, setBolusHistory] = useState<BolusRecord[]>(loadBolusHistory);
  const [dailyMeals, setDailyMeals] = useState<DailyMealLogItem[]>(loadDailyMealLog);
  const [allMealsHistory, setAllMealsHistory] = useState<DailyMealLogItem[]>(() => {
    const archive = loadAllMealsArchive();
    const current = loadDailyMealLog();
    const map = new Map<string, DailyMealLogItem>();
    archive.forEach((m) => map.set(m.id, m));
    current.forEach((m) => map.set(m.id, m));
    return Array.from(map.values());
  });
  const [pendingSplits, setPendingSplits] = useState<PendingSplitBolus[]>(loadPendingSplitBoluses);
  const [plateItems, setPlateItems] = useState<MealPlateItem[]>([]);
  const [manualCarbs, setManualCarbs] = useState<number>(0);

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isIobModalOpen, setIsIobModalOpen] = useState<boolean>(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const [isAddMealOpen, setIsAddMealOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isDriveSyncOpen, setIsDriveSyncOpen] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [isVideoDemoOpen, setIsVideoDemoOpen] = useState<boolean>(false);
  const [demoChapterId, setDemoChapterId] = useState<string>('calculator_pizza');
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState<boolean>(false);
  const [safetyCheckTargetSplit, setSafetyCheckTargetSplit] = useState<PendingSplitBolus | null>(null);

  // Estados de secciones secundarias plegables (acordeones) para evitar sobrecarga visual
  const [isHistorySectionOpen, setIsHistorySectionOpen] = useState<boolean>(false);
  const [isWorkoutSectionOpen, setIsWorkoutSectionOpen] = useState<boolean>(false);
  const [isTrackerSectionOpen, setIsTrackerSectionOpen] = useState<boolean>(false);
  const [isFactorsSectionOpen, setIsFactorsSectionOpen] = useState<boolean>(false);
  const [isCommunitySectionOpen, setIsCommunitySectionOpen] = useState<boolean>(false);
  const [isSponsorsSectionOpen, setIsSponsorsSectionOpen] = useState<boolean>(false);

  // Detectar idioma del dispositivo/navegador al iniciar e instalar parche de seguridad DOM para traducciones
  useEffect(() => {
    installTranslationDomSafetyPatch();
    const initialLang = getInitialAppLanguage(settings.appLanguage);
    applyAppLanguage(initialLang, { allowReloadOnReset: false });
    if (!settings.appLanguage) {
      setSettings((prev) => ({
        ...prev,
        appLanguage: initialLang,
      }));
    }
  }, []);

  const handleConfirmLanguage = (langCode: string) => {
    const updated: UserSettings = {
      ...settings,
      appLanguage: langCode,
      hasSelectedLanguage: true,
    };
    setSettings(updated);
    saveUserSettings(updated);
    syncSettingsToFirestore(user?.uid, updated);
    setIsLanguageModalOpen(false);
  };

  // Abrir automáticamente la Guía Tutorial la primera vez que el usuario entra con su perfil configurado
  useEffect(() => {
    if (settings.isProfileConfigured && !settings.hasSeenTutorial) {
      setIsTutorialOpen(true);
    }
  }, [settings.isProfileConfigured, settings.hasSeenTutorial]);

  const handleCloseTutorial = () => {
    setIsTutorialOpen(false);
    if (!settings.hasSeenTutorial) {
      const updated: UserSettings = {
        ...settings,
        hasSeenTutorial: true,
      };
      setSettings(updated);
      saveUserSettings(updated);
      syncSettingsToFirestore(user?.uid, updated);
    }
  };

  // Estado de Monetización (Mercado Pago + PayPal) y Auspiciantes por País
  const [monetizationConfig, setMonetizationConfig] = useState<CreatorMonetizationConfig>(
    loadLocalMonetizationConfig
  );
  const [sponsorsList, setSponsorsList] = useState<SponsorItem[]>(loadLocalSponsors);

  useEffect(() => {
    const unsubConfig = subscribeToMonetizationConfig((remoteConfig) => {
      setMonetizationConfig(remoteConfig);
    });
    const unsubSponsors = subscribeToSponsors((remoteSponsors) => {
      setSponsorsList(remoteSponsors);
    });
    return () => {
      unsubConfig();
      unsubSponsors();
    };
  }, []);

  const handleSaveMonetizationConfig = async (newConfig: CreatorMonetizationConfig) => {
    setMonetizationConfig(newConfig);
    await saveMonetizationConfigEverywhere(newConfig);
  };

  const handleUpsertSponsor = async (sponsor: SponsorItem) => {
    const updated = await upsertSponsorEverywhere(sponsor, sponsorsList);
    setSponsorsList(updated);
  };

  const handleDeleteSponsor = async (sponsorId: string) => {
    const updated = await deleteSponsorEverywhere(sponsorId, sponsorsList);
    setSponsorsList(updated);
  };

  const handleRecordSponsorClick = async (sponsorId: string) => {
    const updated = await recordSponsorClick(sponsorId, sponsorsList);
    setSponsorsList(updated);
  };

  // Auto-save state updates immediately to local storage
  useEffect(() => {
    saveUserSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveBolusHistory(bolusHistory);
  }, [bolusHistory]);

  useEffect(() => {
    saveDailyMealLog(dailyMeals);
  }, [dailyMeals]);

  useEffect(() => {
    saveAllMealsArchive(allMealsHistory);
  }, [allMealsHistory]);

  useEffect(() => {
    savePendingSplitBoluses(pendingSplits);
  }, [pendingSplits]);

  // Registrar Service Worker y monitorear proactivamente recordatorios de bolos e i-Port:
  // - Sincroniza alarmas nativas del sistema operativo en segundo plano (TimestampTrigger + Service Worker)
  // - Web Worker en segundo plano para evitar que el navegador suspenda el temporizador al minimizar la app
  // - Chequeo instantáneo al reactivar la pantalla (visibilitychange)


  // Sincronización en tiempo real con Firestore aislada por usuario autenticado
  useEffect(() => {
    const userId = user?.uid;
    // Si no hay usuario autenticado (modo invitado), mantener la persistencia 100% en localStorage local sin interferencia remota
    if (!userId) {
      return;
    }

    const unsubMeals = subscribeToMeals(userId, (remoteMeals) => {
      if (remoteMeals && remoteMeals.length > 0) {
        setAllMealsHistory((prev) => {
          // Unir historial remoto con historial local por ID para no perder nada
          const map = new Map<string, DailyMealLogItem>();
          prev.forEach((m) => map.set(m.id, m));
          remoteMeals.forEach((m) => map.set(m.id, m));
          const merged = Array.from(map.values());
          if (JSON.stringify(prev) === JSON.stringify(merged)) return prev;
          return merged;
        });

        const active = remoteMeals.filter((m) => !m.isArchived);
        if (active.length > 0) {
          setDailyMeals((prev) => {
            const map = new Map<string, DailyMealLogItem>();
            prev.forEach((m) => map.set(m.id, m));
            active.forEach((m) => map.set(m.id, m));
            const merged = Array.from(map.values());
            if (JSON.stringify(prev) === JSON.stringify(merged)) return prev;
            return merged;
          });
        }
      }
    });

    const unsubBoluses = subscribeToBoluses(userId, (remoteBoluses) => {
      if (remoteBoluses && remoteBoluses.length > 0) {
        setBolusHistory((prev) => {
          // Unir bolus remotos con los locales por ID
          const map = new Map<string, BolusRecord>();
          prev.forEach((b) => map.set(b.id, b));
          remoteBoluses.forEach((b) => map.set(b.id, b));
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          if (JSON.stringify(prev) === JSON.stringify(merged)) return prev;
          return merged;
        });
      }
    });

    const unsubSettings = subscribeToSettings(userId, (remoteSettings) => {
      if (remoteSettings) {
        setSettings((prev) => {
          // Asegurar avance automático de Sensor, Bomba e i-Port en settings remotos
          const { updatedSettings, changed } = syncAllDevicesWearDays(remoteSettings);
          const synchronizedSettings = changed ? updatedSettings : remoteSettings;

          if (JSON.stringify(prev) === JSON.stringify(synchronizedSettings)) return prev;
          if (changed) {
            saveUserSettings(synchronizedSettings);
          }
          return synchronizedSettings;
        });
      }
    });

    return () => {
      unsubMeals();
      unsubBoluses();
      unsubSettings();
    };
  }, [user?.uid]);

  // Calculate real-time active IOB
  const { totalIOB } = calculateIOB(bolusHistory, settings.diaHours);

  // Add a food item to current active plate
  const handleAddFoodToPlate = (food: FoodItem, quantity: number) => {
    setPlateItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.foodItem.id === food.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantity;
        return updated;
      }
      return [...prev, { id: `plate-${Date.now()}-${Math.random()}`, foodItem: food, quantity }];
    });
  };

  // Apply full AI analysis to plate & calculator
  const handleApplyAiAnalysisToPlate = (analysis: StructuredMealAnalysis) => {
    if (!analysis) return;

    // Si el análisis no incluye array de ítems específicos, sintetizar uno a partir de los totales
    const rawItems = Array.isArray(analysis.items) && analysis.items.length > 0
      ? analysis.items
      : [{
          name: 'Comida analizada con IA',
          portionText: 'Plato completo',
          carbsGrams: analysis.totals?.carbsGrams ?? 0,
          fiberGrams: analysis.totals?.fiberGrams ?? 0,
          netCarbsGrams: analysis.totals?.carbsGrams ?? 0,
          animalProteinGrams: analysis.totals?.animalProteinGrams ?? 0,
          plantProteinGrams: analysis.totals?.plantProteinGrams ?? 0,
          fatGrams: analysis.totals?.fatGrams ?? 0,
          calories: analysis.totals?.calories ?? 0,
        }];

    // Convert AI items to plate items
    const newItems: MealPlateItem[] = rawItems.map((item, idx) => {
      const fiber = item.fiberGrams || 0;
      // En Argentina y MERCOSUR, los carbohidratos del rótulo ya son los asimilables
      const carbs = item.carbsGrams || 0;
      return {
        id: `ai-plate-${Date.now()}-${idx}`,
        foodItem: {
          id: `ai-food-item-${Date.now()}-${idx}`,
          name: item.name || 'Alimento analizado',
          portionName: item.portionText || 'Porción',
          gramsPerPortion: 100,
          carbsGrams: carbs,
          fiberGrams: fiber,
          netCarbsGrams: carbs,
          animalProteinGrams: item.animalProteinGrams || 0,
          plantProteinGrams: item.plantProteinGrams || 0,
          fatGrams: item.fatGrams || 0,
          calories: item.calories || 0,
          gi: analysis.glycemicIndex || 'Medio',
          cg: analysis.glycemicLoad || Math.round(carbs * 0.5),
          absorption: analysis.absorptionSpeed || 'Mixta',
        },
        quantity: 1,
      };
    });

    const totalCarbs = analysis.totals?.carbsGrams ?? 0;
    setManualCarbs(Math.round(totalCarbs * 10) / 10);
    // Establecer los alimentos analizados directamente como el plato activo para la dosis exacta
    setPlateItems(newItems);

    // Desplazamiento suave instantáneo a la Calculadora de Bolus con realce visual
    setTimeout(() => {
      const calcElem = document.getElementById('section-insulin-calculator');
      if (calcElem) {
        calcElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        calcElem.classList.add('ring-4', 'ring-teal-400', 'transition-all', 'duration-500');
        setTimeout(() => {
          calcElem.classList.remove('ring-4', 'ring-teal-400');
        }, 2500);
      }
    }, 100);
  };

  // Clear current plate items
  const handleClearPlate = () => {
    setPlateItems([]);
    setManualCarbs(0);
  };

  // Log dose and meal entry with Split Bolus awareness
  const handleLogBolusAndMeal = (data: {
    units: number;
    carbUnits: number;
    correctionUnits: number;
    carbsGrams: number;
    carbsNetGrams?: number;
    fiberGrams?: number;
    glucoseMgDl: number;
    mealDescription: string;
    animalProteinGrams: number;
    plantProteinGrams: number;
    fatGrams: number;
    calories: number;
    firstDoseIsPending?: boolean;
    firstDoseDelayMinutes?: number;
    mealMinutesAgo?: number;
    bolusMinutesAgo?: number;
    splitDetails?: {
      isSplit: boolean;
      firstDoseUnits: number;
      secondDoseUnits: number;
      delayHours: number;
      absorptionWindowText?: string;
      totalDose: number;
      firstDoseIsPending?: boolean;
      firstDoseDelayMinutes?: number;
    };
  }) => {
    const now = new Date();
    const mealAgoMs = (data.mealMinutesAgo || 0) * 60 * 1000;
    const bolusAgoMs = (data.bolusMinutesAgo || 0) * 60 * 1000;
    const mealTimestampDate = new Date(now.getTime() - mealAgoMs);
    const bolusTimestampDate = new Date(now.getTime() - bolusAgoMs);

    const timeStr = `${mealTimestampDate.getHours().toString().padStart(2, '0')}:${mealTimestampDate.getMinutes().toString().padStart(2, '0')}`;
    const bolusId = `bolus-${Date.now()}`;
    const isFirstDosePending = Boolean(data.firstDoseIsPending || data.splitDetails?.firstDoseIsPending);
    const firstDoseDelayMinutes = data.firstDoseDelayMinutes || data.splitDetails?.firstDoseDelayMinutes || 25;

    // 1. Si la 1ª dosis NO está pendiente (se inyecta de inmediato o se registró retroactiva), registrar en historial de IOB
    if (!isFirstDosePending && data.units > 0) {
      const newBolus: BolusRecord = {
        id: bolusId,
        timestamp: bolusTimestampDate.toISOString(),
        units: data.units,
        carbUnits: data.carbUnits,
        correctionUnits: data.correctionUnits,
        carbsGrams: data.carbsGrams,
        glucoseMgDl: data.glucoseMgDl,
        notes: data.splitDetails?.isSplit
          ? `${data.mealDescription} [1ª Dosis Bolo Dividido (${data.units} U de ${data.splitDetails.totalDose} U)]`
          : data.mealDescription,
        splitInfo: data.splitDetails?.isSplit
          ? {
              isSplit: true,
              part: 1,
              totalDose: data.splitDetails.totalDose,
              delayHours: data.splitDetails.delayHours,
            }
          : undefined,
      };
      setBolusHistory((prev) => [newBolus, ...prev]);
      syncBolusToFirestore(user?.uid, newBolus);
    }

    // 2. Si la 1ª dosis ES PENDIENTE (post-prandial diferido / esperar X min para remontar glucosa):
    // Se programa como 1ª Dosis Pendiente en el reloj y NO se suma a IOB hasta que se inyecte
    if (isFirstDosePending && (data.units > 0 || (data.splitDetails?.firstDoseUnits ?? 0) > 0)) {
      const firstDoseUnits = data.splitDetails?.isSplit ? data.splitDetails.firstDoseUnits : data.units;
      const firstDueMs = Date.now() + firstDoseDelayMinutes * 60 * 1000;
      const newPendingFirstDose: PendingSplitBolus = {
        id: `split-part1-${Date.now()}`,
        parentBolusId: bolusId,
        createdAt: now.toISOString(),
        dueAt: new Date(firstDueMs).toISOString(),
        delayHours: Math.round((firstDoseDelayMinutes / 60) * 100) / 100,
        delayMinutes: firstDoseDelayMinutes,
        units: firstDoseUnits,
        totalPlannedUnits: data.splitDetails?.isSplit ? data.splitDetails.totalDose : firstDoseUnits,
        firstDoseUnits: firstDoseUnits,
        carbsGrams: data.carbsGrams,
        fatGrams: data.fatGrams,
        fiberGrams: data.fiberGrams ?? 0,
        mealDescription: data.mealDescription,
        status: 'pending',
        part: 1,
        timingNote: `Espera recomendada de +${firstDoseDelayMinutes} min tras empezar a comer para remontar glucosa.`,
      };

      // Si además es bolo dividido, programar también la 2ª dosis
      if (data.splitDetails?.isSplit && data.splitDetails.secondDoseUnits > 0) {
        const secondDueTimestampMs = bolusTimestampDate.getTime() + data.splitDetails.delayHours * 60 * 60 * 1000;
        const newPendingSecondDose: PendingSplitBolus = {
          id: `split-part2-${Date.now()}`,
          parentBolusId: bolusId,
          createdAt: bolusTimestampDate.toISOString(),
          dueAt: new Date(secondDueTimestampMs).toISOString(),
          delayHours: data.splitDetails.delayHours,
          absorptionWindowText: data.splitDetails.absorptionWindowText,
          units: data.splitDetails.secondDoseUnits,
          totalPlannedUnits: data.splitDetails.totalDose,
          firstDoseUnits: data.splitDetails.firstDoseUnits,
          carbsGrams: data.carbsGrams,
          fatGrams: data.fatGrams,
          fiberGrams: data.fiberGrams ?? 0,
          mealDescription: data.mealDescription,
          status: 'pending',
          part: 2,
        };
        setPendingSplits((prev) => [newPendingFirstDose, newPendingSecondDose, ...prev]);
      } else {
        setPendingSplits((prev) => [newPendingFirstDose, ...prev]);
      }
    } else if (data.splitDetails?.isSplit && data.splitDetails.secondDoseUnits > 0) {
      // 3. Caso habitual con 1ª dosis inmediata: solo la 2ª dosis va a pendientes
      const dueTimestampMs = bolusTimestampDate.getTime() + data.splitDetails.delayHours * 60 * 60 * 1000;
      const newPendingSplit: PendingSplitBolus = {
        id: `split-${Date.now()}`,
        parentBolusId: bolusId,
        createdAt: bolusTimestampDate.toISOString(),
        dueAt: new Date(dueTimestampMs).toISOString(),
        delayHours: data.splitDetails.delayHours,
        absorptionWindowText: data.splitDetails.absorptionWindowText,
        units: data.splitDetails.secondDoseUnits,
        totalPlannedUnits: data.splitDetails.totalDose,
        firstDoseUnits: data.splitDetails.firstDoseUnits,
        carbsGrams: data.carbsGrams,
        fatGrams: data.fatGrams,
        fiberGrams: 0,
        mealDescription: data.mealDescription,
        status: 'pending',
        part: 2,
      };
      setPendingSplits((prev) => [newPendingSplit, ...prev]);
    }

    // 4. Registrar en historial de comidas diarias para conteo de calorías y macros
    const newMealLog: DailyMealLogItem = {
      id: `meal-${Date.now()}`,
      time: timeStr,
      date: getLogicalDateKey(settings.dayCutoffHour ?? 2, mealTimestampDate),
      timestamp: mealTimestampDate.toISOString(),
      description: data.mealDescription,
      carbsGrams: data.carbsGrams,
      fiberGrams: data.fiberGrams ?? 0,
      animalProteinGrams: data.animalProteinGrams,
      plantProteinGrams: data.plantProteinGrams,
      fatGrams: data.fatGrams,
      calories: data.calories,
      bolusUnits: data.splitDetails?.isSplit ? data.splitDetails.firstDoseUnits : data.units,
    };

    setDailyMeals((prev) => [newMealLog, ...prev]);
    setAllMealsHistory((prev) => [newMealLog, ...prev]);
    syncMealToFirestore(user?.uid, newMealLog);
  };

  // Confirmar y registrar inyección de bolo pendiente (1ª Dosis o 2ª Dosis)
  const handleConfirmSecondDose = (splitId: string, customUnits?: number, customGlucose?: number) => {
    const split = pendingSplits.find((s) => s.id === splitId);
    if (!split) return;

    const unitsToInject = customUnits !== undefined ? customUnits : split.units;
    if (unitsToInject <= 0) {
      setPendingSplits((prev) => prev.filter((s) => s.id !== splitId));
      setSafetyCheckTargetSplit(null);
      return;
    }

    const now = new Date();
    const isPart1 = split.part === 1;

    // Iniciar la curva de IOB en este instante exacto de aplicación
    const confirmedBolus: BolusRecord = {
      id: `bolus-part${isPart1 ? '1' : '2'}-${Date.now()}`,
      timestamp: now.toISOString(),
      units: unitsToInject,
      carbUnits: unitsToInject,
      correctionUnits: 0,
      carbsGrams: isPart1 ? split.carbsGrams : 0, // Los macros del plato ya se acumularon al inicio
      glucoseMgDl: customGlucose ?? settings.targetGlucose,
      notes: isPart1
        ? (customUnits !== undefined 
            ? `[1ª Dosis Diferida con Sensor] ${split.mealDescription} (${unitsToInject} U)`
            : `[1ª Dosis Bolo Dividido] ${split.mealDescription} (${unitsToInject} U)`)
        : (customUnits !== undefined 
            ? `[2ª Dosis Ajustada con Sensor] ${split.mealDescription} (${unitsToInject} U)`
            : `[2ª Dosis Bolo Dividido] ${split.mealDescription} (${unitsToInject} U)`),
      splitInfo: {
        isSplit: true,
        part: isPart1 ? 1 : 2,
        parentBolusId: split.parentBolusId,
        totalDose: split.totalPlannedUnits,
      },
    };

    setBolusHistory((prev) => [confirmedBolus, ...prev]);
    syncBolusToFirestore(user?.uid, confirmedBolus);

    // Marcar como completada y quitar de la lista de pendientes
    setPendingSplits((prev) => prev.filter((s) => s.id !== splitId));
    setSafetyCheckTargetSplit(null);
  };

  // Descartar recordatorio de 2ª dosis si el usuario decidió no inyectarse
  const handleDismissSplit = (splitId: string) => {
    setPendingSplits((prev) => prev.filter((s) => s.id !== splitId));
  };

  // Posponer la 2ª dosis sumando minutos adicionales al timestamp dueAt
  const handlePostponeSplit = (splitId: string, additionalMinutes: number = 60) => {
    setPendingSplits((prev) =>
      prev.map((s) => {
        if (s.id !== splitId) return s;
        const currentDueMs = new Date(s.dueAt).getTime();
        // Si ya expiró, posponer a partir de ahora, sino a partir del vencimiento actual
        const baseMs = Math.max(Date.now(), currentDueMs);
        const newDueMs = baseMs + additionalMinutes * 60 * 1000;
        return {
          ...s,
          dueAt: new Date(newDueMs).toISOString(),
          delayHours: Math.round(((newDueMs - new Date(s.createdAt).getTime()) / (3600 * 1000)) * 10) / 10,
        };
      })
    );
  };

  // Posponer múltiples o todos los bolos divididos para espaciarlos con seguridad
  const handlePostponeAllSplits = (adjustments: { splitId: string; additionalMinutes: number }[]) => {
    setPendingSplits((prev) =>
      prev.map((s) => {
        const adj = adjustments.find((a) => a.splitId === s.id);
        if (!adj) return s;
        const currentDueMs = new Date(s.dueAt).getTime();
        const baseMs = Math.max(Date.now(), currentDueMs);
        const newDueMs = baseMs + adj.additionalMinutes * 60 * 1000;
        return {
          ...s,
          dueAt: new Date(newDueMs).toISOString(),
          delayHours: Math.round(((newDueMs - new Date(s.createdAt).getTime()) / (3600 * 1000)) * 10) / 10,
        };
      })
    );
  };

  // Pausar o reanudar un bolo diferido/dividido indefinidamente en espera del sensor
  const handleTogglePauseSplit = (splitId: string) => {
    setPendingSplits((prev) =>
      prev.map((s) => {
        if (s.id !== splitId) return s;
        const nowMs = Date.now();
        if (s.isPaused) {
          // Reanudar reloj: programarlo para +30 minutos a partir de ahora
          const newDueMs = nowMs + 30 * 60 * 1000;
          return {
            ...s,
            isPaused: false,
            pausedAt: undefined,
            dueAt: new Date(newDueMs).toISOString(),
            delayHours: Math.round(((newDueMs - new Date(s.createdAt).getTime()) / (3600 * 1000)) * 10) / 10,
          };
        } else {
          // Pausar indefinidamente hasta confirmación de usuario o sensor
          return {
            ...s,
            isPaused: true,
            pausedAt: new Date(nowMs).toISOString(),
          };
        }
      })
    );
  };

  // Add direct meal manually
  const handleAddDirectMeal = (mealData: {
    description: string;
    carbsGrams: number;
    animalProteinGrams: number;
    plantProteinGrams: number;
    fatGrams: number;
    calories: number;
    bolusUnits: number;
  }) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (mealData.bolusUnits > 0) {
      const newBolus: BolusRecord = {
        id: `bolus-${Date.now()}`,
        timestamp: now.toISOString(),
        units: mealData.bolusUnits,
        carbUnits: mealData.bolusUnits,
        correctionUnits: 0,
        carbsGrams: mealData.carbsGrams,
        glucoseMgDl: settings.targetGlucose,
        notes: mealData.description,
      };
      setBolusHistory((prev) => [newBolus, ...prev]);
      syncBolusToFirestore(user?.uid, newBolus);
    }

    const logicalDate = getLogicalDateKey(settings.dayCutoffHour ?? 2, now);

    const newMealLog: DailyMealLogItem = {
      id: `meal-${Date.now()}`,
      time: timeStr,
      date: logicalDate,
      timestamp: now.toISOString(),
      description: mealData.description,
      carbsGrams: mealData.carbsGrams,
      animalProteinGrams: mealData.animalProteinGrams,
      plantProteinGrams: mealData.plantProteinGrams,
      fatGrams: mealData.fatGrams,
      calories: mealData.calories,
      bolusUnits: mealData.bolusUnits,
    };

    setDailyMeals((prev) => [newMealLog, ...prev]);
    setAllMealsHistory((prev) => [newMealLog, ...prev]);
    syncMealToFirestore(user?.uid, newMealLog);
  };

  // Save user settings explicitly
  const handleSaveSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    saveUserSettings(newSettings);
    syncSettingsToFirestore(user?.uid, newSettings);
  };

  // Open Reset Day Modal
  const handleResetDay = () => {
    setIsResetConfirmOpen(true);
  };

  // Confirm Reset Day
  const handleConfirmResetDay = (resetBolusHistory: boolean) => {
    resetDailyLog();
    resetDailyMealsInFirestore(user?.uid, true);
    setDailyMeals([]);
    setPendingSplits([]);
    setPlateItems([]);
    setManualCarbs(0);
    if (resetBolusHistory) {
      setBolusHistory([]);
    }
    // Reiniciar estado de ejercicio para el nuevo día (conservando la rutina personalizada del usuario) y avanzar días de Sensor, Bomba e i-Port si corresponde
    setSettings((prev) => {
      const { updatedSettings } = syncAllDevicesWearDays(prev);
      const resetCustomItems = (prev.dailyWorkout?.customRoutineItems || []).map((item) => ({
        ...item,
        doneStatus: null,
      }));
      const updated: UserSettings = {
        ...updatedSettings,
        dailyWorkout: {
          dateKey: new Date().toISOString().split('T')[0],
          routineType: prev.dailyWorkout?.routineType || 'chest_back',
          weightsDone: null,
          walkDone: null,
          weekendActivity: 'none',
          calorieAccountingMode: prev.dailyWorkout?.calorieAccountingMode || 'add_when_done',
          customRoutineItems: resetCustomItems,
          activeGlycemicFactors: [],
        },
      };
      saveUserSettings(updated);
      syncSettingsToFirestore(user?.uid, updated);
      return updated;
    });
  };

  // Add manual bolus to IOB history
  const handleAddManualBolus = (units: number, minutesAgo: number, notes?: string) => {
    const timestampMs = Date.now() - minutesAgo * 60 * 1000;
    const newBolus: BolusRecord = {
      id: `manual-bolus-${Date.now()}`,
      timestamp: new Date(timestampMs).toISOString(),
      units,
      carbUnits: units,
      correctionUnits: 0,
      carbsGrams: 0,
      glucoseMgDl: settings.targetGlucose,
      notes: notes || 'Bolus manual previo',
    };
    setBolusHistory((prev) => [newBolus, ...prev]);
    syncBolusToFirestore(user?.uid, newBolus);
  };

  // Delete bolus from history
  const handleDeleteBolus = (id: string) => {
    setBolusHistory((prev) => prev.filter((b) => b.id !== id));
    deleteBolusFromFirestore(user?.uid, id);
  };

  // Delete meal from log and permanent history
  const handleDeleteMeal = (id: string) => {
    setDailyMeals((prev) => prev.filter((m) => m.id !== id));
    setAllMealsHistory((prev) => prev.filter((m) => m.id !== id));
    deleteMealFromFirestore(user?.uid, id);
  };

  // Day type switch (recalculates goals without touching any logged meals/macros)
  const handleChangeDayType = (dayType: 'weekday' | 'weekend') => {
    setSettings((prev) => {
      const updated = { ...prev, dayType };
      saveUserSettings(updated);
      syncSettingsToFirestore(user?.uid, updated);
      return updated;
    });
  };

  // Country switch (changes active official databases and commercial catalog)
  const handleChangeCountry = (countryCode: CountryCode) => {
    setSettings((prev) => {
      const updated = { ...prev, countryCode };
      saveUserSettings(updated);
      syncSettingsToFirestore(user?.uid, updated);
      return updated;
    });
  };

  // Workout state update (done / not done toggles)
  const handleUpdateDailyWorkout = (updatedWorkout: UserSettings['dailyWorkout']) => {
    setSettings((prev) => {
      const updated = {
        ...prev,
        dailyWorkout: updatedWorkout,
      };
      saveUserSettings(updated);
      syncSettingsToFirestore(user?.uid, updated);
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-slate-950">

      {/* Top Header */}
      <Header
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        iobValue={totalIOB}
        onOpenIobModal={() => setIsIobModalOpen(true)}
        onOpenTutorial={() => setIsTutorialOpen(true)}
        onOpenVideoDemo={() => {
          setDemoChapterId('insulin_calculator');
          setIsVideoDemoOpen(true);
        }}
      />

      {/* Pestaña Lateral Flotante de Atajos Rápidos a cada sección + Botón de Subir (solo en Modo Completo) */}
      {settings.interfaceMode !== 'simple' && (
        <FloatingQuickNavMenu
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenIobModal={() => setIsIobModalOpen(true)}
          onOpenTutorial={() => setIsTutorialOpen(true)}
        />
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Aviso Llamativo de Mejora Continua y Reporte de Errores en la Caja de Comentarios */}
        <TopBetaDisclaimerBanner />

        {/* PLAN 3: Banner Superior VIP del Auspiciante Principal del País (si hay uno activo) */}
        <TopVipSponsorBanner
          sponsors={sponsorsList}
          countryCode={settings.countryCode || 'AR'}
          onRecordClick={handleRecordSponsorClick}
        />

        {/* PLAN 2 (Dispositivos/Sensores): Auspiciante Destacado en Sensores/Insumos del País (solo en modo completo) */}
        {settings.interfaceMode !== 'simple' && (
          <ContextualFeaturedSponsorBanner
            sponsors={sponsorsList}
            countryCode={settings.countryCode || 'AR'}
            contextCategory="devices_sensors"
            onRecordClick={handleRecordSponsorClick}
          />
        )}

        {/* Banner de 2ª Dosis de Bolo Dividido Pendiente / Timer en Vivo */}
        <PendingSplitBolusBanner
          pendingSplits={pendingSplits}
          bolusHistory={bolusHistory}
          onConfirmSecondDose={handleConfirmSecondDose}
          onDismissSplit={handleDismissSplit}
          onPostponeSplit={handlePostponeSplit}
          onTogglePauseSplit={handleTogglePauseSplit}
          onPostponeAllSplits={handlePostponeAllSplits}
          onRequestSafetyCheck={(split) => setSafetyCheckTargetSplit(split)}
        />

        {/* Core Calculator */}
        <section id="section-insulin-calculator">
          <SectionHeaderBar sectionId="insulin_calculator" settings={settings} />
          <InsulinCalculatorCard
            settings={settings}
            iobValue={totalIOB}
            dailyMeals={dailyMeals}
            plateItems={plateItems}
            manualCarbs={manualCarbs}
            setManualCarbs={setManualCarbs}
            onClearPlate={handleClearPlate}
            pendingSplits={pendingSplits}
            onPostponeSplit={handlePostponeSplit}
            onTogglePauseSplit={handleTogglePauseSplit}
            onDismissSplit={handleDismissSplit}
            onConfirmSecondDose={handleConfirmSecondDose}
            onRequestSafetyCheck={(split) => setSafetyCheckTargetSplit(split)}
            onUpdateSettings={handleSaveSettings}
            onLogBolusAndMeal={handleLogBolusAndMeal}
          />
        </section>

        {/* Solo en Modo Completo se muestran las secciones adicionales (Alimentos, Actividad, Historial, Factores, etc.) */}
        {settings.interfaceMode !== 'simple' && (
          <>
            {/* Food Search & AI Photo/Text Analyzer */}
            <section id="section-food-analyzer" className="space-y-3">
          <SectionHeaderBar sectionId="food_analyzer" settings={settings} />
          {/* PLAN 2 (Nutrición/Comidas): Auspiciante Destacado en Dietéticas / Sin TACC / Keto del País */}
          <ContextualFeaturedSponsorBanner
            sponsors={sponsorsList}
            countryCode={settings.countryCode || 'AR'}
            contextCategory="nutrition_food"
            onRecordClick={handleRecordSponsorClick}
          />

          <FoodSearchAndAnalyzer
            settings={settings}
            currentGlucose={settings.targetGlucose}
            iobValue={totalIOB}
            onAddFoodToPlate={handleAddFoodToPlate}
            onApplyAiAnalysisToPlate={handleApplyAiAnalysisToPlate}
            onChangeCountry={handleChangeCountry}
            onUpdateSettings={handleSaveSettings}
          />
        </section>

        {/* Acordeón 1: Ejercicio y Actividad Física */}
        <section id="section-daily-workout" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏃</span>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Ejercicio y Actividad Física</h3>
                <p className="text-xs text-slate-400">Ajuste de dosis y prevención de hipoglucemias al entrenar</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsWorkoutSectionOpen(!isWorkoutSectionOpen)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 text-xs font-medium rounded-xl border border-slate-700 transition flex items-center gap-1"
            >
              {isWorkoutSectionOpen ? 'Ocultar ▲' : 'Ver Sección ▼'}
            </button>
          </div>
          {isWorkoutSectionOpen && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              <SectionHeaderBar sectionId="workout_routine" settings={settings} />
              <DailyWorkoutTrackerCard
                settings={settings}
                onUpdateWorkout={handleUpdateDailyWorkout}
                onUpdateWeightKg={(newWeightKg) => {
                  handleSaveSettings({
                    ...settings,
                    weightKg: newWeightKg,
                  });
                }}
              />
            </div>
          )}
        </section>

        {/* Acordeón 2: Resumen del Día (Renal y Calorías) */}
        <section id="section-daily-tracker" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Resumen y Acumulado del Día</h3>
                <p className="text-xs text-slate-400">Control de carbohidratos, calorías y cargas renales diarias</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsTrackerSectionOpen(!isTrackerSectionOpen)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 text-xs font-medium rounded-xl border border-slate-700 transition flex items-center gap-1"
            >
              {isTrackerSectionOpen ? 'Ocultar ▲' : 'Ver Sección ▼'}
            </button>
          </div>
          {isTrackerSectionOpen && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              <SectionHeaderBar sectionId="daily_tracker" settings={settings} />
              <DailyRenalAndCalorieTracker
                settings={settings}
                dailyMeals={dailyMeals}
                onResetDay={handleResetDay}
                onDeleteMeal={handleDeleteMeal}
                onOpenAddMealModal={() => setIsAddMealOpen(true)}
                onUpdateSettings={handleSaveSettings}
              />
            </div>
          )}
        </section>

        {/* Acordeón 3: Historial Permanente de Comidas y Bolus */}
        <section id="section-permanent-history" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">📖</span>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Historial de Comidas y Bolus</h3>
                <p className="text-xs text-slate-400">Registro histórico guardado en tu dispositivo y nube</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsHistorySectionOpen(!isHistorySectionOpen)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 text-xs font-medium rounded-xl border border-slate-700 transition flex items-center gap-1"
            >
              {isHistorySectionOpen ? 'Ocultar ▲' : 'Ver Sección ▼'}
            </button>
          </div>
          {isHistorySectionOpen && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              <SectionHeaderBar sectionId="permanent_history" settings={settings} />
              <PermanentMealHistory
                allMeals={allMealsHistory}
                bolusHistory={bolusHistory}
                onDeleteMeal={handleDeleteMeal}
                onOpenDriveSync={() => setIsDriveSyncOpen(true)}
              />
            </div>
          )}
        </section>

        {/* Acordeón 4: Guía de Factores Glicémicos (Los 42 Factores) */}
        <section id="section-glycemic-factors" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">📚</span>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Guía de los 42 Factores Glicémicos</h3>
                <p className="text-xs text-slate-400">Biblioteca interactiva para entender por qué sube o baja el azúcar</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsFactorsSectionOpen(!isFactorsSectionOpen)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 text-xs font-medium rounded-xl border border-slate-700 transition flex items-center gap-1"
            >
              {isFactorsSectionOpen ? 'Ocultar ▲' : 'Ver Sección ▼'}
            </button>
          </div>
          {isFactorsSectionOpen && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              <SectionHeaderBar sectionId="glycemic_factors" settings={settings} />
              <GlycemicFactorsPanel
                settings={settings}
                onUpdateWorkout={handleUpdateDailyWorkout}
              />
            </div>
          )}
        </section>

        {/* Acordeón 5: Comunidad y Buzón de Sugerencias */}
        <section id="section-community-reviews" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">💬</span>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Comunidad y Opiniones</h3>
                <p className="text-xs text-slate-400">Deja tus comentarios y sugerencias para el equipo</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCommunitySectionOpen(!isCommunitySectionOpen)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 text-xs font-medium rounded-xl border border-slate-700 transition flex items-center gap-1"
            >
              {isCommunitySectionOpen ? 'Ocultar ▲' : 'Ver Sección ▼'}
            </button>
          </div>
          {isCommunitySectionOpen && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              <SectionHeaderBar sectionId="community_reviews" settings={settings} />
              <CommunityReviewsAndFeedbackCard settings={settings} />
            </div>
          )}
        </section>

        {/* Acordeón 6: Auspiciantes y Donaciones */}
        <section id="section-sponsors-donations" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤝</span>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Auspiciantes y Colaboración</h3>
                <p className="text-xs text-slate-400">Directorio de insumos del país y apoyo al proyecto</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSponsorsSectionOpen(!isSponsorsSectionOpen)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 text-xs font-medium rounded-xl border border-slate-700 transition flex items-center gap-1"
            >
              {isSponsorsSectionOpen ? 'Ocultar ▲' : 'Ver Sección ▼'}
            </button>
          </div>
          {isSponsorsSectionOpen && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              <SectionHeaderBar sectionId="sponsors_donations" settings={settings} />
              <SponsorsAndDonationsHub
                countryCode={settings.countryCode || 'AR'}
                monetizationConfig={monetizationConfig}
                sponsors={sponsorsList}
                onSaveMonetizationConfig={handleSaveMonetizationConfig}
                onUpsertSponsor={handleUpsertSponsor}
                onDeleteSponsor={handleDeleteSponsor}
                onRecordSponsorClick={handleRecordSponsorClick}
              />
            </div>
          )}
        </section>
          </>
        )}

      </main>

      {/* Modals */}
      <AddMealModal
        isOpen={isAddMealOpen}
        onClose={() => setIsAddMealOpen(false)}
        settings={settings}
        onAddMeal={handleAddDirectMeal}
      />

      <ActiveInsulinTrackerModal
        isOpen={isIobModalOpen}
        onClose={() => setIsIobModalOpen(false)}
        bolusHistory={bolusHistory}
        settings={settings}
        onAddManualBolus={handleAddManualBolus}
        onDeleteBolus={handleDeleteBolus}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenDriveSync={() => setIsDriveSyncOpen(true)}
      />

      <ResetDayModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirmReset={handleConfirmResetDay}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Modal de Sincronización y Respaldo Híbrido en Google Drive */}
      <GoogleDriveSyncModal
        isOpen={isDriveSyncOpen}
        onClose={() => setIsDriveSyncOpen(false)}
        dailyMeals={dailyMeals}
        allMealsHistory={allMealsHistory}
        bolusHistory={bolusHistory}
        settings={settings}
        onRestoreBackup={(backupData) => {
          if (backupData.settings) setSettings(backupData.settings);
          if (backupData.dailyMeals) setDailyMeals(backupData.dailyMeals);
          if (backupData.allMealsHistory) setAllMealsHistory(backupData.allMealsHistory);
          if (backupData.bolusHistory) setBolusHistory(backupData.bolusHistory);
        }}
      />

      {/* Modal de Chequeo de Seguridad con Sensor antes de 2ª Dosis de Bolo Dividido */}
      <SecondDoseSafetyCheckModal
        isOpen={Boolean(safetyCheckTargetSplit)}
        split={safetyCheckTargetSplit}
        isf={settings.isf}
        targetGlucose={settings.targetGlucose}
        iobValue={totalIOB}
        roundStep={settings.roundDoseTo}
        onClose={() => setSafetyCheckTargetSplit(null)}
        onApplyDose={(splitId, finalUnits) => handleConfirmSecondDose(splitId, finalUnits)}
        onPostpone={(splitId, minutes) => {
          handlePostponeSplit(splitId, minutes);
          setSafetyCheckTargetSplit(null);
        }}
        onTogglePauseSplit={(splitId) => {
          handleTogglePauseSplit(splitId);
          setSafetyCheckTargetSplit(null);
        }}
        onCancelSplit={(splitId) => {
          handleDismissSplit(splitId);
          setSafetyCheckTargetSplit(null);
        }}
      />

      {/* PASO AL ABRIR POR PRIMERA VEZ: Pantalla de Selección de Modalidades */}
      {!settings.isProfileConfigured && (
        <InitialSetupModal
          currentLanguage={settings.appLanguage}
          initialGlucoseMode={settings.glucoseMode || 'cgm_nfc'}
          initialInsulinMode={settings.insulinMode || 'manual_pen'}
          initialSensorBrand={settings.sensorBrand || 'freestyle_libre'}
          initialRapidInsulinBrand={settings.rapidInsulinBrand || 'novorapid'}
          initialDosingMode={settings.dosingMode || 'carb_counting'}
          initialFixedMealDoses={settings.fixedMealDoses}
          initialFixedCorrectionMethod={settings.fixedCorrectionMethod || 'sliding_scale'}
          initialCorrectionScale={settings.correctionScale}
          initialIcr={settings.icr || 10}
          initialIsf={settings.isf || 30}
          initialWeightKg={settings.weightKg || 65}
          initialMedicalConditions={settings.medicalConditions}
          onSaveProfile={(glucoseMode, insulinMode, medicalConditions, sensorBrand, extraParams) => {
            const chosenBrand = sensorBrand || settings.sensorBrand || 'freestyle_libre';
            const defaultSensorDays = DEFAULT_SENSOR_DURATION_BY_BRAND[chosenBrand] || 14;
            const todayKey = getLogicalDateKey(settings.dayCutoffHour ?? 2, new Date());

            const updated: UserSettings = {
              ...settings,
              interfaceMode: extraParams?.interfaceMode || settings.interfaceMode || 'simple',
              glucoseMode,
              insulinMode,
              sensorBrand: chosenBrand,
              rapidInsulinBrand: extraParams?.rapidInsulinBrand || settings.rapidInsulinBrand || 'novorapid',
              dosingMode: extraParams?.dosingMode || settings.dosingMode || 'carb_counting',
              fixedMealDoses: extraParams?.fixedMealDoses || settings.fixedMealDoses,
              fixedCorrectionMethod:
                extraParams?.fixedCorrectionMethod || settings.fixedCorrectionMethod || 'sliding_scale',
              correctionScale: extraParams?.correctionScale || settings.correctionScale,
              icr: extraParams?.icr || settings.icr || 10,
              isf: extraParams?.isf || settings.isf || 30,
              weightKg: extraParams?.weightKg || settings.weightKg || 65,
              medicalConditions: medicalConditions || settings.medicalConditions,
              enableRenalProteinLimits:
                medicalConditions?.renal !== undefined
                  ? medicalConditions.renal
                  : settings.enableRenalProteinLimits,
              sensorTracker: settings.sensorTracker || {
                enabled: glucoseMode !== 'capillary',
                targetDurationDays: defaultSensorDays,
                currentDayOfWear: 1,
                placedDate: todayKey,
              },
              pumpSetTracker: settings.pumpSetTracker || {
                enabled: insulinMode === 'pump',
                targetDurationDays: 3,
                currentDayOfWear: 1,
                placedDate: todayKey,
              },
              isProfileConfigured: true,
            };
            setSettings(updated);
            saveUserSettings(updated);
            syncSettingsToFirestore(user?.uid, updated);
            setIsTutorialOpen(true);
          }}
        />
      )}

      {/* PASO 3 AL ABRIR POR PRIMERA VEZ: Guía / Tutorial Interactivo */}
      <InteractiveTutorialGuideModal
        isOpen={isTutorialOpen && Boolean(settings.isProfileConfigured)}
        onClose={handleCloseTutorial}
        settings={settings}
      />

      {/* Reproductor de Video Demostración Animado en Vivo */}
      <LiveAppVideoDemoModal
        isOpen={isVideoDemoOpen}
        onClose={() => setIsVideoDemoOpen(false)}
        initialChapterId={demoChapterId}
        settings={settings}
      />

    </div>
  );
}
