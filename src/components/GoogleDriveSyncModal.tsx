import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Upload, 
  Download, 
  FolderCheck, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Database,
  ExternalLink,
  ShieldCheck,
  Plus,
  Trash2,
  HardDrive,
  Server,
  Layers
} from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { secondaryDriveAuth, selectAccountGoogleProvider } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { 
  listDriveBackups, 
  downloadDriveFile, 
  DriveFileInfo,
  getDriveAccessToken,
  DrivePoolAccount,
  ExternalCloudNode,
  ExternalCloudProviderId,
  CLOUD_PROVIDER_CATALOG,
  getDrivePoolAccounts,
  saveDrivePoolAccounts,
  removeDrivePoolAccount,
  fetchDriveAccountQuota,
  getExternalCloudNodes,
  addExternalCloudNode,
  removeExternalCloudNode,
  syncBackupAcrossMultiCloudPool
} from '../services/googleDriveService';
import { DailyMealLogItem, BolusRecord, UserSettings } from '../types';

interface GoogleDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  dailyMeals: DailyMealLogItem[];
  allMealsHistory: DailyMealLogItem[];
  bolusHistory: BolusRecord[];
  settings: UserSettings;
  onRestoreBackup?: (backupData: any) => void;
}

export const GoogleDriveSyncModal: React.FC<GoogleDriveSyncModalProps> = ({
  isOpen,
  onClose,
  dailyMeals,
  allMealsHistory,
  bolusHistory,
  settings,
  onRestoreBackup,
}) => {
  const { user, driveToken, signInWithGoogle } = useAuth();
  const [backups, setBackups] = useState<DriveFileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [addingDrive, setAddingDrive] = useState(false);
  const [confirmRestoreFile, setConfirmRestoreFile] = useState<DriveFileInfo | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Pool de cuentas Google Drive secundarias (+15 GB c/u)
  const [drivePool, setDrivePool] = useState<DrivePoolAccount[]>(() => getDrivePoolAccounts());

  // Nodos de nubes abiertas externas (MEGA, Koofr, pCloud, Box, Cloudflare R2, Backblaze B2)
  const [externalNodes, setExternalNodes] = useState<ExternalCloudNode[]>(() => getExternalCloudNodes());
  const [showAddExternalForm, setShowAddExternalForm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ExternalCloudProviderId>('mega');
  const [accountLabel, setAccountLabel] = useState('');
  const [endpointUrl, setEndpointUrl] = useState(CLOUD_PROVIDER_CATALOG.mega.defaultEndpoint);
  const [username, setUsername] = useState('');
  const [secretOrToken, setSecretOrToken] = useState('');

  const activeToken = driveToken || getDriveAccessToken();

  useEffect(() => {
    if (isOpen) {
      setDrivePool(getDrivePoolAccounts());
      setExternalNodes(getExternalCloudNodes());
      if (activeToken) {
        loadBackupsList();
      }
    }
  }, [isOpen, activeToken]);

  const handleProviderChange = (prov: ExternalCloudProviderId) => {
    setSelectedProvider(prov);
    setEndpointUrl(CLOUD_PROVIDER_CATALOG[prov].defaultEndpoint);
  };

  // Cálculo en tiempo real del espacio total expandido (GB)
  const firestoreGB = 1;
  const primaryDriveGB = 15;
  const extraDrivesGB = drivePool.reduce((acc, item) => acc + (item.quotaTotalGB || 15), 0);
  const externalCloudsGB = externalNodes.reduce((acc, item) => acc + (item.quotaTotalGB || 10), 0);
  const totalPoolGB = firestoreGB + primaryDriveGB + extraDrivesGB + externalCloudsGB;

  const loadBackupsList = async () => {
    if (!activeToken) return;
    setLoading(true);
    try {
      const files = await listDriveBackups(activeToken);
      setBackups(files);
    } catch (err: any) {
      console.error('Error cargando copias de Google Drive:', err);
      setStatusMessage({
        type: 'error',
        text: 'No se pudieron listar los archivos de Google Drive. Verifica permisos o vuelve a conectar.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Agregar una segunda, tercera o cuarta cuenta de Google Drive (+15 GB cada una) sin cerrar sesión
  const handleAddSecondaryGoogleDrive = async () => {
    setAddingDrive(true);
    setStatusMessage({ type: 'info', text: 'Selecciona la cuenta adicional de Google Drive (+15 GB) en la ventana emergente...' });
    try {
      const result = await signInWithPopup(secondaryDriveAuth, selectAccountGoogleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      const email = result.user.email || `drive-${Date.now()}@gmail.com`;
      const displayName = result.user.displayName || 'Cuenta Google Extra';

      if (!token) {
        throw new Error('No se recibió el permiso de Google Drive para la cuenta seleccionada.');
      }

      const quota = await fetchDriveAccountQuota(token);
      const existing = getDrivePoolAccounts().filter((a) => a.email !== email);
      const newAccount: DrivePoolAccount = {
        id: `gdrive-${Date.now()}`,
        email: quota.email || email,
        displayName: quota.displayName || displayName,
        token,
        quotaTotalGB: quota.totalGB || 15,
        quotaUsedGB: quota.usedGB || 0,
        addedAt: new Date().toISOString(),
      };

      const updated = [...existing, newAccount];
      saveDrivePoolAccounts(updated);
      setDrivePool(updated);

      setStatusMessage({
        type: 'success',
        text: `¡Cuenta ${newAccount.email} vinculada al Pool! Se sumaron +${newAccount.quotaTotalGB} GB de almacenamiento.`,
      });
    } catch (err: any) {
      console.error('Error agregando cuenta extra de Drive:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setStatusMessage({ type: 'info', text: 'Selección de cuenta adicional cancelada.' });
      } else {
        setStatusMessage({
          type: 'error',
          text: err?.message || 'No se pudo vincular la cuenta adicional de Google Drive.',
        });
      }
    } finally {
      setAddingDrive(false);
    }
  };

  const handleRemoveDriveAccount = (email: string) => {
    const updated = removeDrivePoolAccount(email);
    setDrivePool(updated);
    setStatusMessage({
      type: 'info',
      text: `Cuenta ${email} desvinculada del Pool Multi-Nube.`,
    });
  };

  const handleAddExternalCloud = (e: React.FormEvent) => {
    e.preventDefault();
    const spec = CLOUD_PROVIDER_CATALOG[selectedProvider];
    if (!accountLabel.trim()) {
      setStatusMessage({ type: 'error', text: 'Ingresa un correo o nombre para identificar esta cuenta.' });
      return;
    }

    const updated = addExternalCloudNode({
      provider: selectedProvider,
      providerName: spec.name,
      accountLabel: accountLabel.trim(),
      endpointUrl: endpointUrl.trim() || spec.defaultEndpoint,
      username: username.trim() || accountLabel.trim(),
      secretOrToken: secretOrToken.trim(),
      quotaTotalGB: spec.freeGB,
      status: 'connected',
    });

    setExternalNodes(updated);
    setAccountLabel('');
    setUsername('');
    setSecretOrToken('');
    setShowAddExternalForm(false);

    setStatusMessage({
      type: 'success',
      text: `¡${spec.name} (+${spec.freeGB} GB) conectado al Pool! Tu capacidad total subió a ${totalPoolGB + spec.freeGB} GB.`,
    });
  };

  const handleRemoveExternalCloud = (id: string, name: string) => {
    const updated = removeExternalCloudNode(id);
    setExternalNodes(updated);
    setStatusMessage({
      type: 'info',
      text: `${name} fue removido del Pool Multi-Nube.`,
    });
  };

  const handleCreateBackup = async () => {
    if (!activeToken && drivePool.length === 0 && externalNodes.length === 0) {
      setStatusMessage({ type: 'error', text: 'Conecta tu cuenta de Google Drive o agrega una nube al Pool primero.' });
      return;
    }

    setSyncing(true);
    setStatusMessage({ type: 'info', text: 'Sincronizando respaldo en todo tu Pool Multi-Nube...' });

    try {
      const now = new Date();
      const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `InsulinCalc_Backup_${dateStr}.json`;

      const backupPayload = {
        exportedAt: now.toISOString(),
        version: '3.0-multicloud-pool',
        sharedAppBridge: true,
        settings,
        dailyMeals,
        allMealsHistory,
        bolusHistory,
        stats: {
          totalMeals: allMealsHistory.length,
          totalBoluses: bolusHistory.length,
          totalPoolCapacityGB: totalPoolGB,
        },
      };

      const { syncedTargets, failedTargets } = await syncBackupAcrossMultiCloudPool(
        activeToken,
        fileName,
        backupPayload
      );

      setDrivePool(getDrivePoolAccounts());
      setExternalNodes(getExternalCloudNodes());

      if (syncedTargets.length > 0) {
        setStatusMessage({
          type: 'success',
          text: `¡Respaldo sincronizado en: ${syncedTargets.join(', ')}! (${fileName})`,
        });
        if (activeToken) {
          await loadBackupsList();
        }
      } else {
        setStatusMessage({
          type: 'error',
          text: `No se pudo subir a los destinos (${failedTargets.join(', ')}). Revisa tu conexión.`,
        });
      }
    } catch (err: any) {
      console.error('Error al sincronizar en el Pool Multi-Nube:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Error al guardar el respaldo en el Pool Multi-Nube.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const executeRestore = async (file: DriveFileInfo) => {
    if (!activeToken) return;
    setConfirmRestoreFile(null);
    setLoading(true);
    setStatusMessage({ type: 'info', text: `Descargando respaldo ${file.name}...` });

    try {
      const backupData = await downloadDriveFile(activeToken, file.id);
      if (onRestoreBackup && backupData) {
        onRestoreBackup(backupData);
        setStatusMessage({
          type: 'success',
          text: `Respaldo "${file.name}" restaurado correctamente en la app.`,
        });
      }
    } catch (err: any) {
      console.error('Error restaurando archivo:', err);
      setStatusMessage({
        type: 'error',
        text: 'Error al leer el archivo de Google Drive.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-5 text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/30 text-indigo-400">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                Pool Multi-Nube Expandible
              </h2>
              <p className="text-xs text-slate-400">
                Suma cuentas gratuitas para expandir tu espacio y compartir datos entre todas tus apps
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Medidor de Capacidad Total del Pool Multi-Nube */}
        <div className="bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950 border border-indigo-500/30 rounded-xl p-4 space-y-3 shadow-inner">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-emerald-400" /> Capacidad Total Combinada en tu App
              </span>
              <p className="text-xs text-slate-400">
                Tus 16 GB base nunca se pierden: cada nube que conectas se suma encima.
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                {totalPoolGB} GB
              </span>
              <span className="block text-[10px] text-slate-400">Espacio Total Activo</span>
            </div>
          </div>

          {/* Barra visual de composición de GB */}
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
            <div
              style={{ width: `${Math.max(6, (firestoreGB / totalPoolGB) * 100)}%` }}
              className="bg-teal-500 h-full"
              title="Firestore (1 GB)"
            />
            <div
              style={{ width: `${(primaryDriveGB / totalPoolGB) * 100}%` }}
              className="bg-indigo-500 h-full"
              title="Google Drive Principal (15 GB)"
            />
            {extraDrivesGB > 0 && (
              <div
                style={{ width: `${(extraDrivesGB / totalPoolGB) * 100}%` }}
                className="bg-cyan-500 h-full"
                title={`Drives Adicionales (+${extraDrivesGB} GB)`}
              />
            )}
            {externalCloudsGB > 0 && (
              <div
                style={{ width: `${(externalCloudsGB / totalPoolGB) * 100}%` }}
                className="bg-emerald-500 h-full"
                title={`Nubes Abiertas Grupo 1 (+${externalCloudsGB} GB)`}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
              Firestore: <strong>1 GB</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
              Drive Principal: <strong>15 GB</strong>
            </span>
            {extraDrivesGB > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
                Drives Extra: <strong>+{extraDrivesGB} GB</strong>
              </span>
            )}
            {externalCloudsGB > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                MEGA / Koofr / R2 / Box: <strong>+{externalCloudsGB} GB</strong>
              </span>
            )}
          </div>
        </div>

        {/* 1. Cuenta Principal de Google Drive + Cuentas Extra de Google Drive */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-teal-400" /> 1. Cuentas de Google Drive (15 GB gratis por cuenta)
            </span>
            <button
              type="button"
              onClick={handleAddSecondaryGoogleDrive}
              disabled={addingDrive}
              className="py-1.5 px-2.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {addingDrive ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span>Sumar otra cuenta Google (+15 GB)</span>
            </button>
          </div>

          {/* Cuenta Principal */}
          {activeToken ? (
            <div className="flex items-center justify-between text-xs bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-200">
                    {user?.displayName || 'Cuenta Principal'} <span className="text-[10px] text-emerald-400 font-mono">(15 GB Activos)</span>
                  </p>
                  <p className="text-[11px] text-slate-400">{user?.email || 'Conectada con Google Drive'}</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                Principal
              </span>
            </div>
          ) : (
            <div className="space-y-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-300">
                Conecta tu cuenta principal de Google para activar tus primeros 15 GB de respaldo automático:
              </p>
              <button
                type="button"
                onClick={signInWithGoogle}
                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 shadow cursor-pointer"
              >
                <Cloud className="h-4 w-4" />
                <span>Conectar Google Drive Principal (15 GB)</span>
              </button>
            </div>
          )}

          {/* Lista de Cuentas Secundarias de Google Drive en el Pool */}
          {drivePool.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] font-semibold text-cyan-300">
                Cuentas adicionales de Google Drive unidas al Pool ({drivePool.length}):
              </p>
              {drivePool.map((acc) => (
                <div
                  key={acc.email}
                  className="flex items-center justify-between text-xs bg-slate-900/70 p-2 rounded-lg border border-cyan-900/40"
                >
                  <div className="truncate pr-2">
                    <p className="font-semibold text-slate-200 truncate">
                      {acc.displayName} <span className="text-cyan-400 font-mono">(+{acc.quotaTotalGB} GB)</span>
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {acc.email} {acc.lastSyncAt ? `• Sincronizado: ${new Date(acc.lastSyncAt).toLocaleTimeString()}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDriveAccount(acc.email)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition cursor-pointer"
                    title="Quitar cuenta del Pool"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Nubes Abiertas del Grupo 1 (MEGA 20 GB, Koofr 10 GB, pCloud 10 GB, Box 10 GB, Cloudflare R2 10 GB) */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Server className="h-4 w-4 text-emerald-400" /> 2. Nubes Abiertas Adicionales (MEGA, Koofr, pCloud, Box, R2)
              </span>
              <p className="text-[11px] text-slate-400">
                Nubes con puerta abierta para desarrolladores que expanden tu espacio y comparten datos entre apps
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddExternalForm(!showAddExternalForm)}
              className="py-1.5 px-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{showAddExternalForm ? 'Cerrar formulario' : 'Conectar otra nube (+10 a +20 GB)'}</span>
            </button>
          </div>

          {showAddExternalForm && (
            <form onSubmit={handleAddExternalCloud} className="bg-slate-900 border border-slate-700/80 rounded-xl p-3.5 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Servicio de Nube (Grupo 1):</label>
                  <select
                    value={selectedProvider}
                    onChange={(e) => handleProviderChange(e.target.value as ExternalCloudProviderId)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
                  >
                    <option value="mega">MEGA Cloud (+20 GB Gratis)</option>
                    <option value="koofr">Koofr Cloud (+10 GB Gratis - WebDAV)</option>
                    <option value="pcloud">pCloud (+10 GB Gratis - WebDAV)</option>
                    <option value="box">Box Drive (+10 GB Gratis - WebDAV)</option>
                    <option value="cloudflare_r2">Cloudflare R2 (+10 GB Gratis - Apps)</option>
                    <option value="backblaze_b2">Backblaze B2 (+10 GB Gratis - Apps)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Correo o Nombre de la Cuenta:</label>
                  <input
                    type="text"
                    value={accountLabel}
                    onChange={(e) => setAccountLabel(e.target.value)}
                    placeholder="ej. micuenta@gmail.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
                    required
                  />
                </div>
              </div>

              <p className="text-[11px] text-emerald-300 bg-emerald-950/40 border border-emerald-800/50 rounded-lg p-2">
                💡 {CLOUD_PROVIDER_CATALOG[selectedProvider].setupHint}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-400 block mb-1">URL de Conexión (API / WebDAV):</label>
                  <input
                    type="text"
                    value={endpointUrl}
                    onChange={(e) => setEndpointUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-300 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Llave de App / Contraseña WebDAV (Opcional):</label>
                  <input
                    type="password"
                    value={secretOrToken}
                    onChange={(e) => setSecretOrToken(e.target.value)}
                    placeholder="Token o clave de aplicación"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddExternalForm(false)}
                  className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Sumar +{CLOUD_PROVIDER_CATALOG[selectedProvider].freeGB} GB al Pool
                </button>
              </div>
            </form>
          )}

          {externalNodes.length === 0 ? (
            <p className="text-[11px] text-slate-400 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80">
              Aún no agregaste nubes externas adicionales. Puedes conectar <strong>MEGA (+20 GB)</strong>, <strong>Koofr (+10 GB)</strong>, <strong>pCloud (+10 GB)</strong> o <strong>Cloudflare R2 (+10 GB)</strong> cuando quieras.
            </p>
          ) : (
            <div className="space-y-1.5">
              {externalNodes.map((node) => (
                <div
                  key={node.id}
                  className="flex items-center justify-between text-xs bg-slate-900/80 p-2.5 rounded-lg border border-emerald-900/40"
                >
                  <div className="truncate pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100">{node.providerName}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        +{node.quotaTotalGB} GB
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      Cuenta: {node.accountLabel} {node.lastSyncAt ? `• Última copia: ${new Date(node.lastSyncAt).toLocaleTimeString()}` : '• Listo para sincronizar'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveExternalCloud(node.id, node.providerName)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition cursor-pointer"
                    title="Eliminar nube del Pool"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botón Maestro de Sincronización en Todo el Pool */}
        <button
          type="button"
          onClick={handleCreateBackup}
          disabled={syncing}
          className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
        >
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <span>Guardar y Sincronizar Ahora en Todo el Pool ({totalPoolGB} GB)</span>
        </button>

        {/* Mensaje de estado */}
        {statusMessage && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
              : statusMessage.type === 'error'
              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
              : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
          }`}>
            {statusMessage.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
            {statusMessage.type === 'error' && <AlertCircle className="h-4 w-4 shrink-0" />}
            {statusMessage.type === 'info' && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
            <span className="flex-1">{statusMessage.text}</span>
          </div>
        )}

        {/* Confirmación en línea para restaurar respaldo */}
        {confirmRestoreFile && (
          <div className="p-3.5 rounded-xl bg-amber-950/50 border border-amber-500/50 text-xs space-y-2.5">
            <p className="text-amber-200 font-semibold">
              ¿Deseas restaurar la copia "{confirmRestoreFile.name}"? Tus comidas e historial se actualizarán con este respaldo.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmRestoreFile(null)}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => executeRestore(confirmRestoreFile)}
                className="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer"
              >
                Sí, Restaurar Ahora
              </button>
            </div>
          </div>
        )}

        {/* Lista de Respaldos en Google Drive */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 px-1">
            <span className="flex items-center gap-1.5">
              <FolderCheck className="h-4 w-4 text-indigo-400" /> Archivos de Respaldo Compartibles entre Apps
            </span>
            {activeToken && (
              <button
                type="button"
                onClick={loadBackupsList}
                disabled={loading}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
              >
                Actualizar lista
              </button>
            )}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 max-h-44 overflow-y-auto space-y-1.5">
            {loading ? (
              <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-xs">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                <span>Consultando tu Pool de almacenamiento...</span>
              </div>
            ) : backups.length === 0 ? (
              <div className="py-5 text-center text-slate-400 text-xs">
                {activeToken 
                  ? 'No hay copias previas en la carpeta. ¡Presiona "Guardar y Sincronizar Ahora" para crear la primera!' 
                  : 'Conecta tu cuenta de Google Drive arriba para ver o restaurar tus archivos.'}
              </div>
            ) : (
              backups.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition text-xs"
                >
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    <FileText className="h-4 w-4 text-indigo-400 shrink-0" />
                    <div className="truncate">
                      <p className="font-semibold text-slate-200 truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString() : 'Fecha desconocida'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                        title="Ver en Google Drive"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirmRestoreFile(file)}
                      className="py-1 px-2.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Download className="h-3 w-3" />
                      <span>Restaurar</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Database className="h-3.5 w-3.5 text-teal-400" /> Carpeta compartida: <code className="text-indigo-300">InsulinSmartCalc_Backups</code>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
