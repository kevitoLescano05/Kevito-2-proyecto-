import { FoodItem } from '../types';
import { 
  syncFavoriteToFirestore, 
  syncAllFavoritesToFirestore,
  deleteFavoriteFromFirestore 
} from '../services/firestoreSync';

const STORAGE_KEY_SEARCH_CACHE = 't1d_food_search_cache_v6';
const STORAGE_KEY_FAVORITES = 'insu_calc_user_favorites_v2';
const STORAGE_KEY_FAVORITES_BACKUP = 'insu_calc_user_favorites_master_permanent';
const STORAGE_KEY_DELETED_FAVORITES = 'insu_calc_user_favorites_deleted_ids_v1';

// Legacy keys for seamless automatic data migration
const LEGACY_KEYS = [
  'insu_calc_user_favorites_v2',
  'insu_calc_user_favorites',
  't1d_favorite_foods_v1',
  'user_favorite_foods',
];

export const DEFAULT_FAVORITE_FOODS: FoodItem[] = [];

// Cache helper functions
export function getCachedFoodSearch(query: string): FoodItem[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SEARCH_CACHE);
    if (!raw) return null;
    const cache: Record<string, { timestamp: number; items: FoodItem[] }> = JSON.parse(raw);
    const normalizedKey = query.trim().toLowerCase();
    const entry = cache[normalizedKey];
    if (!entry) return null;

    // Cache valid for 7 days
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - entry.timestamp > SEVEN_DAYS) {
      delete cache[normalizedKey];
      localStorage.setItem(STORAGE_KEY_SEARCH_CACHE, JSON.stringify(cache));
      return null;
    }

    return entry.items;
  } catch (e) {
    console.error('Error reading food search cache:', e);
    return null;
  }
}

export function saveCachedFoodSearch(query: string, items: FoodItem[]): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SEARCH_CACHE);
    const cache: Record<string, { timestamp: number; items: FoodItem[] }> = raw ? JSON.parse(raw) : {};
    const normalizedKey = query.trim().toLowerCase();
    cache[normalizedKey] = {
      timestamp: Date.now(),
      items,
    };

    // Keep only last 50 queries to keep localStorage small
    const keys = Object.keys(cache);
    if (keys.length > 50) {
      const oldestKey = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp)[0];
      delete cache[oldestKey];
    }

    localStorage.setItem(STORAGE_KEY_SEARCH_CACHE, JSON.stringify(cache));
  } catch (e) {
    console.error('Error saving food search cache:', e);
  }
}

// User favorite foods helper functions
export const FAVORITES_UPDATED_EVENT = 't1d_favorites_updated';

export function notifyFavoritesChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FAVORITES_UPDATED_EVENT));
  }
}

/**
 * Normalizes strings for robust food comparison
 */
export function normalizeFoodMatchKey(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if two food items represent the same food item
 */
export function isSameFoodItem(a: { id?: string; name: string }, b: { id?: string; name: string }): boolean {
  if (a.id && b.id && a.id === b.id) return true;
  const keyA = normalizeFoodMatchKey(a.name);
  const keyB = normalizeFoodMatchKey(b.name);
  if (keyA && keyB && keyA === keyB) return true;
  if (keyA && keyB && keyA.length > 6 && keyB.length > 6 && (keyA.includes(keyB) || keyB.includes(keyA))) return true;
  return false;
}

function getDeletedFavoriteIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED_FAVORITES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch {
    // Ignore error
  }
  return new Set();
}

function recordDeletedFavoriteId(id: string) {
  try {
    const set = getDeletedFavoriteIds();
    set.add(id);
    localStorage.setItem(STORAGE_KEY_DELETED_FAVORITES, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore error
  }
}

function unmarkDeletedFavoriteId(id: string) {
  try {
    const set = getDeletedFavoriteIds();
    if (set.has(id)) {
      set.delete(id);
      localStorage.setItem(STORAGE_KEY_DELETED_FAVORITES, JSON.stringify(Array.from(set)));
    }
  } catch {
    // Ignore error
  }
}

/**
 * Reads user favorites with multi-tier fallback and automatic legacy recovery
 */
export function getUserFavorites(): FoodItem[] {
  try {
    // 1. Try primary storage key
    const primaryRaw = localStorage.getItem(STORAGE_KEY_FAVORITES);
    if (primaryRaw) {
      const parsed = JSON.parse(primaryRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // 2. Try permanent backup storage key
    const backupRaw = localStorage.getItem(STORAGE_KEY_FAVORITES_BACKUP);
    if (backupRaw) {
      const parsed = JSON.parse(backupRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Restore to primary
        localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(parsed));
        return parsed;
      }
    }

    // 3. Try legacy keys migration
    for (const key of LEGACY_KEYS) {
      const legacyRaw = localStorage.getItem(key);
      if (legacyRaw) {
        try {
          const parsed = JSON.parse(legacyRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            saveUserFavorites(parsed, false);
            return parsed;
          }
        } catch {
          // Continue to next key
        }
      }
    }

    return [];
  } catch (e) {
    console.error('Error loading favorite foods:', e);
    return [];
  }
}

/**
 * Saves user favorites to both primary and permanent master backup keys
 */
export function saveUserFavorites(favorites: FoodItem[], notify: boolean = true): void {
  try {
    const serialized = JSON.stringify(favorites);
    const existing = localStorage.getItem(STORAGE_KEY_FAVORITES);
    if (existing === serialized) {
      return; // No change, do not trigger updates or events
    }
    localStorage.setItem(STORAGE_KEY_FAVORITES, serialized);
    if (favorites.length > 0) {
      localStorage.setItem(STORAGE_KEY_FAVORITES_BACKUP, serialized);
    }
    if (notify) {
      notifyFavoritesChanged();
    }
  } catch (e) {
    console.error('Error saving favorite foods:', e);
  }
}

// Track synced items in memory to prevent duplicate network requests
const uploadedFoodIdsInMemory = new Set<string>();

/**
 * Merge remote favorites safely without ever wiping local data or causing loop
 */
export function mergeIncomingRemoteFavorites(
  remoteFavs: FoodItem[],
  userId?: string
): FoodItem[] {
  const localFavs = getUserFavorites();
  const deletedIds = getDeletedFavoriteIds();

  // If remote snapshot is empty:
  if (!remoteFavs || remoteFavs.length === 0) {
    if (localFavs.length > 0) {
      const unsynced = localFavs.filter((f) => !uploadedFoodIdsInMemory.has(f.id));
      if (unsynced.length > 0) {
        unsynced.forEach((f) => uploadedFoodIdsInMemory.add(f.id));
        syncAllFavoritesToFirestore(userId, unsynced);
      }
    }
    return localFavs;
  }

  // Filter out any remote items that were explicitly deleted by the user on this device
  const validRemote = remoteFavs.filter((r) => r && r.id && !deletedIds.has(r.id));

  // Merge local and remote uniquely
  const mergedMap = new Map<string, FoodItem>();

  // Add remote items
  validRemote.forEach((food) => {
    if (food && (food.id || food.name)) {
      const id = food.id || `fav-${Date.now()}-${Math.random()}`;
      mergedMap.set(id, { ...food, id });
      uploadedFoodIdsInMemory.add(id);
    }
  });

  // Add local items (if not explicitly deleted)
  const localItemsToUpload: FoodItem[] = [];
  localFavs.forEach((food) => {
    if (food && (food.id || food.name)) {
      const id = food.id || `fav-${Date.now()}-${Math.random()}`;
      if (!deletedIds.has(id)) {
        if (!mergedMap.has(id)) {
          // Check if there is an item with the exact same name
          const existsByName = Array.from(mergedMap.values()).some((m) => isSameFoodItem(m, food));
          if (!existsByName) {
            mergedMap.set(id, { ...food, id });
            if (!uploadedFoodIdsInMemory.has(id)) {
              localItemsToUpload.push({ ...food, id });
              uploadedFoodIdsInMemory.add(id);
            }
          }
        }
      }
    }
  });

  const finalMerged = Array.from(mergedMap.values());
  saveUserFavorites(finalMerged, false);

  // If local had new favorites that weren't in Firestore yet, sync them up once
  if (localItemsToUpload.length > 0) {
    syncAllFavoritesToFirestore(userId, localItemsToUpload);
  }

  return finalMerged;
}

export function isFavoriteFood(food: FoodItem, currentFavorites?: FoodItem[]): boolean {
  const list = currentFavorites || getUserFavorites();
  return list.some((f) => isSameFoodItem(f, food));
}

export function toggleFavoriteFood(food: FoodItem, userId?: string): FoodItem[] {
  const current = getUserFavorites();
  const exists = current.some((f) => isSameFoodItem(f, food));
  let updated: FoodItem[];

  if (exists) {
    const target = current.find((f) => isSameFoodItem(f, food));
    const targetId = target?.id || food.id;
    if (targetId) {
      recordDeletedFavoriteId(targetId);
      deleteFavoriteFromFirestore(userId, targetId);
    }
    updated = current.filter((f) => !isSameFoodItem(f, food));
  } else {
    const foodWithId: FoodItem = {
      ...food,
      id: food.id || `fav-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    };
    unmarkDeletedFavoriteId(foodWithId.id);
    uploadedFoodIdsInMemory.add(foodWithId.id);
    updated = [foodWithId, ...current];
    syncFavoriteToFirestore(userId, foodWithId);
  }

  saveUserFavorites(updated, true);
  return updated;
}

export function removeFavoriteFood(foodIdOrName: string, userId?: string): FoodItem[] {
  const current = getUserFavorites();
  const dummy = { id: foodIdOrName, name: foodIdOrName };
  const target = current.find((f) => f.id === foodIdOrName || isSameFoodItem(f, dummy));
  
  const targetId = target?.id || (foodIdOrName.startsWith('fav') ? foodIdOrName : undefined);
  if (targetId) {
    recordDeletedFavoriteId(targetId);
    deleteFavoriteFromFirestore(userId, targetId);
  }

  const updated = current.filter((f) => f.id !== foodIdOrName && !isSameFoodItem(f, dummy));
  
  saveUserFavorites(updated, true);
  return updated;
}

export function updateFavoriteFood(foodId: string, updates: Partial<FoodItem>, userId?: string): FoodItem[] {
  const current = getUserFavorites();
  const updated = current.map((f) => {
    if (f.id === foodId) {
      const merged = { ...f, ...updates };
      syncFavoriteToFirestore(userId, merged);
      return merged;
    }
    return f;
  });
  saveUserFavorites(updated, true);
  return updated;
}

export function addCustomFavoriteFood(food: FoodItem, userId?: string): FoodItem[] {
  const current = getUserFavorites();
  const foodWithId: FoodItem = {
    ...food,
    id: food.id || `fav-custom-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  };
  
  unmarkDeletedFavoriteId(foodWithId.id);
  uploadedFoodIdsInMemory.add(foodWithId.id);
  const existsIdx = current.findIndex((f) => isSameFoodItem(f, foodWithId));
  let updated: FoodItem[];
  
  if (existsIdx >= 0) {
    updated = [...current];
    updated[existsIdx] = foodWithId;
  } else {
    updated = [foodWithId, ...current];
  }
  
  syncFavoriteToFirestore(userId, foodWithId);
  saveUserFavorites(updated, true);
  return updated;
}
