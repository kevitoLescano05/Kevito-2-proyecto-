import fs from 'fs';
import path from 'path';
import { Router, Response } from 'express';
import { CommunityReview } from '../src/types';

const STORE_FILE_PATH = path.join(process.cwd(), 'server', 'communityReviewsData.json');

interface CommunityStoreFile {
  deletedIds: string[];
  reviews: CommunityReview[];
}

const DEFAULT_INITIAL_REVIEWS: CommunityReview[] = [
  {
    id: 'rev-real-dosis-fijas-1',
    authorName: 'Usuario Invitado',
    authorId: 'guest-real-1',
    countryCode: 'AR',
    treatmentBadge: 'Sensor NFC + Pluma Manual',
    rating: 0,
    category: 'review',
    title: '',
    text: 'Falta que se pueda incluir la opción de dosis fijas. Yo no uso conteo de carbohidratos, uso una tabla que me dió mi médico para aplicarme insulina',
    createdAt: '2026-10-11T04:48:00.000Z',
    likesCount: 0,
    likedBy: [],
    replies: [],
    status: 'open',
    reportedBy: [],
    reportsCount: 0,
    reportReasons: [],
    autoHidden: false,
  },
  {
    id: 'seed-rev-2',
    authorName: 'Carlos R.',
    authorId: 'seed-user-3',
    countryCode: 'ES',
    treatmentBadge: 'Sensor NFC + Pluma',
    rating: 5,
    category: 'idea',
    title: 'Excelente el cambio de país para cuando viajamos',
    text: 'Viajé de Madrid a Buenos Aires y poder cambiar el catálogo de alimentos entre España (BEDCA / Mercadona) y Argentina (ARGENFOODS) con un botón es genial.',
    stickerId: 'sticker_t1d_strength',
    createdAt: '2026-10-09T21:00:00.000Z',
    likesCount: 9,
    likedBy: ['seed-3'],
    replies: [],
    status: 'open',
    reportedBy: [],
    reportsCount: 0,
  },
  {
    id: 'seed-rev-3',
    authorName: 'Sofía L.',
    authorId: 'seed-user-4',
    countryCode: 'AR',
    treatmentBadge: 'Sensor NFC + Pluma Manual',
    rating: 3,
    category: 'review',
    title: 'Muy completa la calculadora, pero el buscador a veces tarda un poco',
    text: 'Le pongo 3 estrellas porque la parte de calcular la insulina y los minutos de espera según dónde te pinches está buenísima, pero cuando buscás algunas marcas de supermercado o analizás una foto con poca señal de internet el buscador tarda varios segundos en cargar. Si agilizan eso queda de 10.',
    createdAt: '2026-10-08T21:00:00.000Z',
    likesCount: 6,
    likedBy: ['seed-4', 'seed-5'],
    replies: [],
    status: 'open',
    reportedBy: [],
    reportsCount: 0,
  },
  {
    id: 'seed-rev-1',
    authorName: 'Martín G.',
    authorId: 'seed-user-1',
    countryCode: 'AR',
    treatmentBadge: 'FreeStyle Libre + i-Port',
    rating: 5,
    category: 'review',
    title: '¡Salvavidas para las comidas con grasa y el recordatorio de i-Port!',
    text: 'Me sirve muchísimo cómo divide el bolo cuando como pizza o empanadas y te avisa cuándo toca la segunda dosis. Además tener las marcas argentinas exactas ahorra muchísimo tiempo.',
    stickerId: 'sticker_pizza_victory',
    createdAt: '2026-10-07T21:00:00.000Z',
    likesCount: 14,
    likedBy: ['seed-1', 'seed-2'],
    replies: [
      {
        id: 'seed-rep-1',
        authorName: 'Lucía M.',
        authorId: 'seed-user-2',
        countryCode: 'UY',
        text: '¡Tal cual! El chequeo de seguridad antes de la 2da dosis me evitó más de un bajón a la noche.',
        stickerId: 'sticker_in_range',
        createdAt: '2026-10-08T18:00:00.000Z',
      },
    ],
    status: 'open',
    reportedBy: [],
    reportsCount: 0,
  },
];

function sanitizeTitle(title?: string, text?: string): string {
  const t = (title || '').trim();
  const body = (text || '').trim();
  if (!t || t === body || t === '📷 Captura de pantalla adjunta') return '';
  if (t.endsWith('...')) {
    const prefix = t.slice(0, -3).trim();
    if (prefix && body.startsWith(prefix)) return '';
  }
  return t.slice(0, 120);
}

function normalizeReview(raw: any): CommunityReview | null {
  if (!raw || typeof raw !== 'object' || !raw.id) return null;
  const cleanText = String(raw.text || '').trim().slice(0, 1500);
  const cleanTitle = sanitizeTitle(raw.title, cleanText);
  if (!cleanText && !cleanTitle && !raw.stickerId && !raw.imageDataUrl) return null;

  const likedBy: string[] = Array.isArray(raw.likedBy)
    ? Array.from(new Set(raw.likedBy.map((x: any) => String(x))))
    : [];
  const reportedBy: string[] = Array.isArray(raw.reportedBy)
    ? Array.from(new Set(raw.reportedBy.map((x: any) => String(x))))
    : [];

  return {
    id: String(raw.id),
    authorName: String(raw.authorName || 'Usuario Invitado').trim().slice(0, 80),
    authorId: String(raw.authorId || 'guest-anon'),
    countryCode: (raw.countryCode || 'AR') as any,
    treatmentBadge: raw.treatmentBadge ? String(raw.treatmentBadge).slice(0, 80) : undefined,
    rating: typeof raw.rating === 'number' && raw.rating >= 0 && raw.rating <= 5 ? raw.rating : 0,
    category: raw.category || 'review',
    title: cleanTitle,
    text: cleanText,
    stickerId: raw.stickerId || undefined,
    imageDataUrl: raw.imageDataUrl || undefined,
    createdAt: raw.createdAt || new Date().toISOString(),
    likesCount: Math.max(typeof raw.likesCount === 'number' ? raw.likesCount : 0, likedBy.length),
    likedBy,
    replies: Array.isArray(raw.replies) ? raw.replies : [],
    status: raw.status === 'resolved' ? 'resolved' : 'open',
    reportedBy,
    reportsCount: Math.max(
      typeof raw.reportsCount === 'number' ? raw.reportsCount : 0,
      reportedBy.length
    ),
    reportReasons: Array.isArray(raw.reportReasons) ? raw.reportReasons : [],
    autoHidden: Boolean(raw.autoHidden),
  };
}

function loadStoreFromDisk(): CommunityStoreFile {
  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const content = fs.readFileSync(STORE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      const deletedIds: string[] = Array.isArray(parsed?.deletedIds) ? parsed.deletedIds : [];
      const rawReviews: any[] = Array.isArray(parsed?.reviews) ? parsed.reviews : [];
      const normalized = rawReviews
        .map(normalizeReview)
        .filter((r): r is CommunityReview => r !== null && !deletedIds.includes(r.id));

      // Asegurar que los iniciales estén presentes salvo que hayan sido borrados explícitamente
      const byId = new Map<string, CommunityReview>();
      for (const initRev of DEFAULT_INITIAL_REVIEWS) {
        if (!deletedIds.includes(initRev.id)) {
          byId.set(initRev.id, initRev);
        }
      }
      for (const rev of normalized) {
        byId.set(rev.id, rev);
      }

      const sorted = Array.from(byId.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return { deletedIds, reviews: sorted };
    }
  } catch (e) {
    console.warn('[CommunityReviewsServer] Error leyendo store de disco, usando inicial:', e);
  }
  return {
    deletedIds: [],
    reviews: [...DEFAULT_INITIAL_REVIEWS],
  };
}

let memoryStore: CommunityStoreFile = loadStoreFromDisk();

function persistStoreToDisk() {
  try {
    const dir = path.dirname(STORE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[CommunityReviewsServer] No se pudo escribir store en disco:', e);
  }
}

// Clientes SSE conectados en vivo para recibir actualizaciones instantáneas
const sseClients = new Set<Response>();

function broadcastReviewsUpdate() {
  const payload = JSON.stringify({
    type: 'reviews_update',
    reviews: memoryStore.reviews,
    deletedIds: memoryStore.deletedIds,
    updatedAt: new Date().toISOString(),
  });
  for (const client of sseClients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

function mergeTwoReviews(existing: CommunityReview, incoming: CommunityReview): CommunityReview {
  const mergedLikedBy = Array.from(new Set([...(existing.likedBy || []), ...(incoming.likedBy || [])]));
  const mergedReportedBy = Array.from(
    new Set([...(existing.reportedBy || []), ...(incoming.reportedBy || [])])
  );
  const mergedReasons = Array.from(
    new Set([...(existing.reportReasons || []), ...(incoming.reportReasons || [])])
  );

  // Unir respuestas por ID
  const replyMap = new Map<string, any>();
  for (const r of existing.replies || []) {
    if (r && r.id) replyMap.set(r.id, r);
  }
  for (const r of incoming.replies || []) {
    if (r && r.id) replyMap.set(r.id, r);
  }
  const mergedReplies = Array.from(replyMap.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return {
    ...existing,
    ...incoming,
    id: existing.id, // Conservar el ID canónico del servidor si coincidieron por texto
    title: sanitizeTitle(incoming.title ?? existing.title, incoming.text || existing.text),
    likedBy: mergedLikedBy,
    likesCount: Math.max(existing.likesCount || 0, incoming.likesCount || 0, mergedLikedBy.length),
    replies: mergedReplies,
    reportedBy: mergedReportedBy,
    reportsCount: Math.max(
      existing.reportsCount || 0,
      incoming.reportsCount || 0,
      mergedReportedBy.length
    ),
    reportReasons: mergedReasons,
    autoHidden: Boolean(existing.autoHidden || incoming.autoHidden || mergedReportedBy.length >= 3),
  };
}

function upsertReviewInMemory(rawReview: any, isFromBackgroundSync = false): boolean {
  const clean = normalizeReview(rawReview);
  if (!clean) return false;
  if (memoryStore.deletedIds.includes(clean.id)) return false;

  const normText = clean.text.trim().toLowerCase();

  // Buscar coincidencia por ID o (si viene de un sync de caché local) por texto exacto para evitar duplicar el mismo comentario
  const existingIdx = memoryStore.reviews.findIndex((r) => {
    if (r.id === clean.id) return true;
    if (isFromBackgroundSync && normText.length >= 15 && r.text.trim().toLowerCase() === normText) {
      return true;
    }
    return false;
  });

  if (existingIdx >= 0) {
    const prev = memoryStore.reviews[existingIdx];
    const merged = isFromBackgroundSync ? mergeTwoReviews(prev, clean) : { ...prev, ...clean, title: sanitizeTitle(clean.title, clean.text) };
    if (JSON.stringify(prev) === JSON.stringify(merged)) {
      return false;
    }
    memoryStore.reviews[existingIdx] = merged;
  } else {
    memoryStore.reviews.push(clean);
  }

  memoryStore.reviews.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return true;
}

export const communityReviewsRouter = Router();

// 1. Obtener todos los comentarios actuales
communityReviewsRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    reviews: memoryStore.reviews,
    deletedIds: memoryStore.deletedIds,
  });
});

// 2. Canal en tiempo real (Server-Sent Events) para que todos los usuarios vean nuevos comentarios al instante
communityReviewsRouter.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Enviar estado inicial apenas se conecta
  res.write(
    `data: ${JSON.stringify({
      type: 'reviews_init',
      reviews: memoryStore.reviews,
      deletedIds: memoryStore.deletedIds,
    })}\n\n`
  );

  sseClients.add(res);

  const keepAlive = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch {
      clearInterval(keepAlive);
      sseClients.delete(res);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

// 3. Publicar o actualizar un comentario / respuesta / like / denuncia
communityReviewsRouter.post('/', (req, res) => {
  try {
    const incoming = req.body?.review || req.body;
    const changed = upsertReviewInMemory(incoming, false);
    if (changed) {
      persistStoreToDisk();
      broadcastReviewsUpdate();
    }
    return res.json({
      status: 'ok',
      reviews: memoryStore.reviews,
      deletedIds: memoryStore.deletedIds,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Error al guardar comentario' });
  }
});

// 4. Sincronizar en lote cualquier comentario real que haya quedado guardado en el navegador de un usuario (invitado o con cuenta)
communityReviewsRouter.post('/sync-batch', (req, res) => {
  try {
    const localReviews: any[] = Array.isArray(req.body?.reviews) ? req.body.reviews : [];
    let anyChanged = false;
    for (const item of localReviews) {
      if (upsertReviewInMemory(item, true)) {
        anyChanged = true;
      }
    }
    if (anyChanged) {
      persistStoreToDisk();
      broadcastReviewsUpdate();
    }
    return res.json({
      status: 'ok',
      reviews: memoryStore.reviews,
      deletedIds: memoryStore.deletedIds,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Error al sincronizar comentarios' });
  }
});

// 5. Eliminar un comentario (por su autor, por el creador o al llegar a 3 denuncias)
communityReviewsRouter.delete('/:id', (req, res) => {
  try {
    const reviewId = req.params.id;
    if (!reviewId) {
      return res.status(400).json({ error: 'Falta ID del comentario' });
    }
    if (!memoryStore.deletedIds.includes(reviewId)) {
      memoryStore.deletedIds.push(reviewId);
    }
    const prevLen = memoryStore.reviews.length;
    memoryStore.reviews = memoryStore.reviews.filter((r) => r.id !== reviewId);
    if (memoryStore.reviews.length !== prevLen || true) {
      persistStoreToDisk();
      broadcastReviewsUpdate();
    }
    return res.json({
      status: 'ok',
      reviews: memoryStore.reviews,
      deletedIds: memoryStore.deletedIds,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Error al eliminar comentario' });
  }
});
