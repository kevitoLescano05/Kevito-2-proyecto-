import webpush from 'web-push';
import { Router } from 'express';

// Claves VAPID permanentes para mantener la suscripción válida
export const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BEYmSQMmIgDoJ6AaaXorMZEz7uV59mWZfos6oc_6AoTzpK9j6BTqZGzO8F81oBTh3MZpAui1q39nNSkcqHcg8LU';

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'n1ah1-oZia9J_icM9DNiz-kglLK_qDvYRUsz-8mJvOU';

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:soporte@calculadora-dt1.app';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export interface PushReminder {
  id: string;
  dueMs: number;
  title: string;
  body: string;
  splitId: string;
  subscription: webpush.PushSubscription;
  createdAt: number;
  sent?: boolean;
}

// Almacén en memoria de recordatorios programados en el servidor
const scheduledReminders = new Map<string, PushReminder>();

// Bucle en segundo plano en Node.js que revisa cada 3 segundos si venció alguna alarma
setInterval(async () => {
  const now = Date.now();
  for (const [id, reminder] of scheduledReminders.entries()) {
    if (!reminder.sent && reminder.dueMs <= now) {
      reminder.sent = true;
      console.log(`[WebPush] Disparando alarma programada: ${reminder.title} (${reminder.id})`);
      try {
        await webpush.sendNotification(
          reminder.subscription,
          JSON.stringify({
            title: reminder.title,
            body: reminder.body,
            tag: `dt1-split-${reminder.splitId}`,
            splitId: reminder.splitId,
            url: '/',
          }),
          {
            urgency: 'high', // Obligatorio para Android/Chrome: prioridad alta despierta el dispositivo
            TTL: 3600, // 1 hora de vida útil
          }
        );
        console.log(`[WebPush] Notificación enviada con éxito al dispositivo para ${reminder.id}`);
      } catch (err: any) {
        console.error(`[WebPush] Error al enviar push para ${id}:`, err?.statusCode, err?.message);
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          // Suscripción inválida o expirada
          scheduledReminders.delete(id);
        }
      }
    }
  }

  // Limpieza de alarmas enviadas con más de 2 horas de antigüedad
  for (const [id, reminder] of scheduledReminders.entries()) {
    if (reminder.sent && now - reminder.dueMs > 2 * 60 * 60 * 1000) {
      scheduledReminders.delete(id);
    }
  }
}, 3000);

export const pushRouter = Router();

// 1. Obtener la clave pública VAPID para que el cliente se suscriba
pushRouter.get('/public-key', (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// 2. Programar un recordatorio de dosis que se disparará en dueMs
pushRouter.post('/schedule-reminder', (req, res) => {
  try {
    const { subscription, reminder } = req.body;
    if (!subscription || !subscription.endpoint || !reminder || !reminder.id || !reminder.dueMs) {
      return res.status(400).json({ error: 'Faltan parámetros de suscripción o recordatorio' });
    }

    const newReminder: PushReminder = {
      id: reminder.id,
      dueMs: Number(reminder.dueMs),
      title: reminder.title || '⏱️ Tiempo cumplido: Dosis de Novorapid',
      body: reminder.body || 'Momento de chequear tu FreeStyle Libre y aplicar la dosis.',
      splitId: reminder.splitId || reminder.id,
      subscription,
      createdAt: Date.now(),
      sent: false,
    };

    scheduledReminders.set(reminder.id, newReminder);
    console.log(
      `[WebPush] Recordatorio agendado para ${new Date(newReminder.dueMs).toLocaleTimeString()} (${Math.round(
        (newReminder.dueMs - Date.now()) / 1000
      )}s a partir de ahora)`
    );

    return res.json({ success: true, reminderId: reminder.id });
  } catch (err: any) {
    console.error('[WebPush] Error al programar recordatorio:', err);
    return res.status(500).json({ error: err?.message || 'Error interno' });
  }
});

// 3. Cancelar un recordatorio de dosis si el usuario lo confirmó o descartó
pushRouter.post('/cancel-reminder', (req, res) => {
  try {
    const { id } = req.body;
    if (id && scheduledReminders.has(id)) {
      scheduledReminders.delete(id);
      console.log(`[WebPush] Recordatorio cancelado: ${id}`);
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Error interno' });
  }
});

// 4. Enviar notificación de prueba diferida (ej: en 5 segundos) para validar con la pantalla bloqueada
pushRouter.post('/test-reminder', async (req, res) => {
  try {
    const { subscription, delaySeconds = 5 } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Suscripción requerida' });
    }

    const dueMs = Date.now() + delaySeconds * 1000;
    const testId = `test-${Date.now()}`;

    scheduledReminders.set(testId, {
      id: testId,
      dueMs,
      title: '🔔 Prueba de Notificación DT1',
      body: '¡Excelente! Las notificaciones nativas funcionan con la pantalla bloqueada y la app cerrada.',
      splitId: testId,
      subscription,
      createdAt: Date.now(),
      sent: false,
    });

    console.log(`[WebPush] Prueba programada para sonar en ${delaySeconds}s`);
    return res.json({ success: true, delaySeconds });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Error interno' });
  }
});
