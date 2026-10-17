import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfigJson from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const rawConfig = firebaseConfigJson as Record<string, any>;
const dbId = rawConfig.firestoreDatabaseId && rawConfig.firestoreDatabaseId !== '(default)'
  ? rawConfig.firestoreDatabaseId
  : undefined;

export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

// Instancia secundaria aislada para agregar cuentas extra de Google Drive (+15 GB c/u) sin cerrar la sesión principal
const secondaryApp = getApps().find((a) => a.name === 'drive-pool-secondary') || initializeApp(firebaseConfig, 'drive-pool-secondary');
export const secondaryDriveAuth = getAuth(secondaryApp);
export const selectAccountGoogleProvider = new GoogleAuthProvider();
selectAccountGoogleProvider.addScope('https://www.googleapis.com/auth/drive.file');
selectAccountGoogleProvider.setCustomParameters({ prompt: 'select_account' });

