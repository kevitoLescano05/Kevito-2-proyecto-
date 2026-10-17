import React, { useState } from 'react';
import { RefreshCw, AlertTriangle, Check, X, ShieldAlert } from 'lucide-react';

interface ResetDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: (resetBolusHistory: boolean) => void;
}

export const ResetDayModal: React.FC<ResetDayModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
}) => {
  const [resetBolus, setResetBolus] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirmReset(resetBolus);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-100 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon & Title */}
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <RefreshCw className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              ¿Comenzar Nuevo Día?
            </h3>
            <p className="text-xs text-slate-400">
              Reiniciar los contadores diarios a 0
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-300">
          <p className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Se borrará la lista de comidas de hoy y los acumulados de <strong>calorías, carbohidratos y proteínas (animal/vegetal)</strong> para volver a contar desde cero.
            </span>
          </p>
        </div>

        {/* Optional Checkbox */}
        <label className="flex items-center space-x-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition">
          <input
            type="checkbox"
            checked={resetBolus}
            onChange={(e) => setResetBolus(e.target.checked)}
            className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 bg-slate-900 border-slate-700"
          />
          <div className="text-xs">
            <span className="font-bold text-slate-200 block">Borrar también historial de insulina activa (IOB)</span>
            <span className="text-slate-400">Pondrá las dosis recientes de Novorapid e IOB en 0 U.</span>
          </div>
        </label>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-rose-600/20 transition"
          >
            <Check className="h-4 w-4" />
            <span>Sí, Reiniciar Día</span>
          </button>
        </div>

      </div>
    </div>
  );
};
