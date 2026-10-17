import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInAnonymously,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { setDriveAccessToken, getDriveAccessToken } from '../services/googleDriveService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  driveToken: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  signInGuest: () => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driveToken, setDriveTokenState] = useState<string | null>(getDriveAccessToken());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setDriveAccessToken(null);
        setDriveTokenState(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const clearError = () => setError(null);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setDriveAccessToken(credential.accessToken);
        setDriveTokenState(credential.accessToken);
      }
    } catch (err: any) {
      console.error('Error al iniciar sesión con Google:', err);
      // Mensajes de error amigables
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Inicio de sesión cancelado.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Error de conexión a internet. Revisa tu red.');
      } else {
        setError('No se pudo iniciar sesión con Google. Puedes probar con Correo.');
      }
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.error('Error al iniciar con email:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Correo o contraseña incorrectos.');
      } else if (err.code === 'auth/invalid-email') {
        setError('El formato de correo no es válido.');
      } else {
        setError(err.message || 'Error al iniciar sesión.');
      }
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    try {
      setError(null);
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.error('Error al registrar usuario:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este correo ya tiene una cuenta. Inicia sesión directamente.');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setError(err.message || 'Error al crear la cuenta.');
      }
      throw err;
    }
  };

  const signInGuest = async () => {
    try {
      setError(null);
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error('Error al entrar como invitado:', err);
      setError('Error al ingresar como invitado.');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error('Error cerrando sesión:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        driveToken,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInGuest,
        logout,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
