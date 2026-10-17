import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CommunityReview,
  CommunityReply,
  CommunityPostCategory,
  CountryCode,
  UserSettings,
} from '../types';
import { COUNTRY_PROFILES } from '../data/searchSources';
import {
  subscribeToCommunityReviews,
  saveCommunityReviewToFirestore,
  deleteCommunityReviewFromFirestore,
} from '../services/firestoreSync';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare,
  Star,
  ThumbsUp,
  Bug,
  Lightbulb,
  HelpCircle,
  Send,
  Copy,
  CheckCircle2,
  Trash2,
  CornerDownRight,
  Heart,
  Coffee,
  Sparkles,
  Check,
  ImagePlus,
  Smile,
  Flag,
  X,
  ShieldAlert,
  ZoomIn,
  Eye,
  RotateCcw,
} from 'lucide-react';

interface CommunityReviewsAndFeedbackCardProps {
  settings: UserSettings;
}

const LOCAL_REVIEWS_KEY = 't1d_community_reviews_cache_v3';
const CREATOR_ADMIN_EMAIL = 'pirilescano@gmail.com';
export const PRUDENT_REPORT_THRESHOLD = 3; // Si llega a 3 denuncias de usuarios distintos, se elimina/oculta automáticamente

export interface CommunityStickerDef {
  id: string;
  emoji: string;
  label: string;
  subtitle: string;
  gradientClasses: string;
}

export const COMMUNITY_STICKERS_CATALOG: CommunityStickerDef[] = [
  {
    id: 'sticker_in_range',
    emoji: '🎯',
    label: '¡100% En Rango!',
    subtitle: 'Línea recta perfecta',
    gradientClasses: 'from-emerald-950/90 to-teal-900/80 border-emerald-500/70 text-emerald-200',
  },
  {
    id: 'sticker_pizza_victory',
    emoji: '🍕',
    label: 'Domé la Pizza',
    subtitle: 'Bolo dividido impecable',
    gradientClasses: 'from-amber-950/90 to-orange-900/80 border-amber-500/70 text-amber-200',
  },
  {
    id: 'sticker_sensor_hero',
    emoji: '📡',
    label: 'Sensor Nuevo',
    subtitle: '14 días de paz mental',
    gradientClasses: 'from-cyan-950/90 to-sky-900/80 border-cyan-500/70 text-cyan-200',
  },
  {
    id: 'sticker_bug_screenshot',
    emoji: '📸',
    label: 'Dejo Captura',
    subtitle: 'Para revisar este detalle',
    gradientClasses: 'from-rose-950/90 to-pink-900/80 border-rose-500/70 text-rose-200',
  },
  {
    id: 'sticker_t1d_strength',
    emoji: '💪',
    label: 'Fuerza T1D',
    subtitle: 'No estamos solos',
    gradientClasses: 'from-indigo-950/90 to-violet-900/80 border-indigo-500/70 text-indigo-200',
  },
  {
    id: 'sticker_hypo_saved',
    emoji: '🧃',
    label: 'Zafé del Bajón',
    subtitle: 'Jugo a tiempo',
    gradientClasses: 'from-lime-950/90 to-emerald-900/80 border-lime-500/70 text-lime-200',
  },
  {
    id: 'sticker_gym_power',
    emoji: '🏋️',
    label: 'Entreno Listo',
    subtitle: 'Glucosa controlada',
    gradientClasses: 'from-blue-950/90 to-indigo-900/80 border-blue-500/70 text-blue-200',
  },
  {
    id: 'sticker_thanks_app',
    emoji: '🙌',
    label: '¡Crack Total!',
    subtitle: 'Me re ayudó hoy',
    gradientClasses: 'from-fuchsia-950/90 to-purple-900/80 border-fuchsia-500/70 text-fuchsia-200',
  },
];

export const REPORT_REASONS_LIST = [
  { id: 'spam', label: '📢 Spam o publicidad engañosa' },
  { id: 'offensive', label: '🤬 Comentario desubicado, insulto o falta de respeto' },
  { id: 'unsafe_medical', label: '⚠️ Consejo médico peligroso o irresponsable' },
  { id: 'inappropriate_image', label: '🖼️ Foto o imagen inapropiada / fuera de lugar' },
];

/**
 * Comprime automáticamente una captura o foto del celular para que sea liviana,
 * cargue al instante y entre cómodamente en Firestore y LocalStorage.
 */
async function compressImageFileToDataUrl(file: File, maxWidth = 850, quality = 0.74): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen no válido.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(ev.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const SEED_REVIEWS: CommunityReview[] = [
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
];

function deduplicateAndMergeReviews(
  lists: CommunityReview[][],
  deletedIds: string[] = []
): CommunityReview[] {
  const deletedSet = new Set(deletedIds);
  const byId = new Map<string, CommunityReview>();
  const textToId = new Map<string, string>();

  for (const list of lists) {
    for (const item of list) {
      if (!item || !item.id || deletedSet.has(item.id)) continue;
      const normText = (item.text || '').trim().toLowerCase();
      const matchedIdByText = normText.length >= 15 ? textToId.get(normText) : undefined;
      const targetId = byId.has(item.id) ? item.id : matchedIdByText || item.id;

      const existing = byId.get(targetId);
      if (existing) {
        const mergedLikedBy = Array.from(
          new Set([...(existing.likedBy || []), ...(item.likedBy || [])])
        );
        const mergedReportedBy = Array.from(
          new Set([...(existing.reportedBy || []), ...(item.reportedBy || [])])
        );
        const replyMap = new Map<string, CommunityReply>();
        for (const rep of existing.replies || []) {
          if (rep && rep.id) replyMap.set(rep.id, rep);
        }
        for (const rep of item.replies || []) {
          if (rep && rep.id) replyMap.set(rep.id, rep);
        }
        byId.set(targetId, {
          ...existing,
          ...item,
          id: targetId,
          likedBy: mergedLikedBy,
          likesCount: Math.max(
            existing.likesCount || 0,
            item.likesCount || 0,
            mergedLikedBy.length
          ),
          replies: Array.from(replyMap.values()),
          reportedBy: mergedReportedBy,
          reportsCount: Math.max(
            existing.reportsCount || 0,
            item.reportsCount || 0,
            mergedReportedBy.length
          ),
        });
      } else {
        byId.set(targetId, item);
        if (normText.length >= 15) {
          textToId.set(normText, targetId);
        }
      }
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function loadLocalReviews(): CommunityReview[] {
  if (typeof localStorage === 'undefined') return SEED_REVIEWS;
  try {
    const raw = localStorage.getItem(LOCAL_REVIEWS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return deduplicateAndMergeReviews([SEED_REVIEWS, parsed]);
      }
    }
  } catch {
    // ignore
  }
  return SEED_REVIEWS;
}

function saveLocalReviews(reviews: CommunityReview[]) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(reviews));
  } catch {
    // ignore
  }
}

export const CommunityReviewsAndFeedbackCard: React.FC<CommunityReviewsAndFeedbackCardProps> = ({
  settings,
}) => {
  const { user } = useAuth();
  const isCreatorAdmin = Boolean(
    user?.email && user.email.toLowerCase().trim() === CREATOR_ADMIN_EMAIL.toLowerCase()
  );
  const [reviews, setReviews] = useState<CommunityReview[]>(loadLocalReviews);

  // Form states
  const [authorName, setAuthorName] = useState<string>(() => {
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split('@')[0];
    return '';
  });
  const [rating, setRating] = useState<number>(0); // 0 = Sin calificar (opcional)
  const [title, setTitle] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [selectedStickerId, setSelectedStickerId] = useState<string | undefined>(undefined);
  const [attachedImageDataUrl, setAttachedImageDataUrl] = useState<string | undefined>(undefined);
  const [isCompressingImage, setIsCompressingImage] = useState<boolean>(false);
  const [showStickerPicker, setShowStickerPicker] = useState<boolean>(false);
  const [postSuccess, setPostSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reply states
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyAuthor, setReplyAuthor] = useState<string>('');
  const [replyText, setReplyText] = useState<string>('');
  const [replyStickerId, setReplyStickerId] = useState<string | undefined>(undefined);

  // Report modal states
  const [reportingReview, setReportingReview] = useState<CommunityReview | null>(null);
  const [selectedReportReason, setSelectedReportReason] = useState<string>('spam');
  const [reportNotice, setReportNotice] = useState<string | null>(null);

  // Lightbox for attached screenshots
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Creator moderation view
  const [showReportedToCreator, setShowReportedToCreator] = useState<boolean>(false);

  // Copy for AI Studio Developer states
  const [copiedReportMessage, setCopiedReportMessage] = useState<string | null>(null);
  const [showSupportInfo, setShowSupportInfo] = useState<boolean>(false);

  useEffect(() => {
    if (user?.displayName && !authorName) {
      setAuthorName(user.displayName);
    } else if (user?.email && !authorName) {
      setAuthorName(user.email.split('@')[0]);
    }
  }, [user]);

  // Real-time Server + Firestore subscription merged with local storage fallback
  useEffect(() => {
    const unsub = subscribeToCommunityReviews((remoteReviews, deletedIds = []) => {
      setReviews((prev) => {
        const merged = deduplicateAndMergeReviews(
          [SEED_REVIEWS, prev, remoteReviews],
          deletedIds
        );
        saveLocalReviews(merged);
        if (JSON.stringify(prev) === JSON.stringify(merged)) {
          return prev;
        }
        return merged;
      });
    });
    return () => unsub();
  }, []);

  const currentUserId = useMemo(() => {
    if (user?.uid) return user.uid;
    if (typeof localStorage !== 'undefined') {
      let guestId = localStorage.getItem('t1d_guest_community_uid');
      if (!guestId) {
        guestId = `guest-${Math.random().toString(36).substring(2, 10)}`;
        localStorage.setItem('t1d_guest_community_uid', guestId);
      }
      return guestId;
    }
    return 'guest-anon';
  }, [user?.uid]);

  const activeTreatmentBadge = useMemo(() => {
    const gLabel =
      settings.glucoseMode === 'cgm_reader'
        ? 'Lector FreeStyle sin NFC'
        : settings.glucoseMode === 'capillary'
        ? 'Glucómetro Capilar'
        : settings.glucoseMode === 'pump_sensor'
        ? 'Sensor en Bomba'
        : 'Sensor NFC';
    const iLabel =
      settings.insulinMode === 'iport'
        ? 'i-Port Advance'
        : settings.insulinMode === 'pump'
        ? 'Bomba Infusora'
        : 'Pluma Manual';
    return `${gLabel} + ${iLabel}`;
  }, [settings.glucoseMode, settings.insulinMode]);

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressingImage(true);
    try {
      const compressedDataUrl = await compressImageFileToDataUrl(file, 850, 0.74);
      setAttachedImageDataUrl(compressedDataUrl);
    } catch {
      // fallback if image fails
    } finally {
      setIsCompressingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = text.trim();
    const cleanTitle = title.trim();
    const stickerObj = COMMUNITY_STICKERS_CATALOG.find((s) => s.id === selectedStickerId);

    // Permitir publicar si puso texto, o título, o eligió un sticker, o subió una foto
    if (!cleanText && !cleanTitle && !selectedStickerId && !attachedImageDataUrl) return;

    const fallbackText =
      cleanText ||
      cleanTitle ||
      (stickerObj ? `${stickerObj.emoji} ${stickerObj.label} — ${stickerObj.subtitle}` : '📷 Captura adjunta');

    // Si el usuario no escribió un título (o si solo escribió en el campo título sin texto), dejamos el título vacío para que no se duplique
    const finalTitle = cleanText && cleanTitle ? cleanTitle : '';

    const finalAuthor = authorName.trim() || 'Usuario Invitado';
    const newReview: CommunityReview = {
      id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      authorName: finalAuthor,
      authorId: currentUserId,
      countryCode: settings.countryCode || 'AR',
      treatmentBadge: activeTreatmentBadge,
      rating: rating > 0 ? rating : 0,
      category: 'review',
      title: finalTitle,
      text: fallbackText,
      stickerId: selectedStickerId,
      imageDataUrl: attachedImageDataUrl,
      createdAt: new Date().toISOString(),
      likesCount: 0,
      likedBy: [],
      replies: [],
      status: 'open',
      reportedBy: [],
      reportsCount: 0,
      reportReasons: [],
      autoHidden: false,
    };

    const updated = [newReview, ...reviews];
    setReviews(updated);
    saveLocalReviews(updated);
    await saveCommunityReviewToFirestore(newReview);

    setTitle('');
    setText('');
    setRating(0);
    setSelectedStickerId(undefined);
    setAttachedImageDataUrl(undefined);
    setShowStickerPicker(false);
    setPostSuccess('💬 ¡Gracias por tu comentario! Ya está publicado abajo en la comunidad.');
    setTimeout(() => setPostSuccess(null), 4500);
  };

  const handleToggleLike = async (review: CommunityReview) => {
    const hasLiked = review.likedBy.includes(currentUserId);
    const updatedLikedBy = hasLiked
      ? review.likedBy.filter((id) => id !== currentUserId)
      : [...review.likedBy, currentUserId];
    const updatedReview: CommunityReview = {
      ...review,
      likedBy: updatedLikedBy,
      likesCount: Math.max(0, updatedLikedBy.length),
    };

    const updatedList = reviews.map((r) => (r.id === review.id ? updatedReview : r));
    setReviews(updatedList);
    saveLocalReviews(updatedList);
    await saveCommunityReviewToFirestore(updatedReview);
  };

  const handleAddReply = async (review: CommunityReview) => {
    const stickerObj = COMMUNITY_STICKERS_CATALOG.find((s) => s.id === replyStickerId);
    if (!replyText.trim() && !replyStickerId) return;
    const finalReplyAuthor = replyAuthor.trim() || authorName.trim() || 'Usuario T1D';

    const newReply: CommunityReply = {
      id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      authorName: finalReplyAuthor,
      authorId: currentUserId,
      countryCode: settings.countryCode || 'AR',
      text:
        replyText.trim() ||
        (stickerObj ? `${stickerObj.emoji} ${stickerObj.label}` : ''),
      stickerId: replyStickerId,
      createdAt: new Date().toISOString(),
    };

    const updatedReview: CommunityReview = {
      ...review,
      replies: [...(review.replies || []), newReply],
    };

    const updatedList = reviews.map((r) => (r.id === review.id ? updatedReview : r));
    setReviews(updatedList);
    saveLocalReviews(updatedList);
    await saveCommunityReviewToFirestore(updatedReview);

    setReplyText('');
    setReplyStickerId(undefined);
    setReplyingToId(null);
  };

  const handleToggleResolved = async (review: CommunityReview) => {
    const updatedReview: CommunityReview = {
      ...review,
      status: review.status === 'resolved' ? 'open' : 'resolved',
    };
    const updatedList = reviews.map((r) => (r.id === review.id ? updatedReview : r));
    setReviews(updatedList);
    saveLocalReviews(updatedList);
    await saveCommunityReviewToFirestore(updatedReview);
  };

  const handleDeleteReview = async (reviewId: string) => {
    const updatedList = reviews.filter((r) => r.id !== reviewId);
    setReviews(updatedList);
    saveLocalReviews(updatedList);
    await deleteCommunityReviewFromFirestore(reviewId);
  };

  /**
   * Sistema de Denuncia Prudente Comunitaria:
   * - Cada usuario/dispositivo puede denunciar 1 sola vez cada comentario.
   * - Si el comentario llega a PRUDENT_REPORT_THRESHOLD (3 denuncias distintas),
   *   se elimina/oculta automáticamente de la vista pública por moderación comunitaria.
   */
  const handleConfirmReportReview = async () => {
    if (!reportingReview) return;
    const prevReportedBy = Array.isArray(reportingReview.reportedBy)
      ? reportingReview.reportedBy
      : [];

    if (prevReportedBy.includes(currentUserId)) {
      setReportingReview(null);
      setReportNotice('Ya habías reportado este comentario anteriormente.');
      setTimeout(() => setReportNotice(null), 4000);
      return;
    }

    const nextReportedBy = [...prevReportedBy, currentUserId];
    const nextReportsCount = nextReportedBy.length;
    const reasonLabel =
      REPORT_REASONS_LIST.find((r) => r.id === selectedReportReason)?.label || selectedReportReason;
    const nextReasons = Array.from(
      new Set([...(reportingReview.reportReasons || []), reasonLabel])
    );

    const reachedThreshold = nextReportsCount >= PRUDENT_REPORT_THRESHOLD;

    if (reachedThreshold) {
      // Al llegar a 3 denuncias de personas distintas, se elimina automáticamente de la comunidad
      const updatedReview: CommunityReview = {
        ...reportingReview,
        reportedBy: nextReportedBy,
        reportsCount: nextReportsCount,
        reportReasons: nextReasons,
        autoHidden: true,
      };
      // Guardamos el conteo y luego intentamos eliminar en Firestore / ocultar en local
      await saveCommunityReviewToFirestore(updatedReview);
      await deleteCommunityReviewFromFirestore(reportingReview.id);

      const updatedList = reviews.filter((r) => r.id !== reportingReview.id);
      setReviews(updatedList);
      saveLocalReviews(updatedList);

      setReportNotice(
        `🛡️ El comentario alcanzó ${PRUDENT_REPORT_THRESHOLD} denuncias de la comunidad y fue eliminado automáticamente por seguridad.`
      );
    } else {
      const updatedReview: CommunityReview = {
        ...reportingReview,
        reportedBy: nextReportedBy,
        reportsCount: nextReportsCount,
        reportReasons: nextReasons,
        autoHidden: false,
      };
      const updatedList = reviews.map((r) =>
        r.id === reportingReview.id ? updatedReview : r
      );
      setReviews(updatedList);
      saveLocalReviews(updatedList);
      await saveCommunityReviewToFirestore(updatedReview);

      setReportNotice(
        `🚩 Denuncia registrada (${nextReportsCount}/${PRUDENT_REPORT_THRESHOLD}). Si alcanza ${PRUDENT_REPORT_THRESHOLD} denuncias de distintos usuarios, se eliminará automáticamente.`
      );
    }

    setReportingReview(null);
    setTimeout(() => setReportNotice(null), 5500);
  };

  // Restaurar comentario si el creador (pirilescano@gmail.com) considera que fue denunciado injustamente
  const handleCreatorClearReports = async (review: CommunityReview) => {
    const updatedReview: CommunityReview = {
      ...review,
      reportedBy: [],
      reportsCount: 0,
      reportReasons: [],
      autoHidden: false,
    };
    const updatedList = reviews.map((r) => (r.id === review.id ? updatedReview : r));
    setReviews(updatedList);
    saveLocalReviews(updatedList);
    await saveCommunityReviewToFirestore(updatedReview);
  };

  const hasDistinctTitle = (rev: CommunityReview): boolean => {
    const t = (rev.title || '').trim();
    const body = (rev.text || '').trim();
    if (!t || t === body || t === '📷 Captura de pantalla adjunta') return false;
    if (t.endsWith('...')) {
      const prefix = t.slice(0, -3).trim();
      if (prefix && body.startsWith(prefix)) return false;
    }
    return true;
  };

  // Copy single or all comments formatted for pasting directly into the AI Studio Chat
  const handleCopyReportsForDeveloper = (singleReview?: CommunityReview) => {
    const targets = singleReview
      ? [singleReview]
      : reviews.filter(
          (r) =>
            r.status !== 'resolved' &&
            !r.autoHidden &&
            (r.reportsCount || 0) < PRUDENT_REPORT_THRESHOLD
        );

    if (targets.length === 0) {
      setCopiedReportMessage('No hay comentarios pendientes por copiar.');
      setTimeout(() => setCopiedReportMessage(null), 3500);
      return;
    }

    const formatted = [
      'Hola amigo, te comparto estos comentarios de la comunidad para revisar:',
      '',
      ...targets.map((t, idx) => {
        const hasPhotoNote = t.imageDataUrl ? ' [📷 Incluye captura de pantalla en la app]' : '';
        if (hasDistinctTitle(t)) {
          return `${idx + 1}.${hasPhotoNote} "${t.title}" (por ${t.authorName} - ${t.treatmentBadge || 'T1D'}):\n   Detalle: "${t.text}"`;
        }
        return `${idx + 1}.${hasPhotoNote} Comentario de ${t.authorName} (${t.treatmentBadge || 'T1D'}):\n   "${t.text}"`;
      }),
    ].join('\n');

    navigator.clipboard?.writeText(formatted);
    setCopiedReportMessage(
      singleReview
        ? '📋 ¡Comentario copiado! Ya podés pegarlo en el chat.'
        : `📋 ¡Comentarios copiados al portapapeles! Pegalos en nuestro chat.`
    );
    setTimeout(() => setCopiedReportMessage(null), 5000);
  };

  // Filtrar comentarios públicos: ocultar los que hayan llegado a 3 denuncias (salvo que el creador active "Ver denunciados")
  const visiblePublicReviews = useMemo(() => {
    return reviews.filter((r) => {
      const isHiddenByReports =
        Boolean(r.autoHidden) || (r.reportsCount || 0) >= PRUDENT_REPORT_THRESHOLD;
      if (isHiddenByReports && !(isCreatorAdmin && showReportedToCreator)) {
        return false;
      }
      return true;
    });
  }, [reviews, isCreatorAdmin, showReportedToCreator]);

  const ratedReviews = useMemo(
    () => visiblePublicReviews.filter((r) => typeof r.rating === 'number' && r.rating > 0),
    [visiblePublicReviews]
  );

  const averageRating = useMemo(() => {
    if (ratedReviews.length === 0) return null;
    const sum = ratedReviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return (sum / ratedReviews.length).toFixed(1);
  }, [ratedReviews]);

  const flaggedReviewsCount = useMemo(
    () => reviews.filter((r) => (r.reportsCount || 0) > 0).length,
    [reviews]
  );

  const selectedStickerObj = COMMUNITY_STICKERS_CATALOG.find(
    (s) => s.id === selectedStickerId
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-6">
      {/* Encabezado Limpio de Comunidad + Apoyo sin Publicidad */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-white">
              Comentarios de la Comunidad
            </h2>
            {averageRating && (
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>{averageRating}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Dejá tu comentario libremente, sumá stickers o subí una captura si querés mostrar algo. Calificar con estrellas es totalmente opcional.
          </p>
        </div>

        {/* Botones de Acción (Copiar para el Programador SOLO visible para pirilescano@gmail.com) */}
        <div className="flex flex-wrap items-center gap-2">
          {isCreatorAdmin && (
            <>
              <button
                type="button"
                onClick={() => handleCopyReportsForDeveloper()}
                id="btn-copy-bug-reports-for-ai"
                className="px-3 py-2 rounded-xl bg-indigo-950/80 hover:bg-indigo-900/80 border border-indigo-600/60 text-indigo-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                title="Exclusivo para vos (pirilescano@gmail.com): Copia los comentarios para pegarlos en nuestro chat"
              >
                <Copy className="h-3.5 w-3.5 text-indigo-400" />
                <span>🔒 Copiar para el Programador</span>
              </button>

              {flaggedReviewsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowReportedToCreator(!showReportedToCreator)}
                  className="px-2.5 py-2 rounded-xl bg-rose-950/70 hover:bg-rose-900/70 border border-rose-600/50 text-rose-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="Exclusivo para vos: Ver comentarios con denuncias de usuarios"
                >
                  <Eye className="h-3.5 w-3.5 text-rose-400" />
                  <span>Denuncias ({flaggedReviewsCount})</span>
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => setShowSupportInfo(!showSupportInfo)}
            className="px-3 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/70 border border-emerald-600/50 text-emerald-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Coffee className="h-3.5 w-3.5 text-emerald-400" />
            <span>App 100% Sin Publicidad (Apoyar)</span>
          </button>
        </div>
      </div>

      {/* Panel informativo de Apoyo Ético */}
      {showSupportInfo && (
        <div className="bg-emerald-950/30 border border-emerald-700/50 rounded-xl p-4 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-emerald-400 fill-emerald-400" />
              Compromiso de Salud: Cero Publicidades Invasivas
            </h3>
            <button
              type="button"
              onClick={() => setShowSupportInfo(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cerrar ✕
            </button>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            En una aplicación de Diabetes Tipo 1 cada segundo importa. Por seguridad médica, <strong>nunca pondremos anuncios molestos ni videos publicitarios</strong> antes de calcular una dosis de insulina. Si la app te ayuda en tu día a día, podés apoyar su mantenimiento de forma voluntaria o compartir tus ideas abajo.
          </p>
        </div>
      )}

      {/* Notificación de copiado para el programador */}
      {copiedReportMessage && (
        <div className="p-3 rounded-xl bg-indigo-950/90 border border-indigo-500/70 text-indigo-200 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" />
          <span>{copiedReportMessage}</span>
        </div>
      )}

      {/* Notificación de denuncia comunitaria */}
      {reportNotice && (
        <div className="p-3 rounded-xl bg-amber-950/90 border border-amber-500/70 text-amber-200 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
          <span>{reportNotice}</span>
        </div>
      )}

      {/* Formulario directo y limpio para comentar sin tener que elegir categoría ni calificar obligatoriamente */}
      <form
        onSubmit={handleCreatePost}
        className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-teal-400" />
            Escribir un comentario en la comunidad:
          </span>
          <span className="text-[11px] text-slate-400">
            Tu modalidad actual: <strong className="text-teal-300">{activeTreatmentBadge}</strong>
          </span>
        </div>

        {/* Nombre y Calificación Opcional */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">
              Tu nombre o apodo (opcional)
            </label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Ej: Piri, Martín, Ana..."
              maxLength={60}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-slate-400">
                Calificación de la app (opcional)
              </label>
              {rating > 0 ? (
                <button
                  type="button"
                  onClick={() => setRating(0)}
                  className="text-[10px] text-slate-400 hover:text-rose-300 underline cursor-pointer"
                >
                  Quitar estrellas (comentar sin calificar)
                </button>
              ) : (
                <span className="text-[10px] text-slate-500">Sin calificar</span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(rating === star ? 0 : star)}
                    title={
                      rating === star
                        ? 'Tocá de nuevo para quitar la calificación'
                        : `Calificar con ${star} ${star === 1 ? 'estrella' : 'estrellas'}`
                    }
                    className="p-0.5 cursor-pointer transition transform hover:scale-110"
                  >
                    <Star
                      className={`h-4 w-4 ${
                        star <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-600 hover:text-slate-400'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-slate-400">
                {rating > 0 ? `${rating}/5 ⭐` : 'Opcional'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título corto (opcional)..."
            maxLength={120}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
          />

          <textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribí tu comentario acá a gusto (también podés sumar un sticker o subir una captura)..."
            maxLength={1500}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Barra de Herramientas Multimedia: Subir Captura/Foto + Elegir Sticker */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Input oculto para subir foto/captura */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressingImage}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                attachedImageDataUrl
                  ? 'bg-rose-950/80 border-rose-500/80 text-rose-200'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              <ImagePlus className="h-4 w-4 text-rose-400" />
              <span>
                {isCompressingImage
                  ? 'Procesando imagen...'
                  : attachedImageDataUrl
                  ? '📷 Cambiar Captura / Foto'
                  : '📷 Subir Captura / Foto'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowStickerPicker(!showStickerPicker)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                selectedStickerId || showStickerPicker
                  ? 'bg-amber-950/80 border-amber-500/80 text-amber-200'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              <Smile className="h-4 w-4 text-amber-400" />
              <span>
                {selectedStickerObj
                  ? `Sticker: ${selectedStickerObj.emoji} ${selectedStickerObj.label}`
                  : '✨ Agregar Sticker'}
              </span>
            </button>
          </div>

          <button
            type="submit"
            disabled={
              !text.trim() &&
              !title.trim() &&
              !selectedStickerId &&
              !attachedImageDataUrl
            }
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Publicar en la Comunidad</span>
          </button>
        </div>

        {/* Galería desplegable de Stickers llamativos */}
        {showStickerPicker && (
          <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                <Smile className="h-3.5 w-3.5" />
                Elegí un Sticker para acompañar tu comentario:
              </span>
              {selectedStickerId && (
                <button
                  type="button"
                  onClick={() => setSelectedStickerId(undefined)}
                  className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                >
                  Quitar sticker
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {COMMUNITY_STICKERS_CATALOG.map((st) => {
                const isSelected = selectedStickerId === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() =>
                      setSelectedStickerId(isSelected ? undefined : st.id)
                    }
                    className={`p-2.5 rounded-xl border bg-gradient-to-br text-left transition cursor-pointer flex items-center gap-2.5 ${
                      st.gradientClasses
                    } ${
                      isSelected
                        ? 'ring-2 ring-amber-400 scale-[1.02] shadow-lg'
                        : 'opacity-85 hover:opacity-100'
                    }`}
                  >
                    <span className="text-2xl shrink-0">{st.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-black truncate">{st.label}</p>
                      <p className="text-[10px] opacity-80 truncate">{st.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Vista previa de la captura/foto o sticker antes de publicar */}
        {(attachedImageDataUrl || selectedStickerObj) && (
          <div className="flex flex-wrap items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
            {selectedStickerObj && (
              <div
                className={`inline-flex items-center gap-2.5 px-3 py-2 rounded-xl border bg-gradient-to-r ${selectedStickerObj.gradientClasses}`}
              >
                <span className="text-2xl">{selectedStickerObj.emoji}</span>
                <div>
                  <p className="text-xs font-black leading-tight">
                    {selectedStickerObj.label}
                  </p>
                  <p className="text-[10px] opacity-85">
                    {selectedStickerObj.subtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStickerId(undefined)}
                  className="ml-1 p-1 rounded-full bg-slate-950/50 hover:bg-slate-950 text-slate-300 cursor-pointer"
                  title="Quitar sticker"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {attachedImageDataUrl && (
              <div className="relative inline-block">
                <img
                  src={attachedImageDataUrl}
                  alt="Vista previa de captura"
                  className="h-24 w-auto rounded-lg border border-slate-700 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setAttachedImageDataUrl(undefined)}
                  className="absolute -top-2 -right-2 p-1 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-md cursor-pointer"
                  title="Quitar foto"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {postSuccess && (
          <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-600/60 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{postSuccess}</span>
          </div>
        )}
      </form>

      {/* Lista de Comentarios Limpia */}
      <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
        {visiblePublicReviews.map((rev) => {
          const countryFlag = COUNTRY_PROFILES[rev.countryCode]?.flag || '🇦🇷';
          const hasLiked = rev.likedBy.includes(currentUserId);
          const hasReported = (rev.reportedBy || []).includes(currentUserId);
          const reportCount = rev.reportsCount || 0;
          const isResolved = rev.status === 'resolved';
          const stickerObj = COMMUNITY_STICKERS_CATALOG.find(
            (s) => s.id === rev.stickerId
          );
          const hasRating = typeof rev.rating === 'number' && rev.rating > 0;

          return (
            <div
              key={rev.id}
              className={`p-4 rounded-xl border transition space-y-2.5 ${
                reportCount >= PRUDENT_REPORT_THRESHOLD
                  ? 'bg-rose-950/20 border-rose-700/60 opacity-75'
                  : isResolved
                  ? 'bg-slate-950/40 border-emerald-800/40 opacity-85'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base">{countryFlag}</span>
                  <span className="text-xs font-bold text-white">{rev.authorName}</span>
                  {rev.treatmentBadge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                      {rev.treatmentBadge}
                    </span>
                  )}
                  {isResolved && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-600/60 text-emerald-300 font-bold flex items-center gap-1">
                      <Check className="h-3 w-3" /> Revisado
                    </span>
                  )}
                  {reportCount > 0 && isCreatorAdmin && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 border border-rose-600/60 text-rose-300 font-bold">
                      🚩 {reportCount}/{PRUDENT_REPORT_THRESHOLD} denuncias
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {hasRating && (
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-3 w-3 ${
                            s <= (rev.rating || 0)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                  <span className="text-[10px] text-slate-500">
                    {new Date(rev.createdAt).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                </div>
              </div>

              {/* Contenido del comentario + Sticker + Captura de pantalla adjunta */}
              <div className="space-y-2.5">
                <div>
                  {hasDistinctTitle(rev) && (
                    <h4 className="text-xs sm:text-sm font-bold text-slate-100 mb-1">
                      {rev.title}
                    </h4>
                  )}
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                    {rev.text}
                  </p>
                </div>

                {/* Sticker visual si el usuario eligió uno */}
                {stickerObj && (
                  <div
                    className={`inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border bg-gradient-to-r shadow-md ${stickerObj.gradientClasses}`}
                  >
                    <span className="text-2xl">{stickerObj.emoji}</span>
                    <div>
                      <p className="text-xs font-black leading-tight">
                        {stickerObj.label}
                      </p>
                      <p className="text-[10px] opacity-85">{stickerObj.subtitle}</p>
                    </div>
                  </div>
                )}

                {/* Captura de pantalla o foto subida por el usuario */}
                {rev.imageDataUrl && (
                  <div className="pt-1">
                    <div
                      onClick={() => setLightboxImageUrl(rev.imageDataUrl!)}
                      className="group relative inline-block cursor-pointer rounded-xl overflow-hidden border border-slate-700 hover:border-teal-500 transition shadow-md"
                    >
                      <img
                        src={rev.imageDataUrl}
                        alt="Captura adjunta al comentario"
                        className="max-h-56 w-auto object-contain bg-slate-900"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-900/90 text-white text-[11px] font-bold flex items-center gap-1">
                          <ZoomIn className="h-3.5 w-3.5 text-teal-400" />
                          Ver captura completa
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones de interacción (Me gusta, Responder, Reportar comentario, y opciones de Creador) */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(rev)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer ${
                      hasLiked
                        ? 'bg-teal-950/70 border-teal-500/60 text-teal-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ThumbsUp className="h-3 w-3" />
                    <span>Útil{rev.likesCount > 0 ? ` (${rev.likesCount})` : ''}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setReplyingToId(replyingToId === rev.id ? null : rev.id)
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                  >
                    <CornerDownRight className="h-3 w-3" />
                    <span>Responder</span>
                  </button>

                  {/* Botón público para denunciar spam o comentario desubicado */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!hasReported) {
                        setReportingReview(rev);
                        setSelectedReportReason('spam');
                      }
                    }}
                    disabled={hasReported}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1 transition cursor-pointer ${
                      hasReported
                        ? 'bg-rose-950/50 border-rose-800/50 text-rose-400 opacity-75 cursor-default'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-rose-300 hover:border-rose-800/60'
                    }`}
                    title="Denunciar si es spam o dice algo desubicado. Al llegar a 3 denuncias de usuarios distintos se elimina automáticamente."
                  >
                    <Flag className="h-3 w-3" />
                    <span>
                      {hasReported
                        ? 'Reportado'
                        : 'Reportar'}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {isCreatorAdmin && (
                    <>
                      {reportCount > 0 && (
                        <button
                          type="button"
                          onClick={() => handleCreatorClearReports(rev)}
                          className="px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-700/60 text-emerald-300 text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                          title="Quitar denuncias y mantener comentario"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Limpiar denuncias</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopyReportsForDeveloper(rev)}
                        className="px-2 py-1 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/70 border border-indigo-800/60 text-indigo-300 text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                        title="Exclusivo para vos (pirilescano@gmail.com): Copiar este comentario para pegárselo al programador en el chat"
                      >
                        <Copy className="h-3 w-3" />
                        <span>🔒 Copiar para el Programador</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleResolved(rev)}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[10px] transition cursor-pointer"
                      >
                        {isResolved ? 'Reabrir' : '✓ Marcar revisado'}
                      </button>
                    </>
                  )}

                  {(rev.authorId === currentUserId || isCreatorAdmin) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteReview(rev.id)}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      title="Borrar comentario"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Caja para escribir una respuesta a este comentario (también soporta stickers) */}
              {replyingToId === rev.id && (
                <div className="mt-2 pl-3 border-l-2 border-teal-600/50 space-y-2 pt-1">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={replyAuthor}
                      onChange={(e) => setReplyAuthor(e.target.value)}
                      placeholder={authorName || 'Tu nombre'}
                      className="sm:w-36 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Escribí tu respuesta o elegí un sticker abajo..."
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddReply(rev)}
                      className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      Enviar
                    </button>
                  </div>

                  {/* Mini selector de stickers para respuestas */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 mr-1">Sumar sticker:</span>
                    {COMMUNITY_STICKERS_CATALOG.map((st) => {
                      const active = replyStickerId === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() =>
                            setReplyStickerId(active ? undefined : st.id)
                          }
                          className={`px-2 py-0.5 rounded-full border text-[11px] transition cursor-pointer flex items-center gap-1 ${
                            active
                              ? 'bg-amber-950 border-amber-400 text-amber-200 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <span>{st.emoji}</span>
                          <span>{st.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Respuestas anidadas estilo YouTube */}
              {rev.replies && rev.replies.length > 0 && (
                <div className="mt-2 pl-3.5 border-l-2 border-slate-800 space-y-2 pt-1">
                  {rev.replies.map((rep) => {
                    const repSticker = COMMUNITY_STICKERS_CATALOG.find(
                      (s) => s.id === rep.stickerId
                    );
                    return (
                      <div
                        key={rep.id}
                        className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-2.5 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-teal-300 flex items-center gap-1">
                            <span>
                              {rep.countryCode
                                ? COUNTRY_PROFILES[rep.countryCode]?.flag || '🇦🇷'
                                : '🇦🇷'}
                            </span>
                            <span>{rep.authorName}</span>
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(rep.createdAt).toLocaleDateString('es-AR', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </span>
                        </div>
                        <p className="text-slate-300">{rep.text}</p>
                        {repSticker && (
                          <div
                            className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border bg-gradient-to-r ${repSticker.gradientClasses}`}
                          >
                            <span className="text-base">{repSticker.emoji}</span>
                            <span className="text-[11px] font-bold">
                              {repSticker.label}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Prudente para Reportar un Comentario Desubicado o Spam */}
      {reportingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <Flag className="h-4 w-4" />
                <span>Reportar Comentario a la Comunidad</span>
              </div>
              <button
                type="button"
                onClick={() => setReportingReview(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
              <p className="text-slate-400">
                Comentario de <strong className="text-white">{reportingReview.authorName}</strong>:
              </p>
              <p className="text-slate-200 italic line-clamp-2">"{reportingReview.text}"</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                ¿Por qué querés reportar este mensaje?
              </label>
              <div className="space-y-1.5">
                {REPORT_REASONS_LIST.map((reason) => (
                  <label
                    key={reason.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                      selectedReportReason === reason.id
                        ? 'bg-rose-950/60 border-rose-500 text-rose-100 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={reason.id}
                      checked={selectedReportReason === reason.id}
                      onChange={() => setSelectedReportReason(reason.id)}
                      className="accent-rose-500"
                    />
                    <span>{reason.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-700/50 text-[11px] text-amber-200 leading-relaxed">
              🛡️ <strong>Regla prudente:</strong> Para evitar que alguien borre un comentario por error o malicia, un mensaje solo se elimina automáticamente cuando alcanza <strong>{PRUDENT_REPORT_THRESHOLD} denuncias de usuarios distintos</strong> (actualmente tiene {reportingReview.reportsCount || 0}/{PRUDENT_REPORT_THRESHOLD}).
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setReportingReview(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReportReview}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Flag className="h-3.5 w-3.5" />
                <span>Enviar Denuncia</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visor de pantalla completa (Lightbox) cuando alguien toca una captura de pantalla */}
      {lightboxImageUrl && (
        <div
          onClick={() => setLightboxImageUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn cursor-zoom-out"
        >
          <div className="relative max-w-3xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setLightboxImageUrl(null)}
              className="mb-2 self-end px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <X className="h-4 w-4" />
              <span>Cerrar imagen</span>
            </button>
            <img
              src={lightboxImageUrl}
              alt="Captura ampliada"
              className="max-w-full max-h-[82vh] rounded-xl border border-slate-700 shadow-2xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
