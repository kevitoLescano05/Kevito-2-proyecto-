// Gestor de Idioma Automático (Detección de Navegador/Dispositivo + Selector Multilenguaje Global)

export interface SupportedLanguage {
  code: string;
  nativeName: string;
  spanishName: string;
  englishName: string;
  flag: string;
  featured?: boolean;
}

export const WORLD_LANGUAGES: SupportedLanguage[] = [
  { code: 'es', nativeName: 'Español', spanishName: 'Español', englishName: 'Spanish', flag: '🇪🇸 / 🇦🇷', featured: true },
  { code: 'en', nativeName: 'English', spanishName: 'Inglés', englishName: 'English', flag: '🇺🇸 / 🇬🇧', featured: true },
  { code: 'pt', nativeName: 'Português', spanishName: 'Portugués', englishName: 'Portuguese', flag: '🇧🇷 / 🇵🇹', featured: true },
  { code: 'it', nativeName: 'Italiano', spanishName: 'Italiano', englishName: 'Italian', flag: '🇮🇹', featured: true },
  { code: 'fr', nativeName: 'Français', spanishName: 'Francés', englishName: 'French', flag: '🇫🇷', featured: true },
  { code: 'de', nativeName: 'Deutsch', spanishName: 'Alemán', englishName: 'German', flag: '🇩🇪', featured: true },
  { code: 'ca', nativeName: 'Català', spanishName: 'Catalán', englishName: 'Catalan', flag: '🏴', featured: false },
  { code: 'gl', nativeName: 'Galego', spanishName: 'Gallego', englishName: 'Galician', flag: '🏴', featured: false },
  { code: 'eu', nativeName: 'Euskara', spanishName: 'Vasco (Euskera)', englishName: 'Basque', flag: '🏴', featured: false },
  { code: 'nl', nativeName: 'Nederlands', spanishName: 'Neerlandés (Holandés)', englishName: 'Dutch', flag: '🇳🇱', featured: false },
  { code: 'pl', nativeName: 'Polski', spanishName: 'Polaco', englishName: 'Polish', flag: '🇵🇱', featured: false },
  { code: 'ru', nativeName: 'Русский', spanishName: 'Ruso', englishName: 'Russian', flag: '🇷🇺', featured: false },
  { code: 'uk', nativeName: 'Українська', spanishName: 'Ucraniano', englishName: 'Ukrainian', flag: '🇺🇦', featured: false },
  { code: 'ro', nativeName: 'Română', spanishName: 'Rumano', englishName: 'Romanian', flag: '🇷🇴', featured: false },
  { code: 'el', nativeName: 'Ελληνικά', spanishName: 'Griego', englishName: 'Greek', flag: '🇬🇷', featured: false },
  { code: 'sv', nativeName: 'Svenska', spanishName: 'Sueco', englishName: 'Swedish', flag: '🇸🇪', featured: false },
  { code: 'no', nativeName: 'Norsk', spanishName: 'Noruego', englishName: 'Norwegian', flag: '🇳🇴', featured: false },
  { code: 'da', nativeName: 'Dansk', spanishName: 'Danés', englishName: 'Danish', flag: '🇩🇰', featured: false },
  { code: 'fi', nativeName: 'Suomi', spanishName: 'Finés', englishName: 'Finnish', flag: '🇫🇮', featured: false },
  { code: 'cs', nativeName: 'Čeština', spanishName: 'Checo', englishName: 'Czech', flag: '🇨🇿', featured: false },
  { code: 'hu', nativeName: 'Magyar', spanishName: 'Húngaro', englishName: 'Hungarian', flag: '🇭🇺', featured: false },
  { code: 'tr', nativeName: 'Türkçe', spanishName: 'Turco', englishName: 'Turkish', flag: '🇹🇷', featured: false },
  { code: 'ar', nativeName: 'العربية', spanishName: 'Árabe', englishName: 'Arabic', flag: '🇸🇦', featured: false },
  { code: 'he', nativeName: 'עברית', spanishName: 'Hebreo', englishName: 'Hebrew', flag: '🇮🇱', featured: false },
  { code: 'hi', nativeName: 'हिन्दी', spanishName: 'Hindi', englishName: 'Hindi', flag: '🇮🇳', featured: false },
  { code: 'zh-CN', nativeName: '中文 (简体)', spanishName: 'Chino Simplificado', englishName: 'Chinese (Simplified)', flag: '🇨🇳', featured: false },
  { code: 'zh-TW', nativeName: '中文 (繁體)', spanishName: 'Chino Tradicional', englishName: 'Chinese (Traditional)', flag: '🇹🇼', featured: false },
  { code: 'ja', nativeName: '日本語', spanishName: 'Japonés', englishName: 'Japanese', flag: '🇯🇵', featured: false },
  { code: 'ko', nativeName: '한국어', spanishName: 'Coreano', englishName: 'Korean', flag: '🇰🇷', featured: false },
  { code: 'vi', nativeName: 'Tiếng Việt', spanishName: 'Vietnamita', englishName: 'Vietnamese', flag: '🇻🇳', featured: false },
  { code: 'th', nativeName: 'ไทย', spanishName: 'Tailandés', englishName: 'Thai', flag: '🇹🇭', featured: false },
  { code: 'id', nativeName: 'Bahasa Indonesia', spanishName: 'Indonesio', englishName: 'Indonesian', flag: '🇮🇩', featured: false },
  { code: 'ms', nativeName: 'Bahasa Melayu', spanishName: 'Malayo', englishName: 'Malay', flag: '🇲🇾', featured: false },
  { code: 'tl', nativeName: 'Filipino / Tagalog', spanishName: 'Filipino', englishName: 'Filipino', flag: '🇵🇭', featured: false },
  { code: 'fa', nativeName: 'فارسی', spanishName: 'Persa', englishName: 'Persian', flag: '🇮🇷', featured: false },
  { code: 'ur', nativeName: 'اردو', spanishName: 'Urdu', englishName: 'Urdu', flag: '🇵🇰', featured: false },
  { code: 'bn', nativeName: 'বাংলা', spanishName: 'Bengalí', englishName: 'Bengali', flag: '🇧🇩', featured: false },
  { code: 'sw', nativeName: 'Kiswahili', spanishName: 'Suajili', englishName: 'Swahili', flag: '🇰🇪', featured: false },
];

const LANGUAGE_STORAGE_KEY = 'insu_calc_app_language';

/**
 * Parche de seguridad para evitar que React falle cuando un traductor (integrado o de Chrome)
 * modifica nodos de texto en el DOM.
 */
export function installTranslationDomSafetyPatch(): void {
  if (typeof Node === 'undefined' || typeof window === 'undefined') return;
  const win = window as unknown as { __reactTranslatePatchInstalled?: boolean };
  if (win.__reactTranslatePatchInstalled) return;
  win.__reactTranslatePatchInstalled = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (console && console.warn) {
        console.warn('Ignored removeChild on translated DOM node');
      }
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (console && console.warn) {
        console.warn('Ignored insertBefore on translated DOM node');
      }
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

/**
 * Detecta el idioma configurado en el navegador o dispositivo del usuario.
 */
export function detectDeviceLanguageCode(): string {
  if (typeof navigator === 'undefined') return 'es';

  const rawCandidates: string[] = [];
  if (Array.isArray(navigator.languages)) {
    rawCandidates.push(...navigator.languages);
  }
  if (navigator.language) {
    rawCandidates.push(navigator.language);
  }

  for (const raw of rawCandidates) {
    if (!raw) continue;
    const normalized = raw.trim();
    // Caso especial Chino Tradicional vs Simplificado
    if (/^zh[-_](TW|HK|MO|Hant)/i.test(normalized)) {
      return 'zh-TW';
    }
    if (/^zh/i.test(normalized)) {
      return 'zh-CN';
    }
    const base = normalized.split(/[-_]/)[0].toLowerCase();
    const found = WORLD_LANGUAGES.find((l) => l.code.toLowerCase() === base);
    if (found) {
      return found.code;
    }
  }

  return 'es';
}

export function getLanguageInfo(code?: string): SupportedLanguage {
  if (!code) return WORLD_LANGUAGES[0];
  return (
    WORLD_LANGUAGES.find((l) => l.code.toLowerCase() === code.toLowerCase()) ||
    WORLD_LANGUAGES[0]
  );
}

/**
 * Limpia las cookies de Google Translate para volver al español original nativo de la app.
 */
function clearGoogleTranslateCookies(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const host = window.location.hostname;
  const parts = host.split('.');
  const domains = [
    '',
    host,
    `.${host}`,
    parts.length >= 2 ? `.${parts.slice(-2).join('.')}` : '',
    parts.length >= 3 ? `.${parts.slice(-3).join('.')}` : '',
  ].filter(Boolean);

  document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  for (const d of domains) {
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${d};`;
  }
}

/**
 * Configura la cookie de Google Translate para un idioma destino.
 */
function setGoogleTranslateCookie(targetLang: string): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const cookieVal = `/es/${targetLang}`;
  document.cookie = `googtrans=${cookieVal}; path=/; SameSite=Lax`;
}

/**
 * Dispara el cambio de idioma en vivo sobre el widget oculto de Google Translate,
 * o recarga suavemente si hace falta volver a Español puro.
 */
export function applyAppLanguage(targetLang: string, options?: { allowReloadOnReset?: boolean }): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const validLang = getLanguageInfo(targetLang).code;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, validLang);
  } catch {
    // ignore storage errors
  }

  document.documentElement.lang = validLang;

  if (validLang === 'es') {
    const hadGoogTransCookie = document.cookie.includes('googtrans=') && !document.cookie.includes('googtrans=/es/es');
    clearGoogleTranslateCookies();

    const combo = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
    if (combo && combo.value && combo.value !== 'es') {
      combo.value = 'es';
      combo.dispatchEvent(new Event('change'));
    }

    // Si la página estaba traducida por el motor y el usuario vuelve a Español, recargar limpia cualquier nodo traducido
    if (
      options?.allowReloadOnReset &&
      (hadGoogTransCookie || document.documentElement.classList.contains('translated-ltr') || document.documentElement.classList.contains('translated-rtl'))
    ) {
      window.location.reload();
    }
    return;
  }

  // Para cualquier otro idioma distinto de español:
  setGoogleTranslateCookie(validLang);

  const triggerCombo = (attemptsLeft: number) => {
    const combo = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
    if (combo) {
      if (combo.value !== validLang) {
        combo.value = validLang;
        combo.dispatchEvent(new Event('change'));
      }
    } else if (attemptsLeft > 0) {
      setTimeout(() => triggerCombo(attemptsLeft - 1), 350);
    }
  };

  triggerCombo(12);
}

/**
 * Obtiene el idioma inicial (el elegido por el usuario o el detectado automáticamente del navegador/dispositivo).
 */
export function getInitialAppLanguage(savedSettingsLang?: string): string {
  if (savedSettingsLang) {
    return getLanguageInfo(savedSettingsLang).code;
  }
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored) {
      return getLanguageInfo(stored).code;
    }
  } catch {
    // ignore
  }
  return detectDeviceLanguageCode();
}
