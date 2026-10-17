import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  BookOpen,
  Compass,
  Link2,
  MousePointerClick,
  Play,
  Pause,
  RotateCcw,
  Video,
  Sparkles,
  Smartphone,
  Activity,
  HeartPulse,
} from 'lucide-react';
import { UserSettings, SensorBrand } from '../types';
import { loadUserSettings } from '../utils/storage';

export type TutorialSectionId =
  | 'top_header_bar'
  | 'devices_tracker'
  | 'insulin_calculator'
  | 'food_analyzer'
  | 'workout_routine'
  | 'daily_tracker'
  | 'permanent_history'
  | 'community_reviews'
  | 'sponsors_donations'
  | 'glycemic_factors';

export interface AnimatedVideoSimulation {
  title: string;
  frames: {
    stepTitle: string;
    description: string;
    visualBadge: string;
    mockUI: {
      label: string;
      value: string;
      highlight?: boolean;
      subValue?: string;
    }[];
  }[];
}

export function getSensorDisplayName(brand?: SensorBrand): string {
  switch (brand) {
    case 'dexcom':
      return 'Dexcom G6 / G7';
    case 'medtronic':
      return 'Medtronic Guardian';
    case 'sibionics':
      return 'Sibionics GS1';
    case 'sinocare':
      return 'Sinocare iCan';
    case 'accu_chek':
      return 'Accu-Chek SmartGuide';
    case 'eversense':
      return 'Eversense E3';
    case 'freestyle_libre':
    default:
      return 'FreeStyle Libre';
  }
}

export function getSectionSimulation(
  sectionId: TutorialSectionId,
  userSettings?: UserSettings
): AnimatedVideoSimulation {
  const s = userSettings || loadUserSettings();
  const isSimple = s.interfaceMode === 'simple';
  const isPump = s.insulinMode === 'pump';
  const isIport = s.insulinMode === 'iport';
  const isNfc = s.glucoseMode === 'cgm_nfc';
  const isPumpSensor = s.glucoseMode === 'pump_sensor';
  const isCapillary = s.glucoseMode === 'capillary';
  const sensorName = getSensorDisplayName(s.sensorBrand);
  const isf = s.isf || 28;
  const icr = s.icr || 8;
  const weight = s.weightKg || 70;
  const isRenal = Boolean(
    s.medicalConditions?.renal || s.enableRenalProteinLimits
  );

  switch (sectionId) {
    case 'top_header_bar':
      if (isSimple) {
        return {
          title: 'Simulación Video: Barra Superior en Modo Simple',
          frames: [
            {
              stepTitle: 'Paso 1: Cambiar de Modo en Configuración (Tuerca ⚙️)',
              description:
                'Tocando la tuerca de configuración arriba a la derecha podés cambiar entre Modo Simple y Modo Completo cuando quieras.',
              visualBadge: '⚙️ Configuración Fácil',
              mockUI: [
                { label: 'Modo Actual', value: '🟢 Modo Simple', highlight: true },
                { label: 'Cambiar Modo', value: 'Dentro de Configuración (⚙️)' },
                { label: 'Acceso', value: 'Arriba a la derecha' },
              ],
            },
            {
              stepTitle: 'Paso 2: Insulina Activa (IOB) sin complicaciones',
              description:
                'El botón superior te muestra si todavía te queda insulina de un pinchazo anterior para no inyectarte de más.',
              visualBadge: '💓 Insulina en Cuerpo',
              mockUI: [
                { label: 'Insulina Activa', value: 'Calculada en automático', highlight: true },
                { label: 'Seguridad', value: 'Te protege de bajas de azúcar' },
              ],
            },
            {
              stepTitle: 'Paso 3: Configuración Rápida y Condiciones',
              description:
                'En la ruedita ponés tus dosis básicas o elegís tu condición de salud (celiaquía, riñón, etc.) de forma limpia y directa.',
              visualBadge: '⚙️ Configuración Simple',
              mockUI: [
                { label: 'Mis Dosis', value: 'Fáciles de actualizar', highlight: true },
                { label: 'Condiciones de Salud', value: 'Te cuida en silencio' },
              ],
            },
          ],
        };
      }
      return {
        title: `Simulación Video: Barra Superior & Configuración (FSI ${isf} & ICR ${icr})`,
        frames: [
          {
            stepTitle: 'Paso 1: Selector de País y Configuración de Datos',
            description:
              'Elegís tu país (ej. Argentina 🇦🇷) para tablas oficiales y abrís la configuración médica.',
            visualBadge: '🌎 Configuración Inicial',
            mockUI: [
              { label: 'País Seleccionado', value: 'Argentina (AR)', highlight: true },
              { label: 'Ratio ICR Base', value: `${icr} g HC por 1 U` },
              { label: 'Sensibilidad FSI', value: `${isf} mg/dL por 1 U` },
            ],
          },
          {
            stepTitle: 'Paso 2: Insulina Activa (IOB) en Tiempo Real',
            description:
              'El botón superior te muestra cuánta insulina rápida sigue trabajando en tu cuerpo.',
            visualBadge: '💓 IOB Activo: 2.50 U',
            mockUI: [
              { label: 'Insulina en Cuerpo', value: '2.50 U activas', highlight: true },
              { label: 'Hora de Finalización', value: 'En 1h 45m' },
              { label: 'Curva Minuto a Minuto', value: 'Sincronizada' },
            ],
          },
          {
            stepTitle: 'Paso 3: Copia de Seguridad en la Nube y Nuevo Día',
            description:
              'Respaldás tus datos en Google Drive y reiniciás el día sin borrar tu IOB por seguridad.',
            visualBadge: '☁️ Cloud Sync & Nuevo Día',
            mockUI: [
              { label: 'Google Drive Sync', value: 'Conectado OK', highlight: true },
              { label: 'Contador Diario', value: 'Listo para reiniciar' },
            ],
          },
        ],
      };

    case 'devices_tracker': {
      const step2Title = isPump
        ? 'Paso 2: Set de Infusión / Cánula de la Bomba de Insulina'
        : isIport
        ? 'Paso 2: Puerto Subcutáneo i-Port Advance'
        : 'Paso 2: Rotación de Sitios de Inyección con Pluma';

      const step2Desc = isPump
        ? 'La app controla los días de tu cánula de infusión (ej. Día 2 de 3) y te recuerda rotar el set a tiempo para asegurar una absorción perfecta.'
        : isIport
        ? 'Mide los días de tu puerto subcutáneo (ej. Día 3 de 4) y ajusta automáticamente los minutos de espera por tejido adiposo.'
        : 'Te recuerda rotar los sitios de aplicación (Abdomen Bajo, Muslo, Brazo) para proteger la piel y evitar durezas o lipodistrofias.';

      const step2Badge = isPump
        ? '📟 Cánula Bomba Día 2/3'
        : isIport
        ? '🛡️ Puerto i-Port Día 3/4'
        : '💉 Pluma: Rotación Abdomen';

      const step3Desc = isPump
        ? 'Al cumplirse los 3 días de la cánula o los 14 días del sensor, la app te muestra un aviso claro para rotar el set y calibrar.'
        : isIport
        ? 'Cuando se cumple el plazo del sensor o del i-Port, salta el aviso automático para registrar el recambio y reiniciar el contador.'
        : 'Cuando se cumple el plazo de tu sensor, salta el aviso automático para registrar el cambio y empezar un nuevo ciclo.';

      return {
        title: `Simulación Video: Dispositivos (${sensorName} ${
          isPump ? '+ Bomba' : isIport ? '+ i-Port' : '+ Pluma'
        })`,
        frames: [
          {
            stepTitle: `Paso 1: Sensor de Glucosa (${sensorName})`,
            description:
              'La app lleva la cuenta automática de los días de vida útil de tu sensor (ej. Día 10 de 14).',
            visualBadge: '⏱️ Sensor Día 10 / 14',
            mockUI: [
              { label: 'Dispositivo Activo', value: `${sensorName} 2/3`, highlight: true },
              { label: 'Días Transcurridos', value: '10 días de uso' },
              { label: 'Estado', value: 'Lectura activa y estable' },
            ],
          },
          {
            stepTitle: step2Title,
            description: step2Desc,
            visualBadge: step2Badge,
            mockUI: [
              {
                label: isPump
                  ? 'Catéter de Bomba'
                  : isIport
                  ? 'Puerto Subcutáneo'
                  : 'Inyección Manual',
                value: isPump
                  ? 'Día 2 de 3 (Cánula OK)'
                  : isIport
                  ? 'Día 3 de 4'
                  : 'Rotación activa',
                highlight: true,
              },
              {
                label: 'Ajuste de Tejido',
                value: isPump
                  ? 'Infusión continua estable'
                  : isIport
                  ? '+4 min espera por cánula'
                  : 'Aguja nueva cada dosis',
              },
            ],
          },
          {
            stepTitle: 'Paso 3: Alerta Automática de Vencimiento y Cambio',
            description: step3Desc,
            visualBadge: '🔔 Aviso de Cambio',
            mockUI: [
              {
                label: 'Alerta de Dispositivo',
                value: isPump
                  ? '¡Toca cambio de set de bomba!'
                  : '¡Toca cambio de sensor hoy!',
                highlight: true,
              },
              { label: 'Acción Rápida', value: 'Botón "Ya lo cambié hoy"' },
            ],
          },
        ],
      };
    }

    case 'insulin_calculator': {
      const target = s.targetGlucose || 110;
      const excess = Math.max(0, 180 - target);
      const correctionUnits = Number((excess / isf).toFixed(2));
      const mealUnits = Number((64 / icr).toFixed(2));
      const iob = 0.50;
      const netUnits = Number(Math.max(0, mealUnits + correctionUnits - iob).toFixed(2));
      const split1 = Number((netUnits * 0.6).toFixed(1));
      const split2 = Number((netUnits - split1).toFixed(1));

      if (isSimple) {
        return {
          title: 'Simulación Video: Calculadora Simple (Glucosa, Comida e Inyección)',
          frames: [
            {
              stepTitle: 'Paso 1: Escribís tu Glucemia Actual (ej. 180 mg/dL)',
              description:
                'Directo y sin vueltas: ponés cuánto te dio el azúcar. Sin carteles de conectar sensores, sin NFC ni cosas raras.',
              visualBadge: '🩸 Glucemia: 180 mg/dL',
              mockUI: [
                { label: 'Glucemia Actual', value: '180 mg/dL', highlight: true },
                { label: 'Meta habitual', value: `${target} mg/dL` },
                { label: 'Corrección necesaria', value: `+${correctionUnits.toFixed(1)} U` },
              ],
            },
            {
              stepTitle: 'Paso 2: Ponés lo que vas a comer (ej. 4 Empanadas / 64g Carbohidratos)',
              description:
                'Podés escribir los carbohidratos o elegirlos desde el buscador de comida con un toque.',
              visualBadge: '🥟 64g Carbohidratos',
              mockUI: [
                { label: 'Comida', value: '4 Empanadas (64g)', highlight: true },
                { label: 'Insulina para esta comida', value: `+${mealUnits.toFixed(1)} U` },
              ],
            },
            {
              stepTitle: 'Paso 3: Dosis Total Clara y Limpia (Sin fórmulas mareantes)',
              description:
                `La app hace la cuenta y te da un resultado limpio: ${netUnits.toFixed(1)} Unidades en total. Sin 300 datos matemáticos innecesarios.`,
              visualBadge: `✨ Dosis Total: ${netUnits.toFixed(1)} U`,
              mockUI: [
                { label: 'Dosis Total Sugerida', value: `${netUnits.toFixed(1)} Unidades`, highlight: true },
                { label: 'Por la comida', value: `+${mealUnits.toFixed(1)} U` },
                { label: 'Por la corrección', value: `+${correctionUnits.toFixed(1)} U` },
              ],
            },
            {
              stepTitle: 'Paso 4: Elegís cómo inyectarte',
              description:
                'Tenés dos opciones bien claras: Inyectarte todo de una con tu lapicera, o dividir en 2 pinchazos si comiste algo con grasa (como pizza o frituras) para que no te suba horas después.',
              visualBadge: '💉 Opciones de Inyección',
              mockUI: [
                { label: 'Opción 1: Todo de una', value: `Inyectar ${netUnits.toFixed(1)} U Ahora` },
                { label: 'Opción 2: Dividir dosis', value: `${split1.toFixed(1)} U Ahora + ${split2.toFixed(1)} U en 2h`, highlight: true },
              ],
            },
          ],
        };
      }

      const step1Title = isNfc
        ? `Paso 1: Escaneo NFC (${sensorName}) y Sensibilidad FSI ${isf}`
        : isPumpSensor
        ? `Paso 1: Sensor de Bomba (180 mg/dL) y Sensibilidad FSI ${isf}`
        : isCapillary
        ? `Paso 1: Glucómetro Capilar (180 mg/dL) y Sensibilidad FSI ${isf}`
        : `Paso 1: Lector (${sensorName}, 180 mg/dL) y Sensibilidad FSI ${isf}`;

      const step1Desc = isNfc
        ? `Apoyás el celular sobre tu ${sensorName}: lee 180 mg/dL al instante con flecha Estable (➡️) sin pincharte el dedo. Con tu meta de ${target} mg/dL y tu FSI de ${isf}, calcula +${correctionUnits.toFixed(2)} U de corrección.`
        : isPumpSensor
        ? `La glucemia (180 mg/dL ➡️ Estable) se transmite automáticamente desde el sensor continuo de tu bomba. Con tu meta de ${target} mg/dL y tu FSI de ${isf}, calcula +${correctionUnits.toFixed(2)} U de corrección.`
        : isCapillary
        ? `Ingresás la lectura de 180 mg/dL de tu glucómetro capilar (pinchazo en dedo con tira reactiva). Con tu meta de ${target} mg/dL y tu FSI de ${isf}, calcula +${correctionUnits.toFixed(2)} U de corrección.`
        : `Ingresás tu lectura de 180 mg/dL de tu lector de ${sensorName}. Con tu meta de ${target} mg/dL y tu FSI de ${isf}, calcula +${correctionUnits.toFixed(2)} U de corrección.`;

      const step1Badge = isNfc
        ? '📲 NFC: 180 mg/dL'
        : isPumpSensor
        ? '📡 Sensor Bomba: 180 mg/dL'
        : isCapillary
        ? '🩸 Capilar: 180 mg/dL'
        : '📟 Lector: 180 mg/dL';

      const step4Title = isPump
        ? `Paso 4: Transmisión de Bolo Dual / Extendido a la Bomba (${split1.toFixed(1)} U / ${split2.toFixed(1)} U)`
        : isIport
        ? `Paso 4: Inyección en Puerto i-Port Advance (${split1.toFixed(1)} U / ${split2.toFixed(1)} U)`
        : `Paso 4: Sugerencia de Bolo Dividido (${split1.toFixed(1)} U Ahora / ${split2.toFixed(1)} U en 2h)`;

      const step4Desc = isPump
        ? `Por el contenido de grasa de las empanadas, la app programa en tu bomba un bolo dual: ${split1.toFixed(1)} U inmediatas (infusión rápida) y ${split2.toFixed(1)} U cuadradas distribuidas en 2 horas.`
        : isIport
        ? `Inyectás ${split1.toFixed(1)} U en tu puerto subcutáneo i-Port Advance con +4 min de espera ajustada por tejido, y la app programa las ${split2.toFixed(1)} U restantes en 2 horas.`
        : `Al ser fritura con grasa, sugiere ${split1.toFixed(1)} U ahora en Abdomen Bajo y ${split2.toFixed(1)} U en 2 horas, programadas en el reloj de la app.`;

      const step4Badge = isPump
        ? `📟 Bolo Dual Bomba: ${split1.toFixed(1)} U + ${split2.toFixed(1)} U`
        : isIport
        ? `🛡️ i-Port: ${split1.toFixed(1)} U + ${split2.toFixed(1)} U`
        : `🍕 ${split1.toFixed(1)} U Ahora / ${split2.toFixed(1)} U en 2h`;

      return {
        title: `Simulación Video: Calculadora (${step1Badge}, FSI ${isf}, ICR ${icr} y Empanadas Fritas)`,
        frames: [
          {
            stepTitle: step1Title,
            description: step1Desc,
            visualBadge: step1Badge,
            mockUI: [
              { label: 'Glucemia Actual', value: '180 mg/dL (Estable ➡️)', highlight: true },
              { label: 'Sensibilidad FSI', value: `${isf} mg/dL por 1 U (Meta ${target})` },
              { label: 'Corrección Calculada', value: `+${correctionUnits.toFixed(2)} U hacia ${target} mg/dL` },
            ],
          },
          {
            stepTitle: `Paso 2: Carga de Comida (4 Empanadas Fritas / 64g HC con ICR ${icr})`,
            description: `Recibe las 4 empanadas fritas enviadas desde el Buscador o IA (64g Carbs). Con tu ICR de ${icr} g/U, calcula +${mealUnits.toFixed(2)} U de comida.`,
            visualBadge: '🥟 64g HC + Grasa de Fritura',
            mockUI: [
              { label: 'Comida Cargada', value: '4 Empanadas Fritas (64g HC)', highlight: true },
              { label: 'Ratio ICR Aplicado', value: `${icr}.0 g HC por 1 U` },
              { label: 'Bolo de Comida', value: `+${mealUnits.toFixed(2)} U de insulina` },
            ],
          },
          {
            stepTitle: 'Paso 3: Dosis Neta y Resta de Insulina Activa (IOB)',
            description:
              `Suma el bolo de comida (+${mealUnits.toFixed(2)} U) más la corrección (+${correctionUnits.toFixed(2)} U) y resta la insulina activa en cuerpo (-${iob.toFixed(2)} U) = ${netUnits.toFixed(2)} U totales.`,
            visualBadge: `⚙️ Dosis Neta: ${netUnits.toFixed(2)} U`,
            mockUI: [
              { label: 'Suma Comida + Corrección', value: `${mealUnits.toFixed(2)} U + ${correctionUnits.toFixed(2)} U = ${(mealUnits + correctionUnits).toFixed(2)} U` },
              { label: 'Resta Insulina Activa', value: `-${iob.toFixed(2)} U (IOB en cuerpo)`, highlight: true },
              { label: 'Dosis Neta Final', value: `${netUnits.toFixed(2)} U calculadas` },
            ],
          },
          {
            stepTitle: step4Title,
            description: step4Desc,
            visualBadge: step4Badge,
            mockUI: [
              {
                label: isPump ? '1ª Dosis (Inmediata)' : '1ª Dosis (Ahora)',
                value: isPump
                  ? `${split1.toFixed(1)} U (Infusión Bomba)`
                  : isIport
                  ? `${split1.toFixed(1)} U (Puerto i-Port)`
                  : `${split1.toFixed(1)} U (Abdomen Bajo)`,
                highlight: true,
              },
              {
                label: isPump ? '2ª Dosis (Bolo Cuadrado)' : '2ª Dosis (En 2h 00m)',
                value: isPump ? `${split2.toFixed(1)} U (Cuadrada en 2h)` : `${split2.toFixed(1)} U (Programada en App)`,
              },
              {
                label: 'Registro Exitoso',
                value: isPump ? 'Bolo enviado a bomba' : 'Guardado en Historial y reloj',
              },
            ],
          },
        ],
      };
    }

    case 'food_analyzer':
      return {
        title: 'Simulación Video: Buscador, Favoritos y Analizador con IA',
        frames: [
          {
            stepTitle: 'Paso 1: Buscador Oficial y Ajuste de Gramos (Yogur 120g ➔ 150g)',
            description:
              'Buscás "yogur" en la tabla oficial de tu país, ajustás el pote estándar de 120 g a 150 g reales (18.5g HC) y tocás "+ Plato".',
            visualBadge: '🥛 Yogur 150g (18.5g HC)',
            mockUI: [
              { label: 'Búsqueda en Tabla Oficial', value: 'Yogur Firme Vainilla', highlight: true },
              { label: 'Ajuste de Porción', value: '120 g ➔ 150 g reales' },
              { label: 'Carbohidratos Netos', value: '18.5 g HC cargados' },
            ],
          },
          {
            stepTitle: 'Paso 2: Foto con IA y Botón "Ver Desglose" (Hamburguesa)',
            description:
              'Fotografiás una hamburguesa doble con queso y tocás "Ver Desglose" para ver el pan (28g Carbs) y grasas (30g) antes de mandar a calculadora.',
            visualBadge: '🍔 Foto con Desglose IA',
            mockUI: [
              { label: 'Análisis Fotográfico', value: 'Hamburguesa Doble con Queso', highlight: true },
              { label: 'Desglose Desplegado', value: 'Pan: 28g HC | Grasa: 30g | Prot: 24g' },
              { label: 'Tipo de Digestión', value: 'Lenta (alerta para bolo dividido)' },
            ],
          },
          {
            stepTitle: 'Paso 3: Plato Casero Escrito ("4 empanadas fritas de jamón y queso")',
            description:
              'Escribís "4 empanadas fritas de jamón y queso". La IA detecta la fritura, calcula 64g Carbs y 32g Grasa y la manda directo a la calculadora.',
            visualBadge: '🥟 4 Empanadas Fritas',
            mockUI: [
              { label: 'Texto Ingresado', value: '4 empanadas fritas jamón/queso', highlight: true },
              { label: 'Nutrientes IA', value: '64.0 g HC | 32.0 g Grasa' },
              { label: 'Envío Instantáneo', value: 'Directo a Calculadora de Dosis' },
            ],
          },
        ],
      };

    case 'workout_routine': {
      const step3Title = isPump
        ? 'Paso 3: Botón "✓ Hecho" y Sugerencia de Basal Temporal en Bomba'
        : 'Paso 3: Botón "✓ Hecho" y Activación de Sensibilidad';

      const step3Desc = isPump
        ? 'Al marcar el entrenamiento como hecho, suma calorías al balance diario y te aconseja activar una Basal Temporal reducida en tu bomba para prevenir hipoglucemias.'
        : 'Al marcarlo como hecho, suma calorías a tu meta diaria y activa el Factor 42 de sensibilidad para que tu próxima dosis de comida se ajuste.';

      const step3Badge = isPump
        ? '⚡ Calorías + Basal Bomba'
        : '⚡ Calorías y Sensibilidad';

      return {
        title: 'Simulación Video: Rutina de Ejercicio y Calorías',
        frames: [
          {
            stepTitle: `Paso 1: Configuración de tu Peso Corporal (${weight} kg)`,
            description: `La app toma tu peso configurado (${weight} kg) para calcular con exactitud médica las calorías quemadas.`,
            visualBadge: `⚖️ Peso: ${weight} kg`,
            mockUI: [
              { label: 'Peso Corporal', value: `${weight} kg`, highlight: true },
              { label: 'Modo de Contabilidad', value: 'Sumar calorías al hacer ejercicio' },
            ],
          },
          {
            stepTitle: 'Paso 2: Selección entre 20 Deportes',
            description:
              'Elegís entre Pesas, Caminata, Natación, Ciclismo, Fútbol o tu propia rutina.',
            visualBadge: '🏅 20 Deportes Disponibles',
            mockUI: [
              { label: 'Deporte Seleccionado', value: 'Pesas (Pecho/Espalda) - 60 min', highlight: true },
              { label: 'Intensidad', value: 'Moderada / Intensa' },
            ],
          },
          {
            stepTitle: step3Title,
            description: step3Desc,
            visualBadge: step3Badge,
            mockUI: [
              { label: 'Calorías Quemadas', value: '+340 kcal sumadas', highlight: true },
              {
                label: isPump ? 'Ajuste de Bomba' : 'Factor 42',
                value: isPump
                  ? 'Basal Temporal sugerida'
                  : 'Sensibilidad aumentada por 12h',
              },
            ],
          },
        ],
      };
    }

    case 'daily_tracker':
      return {
        title: 'Simulación Video: Monitor Diario, Calorías y Protección Renal',
        frames: [
          {
            stepTitle: 'Paso 1: Balance Diario de Macros y Calorías',
            description:
              'Visualizás calorías consumidas, calorías quemadas y tu meta diaria en tiempo real.',
            visualBadge: '🔥 Balance Diario en Vivo',
            mockUI: [
              { label: 'Calorías Ingeridas', value: '1,650 kcal', highlight: true },
              { label: 'Calorías Quemadas', value: '450 kcal (Ejercicio)' },
            ],
          },
          {
            stepTitle: isRenal
              ? 'Paso 2: Alerta de Protección Renal Estricta (Proteínas)'
              : 'Paso 2: Monitoreo de Macronutrientes y Grasas',
            description: isRenal
              ? 'Con tu condición renal activa, vigila el límite estricto de proteínas animales para cuidar la función de tus riñones.'
              : 'Supervisa la proporción de carbohidratos, grasas y proteínas para anticipar digestiones lentas.',
            visualBadge: isRenal ? '🛡️ Protección Renal Activa' : '🥗 Macros en Equilibrio',
            mockUI: [
              {
                label: isRenal ? 'Proteína Animal' : 'Proteínas Totales',
                value: isRenal
                  ? 'Controlada bajo límite renal seguro'
                  : '75 g en rango adecuado',
                highlight: true,
              },
              {
                label: 'Estado Metabólico',
                value: isRenal ? 'Salud renal protegida' : 'Balance diario óptimo',
              },
            ],
          },
        ],
      };

    case 'permanent_history':
      return {
        title: 'Simulación Video: Historial Permanente de Comidas y Bolus',
        frames: [
          {
            stepTitle: 'Paso 1: Archivo Automático al Terminar el Día',
            description:
              'Cada vez que tocás "Nuevo Día", todas tus comidas y bolus se guardan ordenadas.',
            visualBadge: '📚 Archivo Histórico',
            mockUI: [
              { label: 'Días Anteriores', value: 'Guardados con fecha y hora', highlight: true },
              { label: 'Búsqueda', value: 'Filtro por comida o glucemia' },
            ],
          },
        ],
      };

    case 'community_reviews':
      return {
        title: 'Simulación Video: Comunidad, Reseñas y Foro de Usuarios',
        frames: [
          {
            stepTitle: 'Paso 1: Comparte Opiniones y Consejos',
            description:
              'Leés reseñas de usuarios de tu mismo país con su tratamiento y distintivos.',
            visualBadge: '💬 Comunidad Activa',
            mockUI: [
              { label: 'Publicaciones', value: 'Reseñas, ideas y reportes', highlight: true },
              { label: 'Stickers y Fotos', value: 'Compatibles para compartir' },
            ],
          },
        ],
      };

    case 'sponsors_donations':
      return {
        title: 'Simulación Video: Donaciones y Código Abierto',
        frames: [
          {
            stepTitle: 'Paso 1: Apoyá el Proyecto',
            description:
              'Conocé a los patrocinadores y colaboradores que mantienen la app libre y abierta.',
            visualBadge: '☕ Sponsors y Donaciones',
            mockUI: [
              { label: 'Estado del Proyecto', value: '100% Libre y Colaborativo', highlight: true },
              { label: 'Cafecito / Apoyo', value: 'Disponible' },
            ],
          },
        ],
      };

    case 'glycemic_factors':
      return {
        title: 'Simulación Video: Los 42 Factores que Mueven la Glucosa',
        frames: [
          {
            stepTitle: 'Paso 1: Guía de Factores (Calor, Estrés, Duchas Calientes)',
            description:
              'Explorá los 42 factores que alteran tu glucemia antes de inyectarte.',
            visualBadge: '🧬 Los 42 Factores',
            mockUI: [
              { label: 'Factor Activo', value: 'Calor extremo / Ducha caliente', highlight: true },
              { label: 'Efecto en Absorción', value: 'Acelerada (+15% insulina)' },
            ],
          },
        ],
      };

    default:
      return {
        title: 'Simulación Video',
        frames: [
          {
            stepTitle: 'Paso 1',
            description: 'Demostración de la aplicación.',
            visualBadge: 'Guía',
            mockUI: [],
          },
        ],
      };
  }
}

export const SECTION_VIDEO_SIMULATIONS: Record<
  TutorialSectionId,
  AnimatedVideoSimulation
> = {
  top_header_bar: getSectionSimulation('top_header_bar'),
  devices_tracker: getSectionSimulation('devices_tracker'),
  insulin_calculator: getSectionSimulation('insulin_calculator'),
  food_analyzer: getSectionSimulation('food_analyzer'),
  workout_routine: getSectionSimulation('workout_routine'),
  daily_tracker: getSectionSimulation('daily_tracker'),
  permanent_history: getSectionSimulation('permanent_history'),
  community_reviews: getSectionSimulation('community_reviews'),
  sponsors_donations: getSectionSimulation('sponsors_donations'),
  glycemic_factors: getSectionSimulation('glycemic_factors'),
};

export const RealisticMiniAppScreen: React.FC<{
  sectionId: TutorialSectionId;
  frameIndex: number;
  settings?: UserSettings;
}> = ({ sectionId, frameIndex, settings }) => {
  const s = settings || loadUserSettings();
  const isPump = s.insulinMode === 'pump';
  const isIport = s.insulinMode === 'iport';
  const isNfc = s.glucoseMode === 'cgm_nfc';
  const isPumpSensor = s.glucoseMode === 'pump_sensor';
  const isCapillary = s.glucoseMode === 'capillary';
  const sensorName = getSensorDisplayName(s.sensorBrand);
  const isf = s.isf || 28;
  const icr = s.icr || 8;
  const target = s.targetGlucose || 110;
  const weight = s.weightKg || 70;
  const excess = Math.max(0, 180 - target);
  const correctionUnits = Number((excess / isf).toFixed(2));
  const mealUnits = Number((64 / icr).toFixed(2));
  const iob = 0.50;
  const netUnits = Number(Math.max(0, mealUnits + correctionUnits - iob).toFixed(2));
  const split1 = Number((netUnits * 0.6).toFixed(1));
  const split2 = Number((netUnits - split1).toFixed(1));
  const isRenal = Boolean(
    s.medicalConditions?.renal || s.enableRenalProteinLimits
  );

  return (
    <div className="w-full bg-slate-950 rounded-2xl border-2 border-slate-700/80 p-3 shadow-2xl relative overflow-hidden font-sans">
      {/* Mini Barra de Estado del Celular */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono border-b border-slate-800/80 pb-1.5 mb-2.5">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>4G / WiFi</span>
        </span>
        <span className="font-bold text-teal-400">InsulinCalc T1D</span>
        <span>🔋 100% 12:45</span>
      </div>

      {/* Contenido Simulado según la Sección */}
      {sectionId === 'insulin_calculator' && (
        <div className="space-y-2">
          {frameIndex === 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] bg-slate-900 px-2 py-1.5 rounded-lg border border-slate-800 text-teal-300 font-mono">
                <span>FSI: <strong>{isf} mg/dL</strong></span>
                <span>ICR: <strong>{icr} g/U</strong></span>
                <span className="text-slate-400">Meta: {target}</span>
              </div>
              <div className="bg-slate-900 border-2 border-teal-500/70 rounded-xl p-3 text-center space-y-1.5">
                {isNfc ? (
                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-teal-300 font-bold bg-teal-950/80 border border-teal-700/60 py-1 px-2 rounded-lg">
                    <span className="animate-pulse">📲</span>
                    <span>Sensor NFC ({sensorName}): Escaneo Instantáneo</span>
                  </div>
                ) : isPumpSensor ? (
                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-cyan-300 font-bold bg-cyan-950/80 border border-cyan-700/60 py-1 px-2 rounded-lg">
                    <span className="animate-pulse">📡</span>
                    <span>Sensor Integrado a Bomba de Insulina</span>
                  </div>
                ) : isCapillary ? (
                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-amber-300 font-bold bg-amber-950/80 border border-amber-700/60 py-1 px-2 rounded-lg">
                    <span>🩸</span>
                    <span>Glucómetro Capilar (Tira Reactiva en Dedo)</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-teal-300 font-bold bg-teal-950/80 border border-teal-700/60 py-1 px-2 rounded-lg">
                    <span>📟</span>
                    <span>Lector Externo ({sensorName})</span>
                  </div>
                )}

                <span className="text-[10px] uppercase font-mono text-slate-400">
                  Glucemia Actual Registrada
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-black text-white font-mono">180</span>
                  <span className="text-xs font-bold text-amber-400">mg/dL</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-teal-300 text-xs font-bold border border-slate-700">
                    ➡️ Estable
                  </span>
                </div>
                <p className="text-[11px] text-teal-300 font-medium pt-0.5">
                  Exceso: +{excess} mg/dL ➔ Corrección: {excess} ÷ {isf} = <strong className="text-white">+{correctionUnits.toFixed(2)} U</strong>
                </p>
              </div>
            </div>
          )}

          {frameIndex === 1 && (
            <div className="space-y-2">
              <div className="bg-slate-900 border border-teal-500/50 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    <span>🥟</span> 4 Empanadas Fritas (Jamón y Queso)
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600 font-bold">
                    Fritura
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono">
                  <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                    <strong className="text-teal-300 block text-xs">64.0 g</strong>Carbos
                  </div>
                  <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                    <strong className="text-amber-300 block text-xs">32.0 g</strong>Grasa
                  </div>
                  <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                    <strong className="text-blue-300 block text-xs">22.0 g</strong>Proteína
                  </div>
                </div>
                <div className="bg-teal-950/70 border border-teal-600/50 p-1.5 rounded-lg text-center text-[11px] text-teal-200">
                  Bolo de Comida: 64 g ÷ {icr} (ICR) = <strong className="text-white font-bold">+{mealUnits.toFixed(2)} U</strong>
                </div>
              </div>
            </div>
          )}

          {frameIndex === 2 && (
            <div className="space-y-2">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Bolo Comida (64g HC):</span>
                  <strong className="text-white font-mono">+{mealUnits.toFixed(2)} U</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Corrección Glucemia (180 mg/dL):</span>
                  <strong className="text-teal-300 font-mono">+{correctionUnits.toFixed(2)} U</strong>
                </div>
                <div className="flex justify-between text-rose-300">
                  <span>Resta Insulina Activa (IOB en cuerpo):</span>
                  <strong className="font-mono">-{iob.toFixed(2)} U</strong>
                </div>
                <div className="border-t border-slate-800 pt-1.5 flex justify-between items-center">
                  <span className="font-bold text-white">Dosis Neta Calculada:</span>
                  <span className="text-xl font-black text-teal-300 font-mono">{netUnits.toFixed(2)} U</span>
                </div>
              </div>
            </div>
          )}

          {frameIndex === 3 && (
            <div className="space-y-2">
              {isPump ? (
                <div className="bg-slate-900 border-2 border-teal-500/60 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-teal-300 flex items-center gap-1">
                      <span>📟</span> Bolo Dual / Extendido en Bomba
                    </span>
                    <span className="text-[10px] text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-700 font-mono">
                      Cánula Activa
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-teal-950/80 border border-teal-500 p-2 rounded-lg">
                      <span className="text-[10px] text-teal-300 block">1ª Dosis (Inmediata)</span>
                      <strong className="text-base text-white font-mono block">{split1.toFixed(1)} U</strong>
                      <span className="text-[9px] text-teal-200">Infusión rápida ahora</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">2ª Dosis (Extendido 2h)</span>
                      <strong className="text-base text-teal-300 font-mono block">{split2.toFixed(1)} U</strong>
                      <span className="text-[9px] text-slate-400">Infusión continua en bomba</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-teal-500 text-slate-950 font-black text-xs text-center shadow">
                    📡 Transmitir Bolo a Bomba de Insulina
                  </div>
                </div>
              ) : isIport ? (
                <div className="bg-slate-900 border-2 border-teal-500/60 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-teal-300 flex items-center gap-1">
                      <span>🛡️</span> Inyección en Puerto i-Port Advance
                    </span>
                    <span className="text-[10px] text-amber-300 font-mono">+4 min espera cánula</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-teal-950/80 border border-teal-500 p-2 rounded-lg">
                      <span className="text-[10px] text-teal-300 block">1ª Dosis (AHORA)</span>
                      <strong className="text-base text-white font-mono block">{split1.toFixed(1)} U</strong>
                      <span className="text-[9px] text-teal-200">En cánula i-Port</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">2ª Dosis (En 2h 00m)</span>
                      <strong className="text-base text-teal-300 font-mono block">{split2.toFixed(1)} U</strong>
                      <span className="text-[9px] text-slate-400">Programada en App</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-teal-500 text-slate-950 font-black text-xs text-center shadow">
                    ✅ Registrar Inyección en Puerto
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 border-2 border-teal-500/60 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-300 flex items-center gap-1">
                      <span>💉</span> Inyección con Pluma Manual (Aguja 4mm)
                    </span>
                    <span className="text-[10px] text-slate-400">Abdomen Bajo</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-teal-950/80 border border-teal-500 p-2 rounded-lg">
                      <span className="text-[10px] text-teal-300 block">1ª Dosis (AHORA)</span>
                      <strong className="text-base text-white font-mono block">{split1.toFixed(1)} U</strong>
                      <span className="text-[9px] text-teal-200">Abdomen Bajo</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">2ª Dosis (En 2h 00m)</span>
                      <strong className="text-base text-teal-300 font-mono block">{split2.toFixed(1)} U</strong>
                      <span className="text-[9px] text-slate-400">Alarma en App</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-teal-500 text-slate-950 font-black text-xs text-center shadow">
                    ✅ Registrar Dosis Administrada
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {sectionId === 'food_analyzer' && (
        <div className="space-y-2">
          {frameIndex === 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-slate-900 border border-teal-500/60 rounded-xl px-2.5 py-1.5 text-xs">
                <span>🔍</span>
                <span className="text-white font-mono font-bold">yogur</span>
                <span className="ml-auto text-[10px] text-teal-300 bg-teal-950 px-2 py-0.5 rounded border border-teal-700">
                  {s.countryCode === 'ES' ? 'España Oficial' : s.countryCode === 'MX' ? 'México Oficial' : 'Argentina Oficial'}
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>🥛 Yogur Firme Vainilla</span>
                  <span className="text-teal-300 font-mono">18.5 g HC</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-slate-400">Porción:</span>
                  <span className="line-through text-slate-500 font-mono">120 g</span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-500 text-slate-950 font-black font-mono">
                    ➔ 150 g (Ajustado)
                  </span>
                  <span className="text-slate-400 ml-auto">115 kcal</span>
                </div>
                <div className="py-1.5 rounded-lg bg-teal-500 text-slate-950 font-black text-xs text-center shadow">
                  ➕ Agregar 150g al Plato
                </div>
              </div>
            </div>
          )}

          {frameIndex === 1 && (
            <div className="space-y-2">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-white flex items-center gap-1.5">
                    <span>🍔</span> Foto Analizada con IA
                  </span>
                  <span className="text-[10px] text-teal-300 bg-teal-950 px-2 py-0.5 rounded border border-teal-700 font-mono">
                    Hamburguesa
                  </span>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-[11px] space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>• Pan con sésamo:</span>
                    <strong className="text-white">28.0 g HC</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>• Doble carne + cheddar:</span>
                    <strong className="text-amber-300">30g Grasa / 24g Prot</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>• Papas fritas chicas:</span>
                    <strong className="text-white">22.0 g HC</strong>
                  </div>
                  <div className="border-t border-slate-800 pt-1 flex justify-between font-bold text-teal-300">
                    <span>Total Neto: 50.0 g Carbos</span>
                    <span className="text-[10px] text-amber-300">Digestión Lenta</span>
                  </div>
                </div>
                <div className="py-1.5 rounded-lg bg-teal-500 text-slate-950 font-black text-xs text-center shadow">
                  🚀 Enviar 50g HC a Calculadora
                </div>
              </div>
            </div>
          )}

          {frameIndex === 2 && (
            <div className="space-y-2">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-2">
                <div className="text-xs font-bold text-teal-300 flex items-center gap-1">
                  <span>✍️</span> Plato Casero Escrito:
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-teal-500/60 text-xs font-medium text-white italic">
                  "4 empanadas fritas de jamón y queso"
                </div>
                <div className="p-2 rounded-lg bg-teal-950/70 border border-teal-700/60 text-[11px] text-teal-200 space-y-1">
                  <div className="flex justify-between">
                    <span>Carbohidratos: <strong>64.0 g</strong></span>
                    <span>Grasa: <strong>32.0 g</strong></span>
                  </div>
                  <p className="text-[10px] text-amber-300">
                    ⚡ Fritura: pico glucémico retrasado. Sugerencia: bolo dividido.
                  </p>
                </div>
                <div className="py-1.5 rounded-lg bg-teal-500 text-slate-950 font-black text-xs text-center shadow">
                  📥 Cargar 64g HC a Calculadora
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {sectionId === 'workout_routine' && (
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-300">Peso Corporal Configurado:</span>
            <span className="px-3 py-1 rounded-lg bg-slate-950 border border-teal-500 text-white font-mono font-bold">
              {weight} kg
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">🏋️‍♂️ Pesas (Pecho/Espalda) - 60 min</span>
              <span className="text-teal-300 font-mono font-bold">+340 kcal</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Intensidad: Moderada</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs">
                ✓ Hecho
              </span>
            </div>
          </div>
          <div className="bg-teal-950/80 border border-teal-500/70 rounded-xl p-2 text-[11px] text-teal-200">
            {isPump ? (
              <span>
                ⚡ <strong>Basal Temporal en Bomba:</strong> Reducir infusión 30-50% para prevenir hipoglucemias al entrenar.
              </span>
            ) : (
              <span>
                ⚡ <strong>Factor 42 Activo:</strong> Sensibilidad a la insulina mejorada por 12 horas.
              </span>
            )}
          </div>
        </div>
      )}

      {sectionId === 'top_header_bar' && (
        <div className="space-y-2 text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-300">País Seleccionado:</span>
              <span className="px-2 py-0.5 rounded bg-teal-950 border border-teal-600 text-teal-300 font-bold">
                {s.countryCode === 'ES'
                  ? '🇪🇸 España (ES)'
                  : s.countryCode === 'MX'
                  ? '🇲🇽 México (MX)'
                  : '🇦🇷 Argentina (AR)'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Dispositivos Vinculados:</span>
              <span className="text-teal-300 font-bold">
                {sensorName} + {isPump ? 'Bomba' : isIport ? 'i-Port' : 'Pluma'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Insulina Activa (IOB):</span>
              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-rose-300 font-mono font-bold">
                💓 2.50 U
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Copia de Seguridad:</span>
              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-300">
                ☁️ Google Drive OK
              </span>
            </div>
          </div>
        </div>
      )}

      {sectionId === 'devices_tracker' && (
        <div className="space-y-2 text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white">⏱️ Sensor: {sensorName}</span>
              <span className="text-teal-300 font-mono font-bold">Día 10 / 14</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div className="bg-teal-400 h-full w-[71%]" />
            </div>

            {isPump ? (
              <>
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-800">
                  <span className="font-bold text-white flex items-center gap-1">
                    <span>📟</span> Cánula de Bomba (Infusión)
                  </span>
                  <span className="text-teal-300 font-mono text-[11px] font-bold">Día 2 de 3</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div className="bg-teal-400 h-full w-[66%]" />
                </div>
                <p className="text-[10px] text-teal-300/90 pt-0.5">
                  Rotar el set cada 3 días previene oclusiones y asegura infusión óptima.
                </p>
              </>
            ) : isIport ? (
              <>
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-800">
                  <span className="font-bold text-white">🛡️ Puerto i-Port Advance</span>
                  <span className="text-amber-300 font-mono text-[11px] font-bold">Día 3 de 4</span>
                </div>
                <p className="text-[10px] text-amber-300/90 pt-0.5">
                  Cánula subcutánea activa (+4 min de espera por tejido).
                </p>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-800">
                  <span className="font-bold text-white">💉 Pluma Manual (Aguja 4mm)</span>
                  <span className="text-emerald-300 font-mono text-[11px]">Rotación activa</span>
                </div>
                <p className="text-[10px] text-slate-300 pt-0.5">
                  Alternar zonas (Abdomen Bajo, Muslo, Brazo) para evitar lipodistrofias.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {sectionId === 'daily_tracker' && (
        <div className="space-y-2 text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
            <div className="flex justify-between text-slate-200">
              <span>Calorías Ingeridas:</span>
              <strong className="text-teal-300 font-mono">1,650 / 2,000 kcal</strong>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div className="bg-teal-400 h-full w-[82%]" />
            </div>
            {isRenal ? (
              <div className="bg-teal-950/70 border border-teal-600/50 p-2 rounded-lg text-[11px] text-teal-200 flex items-center gap-1.5">
                <span>🛡️</span>
                <span>
                  <strong>Protección Renal Activa:</strong> Proteína animal controlada bajo límite seguro.
                </span>
              </div>
            ) : (
              <div className="bg-teal-950/70 border border-teal-600/50 p-2 rounded-lg text-[11px] text-teal-200 flex items-center gap-1.5">
                <span>🥗</span>
                <span>
                  <strong>Balance Diario:</strong> Carbohidratos, grasas y proteínas en equilibrio metabólico.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {sectionId === 'permanent_history' && (
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
            <span>🔍</span>
            <span className="text-white font-mono font-bold">empanadas</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1">
            <div className="flex justify-between font-bold text-white">
              <span>4 Empanadas Fritas (64g HC)</span>
              <span className="text-teal-300 font-mono">{netUnits.toFixed(1)} U Total</span>
            </div>
            <div className="text-[10px] text-slate-400 flex justify-between">
              <span>Glucemia: 180 ➔ 118 mg/dL</span>
              <span className="text-amber-300">
                {isPump
                  ? `Bolo Dual Bomba: ${split1.toFixed(1)} U + ${split2.toFixed(1)} U`
                  : `Bolo Dividido: ${split1.toFixed(1)} U + ${split2.toFixed(1)} U`}
              </span>
            </div>
          </div>
        </div>
      )}

      {sectionId === 'community_reviews' && (
        <div className="space-y-2 text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white">
                👤 Lucas (T1D - {sensorName} + {isPump ? 'Bomba de Insulina' : isIport ? 'i-Port' : 'Pluma'})
              </span>
              <span className="text-amber-400 text-xs">⭐⭐⭐⭐⭐</span>
            </div>
            <p className="text-slate-300 text-[11px] italic">
              {isPump
                ? '"El bolo dual en la bomba para comidas con grasa como empanadas me quitó el miedo a las subidas a las 3 horas sin hipoglucemias."'
                : '"El bolo dividido para comidas grasas como empanadas me salvó de la hipoglucemia. Clave la espera programada!"'}
            </p>
          </div>
        </div>
      )}

      {sectionId === 'glycemic_factors' && (
        <div className="space-y-2 text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-bold text-teal-300">🚿 Ducha Caliente / Calor</span>
              <span className="text-[10px] bg-rose-950 border border-rose-700 text-rose-300 px-2 py-0.5 rounded">
                Absorción +15%
              </span>
            </div>
            <p className="text-slate-300 text-[11px]">
              La vasodilatación por calor hace que la insulina rápida actúe más rápido. Ajustar espera previa.
            </p>
          </div>
        </div>
      )}

      {sectionId === 'sponsors_donations' && (
        <div className="space-y-2 text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1.5 text-center">
            <span className="font-bold text-teal-300 block">☕ Proyecto 100% Libre y Colaborativo</span>
            <p className="text-[11px] text-slate-300">
              Directorio de insumos y farmacias con descuento para la comunidad.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export const AnimatedTutorialVideoPlayer: React.FC<{
  sectionId: TutorialSectionId;
  settings?: UserSettings;
}> = ({ sectionId, settings }) => {
  const activeSettings = settings || loadUserSettings();
  const simulation = getSectionSimulation(sectionId, activeSettings);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setCurrentFrameIndex(0);
    setIsPlaying(false);
  }, [sectionId]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentFrameIndex((prev) => {
        if (prev >= simulation.frames.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 3200);
    return () => clearInterval(timer);
  }, [isPlaying, simulation.frames.length]);

  if (!simulation) return null;
  const currentFrame = simulation.frames[currentFrameIndex];

  return (
    <div className="bg-slate-900 border-2 border-teal-500/50 rounded-3xl p-3.5 sm:p-4 shadow-2xl space-y-3">
      {/* Cabecera del Video */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
          <span className="text-xs font-black uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
            <Video className="h-4 w-4 text-teal-400" />
            <span>Simulación en Vivo de la App</span>
          </span>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-teal-950 border border-teal-700 text-teal-300 font-bold">
          {currentFrame.visualBadge}
        </span>
      </div>

      {/* Pantalla Simulada del Celular (Mockup Real adaptado a tu perfil) */}
      <RealisticMiniAppScreen
        sectionId={sectionId}
        frameIndex={currentFrameIndex}
        settings={activeSettings}
      />

      {/* Título de la Escena y Explicación Simple (Sin cortes de texto) */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5 shadow-inner">
        <div className="flex items-start justify-between gap-2 flex-wrap sm:flex-nowrap">
          <h4 className="text-xs sm:text-sm font-extrabold text-white break-words leading-snug flex-1">
            {currentFrame.stepTitle}
          </h4>
          <span className="text-[10px] font-mono text-teal-400 bg-teal-950 px-2 py-0.5 rounded-full border border-teal-700 shrink-0">
            Escena {currentFrameIndex + 1} de {simulation.frames.length}
          </span>
        </div>
        <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed break-words">
          {currentFrame.description}
        </p>
      </div>

      {/* Controles de Reproducción y Botones de Escena */}
      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{isPlaying ? 'Pausar' : 'Reproducir'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setCurrentFrameIndex(0);
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition"
            title="Reiniciar video desde el inicio"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Indicadores de Escenas */}
        <div className="flex items-center gap-1.5">
          {simulation.frames.map((_, fIdx) => (
            <button
              key={fIdx}
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setCurrentFrameIndex(fIdx);
              }}
              className={`h-2.5 rounded-full transition-all cursor-pointer ${
                fIdx === currentFrameIndex
                  ? 'w-7 bg-teal-400'
                  : 'w-2 bg-slate-700 hover:bg-slate-600'
              }`}
              title={`Ir a escena ${fIdx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export interface ButtonExplanationItem {
  buttonName: string;
  whatItDoes: string;
}

export interface TutorialSectionInfo {
  id: TutorialSectionId;
  stepNumber: number;
  emoji: string;
  title: string;
  shortSubtitle: string;
  whatItDoes: string;
  buttonsBreakdown: ButtonExplanationItem[];
  howItConnects: string[];
  practicalExample: string;
  domSectionId?: string;
}

export const TUTORIAL_SECTIONS_CATALOG: Record<
  TutorialSectionId,
  TutorialSectionInfo
> = {
  top_header_bar: {
    id: 'top_header_bar',
    stepNumber: 1,
    emoji: '🎛️',
    title: 'Barra Superior: Idioma, País, Cuenta, Insulina Activa (IOB), Nube y Configuración de Dosis',
    shortSubtitle:
      'Los controles generales que manejan el idioma de la app, tu perfil médico (Conteo de HC o Dosis Fijas), tu insulina en cuerpo y tus copias en la nube',
    whatItDoes:
      'Es el panel de mando que queda siempre visible arriba de todo. Desde acá cambiás el idioma de la app en cualquier momento, elegís de qué país sos, ves cuánta insulina sigue activa en tu cuerpo (IOB), respaldás tus datos en la nube y configurás tus valores médicos para calcular las dosis.',
    buttonsBreakdown: [
      {
        buttonName: '🧭 Botón «Ir a Sección ▾» (y pestaña lateral «Secciones»)',
        whatItDoes:
          'Despliega un menú de atajos con todas las secciones de la app (Dispositivos, Calculadora, Buscador de Comidas, Ejercicio, Monitor Renal, Historial Permanente, Comunidad y Los 42 Factores). Con un solo toque te lleva directo a la sección que elijas sin tener que scrollear toda la pantalla. Además, a un costado de la pantalla siempre tenés la pestaña flotante «🧭 Secciones» y el botón «⬆️ Arriba» para volver al inicio al instante.',
      },
      {
        buttonName: '🌎 Selector de País (Bandera + Nombre del país)',
        whatItDoes:
          'Te permite elegir en qué país estás (Argentina, España, México, Chile, Colombia, Uruguay, Perú, Brasil, EE.UU.). Al cambiarlo, la app cambia automáticamente las tablas oficiales de alimentos y te muestra solo los comercios recomendados de ese país.',
      },
      {
        buttonName: '👤 Botón «Entrar / Mi Cuenta»',
        whatItDoes:
          'Sirve para iniciar sesión con tu correo o con Google. Si entrás con tu cuenta, tus comidas, bolos y configuración se sincronizan en tiempo real para que no pierdas nada si abrís la app en otro celular o computadora.',
      },
      {
        buttonName: '💓 Botón «Insulina Activa (IOB: X.XX U)»',
        whatItDoes:
          'El IOB (Insulin On Board) es la insulina rápida de pinchazos anteriores que todavía sigue bajando el azúcar en tu cuerpo. Al tocar este botón se abre una ventana que te muestra: 1) Cuánta insulina te queda activa y a qué hora se termina por completo, 2) La curva minuto a minuto, y 3) Un botón para «+ Registrar Bolo Manual» por si te aplicaste insulina sin usar la calculadora.',
      },
      {
        buttonName: '🔥 Cartel «Meta hoy (kcal)» y botón «Día Activo / Descanso»',
        whatItDoes:
          'Muestra cuántas calorías tenés como objetivo hoy. Tocando el botoncito de al lado podés alternar entre un Día Activo (más calorías) y un Día de Descanso (menos calorías).',
      },
      {
        buttonName: '🔄 Botón «Nuevo Día»',
        whatItDoes:
          'Guarda todas las comidas del día en el Historial Permanente y pone en cero el contador diario de calorías y proteínas para arrancar un nuevo día limpio (no borra tu insulina activa IOB para cuidar tu seguridad).',
      },
      {
        buttonName: '☁️ Botón «Multi-Nube» (Almacenamiento en la Nube)',
        whatItDoes:
          'Abre el centro de copias de seguridad. Ahí podés: 1) Conectar tu Google Drive personal para subir y restaurar tus comidas y configuraciones con un clic, o 2) Descargar/subir archivos de respaldo compatibles con MEGA, Koofr o cualquier nube.',
      },
      {
        buttonName: '⚙️ Botón de «Configuración» (Rueda dentada - Conteo de Carbohidratos o Dosis Fijas)',
        whatItDoes:
          'Acá configurás cómo calculás tu insulina: podés elegir entre «🥖 Conteo de Carbohidratos» (con tu Ratio ICR general o por horario de comida y tu Sensibilidad FSI) o «📋 Dosis Fijas por Comida» (donde ponés cuántas unidades fijas te indicó tu médico para Desayuno, Almuerzo, Merienda y Cena, y armás tu Tabla de Corrección por escalones de glucosa). También elegís tu marca de insulina rápida, el redondeo y tu modo de aplicación (Lapicera manual, Puerto i-Port o Bomba). Además, incluye la «🧬 Calibración de tu Tejido por Zona Corporal» para definir si tu abdomen, muslos, brazos o glúteos tienen contextura adiposa, neutra o magra/atlética con datos científicos reales.',
      },
      {
        buttonName: '⚠️ Cartel «Avisos de Precisión y Seguridad» y botón «Ver los 42 factores →»',
        whatItDoes:
          'Aparece arriba de todo en pantalla para cuidarte: te recuerda de forma compacta 1) Que la app puede cometer errores y cómo reportarlos, 2) Que el sensor de glucosa suele tener variaciones en su primer día y en su último día de vida, 3) Que la insulina abierta dura 28-30 días y no debe exponerse a calor o sol directo, y 4) Te ofrece el botón «Ver los 42 factores →» para saltar directo a la guía de factores (temperatura, duchas calientes, sol, etc.) antes de inyectarte.',
      },
    ],
    howItConnects: [
      'Lo que elijas en ⚙️ Configuración (ya sea Conteo de Carbohidratos o Esquema de Dosis Fijas + Escala de Corrección) cambia automáticamente la Calculadora de Bolus para adaptarse a tu tratamiento.',
      'La 🧬 Calibración de Tejido por Zona Corporal que guardes acá viaja directo a la Calculadora: si sos corredor con piernas magras o hacés pesas con abdomen marcado, adapta con rigor científico la velocidad de absorción y los minutos de espera antes de comer.',
      'Las unidades que aparecen en 💓 Insulina Activa (IOB) se descuentan automáticamente en la Calculadora cuando querés corregir una glucosa alta, evitando que te inyectes dos veces por la misma subida.',
      'El país que elijas en 🌎 Selector de País filtra tanto el Buscador de Alimentos como el apartado de Comercios Recomendados.',
    ],
    practicalExample:
      'Si hace 1 hora te pusiste 4 U para merendar y ahora medís 170 mg/dL, el botón de IOB te muestra que todavía tenés 2.5 U trabajando en el cuerpo y la calculadora las tiene en cuenta para que no te pases de insulina.',
    domSectionId: 'section-top-header',
  },
  devices_tracker: {
    id: 'devices_tracker',
    stepNumber: 2,
    emoji: '⏰',
    title: 'Control de Días de Dispositivos (Sensor, Puerto i-Port y Bomba)',
    shortSubtitle:
      'Cuenta sola los días que lleva puesto tu sensor, puerto o set de bomba y te avisa al abrir la app cuando toca cambio',
    whatItDoes:
      'Muestra tarjetas con el progreso de días de uso de tu Sensor de Glucosa, tu Puerto de Inyección i-Port Advance o el Catéter/Set de tu Bomba. Cada medianoche suma un día solo y, cuando llega al día límite, te muestra una alerta grande apenas abrís la aplicación.',
    buttonsBreakdown: [
      {
        buttonName: '🟢 Botón «¡Nuevo hoy! (Día 1)»',
        whatItDoes:
          'Lo tocás el día que te cambiás el sensor, el puerto i-Port o la cánula de la bomba por uno nuevo. Reinicia la cuenta a Día 1 con la fecha de hoy.',
      },
      {
        buttonName: '⚙️ Botón «Configurar Duración / Días»',
        whatItDoes:
          'Despliega el panel para elegir cuántos días dura cada dispositivo (por ejemplo: Sensor de 7, 10, 14 o 15 días; Puerto i-Port de 3 o 4 días; Set de Bomba de 2, 3, 4 o 7 días) y te permite indicar por qué día vas hoy si ya lo tenías puesto desde antes.',
      },
      {
        buttonName: '🔔 Botones del Aviso de Vencimiento («Ya lo cambié hoy» / «Avisarme mañana»)',
        whatItDoes:
          'Cuando un dispositivo cumple sus días estipulados, salta un cartel al abrir la app: si ya te pusiste uno nuevo tocás «Ya lo cambié hoy», y si todavía lo vas a estirar unas horas tocás «Avisarme mañana».',
      },
    ],
    howItConnects: [
      'Los días de uso de tu Puerto i-Port o de tu Set de Bomba se conectan directo con la Calculadora de Dosis: si ya vas por el Día 3 o Día 4, la calculadora te suma entre +4 y +8 minutos extra de espera antes de comer porque el tejido alrededor de la cánula absorbe más lento.',
    ],
    practicalExample:
      'Configurás que tu sensor FreeStyle Libre dura 14 días y que hoy vas por el Día 10. Dentro de 4 días, apenas abras la app a la mañana te va a saltar el cartel avisándote que hoy toca cambio.',
    domSectionId: 'section-devices-tracker',
  },
  insulin_calculator: {
    id: 'insulin_calculator',
    stepNumber: 3,
    emoji: '💉',
    title: 'Calculadora de Dosis de Bolus (Conteo de HC o Dosis Fijas, Zonas con Tejido Real, Comida Reciente y Bolo Dividido)',
    shortSubtitle:
      'Calcula tus unidades exactas tanto si contás carbohidratos como si tenés dosis fijas, calibra la espera según tu tejido por zona y sugiere bolo dividido',
    whatItDoes:
      'Es el corazón operativo de la app: calcula cuánta insulina rápida necesitás para tu comida (ya sea por gramos de carbohidratos o por esquema de dosis fijas) y para corregir tu glucosa (por sensibilidad o por tabla de rangos), adaptando el tiempo de espera según la zona anatómica donde te apliques, la contextura de grasa/músculo de esa zona y el momento de la comida.',
    buttonsBreakdown: [
      {
        buttonName: '📍 Botones de Zona de Pinchazo («Abdomen Bajo», «Abdomen Sup.», «Brazo», «Muslo», «Glúteo»)',
        whatItDoes:
          'Te permiten elegir dónde te vas a pinchar en este momento (si usás lapicera/jeringa) o dónde tenés puesto el puerto/bomba. Como cada zona absorbe la insulina a distinta velocidad, al tocar una zona cambia automáticamente el reloj de espera previa. Además, muestra la etiqueta de consistencia real de esa zona (ej. Magro/Atlético, Adiposo o Neutro): si tu abdomen o piernas son magras y musculosas, la insulina actúa más rápido por mayor flujo sanguíneo; si la zona es adiposa o acolchada, la absorción es más constante y gradual.',
      },
      {
        buttonName: '🩸 Casillero «Glucemia Actual» y Modalidad de Medición',
        whatItDoes:
          'Ahí escribís tu glucosa actual en mg/dL. Si configuraste sensor sin NFC (lector externo) o punción capilar, la calculadora te deja el espacio limpio para escribir directo sin carteles molestos. Si usás sensor continuo en el celular con conexión activa (LibreLinkUp, Dexcom, etc.), podés sincronizarla con «Leer Sensor». Si ingresás un valor menor a 70 mg/dL, se despliega automáticamente el 🚨 Asistente de Rescate de Hipoglucemia con cronómetro de 15 minutos.',
      },
      {
        buttonName: '↗️ Botones de «Flecha de Tendencia» (→, ↗, ↑, ⇈, ↘, ↓, ⇊)',
        whatItDoes:
          'Indican hacia dónde se mueve tu glucosa según tu sensor. Si está subiendo rápido suma un pequeño ajuste preventivo, y si está bajando reduce la dosis sugerida para evitar que sigas cayendo.',
      },
      {
        buttonName: '🥖 / 📋 Modalidad de Cálculo («Conteo HC» vs «Dosis Fijas»)',
        whatItDoes:
          'Se define directamente en ⚙️ Configuración («¿Cómo calculas tus dosis de comida?») para que la pantalla quede limpia y sin botones que ocupen espacio de más: si elegís «🥖 Conteo HC» calcula con gramos de carbohidratos, ratio ICR y sensibilidad FSI; si elegís «📋 Dosis Fijas» muestra tus botones de unidades fijas por comida y tabla de corrección.',
      },
      {
        buttonName: '🍽️ Botones de Comida Fija («🌅 Desayuno», «☀️ Almuerzo», «🧉 Merienda», «🌙 Cena» y «🩸 Solo Corrección»)',
        whatItDoes:
          'Aparecen al estar en «📋 Dosis Fijas». Cada botón ya tiene grabadas las unidades que te recetó tu médico (ej. +4 U para almuerzo o +3 U para cena). Si solo querés corregir una glucemia alta sin comer nada, tocás «🩸 Solo Corrección» (que pone 0 U de comida y aplica únicamente la corrección de tu tabla). Si algún día comés más o menos de lo habitual, podés ajustar los números a mano en el casillero que aparece al lado.',
      },
      {
        buttonName: '📏 Panel en vivo «Tu Tabla de Corrección por Glucosa»',
        whatItDoes:
          'Muestra exactamente en qué escalón de tu tabla cae tu glucosa actual y cuántas unidades te suma (ejemplo: si medís 180 mg/dL y tu tabla dice que de 170 a 200 mg/dL van +2 U, la calculadora te resalta ese escalón en vivo y lo suma automáticamente a las unidades de tu comida). Podés editar, agregar o quitar escalones desde ⚙️ Configuración.',
      },
      {
        buttonName: '🕒 Botones «¿Cuándo es esta comida?» («🍽️ Ahora», «Hace 10m», «Hace 15m», «Hace 30m», «Hace 45m», «Hace 1h», «Hace 1h 30m», «Hace 2h»)',
        whatItDoes:
          'Sirven para indicar si vas a comer ahora mismo o si es una comida reciente que ya hiciste hace un rato. Si elegís una comida reciente (ej. «Hace 15m» o «Hace 1h»), aparecen 2 opciones súper útiles: 1) «💉 Me inyecto recién AHORA» (ideal si te olvidaste de pincharte antes de comer: te avisa que te inyectes directo sin hacer espera previa), o 2) «📝 Ya me pinché hace X min» (ideal si ya te habías inyectado al comer pero recién ahora abrís la app para anotarlo: registra la comida y el pinchazo con la hora real de hace X minutos para que tu curva de insulina activa IOB descuente el tiempo que ya pasó).',
      },
      {
        buttonName: '🥖 Casillero «Carbohidratos (g)» y botón «Limpiar Plato»',
        whatItDoes:
          'Podés escribir los gramos de carbohidratos a mano si ya los sabés, o dejar que se carguen solos cuando agregás alimentos desde el Buscador de abajo. El botón «Limpiar Plato» vacía los alimentos cargados para empezar de cero.',
      },
      {
        buttonName: '🍕 Panel de «Bolo Dividido (En 2 Dosis)»',
        whatItDoes:
          'Cuando tu plato tiene mucha grasa o proteína (como pizza, hamburguesa, empanadas fritas o asado), la digestión tarda horas. Este panel te sugiere dividir la insulina en una 1ª Dosis ahora y una 2ª Dosis más tarde, dejándote elegir el porcentaje (ej. 60% / 40%) y el tiempo de espera.',
      },
      {
        buttonName: '✅ Botón «Registrar Dosis Administrada» (o «Aplicar 1ª Dosis y Programar 2ª»)',
        whatItDoes:
          'Confirma tu dosis y guarda tanto el bolo como la comida (con la hora actual o con la hora reciente que hayas elegido).',
      },
    ],
    howItConnects: [
      'Recibe los carbohidratos, grasas, proteínas y fibra que mandás desde el Buscador de Alimentos o el Analizador de Fotos con IA.',
      'Si estás en modo «📋 Dosis Fijas», toma las unidades fijas de cada comida y la Tabla de Corrección por Rangos de Glucosa que configuraste al abrir la app o en ⚙️ Configuración.',
      'Recibe el descuento de Insulina Activa (IOB) desde la Barra Superior para no superponer insulina.',
      'Lee qué Deportes o qué Factores de los 42 tenés activos hoy para mostrarte avisos preventivos antes de inyectarte.',
      'Al tocar «Registrar Dosis», envía las unidades al contador de IOB (descontando los minutos si marcaste que ya te habías pinchado hace un rato), suma las calorías y proteínas al Balance Diario y archiva el plato en el Historial Permanente.',
    ],
    practicalExample:
      'Si tenés dosis fijas de 4 U para la cena y medís 180 mg/dL (que en tu tabla suma +3 U de corrección), tocás «🌙 Cena» y la calculadora te muestra directamente 4 U + 3 U = 7 U totales. Y si ya habías cenado hace 15 minutos, tocás «Hace 15m» para registrarlo con exactitud.',
    domSectionId: 'section-insulin-calculator',
  },
  food_analyzer: {
    id: 'food_analyzer',
    stepNumber: 4,
    emoji: '🍽️',
    title: 'Buscador de Alimentos, Favoritos, País y Analizador por Foto / Texto',
    shortSubtitle:
      'Todas las herramientas para saber cuántos carbohidratos, grasas y proteínas tiene tu comida y mandarlos a la calculadora',
    whatItDoes:
      'Te permite buscar cualquier alimento o bebida, usar tus comidas favoritas en un clic, escanear códigos de barras o analizar un plato con foto o texto para enviarlo directo a la calculadora de insulina.',
    buttonsBreakdown: [
      {
        buttonName: '⭐ Barra de «Mis Alimentos Favoritos (1 Clic)» y botón «+ Crear Favorito»',
        whatItDoes:
          'Son botones de acceso rápido con tus comidas de todos los días. Al tocar cualquiera de tus favoritos, se suma instantáneamente al plato de la calculadora. Además, en la lista de resultados podés tocar el ícono de Estrella (⭐) al lado de cualquier comida para guardarla acá, o tocar «+ Crear Favorito» para armar uno con tus propios valores.',
      },
      {
        buttonName: '🌎 Selector de «País y Fuentes Oficiales»',
        whatItDoes:
          'Muestra qué país tenés elegido y te deja activar o desactivar de qué tablas querés buscar (por ejemplo: tabla oficial del Ministerio de Salud de tu país, marcas de supermercado de OpenFoodFacts o base clínica USDA).',
      },
      {
        buttonName: '🔍 Pestaña «Buscador / Tabla», Selector de Gramos/Porciones y botón «+ Plato»',
        whatItDoes:
          'Escribís el alimento (ej. "arroz", "pan francés", "galletitas"), elegís la cantidad en gramos o tocás las porciones caseras rápidas (ej. "1 unidad", "1 taza", "1 porción") y al tocar «+ Plato» lo manda directo arriba a la Calculadora de Bolus.',
      },
      {
        buttonName: '📷 Botón «Código de Barras»',
        whatItDoes:
          'Abre la cámara de tu celular para apuntar al código de barras de cualquier paquete de supermercado y traer su tabla nutricional exacta.',
      },
      {
        buttonName: '📸 Pestaña «Analizar con IA (Foto o Texto)», Aviso de Precisión y Botón «Enviar al Plato»',
        whatItDoes:
          'Tiene dos opciones que podés usar juntas o separadas: 1) Botón «Sacar Foto / Subir Imagen» para fotografiar el plato servido o un paquete, y 2) Cuadro de texto para escribir lo que vas a comer (ej. "arroz frío recalentado", "puré de papas casero", "fideos al dente" o una marca específica). Justo debajo del cuadro tenés el consejo de precisión: si le detallás a la IA si la comida está fría o recién hecha, si es puré o al dente, o la marca exacta, la IA adapta con ciencia real la absorción (almidón resistente vs absorción rápida), el índice glucémico y los minutos de pre-bolo antes de mandar todo a la calculadora.',
      },
    ],
    howItConnects: [
      'Cada alimento que tocás en «⭐ Favoritos», en «+ Plato» o en «Enviar al Plato» viaja directo a la Calculadora de Dosis de Bolus (sumando carbohidratos para la dosis y grasas/proteínas para avisarte si conviene bolo dividido).',
      'Se conecta con tus Condiciones Médicas: si tenés activada Celiaquía (Sin TACC), Protección Renal o Intolerancia a la Lactosa, el buscador te muestra alertas rojas o amarillas cuando un alimento no es apto.',
    ],
    practicalExample:
      'A la mañana solo tocás tu botón favorito «☕ Café con leche + 2 tostadas» y en 1 segundo ya tenés los carbohidratos cargados en la calculadora listos para calcular tu insulina.',
    domSectionId: 'section-food-analyzer',
  },
  workout_routine: {
    id: 'workout_routine',
    stepNumber: 5,
    emoji: '🏅',
    title: 'Mi Rutina de Ejercicio y Deporte (20 Deportes y Calorías)',
    shortSubtitle:
      'Configurá los deportes que hacés, marcá «Hecho» o «No hecho» y conectalo con tus calorías y tu sensibilidad a la insulina',
    whatItDoes:
      'Te permite armar tu propia lista de ejercicios o caminatas diarias eligiendo entre 20 deportes. Calcula cuántas calorías quemás según tu peso corporal y ajusta tanto tu meta de calorías como los avisos de sensibilidad a la insulina.',
    buttonsBreakdown: [
      {
        buttonName: '⚖️ Casillero «Tu Peso (kg)»',
        whatItDoes:
          'Te permite poner tu peso corporal actual. La app usa este número junto con los minutos de ejercicio para calcular con precisión cuántas calorías quemás en cada actividad.',
      },
      {
        buttonName: '✏️ Botón «Armar Mi Rutina / Editar»',
        whatItDoes:
          'Abre el panel donde podés agregar nuevas actividades eligiendo entre 20 deportes (Pesas, Caminata, Correr, Ciclismo, Natación, Fútbol, Boxeo, Padel, Tenis, CrossFit, Básquet, Baile, Yoga, etc.), definir cuántos minutos hacés, elegir la intensidad (Suave, Moderada o Intensa) o borrar actividades con el ícono del tacho.',
      },
      {
        buttonName: '✅ Botones «✓ Hecho» y «✕ No hecho» al lado de cada actividad',
        whatItDoes:
          'Son los botones que tocás en el día a día para indicar si hoy hiciste o no hiciste esa actividad.',
      },
    ],
    howItConnects: [
      'Al tocar «✓ Hecho» en un deporte, esas calorías quemadas se suman automáticamente a tu Meta de Calorías del Día (tanto en la Barra Superior como en el Balance Diario de abajo).',
      'Al mismo tiempo, marcar un deporte como «✓ Hecho» enciende automáticamente ese factor en «Los 42 Factores de la Diabetes» y hace que la Calculadora de Bolus te recuerde cuidar la sensibilidad a la insulina después de entrenar.',
    ],
    practicalExample:
      'Si hoy hiciste 45 minutos de Caminata y 60 minutos de Pesas, tocás «✓ Hecho» en ambos: tu meta de calorías sube para que sepas cuánto más podés comer y la calculadora te avisa que tus músculos van a absorber glucosa más rápido en la próxima comida.',
    domSectionId: 'section-daily-workout',
  },
  daily_tracker: {
    id: 'daily_tracker',
    stepNumber: 6,
    emoji: '🔥',
    title: 'Balance Diario de Calorías, Macros y las 6 Condiciones Médicas',
    shortSubtitle:
      'Controla tus calorías, proteínas y grasas del día y activa cuidados especiales (Renal, Sin TACC, Lactosa, etc.)',
    whatItDoes:
      'Muestra las barras de progreso con todo lo que comiste hoy (Calorías, Proteína Animal, Proteína Vegetal, Carbohidratos y Grasas) y te permite activar hasta 6 condiciones médicas para que la app vigile tus límites nutricionales.',
    buttonsBreakdown: [
      {
        buttonName: '🩺 Botón Desplegable «Condiciones Médicas (6)»',
        whatItDoes:
          'Al tocarlo se abre una lista donde podés activar o desactivar con un clic cualquiera de las 6 condiciones: 1) Protección Renal (vigila el máximo de proteína animal), 2) Celiaquía Sin TACC (alerta sobre gluten y harinas sin gluten de alto índice glucémico), 3) Gastroparesia (digestión lenta), 4) Hipertensión (control de sodio), 5) Colesterol/Triglicéridos altos, y 6) Intolerancia a la Lactosa.',
      },
      {
        buttonName: '➕ Botón «+ Agregar Comida (Sin Insulina)»',
        whatItDoes:
          'Abre una ventana para anotar comidas por las que no hayas tenido que inyectarte insulina (por ejemplo: un churrasco, pollo, huevos o ensalada) para que sus calorías y proteínas se sumen igual a tu balance del día.',
      },
      {
        buttonName: '🔄 Botón «Reiniciar Día» y 🗑️ Botón de Borrar en cada comida',
        whatItDoes:
          'El botón de basura al lado de cada plato te deja eliminar una comida mal cargada, y «Reiniciar Día» archiva el día actual para empezar uno nuevo.',
      },
    ],
    howItConnects: [
      'Recibe automáticamente cada plato que registrás desde la Calculadora de Bolus.',
      'Recibe las calorías extra que ganaste al marcar deportes como «✓ Hecho» en tu Rutina de Ejercicio.',
      'Las Condiciones Médicas que actives en el desplegable 🩺 activan alertas automáticas tanto en este panel como en el Buscador y Analizador de Alimentos.',
    ],
    practicalExample:
      'Si activás «Celiaquía (Sin TACC)» y «Protección Renal» en el menú desplegable, la app vigila que no te pases de los gramos diarios de proteína animal y te avisa en el buscador si un alimento puede contener gluten.',
    domSectionId: 'section-daily-tracker',
  },
  permanent_history: {
    id: 'permanent_history',
    stepNumber: 7,
    emoji: '📊',
    title: 'Resumen de 7 Días e Historial Permanente de Comidas',
    shortSubtitle:
      'Tus estadísticas simples de la última semana y el archivo histórico de todas tus comidas pasadas',
    whatItDoes:
      'Te muestra arriba cómo estuvo tu control en los últimos 7 días y abajo guarda por fecha todas las comidas que fuiste registrando para que puedas consultarlas cuando quieras.',
    buttonsBreakdown: [
      {
        buttonName: '📈 Tarjetas de «Resumen Simple de los Últimos 7 Días»',
        whatItDoes:
          'Calculan solas tu Glucemia Promedio de la semana, tu porcentaje de mediciones en Rango (entre 70 y 180 mg/dL) con barra de colores (verde en rango, amarillo alto, rojo bajo) y tu promedio diario de unidades de insulina y carbohidratos.',
      },
      {
        buttonName: '📂 Botón «Ver historial / Ocultar»',
        whatItDoes:
          'Abre o cierra la lista completa de días anteriores para que no ocupe espacio en pantalla mientras no la estás mirando.',
      },
      {
        buttonName: '🔍 Barra de «Buscar comida o fecha»',
        whatItDoes:
          'Te permite escribir el nombre de un plato (ej. "milanesa", "pizza", "asado") o una fecha para encontrar rápido cuánta insulina te pusiste y cómo te fue esa vez.',
      },
      {
        buttonName: '☁️ Botón «Multi-Nube»',
        whatItDoes:
          'Abre directamente la ventana de respaldo en Google Drive / Nube para guardar o restaurar todo tu archivo histórico.',
      },
    ],
    howItConnects: [
      'Se alimenta automáticamente de todos los bolos y platos que registrás en la Calculadora y en el Balance Diario.',
      'Cuando tocás «Nuevo Día» arriba en la barra superior, las comidas del día pasan acá para que nunca las pierdas.',
    ],
    practicalExample:
      'Volvés a pedir empanadas en el mismo lugar que hace dos semanas: abrís el historial, escribís "empanadas" en el buscador y ves exactamente cuántas unidades te aplicaste aquella noche.',
    domSectionId: 'section-permanent-history',
  },
  community_reviews: {
    id: 'community_reviews',
    stepNumber: 8,
    emoji: '💬',
    title: 'Comunidad y Comentarios (Sin categorías obligatorias y con estrellas opcionales)',
    shortSubtitle:
      'Un espacio limpio y directo para dejar comentarios, sugerencias o dudas libremente sin tener que clasificar tu mensaje ni obligarte a puntuar',
    whatItDoes:
      'Es un mural abierto y limpio donde cualquier persona de la comunidad puede escribir un comentario libremente, compartir su experiencia o avisar si algo se puede mejorar, sin contadores molestos ni categorías obligatorias.',
    buttonsBreakdown: [
      {
        buttonName: '✍️ Botón «Escribir Comentario»',
        whatItDoes:
          'Abre el cuadro directo para escribir tu nombre y tu mensaje sin pedirte que elijas ninguna categoría.',
      },
      {
        buttonName: '⭐ Selector de Estrellas Opcional (1 a 5 estrellas o «Quitar calificación»)',
        whatItDoes:
          'Si tenés ganas de calificar la app con estrellas podés tocar de 1 a 5 estrellas, y si preferís dejar solo tu comentario sin puntuar la app, lo dejás sin estrellas (o tocás «Quitar calificación») y se publica igual.',
      },
      {
        buttonName: '❤️ Botón «Me gusta», 💬 «Responder» y 🗑️ «Borrar»',
        whatItDoes:
          'Permiten apoyar el comentario de otro usuario, responderle debajo en hilo o borrar tus propios comentarios cuando quieras.',
      },
    ],
    howItConnects: [
      'Muestra automáticamente el país y el tipo de tratamiento del usuario (ej. "FreeStyle + Pluma Manual") según lo que tenga configurado en su perfil, y guarda los comentarios en tiempo real para toda la comunidad.',
    ],
    practicalExample:
      'Querés dejar un comentario rápido o una sugerencia sin calificar con estrellas: tocás «Escribir Comentario», escribís tu mensaje, tocás «Publicar Comentario» y listo.',
    domSectionId: 'section-community-reviews',
  },
  sponsors_donations: {
    id: 'sponsors_donations',
    stepNumber: 9,
    emoji: '🏪',
    title: 'Comercios Recomendados por País, Auspiciantes y Donaciones',
    shortSubtitle:
      'Directorio de tiendas para diabetes y dietéticas de tu país, contacto para publicitar y apoyo con Mercado Pago o PayPal',
    whatItDoes:
      'Reúne comercios útiles (insumos para diabetes, parches para sensores, dietéticas Sin TACC y Keto) filtrados por el país del usuario, permite que nuevos comercios te contacten para publicitar y ofrece botones de donación voluntaria.',
    buttonsBreakdown: [
      {
        buttonName: '🚚 Botones de Filtro («Todos en tu país» / «🚚 Envíos a todo el país»)',
        whatItDoes:
          'Te permiten ver todos los comercios del país seleccionado o filtrar únicamente los que hacen envíos nacionales a cualquier provincia o región.',
      },
      {
        buttonName: '💬 Botones de cada Comercio («Consultar por WhatsApp» y «Ver Tienda / Web»)',
        whatItDoes:
          'Abren el WhatsApp o el Instagram/Tienda del comercio elegido, mostrando antes en una etiqueta clara de qué ciudad es y hasta dónde hace envíos.',
      },
      {
        buttonName: '📢 Botón «¿Tenés un Comercio? Publicitá acá»',
        whatItDoes:
          'Abre la ventana para comercios interesados en aparecer en la app (mostrando los 3 niveles de visibilidad sin precios públicos) con botones directos para hablarte por WhatsApp o Email.',
      },
      {
        buttonName: '☕ Botones «Donar con Mercado Pago (Argentina)» y «Donar con PayPal (Exterior)»',
        whatItDoes:
          'Llevan al usuario a tu link de Mercado Pago (si está en Argentina y dona en pesos) o a tu link de PayPal (si está en otro país y dona en dólares/moneda local).',
      },
      {
        buttonName: '🔐 Botón «Administrar Enlaces y Auspiciantes» (Exclusivo para vos)',
        whatItDoes:
          'Abre tu panel privado de creador para pegar tus links de Mercado Pago y PayPal cuando te hagas las cuentas y para cargar, editar o borrar comercios auspiciantes de cualquier país.',
      },
    ],
    howItConnects: [
      'Se conecta con el 🌎 Selector de País de la Barra Superior: si el usuario cambia su país a Chile, Colombia o Argentina, esta sección cambia automáticamente para mostrar solo comercios que trabajen en ese país.',
      'Los comercios que cargues con «Plan 2 (Destacado)» o «Plan 3 (Banner Principal)» aparecen también arriba de Dispositivos o arriba del Buscador de Alimentos de ese país.',
    ],
    practicalExample:
      'Un usuario de Argentina entra a buscar parches para su sensor o comida Sin TACC, ve de qué provincia es la tienda, chequea el cartel «🚚 Envíos a todo el país» y les escribe directo por WhatsApp.',
    domSectionId: 'section-sponsors-donations',
  },
  glycemic_factors: {
    id: 'glycemic_factors',
    stepNumber: 10,
    emoji: '🧬',
    title: 'Los 42 Factores que Afectan la Diabetes',
    shortSubtitle:
      'Marcá qué factores tuviste hoy para recibir consejo en la calculadora y consultá la guía completa del #1 al #42',
    whatItDoes:
      'El azúcar en sangre no cambia solo por la comida: hay 42 factores demostrados (deporte, alcohol, mal sueño, estrés, fiebre, ciclo hormonal, calor, etc.). Acá podés marcar los que tenés presentes hoy y consultar cómo actúa cada uno.',
    buttonsBreakdown: [
      {
        buttonName: '⚡ Botones de «¿Qué factores tenés presentes hoy?» (Pesas, Caminata, Alcohol, Estrés, Dormí Mal, Fiebre, etc.)',
        whatItDoes:
          'Son interruptores diarios: tocás los que te estén pasando hoy para encenderlos o apagarlos.',
      },
      {
        buttonName: '📚 Botón «Ver Guía Completa de los 42 Factores» + Buscador y Filtros',
        whatItDoes:
          'Despliega las 42 tarjetas educativas divididas por categoría (Comida, Insulina, Ejercicio, Biológicos y Ambientales), explicando con flechas si cada factor sube o baja el azúcar y qué hacer.',
      },
    ],
    howItConnects: [
      'Se vincula de ida y vuelta con «Mi Rutina de Ejercicio»: cuando marcás un deporte como «✓ Hecho» arriba, el factor de ejercicio se enciende solo acá.',
      'Se vincula directo con la «Calculadora de Dosis de Bolus»: cualquier factor que enciendas acá hace aparecer un cartel orientativo en la calculadora (por ejemplo, si encendiste «🍺 Tomé Alcohol» o «🏋️ Pesas», la calculadora te recuerda cómo impacta en tu sensibilidad antes de inyectarte).',
    ],
    practicalExample:
      'Si dormiste solo 4 horas o estás resfriado con fiebre, tocás «😴 Dormí Mal» o «🤒 Fiebre»: cuando vas a la calculadora a desayunar, te recuerda que hoy tu cuerpo puede tener más resistencia a la insulina.',
    domSectionId: 'section-glycemic-factors',
  },
};

export const ORDERED_TUTORIAL_STEPS: TutorialSectionInfo[] = [
  TUTORIAL_SECTIONS_CATALOG.top_header_bar,
  TUTORIAL_SECTIONS_CATALOG.devices_tracker,
  TUTORIAL_SECTIONS_CATALOG.insulin_calculator,
  TUTORIAL_SECTIONS_CATALOG.food_analyzer,
  TUTORIAL_SECTIONS_CATALOG.workout_routine,
  TUTORIAL_SECTIONS_CATALOG.daily_tracker,
  TUTORIAL_SECTIONS_CATALOG.permanent_history,
  TUTORIAL_SECTIONS_CATALOG.community_reviews,
  TUTORIAL_SECTIONS_CATALOG.sponsors_donations,
  TUTORIAL_SECTIONS_CATALOG.glycemic_factors,
];

export function getSectionTutorialInfo(
  sectionId: TutorialSectionId,
  userSettings?: UserSettings
): TutorialSectionInfo {
  const base = TUTORIAL_SECTIONS_CATALOG[sectionId];
  if (!base) return base;
  const s = userSettings || loadUserSettings();
  const isSimple = s.interfaceMode === 'simple';
  if (!isSimple) return base;

  if (sectionId === 'insulin_calculator') {
    return {
      ...base,
      title: 'Calculadora de Dosis de Insulina (Modo Simple)',
      shortSubtitle:
        'Ponés tu glucemia, tus carbohidratos y elegís si te inyectás todo de una o dividís la dosis',
      whatItDoes:
        'Calcula cuánta insulina rápida necesitás de forma limpia y directa. Te da el resultado sin mostrarte 300 datos matemáticos innecesarios, y te permite elegir si inyectarte todo de una vez con la lapicera o dividir la dosis en dos pinchazos si comiste alimentos con grasa o frituras.',
      buttonsBreakdown: [
        {
          buttonName: '🩸 Casillero «Glucemia Actual»',
          whatItDoes:
            'Acá ponés cuánto te dio el azúcar (ej. 180). La calculadora ya sabe cuál es tu objetivo y calcula si necesitás corregir.',
        },
        {
          buttonName: '🥖 Casillero «Carbohidratos (g)»',
          whatItDoes:
            'Ponés cuántos carbohidratos vas a comer. Podés escribirlos a mano o mandarlos automáticamente desde el Buscador de Comidas de abajo.',
        },
        {
          buttonName: '✨ Resumen Limpio de Dosis',
          whatItDoes:
            'Te muestra en grande la dosis final que necesitás. Te indica de forma simple cuánto es por la comida y cuánto es por la corrección, sin fórmulas complicadas.',
        },
        {
          buttonName: '💉 Botón «Inyectar Todo Ahora»',
          whatItDoes:
            'Para aplicarte tu dosis total de una sola vez con la lapicera y guardarla en tu historial con un clic.',
        },
        {
          buttonName: '🍕 Botón «Dividir Dosis» (Para pizza, empanadas o frituras)',
          whatItDoes:
            'Si comiste algo pesado o frito, la grasa hace que el azúcar suba más tarde. Este botón te permite inyectarte una parte ahora y programar el segundo pinchazo para 2 horas después con un recordatorio.',
        },
      ],
      howItConnects: [
        'Recibe los carbohidratos que mandás desde el Buscador de Alimentos con un clic.',
        'Descuenta la Insulina Activa que todavía tenés en el cuerpo para no repetirte dosis.',
        'Si tenés alguna condición de salud (como celiaquía o problemas renales), la calculadora te protege y adapta la dosis en silencio.',
      ],
      practicalExample:
        'Si medís 180 mg/dL y vas a comer 4 empanadas, la calculadora te dice directamente «9.5 Unidades». Tocás «Inyectar Todo» o «Dividir Dosis» y listo.',
    };
  }

  if (sectionId === 'top_header_bar') {
    return {
      ...base,
      title: 'Barra Superior y Configuración',
      shortSubtitle: 'Controlá tus datos médicos, tutoriales y configuración',
      whatItDoes:
        'Te muestra arriba la insulina activa en tu cuerpo, el acceso a los videos y tutoriales, y la tuerca de configuración donde podés cambiar entre Modo Simple y Modo Completo en cualquier momento.',
      buttonsBreakdown: [
        {
          buttonName: '⚙️ Botón de «Configuración» (Tuerca)',
          whatItDoes:
            'Acá podés elegir entre Modo Simple y Modo Completo, revisar tus dosis médicas o indicar si tenés alguna condición de salud especial (como celiaquía o riñón).',
        },
        {
          buttonName: '💓 Botón «Insulina Activa (IOB)»',
          whatItDoes:
            'Te muestra cuánta insulina te queda de pinchazos anteriores para evitar que te inyectes dos veces.',
        },
        {
          buttonName: '❓ Botón «Guía Tutorial»',
          whatItDoes:
            'Abre una ventana explicativa clara para entender cómo funciona la app paso a paso.',
        },
      ],
    };
  }

  return base;
}

/**
 * Botón con signo de interrogación (?) que se coloca al lado de cada apartado de la app.
 * Al tocarlo, abre una ventana clara y simple explicando exactamente:
 * 1) Qué hace ese apartado
 * 2) Qué hace CADA BOTÓN dentro de esa parte
 * 3) Cómo se vinculan esos botones con las demás partes de la app
 */
export const SectionHelpButton: React.FC<{
  sectionId: TutorialSectionId;
  label?: string;
  showText?: boolean;
  settings?: UserSettings;
}> = ({ sectionId, label, showText = true, settings }) => {
  const [isOpen, setIsOpen] = useState(false);
  const info = getSectionTutorialInfo(sectionId, settings);
  if (!info) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        title={`Ver video demostración y qué hace cada botón (${info.title})`}
        aria-label={`Ayuda y video sobre ${info.title}`}
        className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-xl bg-teal-500/15 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 text-xs font-bold transition cursor-pointer shrink-0 shadow-sm"
      >
        <span className="text-sm leading-none select-none">❓</span>
        <span className="text-[11px] font-semibold">{label || '¿Qué hace?'}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-slate-900 border-2 border-teal-500/70 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden text-left flex flex-col max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-teal-950/90 via-slate-900 to-slate-900 p-4 border-b border-teal-500/30 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="text-2xl leading-none mt-0.5">{info.emoji}</span>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                    Video Demostración y Guía de Botones
                  </span>
                  <h3 className="text-base font-extrabold text-white mt-1">
                    {info.title}
                  </h3>
                  <p className="text-xs text-teal-200/90 mt-0.5">
                    {info.shortSubtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs overflow-y-auto flex-1">
              {/* Demostración en Video Animado de esta sección adaptada al perfil */}
              <AnimatedTutorialVideoPlayer sectionId={sectionId} settings={settings} />

              {/* 1. Qué es este apartado */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider block">
                  🤔 ¿Para qué sirve esta parte?
                </span>
                <p className="text-slate-200 leading-relaxed">
                  {info.whatItDoes}
                </p>
              </div>

              {/* 2. Desglose de cada botón de esta parte */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <MousePointerClick className="h-4 w-4 text-amber-400" />
                  <span className="text-[11px] font-extrabold text-amber-300 uppercase tracking-wider">
                    🔘 ¿Qué hace cada botón y control acá adentro?
                  </span>
                </div>
                <div className="space-y-2">
                  {info.buttonsBreakdown.map((btn, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/90 border border-slate-800/90 rounded-lg p-2.5 space-y-1"
                    >
                      <div className="font-extrabold text-white text-xs">
                        {btn.buttonName}
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        {btn.whatItDoes}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Cómo se vinculan estos botones con el resto de la app */}
              <div className="bg-indigo-950/30 border border-indigo-700/40 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Link2 className="h-4 w-4 text-indigo-400" />
                  <span className="text-[11px] font-extrabold text-indigo-300 uppercase tracking-wider">
                    🔗 ¿Cómo se vinculan estos botones con el resto de la app?
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {info.howItConnects.map((conn, idx) => (
                    <li
                      key={idx}
                      className="text-slate-200 flex items-start gap-2 leading-relaxed"
                    >
                      <span className="text-indigo-400 font-bold shrink-0">↔</span>
                      <span>{conn}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 4. Ejemplo práctico */}
              <div className="bg-teal-950/40 border border-teal-700/50 rounded-xl p-3 space-y-1">
                <span className="text-[11px] font-bold text-teal-300 block">
                  💡 Ejemplo práctico:
                </span>
                <p className="text-slate-200 leading-relaxed italic">
                  "{info.practicalExample}"
                </p>
              </div>
            </div>

            <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="py-2 px-5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs transition cursor-pointer"
              >
                ¡Entendido!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Guía / Tutorial Interactivo Completo que se abre automáticamente la primera vez
 * que se entra a la app (y también cuando el usuario toca "❓ Guía / Tutorial" arriba en el Header).
 */
export const InteractiveTutorialGuideModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  settings?: UserSettings;
}> = ({ isOpen, onClose, settings }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'step_by_step' | 'all_sections'>('step_by_step');

  if (!isOpen) return null;

  const isSimple = (settings?.interfaceMode || loadUserSettings().interfaceMode) === 'simple';
  const rawSteps = isSimple
    ? [
        TUTORIAL_SECTIONS_CATALOG.insulin_calculator,
        TUTORIAL_SECTIONS_CATALOG.top_header_bar,
      ]
    : ORDERED_TUTORIAL_STEPS;

  const steps = rawSteps.map((step, idx) => ({
    ...getSectionTutorialInfo(step.id, settings),
    stepNumber: idx + 1,
  }));

  const currentStep = steps[currentIndex] || steps[0];
  const totalSteps = steps.length;

  const handleGoToSectionInApp = (domId?: string) => {
    onClose();
    if (domId) {
      setTimeout(() => {
        const el = document.getElementById(domId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          el.classList.add('ring-4', 'ring-teal-400', 'transition-all', 'duration-500');
          setTimeout(() => {
            el.classList.remove('ring-4', 'ring-teal-400');
          }, 2500);
        }
      }, 120);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-teal-500/80 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header del Tutorial (Compactado al máximo) */}
        <div className="p-2 border-b border-teal-500/20 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-300">
            Guía de la App
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            title="Cerrar tutorial"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Aviso explicativo de videos tutoriales en cada sección */}
        <div className="px-3.5 py-2 bg-gradient-to-r from-teal-950/70 via-slate-900 to-slate-950 border-b border-teal-500/30 flex items-center gap-2 text-xs text-teal-200">
          <span className="text-sm shrink-0">💡</span>
          <p className="leading-tight">
            <strong>Dato importante:</strong> Cada parte de la app tiene un botón con el signo <strong>❓ ¿Qué hace?</strong> para ver en cualquier momento su propio video tutorial animado con ejemplos reales.
          </p>
        </div>

        {/* Selector de modo: Paso a Paso vs Ver Todos de un vistazo */}
        <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setViewMode('step_by_step')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                viewMode === 'step_by_step'
                  ? 'bg-teal-500 text-slate-950'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              👣 Recorrido Detallado ({currentIndex + 1}/{totalSteps})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all_sections')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                viewMode === 'all_sections'
                  ? 'bg-teal-500 text-slate-950'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              📋 Ver Todos los Apartados y Botones Juntos
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-slate-400 hover:text-teal-300 underline cursor-pointer"
          >
            Saltar guía e ir a la app →
          </button>
        </div>

        {/* Contenido Principal */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {viewMode === 'step_by_step' ? (
            <div className="space-y-4">
              {/* Barra de pestañas rápidas */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {steps.map((step, idx) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 transition border cursor-pointer ${
                      idx === currentIndex
                        ? 'bg-teal-500/25 border-teal-400 text-teal-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{step.emoji}</span>
                    <span>{idx + 1}</span>
                  </button>
                ))}
              </div>

              {/* Tarjeta del Paso Actual */}
              <div className="bg-slate-950 border border-teal-800/60 rounded-2xl p-4 space-y-3.5 shadow-inner">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl">{currentStep.emoji}</span>
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold text-teal-400">
                        Apartado {currentStep.stepNumber} de {totalSteps}
                      </span>
                      <h3 className="text-base sm:text-lg font-extrabold text-white">
                        {currentStep.title}
                      </h3>
                      <p className="text-xs text-teal-200/90">
                        {currentStep.shortSubtitle}
                      </p>
                    </div>
                  </div>

                  {currentStep.domSectionId && (
                    <button
                      type="button"
                      onClick={() => handleGoToSectionInApp(currentStep.domSectionId)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-teal-600/50 text-teal-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Compass className="h-3.5 w-3.5" />
                      <span>Ir a este apartado</span>
                    </button>
                  )}
                </div>

                {/* Reproductor de Video Animado de esta sección */}
                <AnimatedTutorialVideoPlayer sectionId={currentStep.id} settings={settings} />

                {/* 1. Qué es */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                  <span className="font-bold text-teal-300 block">
                    🤔 ¿Para qué sirve esta parte?
                  </span>
                  <p className="text-slate-200 leading-relaxed">
                    {currentStep.whatItDoes}
                  </p>
                </div>

                {/* 2. Qué hace cada botón */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
                  <div className="flex items-center gap-1.5">
                    <MousePointerClick className="h-4 w-4 text-amber-400" />
                    <span className="font-extrabold text-amber-300 uppercase tracking-wider">
                      🔘 ¿Qué hace cada botón acá adentro?
                    </span>
                  </div>
                  <div className="space-y-2">
                    {currentStep.buttonsBreakdown.map((btn, i) => (
                      <div
                        key={i}
                        className="bg-slate-950 border border-slate-800/90 rounded-lg p-2.5 space-y-1"
                      >
                        <div className="font-extrabold text-white text-xs">
                          {btn.buttonName}
                        </div>
                        <p className="text-slate-300 leading-relaxed">
                          {btn.whatItDoes}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Cómo se vincula */}
                <div className="bg-indigo-950/30 border border-indigo-700/40 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Link2 className="h-4 w-4 text-indigo-400" />
                    <span className="font-extrabold text-indigo-300 uppercase tracking-wider">
                      🔗 ¿Cómo se vinculan estos botones con el resto de la app?
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {currentStep.howItConnects.map((conn, i) => (
                      <li key={i} className="text-slate-200 flex items-start gap-2 leading-relaxed">
                        <span className="text-indigo-400 font-bold">↔</span>
                        <span>{conn}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 4. Ejemplo simple */}
                <div className="bg-teal-950/30 border border-teal-700/40 rounded-xl p-3 text-xs">
                  <span className="font-bold text-teal-300 block mb-0.5">
                    💡 Ejemplo simple:
                  </span>
                  <p className="text-slate-200 italic">
                    "{currentStep.practicalExample}"
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {steps.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.emoji}</span>
                      <h4 className="font-extrabold text-white text-sm">
                        {item.stepNumber}. {item.title}
                      </h4>
                    </div>
                    {item.domSectionId && (
                      <button
                        type="button"
                        onClick={() => handleGoToSectionInApp(item.domSectionId)}
                        className="px-2.5 py-1 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 text-[11px] font-bold cursor-pointer"
                      >
                        Ir ahí →
                      </button>
                    )}
                  </div>
                  <p className="text-slate-300 leading-relaxed">{item.whatItDoes}</p>
                  <div className="space-y-1.5 pt-1">
                    <span className="font-bold text-amber-300 block">
                      🔘 Botones de esta parte:
                    </span>
                    {item.buttonsBreakdown.map((b, idx) => (
                      <div key={idx} className="bg-slate-900 border border-slate-800 rounded-lg p-2">
                        <span className="font-bold text-white">{b.buttonName}: </span>
                        <span className="text-slate-300">{b.whatItDoes}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1 pt-1">
                    <span className="font-bold text-indigo-300 block">
                      🔗 Cómo se vincula:
                    </span>
                    {item.howItConnects.map((c, idx) => (
                      <div key={idx} className="text-slate-300">
                        ↔ {c}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer de Navegación del Tutorial */}
        <div className="px-4 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          {viewMode === 'step_by_step' ? (
            <>
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1 border transition ${
                  currentIndex === 0
                    ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 cursor-pointer'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Anterior</span>
              </button>

              <span className="text-xs font-mono text-slate-400">
                Apartado {currentIndex + 1} de {totalSteps}
              </span>

              {currentIndex < totalSteps - 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIndex((prev) => Math.min(totalSteps - 1, prev + 1))
                  }
                  className="py-2 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs flex items-center gap-1 transition cursor-pointer shadow-md"
                >
                  <span>Siguiente apartado</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>¡Empezar a usar la App!</span>
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="ml-auto py-2 px-5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Cerrar Guía y Volver a la App</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Barra superior compacta para cada apartado con el título del apartado y el botón (?) al lado.
 */
export const SectionHeaderBar: React.FC<{
  sectionId: TutorialSectionId;
  settings?: UserSettings;
}> = ({ sectionId, settings }) => {
  const info = getSectionTutorialInfo(sectionId, settings);
  if (!info) return null;

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5 mb-1.5 rounded-xl bg-slate-900/80 border border-slate-800/90">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm shrink-0">{info.emoji}</span>
        <span className="text-xs font-bold text-slate-200 truncate">
          {info.title}
        </span>
      </div>
      <SectionHelpButton sectionId={sectionId} settings={settings} />
    </div>
  );
};
