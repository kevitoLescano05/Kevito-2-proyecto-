/**
 * Google Drive Cloud Sync Service
 * Allows syncing meals, bolus history, and backup archives directly to the user's Google Drive.
 * Uses official Google Drive REST API v3 with the least-privilege 'drive.file' scope.
 */

// In-memory cache for Google Drive access token (never persisted to localStorage for security)
let cachedDriveAccessToken: string | null = null;

export function setDriveAccessToken(token: string | null) {
  cachedDriveAccessToken = token;
}

export function getDriveAccessToken(): string | null {
  return cachedDriveAccessToken;
}

export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
}

const APP_FOLDER_NAME = 'InsulinSmartCalc_Backups';

/**
 * Finds or creates the dedicated application folder in user's Google Drive
 */
export async function getOrCreateAppFolder(token: string): Promise<string> {
  // Search if folder already exists
  const query = encodeURIComponent(`mimeType = 'application/vnd.google-apps.folder' and name = '${APP_FOLDER_NAME}' and trashed = false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Error al buscar carpeta en Google Drive: ${errText}`);
  }

  const data = await searchRes.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Create folder if it doesn't exist
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: APP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Copias de seguridad automáticas y archivo de comidas de la Calculadora de Insulina',
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Error al crear carpeta en Google Drive: ${errText}`);
  }

  const created = await createRes.json();
  return created.id;
}

/**
 * Uploads a JSON backup or meal archive to Google Drive
 */
export async function uploadBackupToDrive(
  token: string,
  fileName: string,
  content: object | string,
  existingFileId?: string
): Promise<DriveFileInfo> {
  const folderId = await getOrCreateAppFolder(token);
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const jsonContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    ...(existingFileId ? {} : { parents: [folderId] }),
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    jsonContent +
    closeDelimiter;

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,name,mimeType,modifiedTime,webViewLink`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,webViewLink`;

  const method = existingFileId ? 'PATCH' : 'POST';

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error al guardar en Google Drive: ${err}`);
  }

  return await res.json();
}

/**
 * Uploads a food plate or nutritional label image to the user's Google Drive
 */
export async function uploadImageToDrive(
  token: string,
  fileName: string,
  base64DataUrl: string
): Promise<DriveFileInfo> {
  const folderId = await getOrCreateAppFolder(token);

  // Extract content type and raw base64
  const matches = base64DataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  const mimeType = matches ? matches[1] : 'image/jpeg';
  const base64Data = matches ? matches[2] : base64DataUrl;

  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });

  const metadata = {
    name: fileName,
    mimeType,
    parents: [folderId],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error al subir imagen a Google Drive: ${err}`);
  }

  return await res.json();
}

/**
 * Lists backups stored in the app's Google Drive folder
 */
export async function listDriveBackups(token: string): Promise<DriveFileInfo[]> {
  const folderId = await getOrCreateAppFolder(token);
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,modifiedTime,size,webViewLink)&orderBy=modifiedTime desc`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error al listar archivos de Google Drive: ${err}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Downloads a backup file content from Google Drive
 */
export async function downloadDriveFile(token: string, fileId: string): Promise<any> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error al descargar de Google Drive: ${err}`);
  }

  return await res.json();
}

// ============================================================================
// POOL MULTI-NUBE EXPANDIBLE (Múltiples cuentas Google Drive + MEGA + Koofr + pCloud + Box + Cloudflare R2)
// ============================================================================

export interface DrivePoolAccount {
  id: string;
  email: string;
  displayName: string;
  token?: string;
  quotaTotalGB: number;
  quotaUsedGB: number;
  addedAt: string;
  lastSyncAt?: string;
}

export type ExternalCloudProviderId =
  | 'mega'
  | 'koofr'
  | 'pcloud'
  | 'box'
  | 'cloudflare_r2'
  | 'backblaze_b2';

export interface ExternalCloudNode {
  id: string;
  provider: ExternalCloudProviderId;
  providerName: string;
  accountLabel: string;
  endpointUrl: string;
  username?: string;
  secretOrToken?: string;
  quotaTotalGB: number;
  addedAt: string;
  lastSyncAt?: string;
  status: 'connected' | 'ready';
}

const DRIVE_POOL_STORAGE_KEY = 'insu_calc_drive_pool_accounts_v1';
const EXTERNAL_CLOUD_STORAGE_KEY = 'insu_calc_external_cloud_nodes_v1';

// In-memory map of active tokens for secondary Google Drive accounts
const secondaryDriveTokens = new Map<string, string>();

export function getDrivePoolAccounts(): DrivePoolAccount[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DRIVE_POOL_STORAGE_KEY);
    if (!raw) return [];
    const parsed: DrivePoolAccount[] = JSON.parse(raw);
    return parsed.map((acc) => ({
      ...acc,
      token: secondaryDriveTokens.get(acc.email) || acc.token,
    }));
  } catch {
    return [];
  }
}

export function saveDrivePoolAccounts(accounts: DrivePoolAccount[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const sanitized = accounts.map(({ token, ...rest }) => {
      if (token) secondaryDriveTokens.set(rest.email, token);
      return rest;
    });
    localStorage.setItem(DRIVE_POOL_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (e) {
    console.error('Error guardando pool de cuentas Drive:', e);
  }
}

export function removeDrivePoolAccount(email: string): DrivePoolAccount[] {
  secondaryDriveTokens.delete(email);
  const updated = getDrivePoolAccounts().filter((a) => a.email !== email);
  saveDrivePoolAccounts(updated);
  return updated;
}

/**
 * Fetches storage quota from Google Drive v3 about endpoint
 */
export async function fetchDriveAccountQuota(token: string): Promise<{ totalGB: number; usedGB: number; email?: string; displayName?: string }> {
  try {
    const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota,user', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { totalGB: 15, usedGB: 0 };
    const data = await res.json();
    const limitBytes = Number(data?.storageQuota?.limit || 0);
    const usageBytes = Number(data?.storageQuota?.usage || 0);
    const totalGB = limitBytes > 0 ? Math.round((limitBytes / (1024 ** 3)) * 10) / 10 : 15;
    const usedGB = usageBytes > 0 ? Math.round((usageBytes / (1024 ** 3)) * 100) / 100 : 0;
    return {
      totalGB: totalGB || 15,
      usedGB,
      email: data?.user?.emailAddress,
      displayName: data?.user?.displayName,
    };
  } catch {
    return { totalGB: 15, usedGB: 0 };
  }
}

export function getExternalCloudNodes(): ExternalCloudNode[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(EXTERNAL_CLOUD_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveExternalCloudNodes(nodes: ExternalCloudNode[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(EXTERNAL_CLOUD_STORAGE_KEY, JSON.stringify(nodes));
  } catch (e) {
    console.error('Error guardando nodos de nube externa:', e);
  }
}

export function addExternalCloudNode(node: Omit<ExternalCloudNode, 'id' | 'addedAt'>): ExternalCloudNode[] {
  const current = getExternalCloudNodes();
  const newNode: ExternalCloudNode = {
    ...node,
    id: `cloud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    addedAt: new Date().toISOString(),
  };
  const updated = [...current, newNode];
  saveExternalCloudNodes(updated);
  return updated;
}

export function removeExternalCloudNode(id: string): ExternalCloudNode[] {
  const updated = getExternalCloudNodes().filter((n) => n.id !== id);
  saveExternalCloudNodes(updated);
  return updated;
}

export const CLOUD_PROVIDER_CATALOG: Record<
  ExternalCloudProviderId,
  {
    name: string;
    freeGB: number;
    defaultEndpoint: string;
    protocol: string;
    setupHint: string;
  }
> = {
  mega: {
    name: 'MEGA Cloud',
    freeGB: 20,
    defaultEndpoint: 'https://g.api.mega.co.nz/cs',
    protocol: 'Puente API / WebDAV (MEGA CMD)',
    setupHint: 'Te da 20 GB gratis al registrarte. Ingresa tu correo de cuenta MEGA y llave/token de sincronización.',
  },
  koofr: {
    name: 'Koofr Cloud',
    freeGB: 10,
    defaultEndpoint: 'https://app.koofr.net/dav/Koofr',
    protocol: 'WebDAV Oficial Abierto',
    setupHint: 'Te da 10 GB gratis y permite enchufar otros Drives adentro. Usa tu correo y contraseña de aplicación WebDAV.',
  },
  pcloud: {
    name: 'pCloud Suiza',
    freeGB: 10,
    defaultEndpoint: 'https://webdav.pcloud.com',
    protocol: 'WebDAV / REST API',
    setupHint: 'Te da 10 GB gratis al registrarte. Conecta directo mediante WebDAV o token.',
  },
  box: {
    name: 'Box Drive',
    freeGB: 10,
    defaultEndpoint: 'https://dav.box.com/dav',
    protocol: 'WebDAV / REST API',
    setupHint: 'Te da 10 GB gratis. Ideal para respaldos JSON y archivos compartidos entre apps.',
  },
  cloudflare_r2: {
    name: 'Cloudflare R2 (Developers)',
    freeGB: 10,
    defaultEndpoint: 'https://r2.cloudflarestorage.com',
    protocol: 'S3 Compatible / llave fija',
    setupHint: '10 GB gratis permanentes para desarrolladores de apps. Nunca vence la sesión.',
  },
  backblaze_b2: {
    name: 'Backblaze B2 Cloud',
    freeGB: 10,
    defaultEndpoint: 'https://s3.us-west-000.backblazeb2.com',
    protocol: 'S3 / REST API',
    setupHint: '10 GB gratis permanentes para guardar bases de datos y fotos entre todas tus apps.',
  },
};

/**
 * Syncs a backup payload to all connected clouds in the Pool (Primary Drive + Secondary Drives + External Clouds)
 */
export async function syncBackupAcrossMultiCloudPool(
  primaryToken: string | null,
  fileName: string,
  backupPayload: any
): Promise<{
  syncedTargets: string[];
  failedTargets: string[];
}> {
  const syncedTargets: string[] = [];
  const failedTargets: string[] = [];

  // 1. Primary Google Drive (15 GB)
  if (primaryToken) {
    try {
      await uploadBackupToDrive(primaryToken, fileName, backupPayload);
      syncedTargets.push('Google Drive Principal (15 GB)');
    } catch (e: any) {
      failedTargets.push(`Google Drive Principal (${e?.message || 'Error'})`);
    }
  }

  // 2. Additional Google Drive Pool Accounts (+15 GB each)
  const poolAccounts = getDrivePoolAccounts();
  const updatedPool: DrivePoolAccount[] = [];
  for (const acc of poolAccounts) {
    const tok = acc.token || secondaryDriveTokens.get(acc.email);
    if (tok) {
      try {
        await uploadBackupToDrive(tok, fileName, backupPayload);
        syncedTargets.push(`Google Drive (${acc.email})`);
        updatedPool.push({ ...acc, lastSyncAt: new Date().toISOString() });
      } catch {
        failedTargets.push(`Google Drive (${acc.email})`);
        updatedPool.push(acc);
      }
    } else {
      updatedPool.push(acc);
    }
  }
  if (updatedPool.length > 0) {
    saveDrivePoolAccounts(updatedPool);
  }

  // 3. External Cloud Nodes (MEGA, Koofr, pCloud, Box, Cloudflare R2, Backblaze B2)
  const extNodes = getExternalCloudNodes();
  const updatedNodes: ExternalCloudNode[] = [];
  for (const node of extNodes) {
    try {
      const res = await fetch('/api/cloud-pool/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node,
          fileName,
          payload: backupPayload,
        }),
      });
      if (res.ok) {
        syncedTargets.push(`${node.providerName} (${node.accountLabel})`);
        updatedNodes.push({ ...node, lastSyncAt: new Date().toISOString(), status: 'connected' });
      } else {
        failedTargets.push(`${node.providerName} (${node.accountLabel})`);
        updatedNodes.push(node);
      }
    } catch {
      failedTargets.push(`${node.providerName} (${node.accountLabel})`);
      updatedNodes.push(node);
    }
  }
  if (updatedNodes.length > 0) {
    saveExternalCloudNodes(updatedNodes);
  }

  // 4. Save to Cross-App Shared Bridge on server
  try {
    await fetch('/api/sync-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backupPayload),
    });
  } catch {
    // Ignore local bridge error
  }

  return { syncedTargets, failedTargets };
}

