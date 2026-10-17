import crypto from 'crypto';
import { GlucoseTrend, LiveCgmReading } from '../src/types';

const LIBRELINKUP_REGIONS: Record<string, string> = {
  Auto: 'https://api.libreview.io',
  LA: 'https://api-la.libreview.io',
  US: 'https://api-us.libreview.io',
  EU: 'https://api-eu.libreview.io',
  EU2: 'https://api-eu2.libreview.io',
  DE: 'https://api-de.libreview.io',
  FR: 'https://api-fr.libreview.io',
  CA: 'https://api-ca.libreview.io',
  AP: 'https://api-ap.libreview.io',
  AU: 'https://api-au.libreview.io',
  AE: 'https://api-ae.libreview.io',
  JP: 'https://api-jp.libreview.io',
};

/**
 * Convierte el número de flecha de LibreLinkUp (1 a 5) a nuestro tipo GlucoseTrend.
 * 1 = Bajando rápido, 2 = Bajando, 3 = Estable, 4 = Subiendo, 5 = Subiendo rápido
 */
export function mapLibreTrendArrow(trendNum: number | undefined): GlucoseTrend {
  switch (trendNum) {
    case 1:
      return 'falling_fast';
    case 2:
      return 'falling';
    case 3:
      return 'flat';
    case 4:
      return 'rising';
    case 5:
      return 'rising_fast';
    default:
      return 'flat';
  }
}

/**
 * Convierte las direcciones estándar de Nightscout / Dexcom / xDrip+ a GlucoseTrend.
 */
export function mapDirectionStringToTrend(direction: string | number | undefined): GlucoseTrend {
  if (typeof direction === 'number') {
    // Dexcom numeric trend codes: 1=DoubleUp, 2=SingleUp, 3=FortyFiveUp, 4=Flat, 5=FortyFiveDown, 6=SingleDown, 7=DoubleDown
    switch (direction) {
      case 1:
        return 'rising_fast';
      case 2:
      case 3:
        return 'rising';
      case 4:
        return 'flat';
      case 5:
      case 6:
        return 'falling';
      case 7:
        return 'falling_fast';
      default:
        return 'flat';
    }
  }

  const clean = String(direction || '').trim().toLowerCase();
  if (clean.includes('doubleup') || clean.includes('rapidup') || clean === '⬆️' || clean === '↑↑') {
    return 'rising_fast';
  }
  if (clean.includes('singleup') || clean.includes('fortyfiveup') || clean === '↗️' || clean === '↑' || clean === '↗') {
    return 'rising';
  }
  if (clean.includes('doubledown') || clean.includes('rapiddown') || clean === '⬇️⬇️' || clean === '⬇️' || clean === '↓↓') {
    return 'falling_fast';
  }
  if (clean.includes('singledown') || clean.includes('fortyfivedown') || clean === '↘️' || clean === '↓' || clean === '↘') {
    return 'falling';
  }
  return 'flat';
}

/**
 * Conector Oficial LibreLinkUp (Abbott FreeStyle Libre 1 / 2 / 3)
 */
export async function fetchLibreLinkUpGlucose(params: {
  email: string;
  password: string;
  region?: string;
}): Promise<LiveCgmReading> {
  const email = (params.email || '').trim();
  const password = params.password || '';
  if (!email || !password) {
    throw new Error('Debes ingresar tu correo y contraseña de la app LibreLinkUp.');
  }

  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    version: '4.12.0',
    product: 'llu.android',
    'Cache-Control': 'no-cache',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36',
  };

  let baseUrl = LIBRELINKUP_REGIONS[params.region || 'Auto'] || LIBRELINKUP_REGIONS.Auto;

  // 1. Login inicial (con soporte automático de redirección de región de Abbott)
  let loginRes = await fetch(`${baseUrl}/llu/auth/login`, {
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify({ email, password }),
  });

  let loginJson: any = await loginRes.json().catch(() => null);

  // Si Abbott indica redirección a otro servidor regional (ej. 'eu', 'us', 'la', 'de')
  if (loginJson?.data?.redirect && loginJson?.data?.region) {
    const redirectedRegion = String(loginJson.data.region).toLowerCase();
    baseUrl = `https://api-${redirectedRegion}.libreview.io`;
    loginRes = await fetch(`${baseUrl}/llu/auth/login`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({ email, password }),
    });
    loginJson = await loginRes.json().catch(() => null);
  }

  if (!loginJson || loginJson.status !== 0 || !loginJson.data?.authTicket?.token) {
    if (loginJson?.status === 2) {
      throw new Error(
        'Correo o contraseña de LibreLinkUp incorrectos. Asegúrate de usar la cuenta de la app "LibreLinkUp" (seguidores).'
      );
    }
    if (loginJson?.status === 4) {
      throw new Error(
        'Debes abrir la app oficial LibreLinkUp en tu celular y aceptar los últimos Términos de Uso de Abbott.'
      );
    }
    throw new Error(
      loginJson?.error?.message ||
        'No se pudo iniciar sesión en LibreLinkUp. Verifica tu correo, contraseña y que hayas aceptado la invitación en la app LibreLinkUp.'
    );
  }

  const token = loginJson.data.authTicket.token;
  const userId = loginJson.data.user?.id || '';
  const accountIdHash = userId
    ? crypto.createHash('sha256').update(String(userId)).digest('hex')
    : '';

  const authHeaders: Record<string, string> = {
    ...baseHeaders,
    Authorization: `Bearer ${token}`,
    ...(accountIdHash ? { 'Account-Id': accountIdHash } : {}),
  };

  // 2. Consultar conexiones de sensores activos
  const connRes = await fetch(`${baseUrl}/llu/connections`, {
    method: 'GET',
    headers: authHeaders,
  });

  const connJson: any = await connRes.json().catch(() => null);
  const connections = Array.isArray(connJson?.data) ? connJson.data : [];

  if (connections.length === 0) {
    throw new Error(
      'Tu cuenta de LibreLinkUp conectó bien, pero aún no tiene ningún sensor vinculado. En tu app FreeStyle LibreLink ve a "Aplicaciones conectadas -> LibreLinkUp" y envíate la invitación a este mismo correo.'
    );
  }

  const activePatient = connections[0];
  const measurement = activePatient.glucoseMeasurement || activePatient.glucoseItem;

  if (!measurement || typeof measurement.ValueInMgPerDl !== 'number') {
    throw new Error(
      'Se encontró tu perfil en LibreLinkUp pero no hay lecturas recientes del sensor. Escanea tu sensor con el celular e intenta de nuevo.'
    );
  }

  return {
    glucoseMgDl: Math.round(measurement.ValueInMgPerDl),
    trendArrow: mapLibreTrendArrow(measurement.TrendArrow),
    timestamp: measurement.Timestamp
      ? new Date(measurement.Timestamp).toISOString()
      : new Date().toISOString(),
    sourceLabel: `FreeStyle LibreLinkUp (${activePatient.firstName || 'Sensor Activo'})`,
  };
}

/**
 * Conector Oficial Dexcom Share (Dexcom G6 / G7 / ONE / ONE+)
 */
export async function fetchDexcomShareGlucose(params: {
  username: string;
  password: string;
  region?: 'ous' | 'us' | 'jp';
}): Promise<LiveCgmReading> {
  const accountName = (params.username || '').trim();
  const password = params.password || '';
  if (!accountName || !password) {
    throw new Error('Debes ingresar tu usuario (correo o teléfono) y contraseña de Dexcom Share.');
  }

  const baseUrl =
    params.region === 'us'
      ? 'https://share2.dexcom.com/ShareWebServices/Services'
      : params.region === 'jp'
      ? 'https://share.dexcom.jp/ShareWebServices/Services'
      : 'https://shareous1.dexcom.com/ShareWebServices/Services';

  const applicationId = 'd89443d2-327c-4a6f-89e5-496bbb0317db';
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': 'Dexcom Share/3.0.2.11 CFNetwork/711.2.23 Darwin/14.0.0',
  };

  // Paso 1: Obtener accountId
  const authRes = await fetch(`${baseUrl}/General/AuthenticatePublisherAccount`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      accountName,
      password,
      applicationId,
    }),
  });

  const accountIdRaw = await authRes.text();
  const accountId = accountIdRaw.replace(/"/g, '').trim();

  if (!authRes.ok || !accountId || accountId === '00000000-0000-0000-0000-000000000000') {
    throw new Error(
      'Usuario o contraseña de Dexcom incorrectos, o región equivocada (prueba cambiar entre "Fuera de EE.UU. / Latinoamérica / Europa" y "Estados Unidos").'
    );
  }

  // Paso 2: Obtener sessionId
  const loginRes = await fetch(`${baseUrl}/General/LoginPublisherAccountById`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      accountId,
      password,
      applicationId,
    }),
  });

  const sessionIdRaw = await loginRes.text();
  const sessionId = sessionIdRaw.replace(/"/g, '').trim();

  if (!loginRes.ok || !sessionId || sessionId === '00000000-0000-0000-0000-000000000000') {
    throw new Error('No se pudo abrir sesión en Dexcom Share. Verifica que la función "Share" esté activa en tu app Dexcom.');
  }

  // Paso 3: Leer últimas glucemias
  const valuesRes = await fetch(
    `${baseUrl}/Publisher/ReadGlucoseValues?sessionId=${encodeURIComponent(sessionId)}&minutes=1440&maxCount=2`,
    {
      method: 'POST',
      headers,
    }
  );

  const entries: any[] = await valuesRes.json().catch(() => []);
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('Conectado a Dexcom Share, pero no hay lecturas recientes en las últimas 24 horas.');
  }

  const latest = entries[0];
  const prev = entries[1];
  const glucoseMgDl = Math.round(Number(latest.Value));
  const deltaMgDl = prev && typeof prev.Value === 'number' ? Math.round(glucoseMgDl - Number(prev.Value)) : undefined;

  // Parsear fecha estilo "/Date(1712345678000)/"
  let timestamp = new Date().toISOString();
  const wtMatch = String(latest.WT || latest.ST || '').match(/Date\((\d+)/);
  if (wtMatch && wtMatch[1]) {
    timestamp = new Date(Number(wtMatch[1])).toISOString();
  }

  return {
    glucoseMgDl,
    trendArrow: mapDirectionStringToTrend(latest.Trend),
    timestamp,
    sourceLabel: 'Dexcom Share (Tiempo Real)',
    deltaMgDl,
  };
}

/**
 * Conector Universal Nightscout (Medtronic CareLink, xDrip+, Juggluco, Loop, AndroidAPS, Sibionics, Sinocare, Eversense)
 */
export async function fetchNightscoutGlucose(params: {
  nightscoutUrl: string;
  token?: string;
}): Promise<LiveCgmReading> {
  let cleanUrl = (params.nightscoutUrl || '').trim().replace(/\/+$/, '');
  if (!cleanUrl) {
    throw new Error('Debes ingresar la dirección web (URL) de tu sitio Nightscout.');
  }
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = `https://${cleanUrl}`;
  }

  // Remover si el usuario pegó "/api/v1/entries..." al final
  cleanUrl = cleanUrl.replace(/\/api\/v1\/.*$/i, '');

  const token = (params.token || '').trim();
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  let endpoint = `${cleanUrl}/api/v1/entries/sgv.json?count=2`;
  if (token) {
    // Soportar tanto token de acceso como API_SECRET sha1
    endpoint += `&token=${encodeURIComponent(token)}`;
    headers['API-SECRET'] = crypto.createHash('sha1').update(token).digest('hex');
  }

  const res = await fetch(endpoint, { method: 'GET', headers });
  if (!res.ok) {
    throw new Error(`No se pudo conectar con Nightscout (Código ${res.status}). Verifica la URL y el Token.`);
  }

  const entries: any[] = await res.json().catch(() => []);
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('Tu servidor Nightscout respondió pero no tiene lecturas de glucosa cargadas.');
  }

  const latest = entries[0];
  const prev = entries[1];
  const sgv = Number(latest.sgv || latest.mbg);
  if (!sgv || isNaN(sgv)) {
    throw new Error('Formato de lectura inválido recibido desde Nightscout.');
  }

  const deltaMgDl =
    prev && (prev.sgv || prev.mbg)
      ? Math.round(sgv - Number(prev.sgv || prev.mbg))
      : typeof latest.delta === 'number'
      ? Math.round(latest.delta)
      : undefined;

  const timestamp = latest.dateString
    ? new Date(latest.dateString).toISOString()
    : latest.date
    ? new Date(Number(latest.date)).toISOString()
    : new Date().toISOString();

  return {
    glucoseMgDl: Math.round(sgv),
    trendArrow: mapDirectionStringToTrend(latest.direction || latest.trend),
    timestamp,
    sourceLabel: `Nightscout (${latest.device || 'Puente Universal'})`,
    deltaMgDl,
  };
}
