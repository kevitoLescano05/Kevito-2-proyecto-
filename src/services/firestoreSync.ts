import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  writeBatch 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { DailyMealLogItem, BolusRecord, UserSettings, FoodItem, CommunityReview } from '../types';

/**
 * Sanitiza recursivamente cualquier objeto para Firestore eliminando propiedades `undefined`
 */
function sanitizeForFirestore<T>(data: T): any {
  if (data === null || data === undefined) {
    return null;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)).filter((item) => item !== undefined);
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleanObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleanObj[key] = sanitizeForFirestore(value);
      }
    }
    return cleanObj;
  }
  return data;
}

const DEVICE_GUEST_ID_KEY = 't1d_device_guest_session_uid';

function getOrCreateDeviceGuestId(): string {
  if (typeof localStorage !== 'undefined') {
    try {
      let id = localStorage.getItem(DEVICE_GUEST_ID_KEY);
      if (!id) {
        id = `guest_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
        localStorage.setItem(DEVICE_GUEST_ID_KEY, id);
      }
      return id;
    } catch {
      // ignore storage errors
    }
  }
  return 'guest_isolated_fallback';
}

/**
 * Retorna el path base para un usuario específico o un identificador único por dispositivo si entra sin cuenta
 */
function getUserPath(userId?: string) {
  const effectiveUid = userId || auth?.currentUser?.uid;
  if (effectiveUid) {
    return `users/${effectiveUid}`;
  }
  return `guests/${getOrCreateDeviceGuestId()}`;
}

/**
 * Escucha en tiempo real los alimentos favoritos en Firestore por usuario
 */
export function subscribeToFavorites(
  userId: string | undefined | ((favorites: FoodItem[]) => void),
  onData?: (favorites: FoodItem[]) => void,
  onError?: (err: any) => void
) {
  const actualUserId = typeof userId === 'string' ? userId : auth.currentUser?.uid;
  const callback = typeof userId === 'function' ? userId : onData!;
  const base = getUserPath(actualUserId);
  const q = query(collection(db, `${base}/favorite_foods`));
  return onSnapshot(
    q,
    (snapshot) => {
      const favs: FoodItem[] = [];
      snapshot.forEach((docSnap) => {
        const item = docSnap.data() as FoodItem;
        if (item && (item.id || item.name)) {
          favs.push({
            ...item,
            id: item.id || docSnap.id,
          });
        }
      });
      callback(favs);
    },
    (err) => {
      if (err?.code === 'unavailable') {
        console.warn('Firestore operating in offline cache mode:', err.message);
      } else {
        console.error('Error fetching Firestore favorites:', err);
      }
      if (onError) onError(err);
    }
  );
}

/**
 * Guarda o actualiza un alimento favorito en Firestore
 */
export async function syncFavoriteToFirestore(
  userIdOrFood: string | undefined | FoodItem,
  maybeFood?: FoodItem
): Promise<void> {
  try {
    const userId = typeof userIdOrFood === 'string' ? userIdOrFood : undefined;
    const food = typeof userIdOrFood === 'object' ? userIdOrFood : maybeFood;
    if (!food || !food.id) return;
    const base = getUserPath(userId);
    const docRef = doc(db, `${base}/favorite_foods`, food.id);
    await setDoc(docRef, sanitizeForFirestore(food), { merge: true });
  } catch (e) {
    console.error('Error saving favorite to Firestore:', e);
  }
}

/**
 * Sube una lista completa de alimentos favoritos a Firestore en lote (batch)
 */
export async function syncAllFavoritesToFirestore(
  userIdOrFavs: string | undefined | FoodItem[],
  maybeFavs?: FoodItem[]
): Promise<void> {
  try {
    const userId = typeof userIdOrFavs === 'string' ? userIdOrFavs : undefined;
    const favs = Array.isArray(userIdOrFavs) ? userIdOrFavs : maybeFavs;
    if (!favs || favs.length === 0) return;
    const base = getUserPath(userId);
    const batch = writeBatch(db);
    favs.forEach((food) => {
      if (food && food.id) {
        const docRef = doc(db, `${base}/favorite_foods`, food.id);
        batch.set(docRef, sanitizeForFirestore(food), { merge: true });
      }
    });
    await batch.commit();
  } catch (e) {
    console.error('Error batch syncing favorites to Firestore:', e);
  }
}

/**
 * Elimina un alimento favorito de Firestore
 */
export async function deleteFavoriteFromFirestore(
  userIdOrFoodId: string | undefined,
  maybeFoodId?: string
): Promise<void> {
  try {
    let userId: string | undefined = undefined;
    let foodId = userIdOrFoodId;
    if (maybeFoodId) {
      userId = userIdOrFoodId;
      foodId = maybeFoodId;
    }
    if (!foodId) return;
    const base = getUserPath(userId);
    const docRef = doc(db, `${base}/favorite_foods`, foodId);
    await deleteDoc(docRef);
  } catch (e) {
    console.error('Error deleting favorite from Firestore:', e);
  }
}

/**
 * Guarda o actualiza los ajustes del usuario en Firestore
 */
export async function syncSettingsToFirestore(
  userIdOrSettings: string | undefined | UserSettings,
  maybeSettings?: UserSettings
): Promise<void> {
  try {
    const userId = typeof userIdOrSettings === 'string' ? userIdOrSettings : undefined;
    const settings = typeof userIdOrSettings === 'object' ? userIdOrSettings : maybeSettings;
    if (!settings) return;
    const base = getUserPath(userId);
    const docRef = doc(db, `${base}/config/user_settings`);
    await setDoc(docRef, sanitizeForFirestore(settings), { merge: true });
  } catch (e) {
    console.error('Error saving settings to Firestore:', e);
  }
}

/**
 * Escucha en tiempo real los ajustes del usuario en Firestore
 */
export function subscribeToSettings(
  userId: string | undefined | ((settings: UserSettings) => void),
  onData?: (settings: UserSettings) => void,
  onError?: (err: any) => void
) {
  const actualUserId = typeof userId === 'string' ? userId : auth.currentUser?.uid;
  const callback = typeof userId === 'function' ? userId : onData!;
  const base = getUserPath(actualUserId);
  const docRef = doc(db, `${base}/config/user_settings`);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as UserSettings);
      }
    },
    (err) => {
      if (err?.code === 'unavailable') {
        console.warn('Firestore operating in offline cache mode:', err.message);
      } else {
        console.error('Error fetching Firestore settings:', err);
      }
      if (onError) onError(err);
    }
  );
}

/**
 * Escucha en tiempo real las comidas guardadas en Firestore
 */
export function subscribeToMeals(
  userId: string | undefined | ((meals: DailyMealLogItem[]) => void),
  onData?: (meals: DailyMealLogItem[]) => void,
  onError?: (err: any) => void
) {
  const actualUserId = typeof userId === 'string' ? userId : auth.currentUser?.uid;
  const callback = typeof userId === 'function' ? userId : onData!;
  const base = getUserPath(actualUserId);
  const q = query(collection(db, `${base}/daily_meals`), orderBy('timestamp', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const meals: DailyMealLogItem[] = [];
      snapshot.forEach((docSnap) => {
        meals.push(docSnap.data() as DailyMealLogItem);
      });
      callback(meals);
    },
    (err) => {
      if (err?.code === 'unavailable') {
        console.warn('Firestore operating in offline cache mode:', err.message);
      } else {
        console.error('Error fetching Firestore meals:', err);
      }
      if (onError) onError(err);
    }
  );
}

/**
 * Guarda o actualiza una comida en Firestore
 */
export async function syncMealToFirestore(
  userIdOrMeal: string | undefined | DailyMealLogItem,
  maybeMeal?: DailyMealLogItem
): Promise<void> {
  try {
    const userId = typeof userIdOrMeal === 'string' ? userIdOrMeal : undefined;
    const meal = typeof userIdOrMeal === 'object' ? userIdOrMeal : maybeMeal;
    if (!meal || !meal.id) return;
    const base = getUserPath(userId);
    const docRef = doc(db, `${base}/daily_meals`, meal.id);
    await setDoc(docRef, sanitizeForFirestore(meal), { merge: true });
  } catch (e: any) {
    if (e?.code === 'unavailable') {
      console.warn('Firestore saving meal in offline queue mode');
    } else {
      console.error('Error saving meal to Firestore:', e);
    }
  }
}

/**
 * Elimina una comida de Firestore
 */
export async function deleteMealFromFirestore(
  userIdOrMealId: string | undefined,
  maybeMealId?: string
): Promise<void> {
  try {
    let userId: string | undefined = undefined;
    let mealId = userIdOrMealId;
    if (maybeMealId) {
      userId = userIdOrMealId;
      mealId = maybeMealId;
    }
    if (!mealId) return;
    const base = getUserPath(userId);
    const docRef = doc(db, `${base}/daily_meals`, mealId);
    await deleteDoc(docRef);
  } catch (e: any) {
    if (e?.code === 'unavailable') {
      console.warn('Firestore deleting meal in offline queue mode');
    } else {
      console.error('Error deleting meal from Firestore:', e);
    }
  }
}

/**
 * Escucha en tiempo real los bolus de insulina registrados
 */
export function subscribeToBoluses(
  userId: string | undefined | ((boluses: BolusRecord[]) => void),
  onData?: (boluses: BolusRecord[]) => void,
  onError?: (err: any) => void
) {
  const actualUserId = typeof userId === 'string' ? userId : auth.currentUser?.uid;
  const callback = typeof userId === 'function' ? userId : onData!;
  const base = getUserPath(actualUserId);
  const q = query(collection(db, `${base}/bolus_history`), orderBy('timestamp', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const boluses: BolusRecord[] = [];
      snapshot.forEach((docSnap) => {
        boluses.push(docSnap.data() as BolusRecord);
      });
      callback(boluses);
    },
    (err) => {
      if (err?.code === 'unavailable') {
        console.warn('Firestore operating in offline cache mode:', err.message);
      } else {
        console.error('Error fetching Firestore boluses:', err);
      }
      if (onError) onError(err);
    }
  );
}

/**
 * Guarda o actualiza un registro de dosis de Novorapid en Firestore
 */
export async function syncBolusToFirestore(
  userIdOrBolus: string | undefined | BolusRecord,
  maybeBolus?: BolusRecord
): Promise<void> {
  try {
    const userId = typeof userIdOrBolus === 'string' ? userIdOrBolus : undefined;
    const bolus = typeof userIdOrBolus === 'object' ? userIdOrBolus : maybeBolus;
    if (!bolus || !bolus.id) return;
    const base = getUserPath(userId);
    const docRef = doc(db, `${base}/bolus_history`, bolus.id);
    await setDoc(docRef, sanitizeForFirestore(bolus), { merge: true });
  } catch (e) {
    console.error('Error saving bolus to Firestore:', e);
  }
}

/**
 * Elimina un registro de bolus de Firestore
 */
export async function deleteBolusFromFirestore(
  userIdOrBolusId: string | undefined,
  maybeBolusId?: string
): Promise<void> {
  try {
    let userId: string | undefined = undefined;
    let bolusId = userIdOrBolusId;
    if (maybeBolusId) {
      userId = userIdOrBolusId;
      bolusId = maybeBolusId;
    }
    if (!bolusId) return;
    const base = getUserPath(userId);
    const docRef = doc(db, `${base}/bolus_history`, bolusId);
    await deleteDoc(docRef);
  } catch (e) {
    console.error('Error deleting bolus from Firestore:', e);
  }
}

/**
 * Resetea el día en Firestore (cuando el usuario toca explícitamente "Nuevo Día")
 */
export async function resetDailyMealsInFirestore(
  userIdOrArchive?: string | boolean,
  maybeArchive: boolean = true
): Promise<void> {
  try {
    const userId = typeof userIdOrArchive === 'string' ? userIdOrArchive : undefined;
    const archive = typeof userIdOrArchive === 'boolean' ? userIdOrArchive : maybeArchive;
    const base = getUserPath(userId);
    const snap = await getDocs(collection(db, `${base}/daily_meals`));
    const batch = writeBatch(db);
    snap.forEach((d) => {
      if (archive) {
        batch.update(d.ref, { isArchived: true });
      } else {
        batch.delete(d.ref);
      }
    });
    await batch.commit();
  } catch (e) {
    console.error('Error resetting meals in Firestore:', e);
  }
}

const LEGACY_LOCAL_REVIEW_KEYS = [
  't1d_community_reviews_cache_v3',
  't1d_community_reviews_cache_v2',
  't1d_community_reviews_cache_v1',
  't1d_community_reviews',
  'insu_calc_community_reviews',
];

function collectAllLocallyCachedReviews(): CommunityReview[] {
  if (typeof localStorage === 'undefined') return [];
  const collected: CommunityReview[] = [];
  for (const key of LEGACY_LOCAL_REVIEW_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && typeof item === 'object' && item.id) {
              collected.push(item as CommunityReview);
            }
          }
        }
      }
    } catch {
      // ignore invalid JSON
    }
  }
  return collected;
}

/**
 * Escucha en tiempo real las reseñas, comentarios y reportes de fallas de la comunidad global.
 * Combina:
 * 1. Sincronización automática de cualquier comentario guardado localmente en el navegador del usuario hacia el servidor central (/api/community-reviews/sync-batch).
 * 2. Canal en vivo Server-Sent Events (/api/community-reviews/stream) + sondeo periódico de respaldo cada 4 segundos para actualización instantánea en todos los dispositivos y cuentas.
 * 3. Listener de Firestore en paralelo si está activo.
 */
export function subscribeToCommunityReviews(
  onData: (reviews: CommunityReview[], deletedIds?: string[]) => void,
  onError?: (err: any) => void
) {
  let isDisposed = false;
  let eventSource: EventSource | null = null;
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  const pushLocalAndFetchFromServer = async () => {
    if (typeof window === 'undefined' || isDisposed) return;
    try {
      const localCached = collectAllLocallyCachedReviews();
      const response =
        localCached.length > 0
          ? await fetch('/api/community-reviews/sync-batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reviews: localCached }),
            })
          : await fetch('/api/community-reviews');

      if (!response.ok || isDisposed) return;
      const data = await response.json();
      if (Array.isArray(data?.reviews)) {
        onData(data.reviews, Array.isArray(data?.deletedIds) ? data.deletedIds : []);
      }
    } catch (err) {
      // ignore transient network error
    }
  };

  const fetchLatestFromServer = async () => {
    if (typeof window === 'undefined' || isDisposed) return;
    try {
      const response = await fetch('/api/community-reviews');
      if (!response.ok || isDisposed) return;
      const data = await response.json();
      if (Array.isArray(data?.reviews)) {
        onData(data.reviews, Array.isArray(data?.deletedIds) ? data.deletedIds : []);
      }
    } catch {
      // ignore transient network error
    }
  };

  if (typeof window !== 'undefined') {
    // 1. Subir cualquier comentario local atrapado y traer la lista global inmediatamente
    pushLocalAndFetchFromServer();

    // 2. Abrir canal en tiempo real (Server-Sent Events) para recibir nuevos comentarios al instante
    if (typeof EventSource !== 'undefined') {
      try {
        eventSource = new EventSource('/api/community-reviews/stream');
        eventSource.onmessage = (event) => {
          if (isDisposed) return;
          try {
            const parsed = JSON.parse(event.data);
            if (Array.isArray(parsed?.reviews)) {
              onData(parsed.reviews, Array.isArray(parsed?.deletedIds) ? parsed.deletedIds : []);
            }
          } catch {
            // ignore parse error
          }
        };
      } catch {
        // fallback a polling
      }
    }

    // 3. Respaldo de actualización automática cada 4 segundos y al volver a la pestaña
    pollInterval = setInterval(fetchLatestFromServer, 4000);
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchLatestFromServer();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
  }

  // 4. Listener de Firestore en paralelo (si la API de Firestore está activa en el proyecto)
  let unsubFirestore = () => {};
  try {
    const q = query(collection(db, 'community_reviews'), orderBy('createdAt', 'desc'));
    unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        if (isDisposed) return;
        const reviews: CommunityReview[] = [];
        snapshot.forEach((docSnap) => {
          const item = docSnap.data() as CommunityReview;
          if (item && item.id) {
            reviews.push({
              ...item,
              likedBy: Array.isArray(item.likedBy) ? item.likedBy : [],
              replies: Array.isArray(item.replies) ? item.replies : [],
              reportedBy: Array.isArray(item.reportedBy) ? item.reportedBy : [],
              reportsCount: typeof item.reportsCount === 'number' ? item.reportsCount : 0,
              reportReasons: Array.isArray(item.reportReasons) ? item.reportReasons : [],
            });
          }
        });
        if (reviews.length > 0) {
          onData(reviews);
        }
      },
      (err) => {
        // Silencioso cuando Firestore no está habilitado ya que el servidor central maneja la persistencia en vivo
        if (onError && err?.code !== 'permission-denied' && err?.code !== 'unavailable') {
          onError(err);
        }
      }
    );
  } catch {
    // ignore
  }

  return () => {
    isDisposed = true;
    if (eventSource) {
      eventSource.close();
    }
    if (pollInterval) {
      clearInterval(pollInterval);
    }
    unsubFirestore();
  };
}

/**
 * Publica o actualiza una reseña, respuesta o like en la comunidad global (Servidor Central + Firestore)
 */
export async function saveCommunityReviewToFirestore(review: CommunityReview): Promise<void> {
  if (!review || !review.id) return;
  const cleanReview: CommunityReview = {
    ...review,
    authorName: (review.authorName || 'Usuario').slice(0, 80),
    title: (review.title || '').slice(0, 120),
    text: (review.text || '').slice(0, 1500),
  };

  // 1. Guardar inmediatamente en el servidor central para que les aparezca a todos los usuarios en vivo
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/community-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review: cleanReview }),
      });
    } catch (e) {
      console.warn('Aviso al sincronizar comentario con el servidor central:', e);
    }
  }

  // 2. Intentar guardar también en Firestore si está disponible
  try {
    const docRef = doc(db, 'community_reviews', cleanReview.id);
    await setDoc(docRef, sanitizeForFirestore(cleanReview), { merge: true });
  } catch {
    // El servidor central ya respaldó el comentario
  }
}

/**
 * Elimina una reseña de la comunidad global (Servidor Central + Firestore)
 */
export async function deleteCommunityReviewFromFirestore(reviewId: string): Promise<void> {
  if (!reviewId) return;

  if (typeof window !== 'undefined') {
    try {
      await fetch(`/api/community-reviews/${encodeURIComponent(reviewId)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Aviso al eliminar comentario del servidor central:', e);
    }
  }

  try {
    const docRef = doc(db, 'community_reviews', reviewId);
    await deleteDoc(docRef);
  } catch {
    // El servidor central ya procesó la baja
  }
}


