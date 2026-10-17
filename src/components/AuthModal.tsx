import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserCheck, ShieldCheck, Mail, Lock, Sparkles, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  title = 'Iniciar Sesión / Cuenta',
  subtitle = 'Guarda tus comidas, favoritos y configuraciones privadas en tu propia cuenta en la nube.',
}) => {
  const { 
    user, 
    signInWithGoogle, 
    signInWithEmail, 
    signUpWithEmail, 
    signInGuest, 
    logout,
    error,
    clearError
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password);
      }
      onClose();
    } catch {
      // Error handled in AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuest = async () => {
    setSubmitting(true);
    try {
      await signInGuest();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 text-slate-100">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex p-3 bg-teal-500/10 border border-teal-500/20 rounded-2xl text-teal-400 mb-1">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">{title}</h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">{subtitle}</p>
        </div>

        {/* If user is already logged in */}
        {user ? (
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center font-bold text-slate-950 text-base">
                {user.displayName ? user.displayName[0].toUpperCase() : user.email ? user.email[0].toUpperCase() : 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-slate-100 truncate">
                  {user.displayName || 'Usuario Identificado'}
                </p>
                <p className="text-xs text-slate-400 truncate">{user.email || 'Modo cuenta privada'}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  await logout();
                }}
                className="flex-1 py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-xl transition"
              >
                Cerrar Sesión
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-xl transition"
              >
                Continuar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">{error}</div>
                <button type="button" onClick={clearError} className="text-rose-400 text-xs font-bold">✕</button>
              </div>
            )}

            {/* Quick Google Sign In */}
            <button
              type="button"
              disabled={submitting}
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl transition shadow active:scale-[0.99] disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuar con Google</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px bg-slate-800 flex-1" />
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">O con correo</span>
              <div className="h-px bg-slate-800 flex-1" />
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmitEmail} className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Correo electrónico</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tunombre@gmail.com"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Contraseña</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl transition shadow active:scale-[0.99] disabled:opacity-50 min-h-[44px]"
              >
                {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </button>

              <div className="flex items-center justify-between text-[11px] pt-1">
                {mode === 'login' ? (
                  <p className="text-slate-400">
                    ¿No tienes cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('register')}
                      className="text-teal-400 font-semibold hover:underline"
                    >
                      Regístrate
                    </button>
                  </p>
                ) : (
                  <p className="text-slate-400">
                    ¿Ya tienes cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-teal-400 font-semibold hover:underline"
                    >
                      Inicia sesión
                    </button>
                  </p>
                )}
              </div>
            </form>

            {/* Quick Guest Continue */}
            <div className="pt-2 border-t border-slate-800/80 text-center">
              <button
                type="button"
                onClick={handleGuest}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition"
              >
                Continuar temporalmente como invitado
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition"
        >
          Cerrar ventana
        </button>
      </div>
    </div>
  );
};
