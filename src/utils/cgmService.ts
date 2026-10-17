import {
  CgmCloudProvider,
  CgmConnectionConfig,
  GlucoseTrend,
  LiveCgmReading,
  SensorBrand,
} from '../types';

export interface SensorBrandInfo {
  id: SensorBrand;
  name: string;
  shortName: string;
  emoji: string;
  technology: string;
  recommendedProviders: CgmCloudProvider[];
  description: string;
}

export const SENSOR_BRAND_CATALOG: SensorBrandInfo[] = [
  {
    id: 'freestyle_libre',
    name: 'FreeStyle Libre 1 / 2 / 3 / Plus (Abbott)',
    shortName: 'FreeStyle Libre',
    emoji: '📡',
    technology: 'NFC + Bluetooth (en celular o Lector oficial)',
    recommendedProviders: ['librelinkup', 'xdrip_local', 'nightscout'],
    description:
      'Si escaneás con el celular, podés conectar LibreLinkUp para traer tu glucosa y flecha solas. Si usás el aparatito Lector sin NFC o podés combinarlo con una bomba de cualquier marca.',
  },
  {
    id: 'dexcom',
    name: 'Dexcom G6 / G7 / ONE / ONE+',
    shortName: 'Dexcom',
    emoji: '🟢',
    technology: 'Bluetooth continuo cada 5 minutos (compatible con bombas Tandem / Omnipod)',
    recommendedProviders: ['dexcom_share', 'nightscout', 'xdrip_local'],
    description:
      'Manda la glucosa sola por Bluetooth cada 5 min. Conectá tu cuenta de Dexcom Share para que aparezca sola en la calculadora.',
  },
  {
    id: 'medtronic',
    name: 'Medtronic Guardian Connect / Bombas 780G / 770G / 640G',
    shortName: 'Medtronic Guardian',
    emoji: '💙',
    technology: 'Bluetooth propio de Bomba Medtronic (sin NFC)',
    recommendedProviders: ['nightscout', 'xdrip_local'],
    description:
      'El sensor Guardian se comunica por Bluetooth con la bomba o CareLink. Podés vincularlo mediante Nightscout o xDrip+ (CareLink Follower). También podés usar bomba Medtronic con un sensor FreeStyle Libre.',
  },
  {
    id: 'sibionics',
    name: 'Sibionics GS1 (Sensor Continuo sin pinchazos)',
    shortName: 'Sibionics GS1',
    emoji: '🟣',
    technology: 'Bluetooth continuo cada 5 min (14 días sin calibración)',
    recommendedProviders: ['xdrip_local', 'nightscout'],
    description:
      'Se conecta en tiempo real a través del puente xDrip+ / Juggluco en el celular o mediante Nightscout.',
  },
  {
    id: 'sinocare',
    name: 'Sinocare iCan i3 CGM',
    shortName: 'Sinocare iCan',
    emoji: '🩵',
    technology: 'Bluetooth continuo cada 3 min',
    recommendedProviders: ['xdrip_local', 'nightscout'],
    description:
      'Compatible mediante puente xDrip+ en el celular o subida a Nightscout.',
  },
  {
    id: 'eversense',
    name: 'Senseonics Eversense E3 (Sensor implantable)',
    shortName: 'Eversense',
    emoji: '🧡',
    technology: 'Transmisor inteligente Bluetooth',
    recommendedProviders: ['xdrip_local', 'nightscout'],
    description:
      'Transmite lecturas continuas al teléfono; integrable por xDrip+ local o Nightscout.',
  },
  {
    id: 'medtrum',
    name: 'Medtrum TouchCare / Nano CGM',
    shortName: 'Medtrum',
    emoji: '🩷',
    technology: 'Bluetooth continuo (compatible con parche bomba Medtrum)',
    recommendedProviders: ['xdrip_local', 'nightscout'],
    description:
      'Lectura continua integrable mediante xDrip+ o Nightscout.',
  },
  {
    id: 'accu_chek',
    name: 'Accu-Chek SmartGuide / Guide / Instant (Bluetooth)',
    shortName: 'Accu-Chek',
    emoji: '🩸',
    technology: 'Bluetooth BLE estándar / Sensor continuo',
    recommendedProviders: ['web_bluetooth', 'xdrip_local'],
    description:
      'Los glucómetros Accu-Chek con Bluetooth pueden leerse directo por Bluetooth Web desde Chrome o vía xDrip+.',
  },
  {
    id: 'other_cgm',
    name: 'Otra marca de Sensor o Glucómetro (Contour, OneTouch, GlucoMen, etc.)',
    shortName: 'Otro Sensor / Glucómetro',
    emoji: '📟',
    technology: 'Universal (Bluetooth / Puente / Manual)',
    recommendedProviders: ['xdrip_local', 'nightscout', 'web_bluetooth'],
    description:
      'Podés conectarlo por el puente universal xDrip+/Juggluco, por Nightscout, por Bluetooth o escribir el valor a mano.',
  },
];

function mapLocalDirectionToTrend(direction: string | undefined): GlucoseTrend {
  const clean = String(direction || '').trim().toLowerCase();
  if (clean.includes('doubleup') || clean.includes('rapidup')) return 'rising_fast';
  if (clean.includes('singleup') || clean.includes('fortyfiveup')) return 'rising';
  if (clean.includes('doubledown') || clean.includes('rapiddown')) return 'falling_fast';
  if (clean.includes('singledown') || clean.includes('fortyfivedown')) return 'falling';
  return 'flat';
}

/**
 * Lee directamente del servidor local de xDrip+ o Juggluco corriendo en el mismo celular (127.0.0.1:17580).
 * Soporta cualquier marca de sensor conectada a xDrip+, Juggluco, Diabox o AndroidAPS.
 */
export async function fetchLocalPhoneXdripOrJuggluco(port: number = 17580): Promise<LiveCgmReading> {
  const urlsToTry = [
    `http://127.0.0.1:${port}/sgv.json?count=2`,
    `http://localhost:${port}/sgv.json?count=2`,
  ];

  let lastError: any = null;
  for (const url of urlsToTry) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) continue;
      const entries: any[] = await res.json();
      if (Array.isArray(entries) && entries.length > 0) {
        const latest = entries[0];
        const prev = entries[1];
        const sgv = Math.round(Number(latest.sgv));
        if (!sgv || isNaN(sgv)) continue;

        const deltaMgDl =
          prev && prev.sgv ? Math.round(sgv - Number(prev.sgv)) : undefined;

        const ts = latest.dateString
          ? new Date(latest.dateString).toISOString()
          : latest.date
          ? new Date(Number(latest.date)).toISOString()
          : new Date().toISOString();

        return {
          glucoseMgDl: sgv,
          trendArrow: mapLocalDirectionToTrend(latest.direction),
          timestamp: ts,
          sourceLabel: 'xDrip+ / Juggluco (Directo del Celular)',
          deltaMgDl,
        };
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    lastError?.message?.includes('Failed to fetch')
      ? `No se detectó xDrip+ ni Juggluco activo en el puerto ${port} de este dispositivo. En xDrip+ activá "Ajustes -> Inter-app -> Servicio Web de xDrip (ON)" o en Juggluco activá "Servidor Web (puerto 17580)".`
      : 'No se pudo leer la glucemia desde xDrip+ / Juggluco local.'
  );
}

/**
 * Lee directamente por Bluetooth Web (GATT Glucose Service 0x1808) para glucómetros y sensores BLE estándar.
 */
export async function fetchWebBluetoothGlucose(): Promise<LiveCgmReading> {
  const nav = navigator as any;
  if (!nav || !nav.bluetooth) {
    throw new Error(
      'Tu navegador actual no soporta Bluetooth directo (Web Bluetooth). Usá Google Chrome en Android o PC, o elegí la conexión por LibreLinkUp / Dexcom / Nightscout.'
    );
  }

  const device = await nav.bluetooth.requestDevice({
    filters: [{ services: ['glucose'] }, { services: [0x1808] }],
    optionalServices: ['glucose', 0x1808, 'battery_service'],
  });

  if (!device.gatt) {
    throw new Error('El dispositivo Bluetooth seleccionado no permite lectura GATT.');
  }

  const server = await device.gatt.connect();
  const service = await server.getPrimaryService('glucose');
  const characteristic = await service.getCharacteristic('glucose_measurement');

  return new Promise<LiveCgmReading>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error(
          'Tiempo de espera agotado esperando el valor del medidor Bluetooth. Asegurate de que el medidor esté encendido y con una tira o lectura reciente.'
        )
      );
    }, 15000);

    const handleValue = (event: any) => {
      try {
        clearTimeout(timeout);
        const value: DataView = event.target.value;
        // Según especificación Bluetooth SIG GATT Glucose Measurement (0x2A18):
        // Byte 0: Flags (bit 2 indica unidades: 0 = kg/L -> mg/dL, 1 = mol/L)
        // Bytes 1-2: Sequence Number
        // Bytes 3-9: Base Time (7 bytes)
        // Si bit 0 de flags está activo, hay 2 bytes de Time Offset (bytes 10-11)
        const flags = value.getUint8(0);
        const hasTimeOffset = (flags & 0x01) !== 0;
        const concentrationOffset = hasTimeOffset ? 12 : 10;

        let rawSfloat = value.getUint16(concentrationOffset, true);
        let mantissa = rawSfloat & 0x0fff;
        if (mantissa >= 0x0800) mantissa -= 0x1000;
        let exponent = (rawSfloat >> 12) & 0x0f;
        if (exponent >= 0x08) exponent -= 0x10;

        // En mg/dL suele venir con exponente -5 (kg/L * 100000 = mg/dL)
        const isMolPerL = (flags & 0x04) !== 0;
        let mgDl = mantissa * Math.pow(10, exponent) * (isMolPerL ? 1801.82 : 100000);
        if (mgDl < 20 || mgDl > 600) {
          // Si ya venía escalado directo
          mgDl = mantissa;
        }

        resolve({
          glucoseMgDl: Math.round(mgDl),
          trendArrow: 'flat',
          timestamp: new Date().toISOString(),
          sourceLabel: `Bluetooth (${device.name || 'Medidor BLE'})`,
        });
      } catch (e: any) {
        reject(new Error('No se pudo decodificar la lectura Bluetooth del medidor.'));
      }
    };

    characteristic
      .startNotifications()
      .then(() => {
        characteristic.addEventListener('characteristicvaluechanged', handleValue);
      })
      .catch((err: any) => {
        clearTimeout(timeout);
        reject(new Error(err?.message || 'Error al suscribirse al medidor Bluetooth.'));
      });
  });
}

/**
 * Función principal unificada para traer la glucosa en vivo desde el método que haya elegido el usuario.
 */
export async function fetchLiveGlucoseFromConfiguredSource(
  config: CgmConnectionConfig
): Promise<LiveCgmReading> {
  if (!config || config.provider === 'none') {
    throw new Error('Primero configura un método de conexión automática (LibreLinkUp, Dexcom, Nightscout, xDrip+ o Bluetooth).');
  }

  if (config.provider === 'xdrip_local') {
    return fetchLocalPhoneXdripOrJuggluco(config.xdripLocalPort || 17580);
  }

  if (config.provider === 'web_bluetooth') {
    return fetchWebBluetoothGlucose();
  }

  // Conexiones en la nube vía nuestro backend (/api/cgm/fetch-glucose) para evitar bloqueos CORS
  const res = await fetch('/api/cgm/fetch-glucose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.reading) {
    throw new Error(data?.error || 'No se pudo obtener la lectura del sensor en la nube.');
  }

  return data.reading as LiveCgmReading;
}

export function formatReadingAgeMinutes(isoTimestamp: string): {
  minutesAgo: number;
  text: string;
  isStale: boolean;
} {
  const diffMs = Math.max(0, Date.now() - new Date(isoTimestamp).getTime());
  const minutesAgo = Math.round(diffMs / 60000);
  if (minutesAgo <= 1) {
    return { minutesAgo, text: 'hace instantes', isStale: false };
  }
  if (minutesAgo < 60) {
    return {
      minutesAgo,
      text: `hace ${minutesAgo} min`,
      isStale: minutesAgo > 15,
    };
  }
  const hours = Math.floor(minutesAgo / 60);
  return {
    minutesAgo,
    text: `hace ${hours} h ${minutesAgo % 60} min`,
    isStale: true,
  };
}
