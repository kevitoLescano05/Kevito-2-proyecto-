import React, { useState } from 'react';
import { X, PlusCircle, Sparkles, Beef, Leaf, Flame, ShieldAlert } from 'lucide-react';
import { UserSettings } from '../types';

interface AddMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onAddMeal: (meal: {
    description: string;
    carbsGrams: number;
    animalProteinGrams: number;
    plantProteinGrams: number;
    fatGrams: number;
    calories: number;
    bolusUnits: number;
  }) => void;
}

export const AddMealModal: React.FC<AddMealModalProps> = ({
  isOpen,
  onClose,
  settings,
  onAddMeal,
}) => {
  const [description, setDescription] = useState<string>('');
  const [carbsGrams, setCarbsGrams] = useState<string>('');
  const [animalProteinGrams, setAnimalProteinGrams] = useState<string>('');
  const [plantProteinGrams, setPlantProteinGrams] = useState<string>('');
  const [fatGrams, setFatGrams] = useState<string>('');
  const [calories, setCalories] = useState<string>('');
  const [bolusUnits, setBolusUnits] = useState<string>('');

  if (!isOpen) return null;

  // Auto calculate calories if carbs/protein/fats are entered and calories is empty
  const handleAutoCalcCalories = () => {
    const c = parseFloat(carbsGrams) || 0;
    const pa = parseFloat(animalProteinGrams) || 0;
    const pv = parseFloat(plantProteinGrams) || 0;
    const f = parseFloat(fatGrams) || 0;
    const totalProt = pa + pv;
    const estKcal = Math.round(c * 4 + totalProt * 4 + f * 9);
    setCalories(estKcal.toString());

    // Auto suggest bolus (Carbs / ICR)
    if (c > 0 && !bolusUnits) {
      const suggestedBolus = Math.round((c / settings.icr) * 10) / 10;
      setBolusUnits(suggestedBolus.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const c = parseFloat(carbsGrams) || 0;
    const pa = parseFloat(animalProteinGrams) || 0;
    const pv = parseFloat(plantProteinGrams) || 0;
    const f = parseFloat(fatGrams) || 0;
    let kcal = parseFloat(calories) || 0;

    if (kcal === 0 && (c > 0 || pa > 0 || pv > 0 || f > 0)) {
      kcal = Math.round(c * 4 + (pa + pv) * 4 + f * 9);
    }

    const b = parseFloat(bolusUnits) || 0;

    onAddMeal({
      description: description.trim(),
      carbsGrams: c,
      animalProteinGrams: pa,
      plantProteinGrams: pv,
      fatGrams: f,
      calories: kcal,
      bolusUnits: b,
    });

    // Reset fields
    setDescription('');
    setCarbsGrams('');
    setAnimalProteinGrams('');
    setPlantProteinGrams('');
    setFatGrams('');
    setCalories('');
    setBolusUnits('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <PlusCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Registrar Comida Directa</h3>
              <p className="text-xs text-slate-400">
                Ingresa los gramos de macronutrientes para el balance diario
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Nombre / Descripción de la Comida *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Desayuno: Yogur + 1/4 Torta integral"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition"
            />
          </div>

          {/* Grid Nutrients */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Carbs */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-teal-400 mb-1">
                Carbohidratos (g)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                placeholder="0"
                value={carbsGrams}
                onChange={(e) => setCarbsGrams(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2.5 text-sm font-mono text-teal-300 focus:outline-none min-h-[44px]"
              />
            </div>

            {/* Animal Protein */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-rose-400 mb-1 flex items-center gap-1">
                <Beef className="h-3 w-3" /> Prot. Animal (g)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                placeholder="Máx 25g/día"
                value={animalProteinGrams}
                onChange={(e) => setAnimalProteinGrams(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-3 py-2.5 text-sm font-mono text-rose-300 focus:outline-none min-h-[44px]"
              />
            </div>

            {/* Plant Protein */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-1">
                <Leaf className="h-3 w-3" /> Prot. Vegetal (g)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                placeholder="25-35g/día"
                value={plantProteinGrams}
                onChange={(e) => setPlantProteinGrams(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-sm font-mono text-emerald-300 focus:outline-none min-h-[44px]"
              />
            </div>

            {/* Fats */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Grasas Totales (g)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                placeholder="0"
                value={fatGrams}
                onChange={(e) => setFatGrams(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-mono text-slate-200 focus:outline-none min-h-[44px]"
              />
            </div>

            {/* Calories */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1">
                <Flame className="h-3 w-3" /> Calorías (kcal)
              </label>
              <input
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
                placeholder="0"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2.5 text-sm font-mono text-amber-300 focus:outline-none min-h-[44px]"
              />
            </div>

            {/* Bolus Units */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-400 mb-1">
                Bolus Novorapid (U)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                placeholder="Ratio 1:8"
                value={bolusUnits}
                onChange={(e) => setBolusUnits(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-sm font-mono text-indigo-300 focus:outline-none min-h-[44px]"
              />
            </div>
          </div>

          {/* Quick Auto-Calculate Calories Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAutoCalcCalories}
              className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Autocalcular kcal y sugerir bolus (1:8)</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition flex items-center gap-1.5"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Guardar en el Balance Diario</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
