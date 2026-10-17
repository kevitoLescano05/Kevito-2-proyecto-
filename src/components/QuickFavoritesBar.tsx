import React, { useEffect, useState } from 'react';
import { FoodItem } from '../types';
import {
  getUserFavorites,
  saveUserFavorites,
  removeFavoriteFood,
  addCustomFavoriteFood,
  mergeIncomingRemoteFavorites,
  FAVORITES_UPDATED_EVENT,
} from '../utils/foodCacheAndFavorites';
import {
  subscribeToFavorites,
} from '../services/firestoreSync';
import { useAuth } from '../context/AuthContext';
import {
  Star,
  Sparkles,
  Plus,
  Trash2,
  Settings2,
  X,
  Check,
  Edit2,
  PlusCircle,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface QuickFavoritesBarProps {
  onAddFood: (food: FoodItem, quantity: number) => void;
  onSendToAi: (food: FoodItem, quantity: number) => void;
}

export const QuickFavoritesBar: React.FC<QuickFavoritesBarProps> = ({
  onAddFood,
  onSendToAi,
}) => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FoodItem[]>(() => getUserFavorites());
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedNotice, setAddedNotice] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('insu_calc_favorites_expanded');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('insu_calc_favorites_expanded', String(next));
      } catch {}
      return next;
    });
  };

  // Form for adding/editing custom favorite in modal
  const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);
  const [customForm, setCustomForm] = useState({
    name: '',
    brand: '',
    portionName: '',
    gramsPerPortion: 100,
    carbsGrams: 0,
    animalProteinGrams: 0,
    plantProteinGrams: 0,
    fatGrams: 0,
    calories: 0,
    absorption: 'Lenta' as 'Rápida' | 'Lenta' | 'Mixta',
  });

  const loadFavs = () => {
    const favs = getUserFavorites();
    setFavorites((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(favs)) return prev;
      return favs;
    });
    // Initialize default quantities if not present
    setQuantities((prev) => {
      let changed = false;
      const next = { ...prev };
      favs.forEach((f) => {
        if (!next[f.id]) {
          next[f.id] = 1;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  };

  useEffect(() => {
    loadFavs();

    // Subscribe to Firestore for real-time cloud-synced favorites with safe merging
    const unsubFirestore = subscribeToFavorites(user?.uid, (remoteFavs) => {
      const merged = mergeIncomingRemoteFavorites(remoteFavs || [], user?.uid);
      setFavorites((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(merged)) return prev;
        return merged;
      });
    });

    const handleUpdate = () => {
      loadFavs();
    };

    window.addEventListener(FAVORITES_UPDATED_EVENT, handleUpdate);
    return () => {
      unsubFirestore();
      window.removeEventListener(FAVORITES_UPDATED_EVENT, handleUpdate);
    };
  }, [user?.uid]);

  const handleQuantityChange = (foodId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[foodId] || 1;
      const updated = Math.max(0.5, Math.round((current + delta) * 10) / 10);
      return { ...prev, [foodId]: updated };
    });
  };

  const handleSetDirectQuantity = (foodId: string, val: number) => {
    setQuantities((prev) => ({ ...prev, [foodId]: Math.max(0.1, val) }));
  };

  const handleAdd = (food: FoodItem) => {
    const qty = quantities[food.id] || 1;
    onAddFood(food, qty);
    setAddedNotice(`¡Cargado: ${qty}x ${food.name}!`);
    setTimeout(() => setAddedNotice(null), 2500);
  };

  const handleRemove = (foodId: string) => {
    const updated = removeFavoriteFood(foodId, user?.uid);
    setFavorites(updated);
  };

  const handleStartEdit = (food: FoodItem) => {
    setEditingFoodId(food.id);
    setCustomForm({
      name: food.name,
      brand: food.brand || '',
      portionName: food.portionName,
      gramsPerPortion: food.gramsPerPortion || 100,
      carbsGrams: food.carbsGrams,
      animalProteinGrams: food.animalProteinGrams,
      plantProteinGrams: food.plantProteinGrams,
      fatGrams: food.fatGrams,
      calories: food.calories,
      absorption: food.absorption || 'Lenta',
    });
    setIsAddingCustom(true);
  };

  const handleSaveCustomForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.name.trim()) return;

    const newFood: FoodItem = {
      id: editingFoodId || `fav-custom-${Date.now()}`,
      name: customForm.name.trim(),
      brand: customForm.brand.trim() || undefined,
      portionName: customForm.portionName.trim() || '1 porción',
      gramsPerPortion: Number(customForm.gramsPerPortion) || 100,
      carbsGrams: Number(customForm.carbsGrams) || 0,
      animalProteinGrams: Number(customForm.animalProteinGrams) || 0,
      plantProteinGrams: Number(customForm.plantProteinGrams) || 0,
      fatGrams: Number(customForm.fatGrams) || 0,
      calories: Number(customForm.calories) || 0,
      gi: 'Medio',
      cg: Math.round((Number(customForm.carbsGrams) || 0) * 0.5),
      absorption: customForm.absorption,
      isCommercial: true,
      category: 'Favoritos Personalizados',
    };

    const updated = addCustomFavoriteFood(newFood, user?.uid);
    setFavorites(updated);
    setIsAddingCustom(false);
    setEditingFoodId(null);
    setCustomForm({
      name: '',
      brand: '',
      portionName: '',
      gramsPerPortion: 100,
      carbsGrams: 0,
      animalProteinGrams: 0,
      plantProteinGrams: 0,
      fatGrams: 0,
      calories: 0,
      absorption: 'Lenta',
    });
  };

  return (
    <div className="bg-slate-950/95 border border-amber-500/40 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-md">
      
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <button
          type="button"
          onClick={toggleExpanded}
          className="flex items-center gap-2 text-left group flex-1 cursor-pointer select-none"
          title={isExpanded ? 'Minimizar sección de favoritos' : 'Desplegar sección de favoritos'}
          aria-expanded={isExpanded}
        >
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 group-hover:bg-amber-500/30 transition">
            <Star className="h-4 w-4 fill-amber-400" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-1.5 group-hover:text-amber-200 transition">
              <span>Mis Alimentos Favoritos</span>
              <span className="text-[10px] font-normal px-1.5 py-0.2 bg-amber-950 text-amber-300 rounded border border-amber-800/50">
                {favorites.length} guardados
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              {isExpanded
                ? 'Ajusta la porción y añade directo al plato con 1 toque'
                : 'Sección minimizada • Toca para desplegar y cargar'}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsManageModalOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Gestionar</span>
            <span className="sm:hidden">Editar</span>
          </button>

          <button
            type="button"
            onClick={toggleExpanded}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center transition shadow-sm"
            title={isExpanded ? 'Minimizar favoritos' : 'Desplegar favoritos'}
            aria-label={isExpanded ? 'Minimizar favoritos' : 'Desplegar favoritos'}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-amber-300" />
            ) : (
              <ChevronDown className="h-4 w-4 text-amber-300" />
            )}
          </button>
        </div>
      </div>

      {/* Toast Notice */}
      {addedNotice && (
        <div className="px-3 py-1.5 bg-emerald-950 border border-emerald-600 text-emerald-300 text-xs font-bold rounded-lg flex items-center gap-1.5 animate-fadeIn">
          <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">{addedNotice}</span>
        </div>
      )}

      {/* Favorites List / Cards for Mobile & Desktop (Only when expanded) */}
      {isExpanded && (
        <>
          {favorites.length === 0 ? (
            <div className="text-center py-6 px-3 bg-slate-900/50 rounded-xl border border-dashed border-slate-800 space-y-2.5">
              <p className="text-xs text-slate-400">No tienes alimentos favoritos guardados todavía.</p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Puedes añadir tus alimentos frecuentes desde aquí o tocando la estrella ⭐ en cualquier alimento del buscador o plato. Se guardarán de forma permanente en la nube.
              </p>
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsManageModalOpen(true);
                    setIsAddingCustom(true);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition shadow"
                >
                  ➕ Crear alimento favorito
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 animate-fadeIn">
          {favorites.map((food) => {
            const rawQty = quantities[food.id];
            const qty = rawQty === undefined ? 1 : rawQty === 0 ? 1 : rawQty;
            const displayQty = rawQty === 0 ? '' : (rawQty ?? 1);
            const isMasita = /gallet|masit|cracker|snack/i.test(food.name) || /masita|galletita/i.test(food.portionName);
            
            const totalCarbs = Math.round(food.carbsGrams * qty * 10) / 10;
            const totalAnim = Math.round(food.animalProteinGrams * qty * 10) / 10;
            const totalVeg = Math.round(food.plantProteinGrams * qty * 10) / 10;
            const totalCals = Math.round(food.calories * qty);

            return (
              <div
                key={food.id}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl p-3 flex flex-col justify-between space-y-2.5 transition shadow-sm"
              >
                <div>
                  {/* Title & Brand (Fully wrapped and readable) */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-100 break-words leading-tight">
                        {food.name}
                      </h4>
                      {food.brand && (
                        <span className="text-[10px] text-teal-400 font-medium block mt-0.5">
                          {food.brand}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(food.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition shrink-0"
                      title="Quitar de favoritos"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Portion description */}
                  <p className="text-[11px] text-slate-400 mt-1 break-words">
                    Porción base: <span className="text-slate-300 font-medium">{food.portionName}</span>
                  </p>

                  {/* Macros Badges with exact dynamic multiplication */}
                  <div className="grid grid-cols-4 gap-1 mt-2 text-[10px] font-mono">
                    <div className="bg-slate-950 border border-slate-800 rounded p-1 text-center">
                      <span className="text-slate-400 block text-[9px]">HC</span>
                      <strong className="text-teal-300">{totalCarbs}g</strong>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded p-1 text-center">
                      <span className="text-slate-400 block text-[9px]">P. Anim</span>
                      <strong className="text-amber-300">{totalAnim}g</strong>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded p-1 text-center">
                      <span className="text-slate-400 block text-[9px]">P. Veg</span>
                      <strong className="text-emerald-300">{totalVeg}g</strong>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded p-1 text-center">
                      <span className="text-slate-400 block text-[9px]">Kcal</span>
                      <strong className="text-slate-200">{totalCals}</strong>
                    </div>
                  </div>
                </div>

                {/* Portion Quantity Selector & Action Buttons (Generous Touch Targets) */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(food.id, -1)}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold flex items-center justify-center shrink-0 border border-slate-700 active:bg-slate-600 transition"
                        title="Restar 1 porción"
                      >
                        -
                      </button>
                      
                      <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 min-w-[55px] justify-center">
                        <input
                          type="number"
                          step="1"
                          min="0.1"
                          placeholder="1"
                          value={displayQty}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '') {
                              setQuantities((prev) => ({ ...prev, [food.id]: 0 }));
                            } else {
                              const val = parseFloat(raw);
                              handleSetDirectQuantity(food.id, isNaN(val) ? 1 : val);
                            }
                          }}
                          className="w-8 bg-transparent text-xs font-mono font-bold text-amber-300 placeholder:text-slate-600 placeholder:font-normal text-center focus:outline-none"
                        />
                        <span className="text-[10px] text-amber-300 font-sans font-bold ml-0.5">
                          {isMasita ? 'mas.' : 'u'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleQuantityChange(food.id, 1)}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold flex items-center justify-center shrink-0 border border-slate-700 active:bg-slate-600 transition"
                        title="Sumar 1 porción"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAdd(food)}
                      className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-md"
                      title="Cargar al plato actual"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Cargar {qty > 1 ? `(${qty})` : ''}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSendToAi(food, qty)}
                    className="w-full py-1.5 px-2 bg-slate-950 hover:bg-slate-800 text-teal-300 border border-teal-800/60 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition"
                    title="Ajustar con la IA"
                  >
                    <Sparkles className="h-3 w-3 text-amber-300" />
                    <span>Ajustar {qty > 1 ? `${qty} unidades` : 'unidades'} con la IA</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}
      </>
    )}

      {/* Manage Favorites Modal */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                <h3 className="text-sm sm:text-base font-bold text-slate-100">
                  Administrador de Alimentos Favoritos
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsManageModalOpen(false);
                  setIsAddingCustom(false);
                  setEditingFoodId(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              
              {/* Action Bar inside modal */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs text-slate-300">
                  Puedes editar porciones, borrar favoritos o crear nuevos alimentos frecuentes guardados en la nube.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCustom(true);
                      setEditingFoodId(null);
                      setCustomForm({
                        name: '',
                        brand: '',
                        portionName: '',
                        gramsPerPortion: 100,
                        carbsGrams: 0,
                        animalProteinGrams: 0,
                        plantProteinGrams: 0,
                        fatGrams: 0,
                        calories: 0,
                        absorption: 'Lenta',
                      });
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1 transition shadow"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>Nuevo Alimento Favorito</span>
                  </button>
                </div>
              </div>

              {/* Form to Add / Edit Custom Food */}
              {isAddingCustom && (
                <form
                  onSubmit={handleSaveCustomForm}
                  className="bg-slate-950 border border-amber-500/40 rounded-xl p-4 space-y-3 animate-fadeIn"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      {editingFoodId ? 'Editar Alimento Favorito' : 'Crear Nuevo Alimento Favorito'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsAddingCustom(false)}
                      className="text-xs text-slate-400 hover:text-rose-300"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold">Nombre del Alimento *</label>
                      <input
                        type="text"
                        required
                        value={customForm.name}
                        onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                        placeholder="Ej: Galletitas Doninas / Yogur Vainilla"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold">Marca o Tipo</label>
                      <input
                        type="text"
                        value={customForm.brand}
                        onChange={(e) => setCustomForm({ ...customForm, brand: e.target.value })}
                        placeholder="Ej: Bagley / Milkaut / Casero"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold">Descripción de la Porción</label>
                      <input
                        type="text"
                        value={customForm.portionName}
                        onChange={(e) => setCustomForm({ ...customForm, portionName: e.target.value })}
                        placeholder="Ej: 1 masita (7.5g) o 1 pote (180g)"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold">Gramos por Porción</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Ej: 100"
                        value={customForm.gramsPerPortion === 0 ? '' : customForm.gramsPerPortion}
                        onChange={(e) => setCustomForm({ ...customForm, gramsPerPortion: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-100 placeholder:text-slate-600 placeholder:font-normal font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs pt-1 border-t border-slate-800">
                    <div>
                      <label className="text-teal-300 block mb-1 font-semibold">Carbohidratos (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Ej: 15"
                        value={customForm.carbsGrams === 0 ? '' : customForm.carbsGrams}
                        onChange={(e) => setCustomForm({ ...customForm, carbsGrams: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-teal-300 placeholder:text-slate-600 placeholder:font-normal font-mono font-bold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-amber-300 block mb-1 font-semibold">Prot. Animal (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Ej: 5"
                        value={customForm.animalProteinGrams === 0 ? '' : customForm.animalProteinGrams}
                        onChange={(e) => setCustomForm({ ...customForm, animalProteinGrams: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-amber-300 placeholder:text-slate-600 placeholder:font-normal font-mono font-bold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-emerald-300 block mb-1 font-semibold">Prot. Vegetal (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Ej: 2"
                        value={customForm.plantProteinGrams === 0 ? '' : customForm.plantProteinGrams}
                        onChange={(e) => setCustomForm({ ...customForm, plantProteinGrams: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-emerald-300 placeholder:text-slate-600 placeholder:font-normal font-mono font-bold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold">Grasas (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Ej: 4"
                        value={customForm.fatGrams === 0 ? '' : customForm.fatGrams}
                        onChange={(e) => setCustomForm({ ...customForm, fatGrams: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 placeholder:text-slate-600 placeholder:font-normal font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold">Calorías (kcal)</label>
                      <input
                        type="number"
                        step="1"
                        placeholder="Ej: 120"
                        value={customForm.calories === 0 ? '' : customForm.calories}
                        onChange={(e) => setCustomForm({ ...customForm, calories: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 placeholder:text-slate-600 placeholder:font-normal font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingCustom(false)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition shadow"
                    >
                      Guardar en Favoritos
                    </button>
                  </div>
                </form>
              )}

              {/* List of current favorites in modal */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Tus Alimentos Guardados ({favorites.length})
                </h4>

                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {favorites.map((food) => (
                    <div
                      key={food.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                    >
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs sm:text-sm font-bold text-slate-100 break-words">
                          {food.name}
                        </h5>
                        <p className="text-[11px] text-slate-400">
                          {food.portionName} {food.brand ? `• ${food.brand}` : ''}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-300 flex-wrap">
                          <span className="text-teal-300">HC: {food.carbsGrams}g</span>
                          <span className="text-amber-300">P. Anim: {food.animalProteinGrams}g</span>
                          <span className="text-emerald-300">P. Veg: {food.plantProteinGrams}g</span>
                          <span className="text-slate-400">{food.calories} kcal</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(food)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                          title="Editar alimento"
                        >
                          <Edit2 className="h-4 w-4 text-amber-300" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(food.id)}
                          className="p-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/50 transition"
                          title="Eliminar de favoritos"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl transition shadow"
              >
                Listo / Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
