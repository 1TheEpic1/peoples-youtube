// Кросс-браузерная совместимость (Chrome/Edge/Opera не имеют глобального
// `browser`, только `chrome`; Firefox имеет оба, но нативно — только `browser`).
if (typeof browser === 'undefined') {
  var browser = chrome;
}

console.log("[People's YouTube] content-home.js v0.5.0 загружен, старт инициализации...");

// ---------------------------------------------------------------------------
// Значения по умолчанию (совпадают с DEFAULT_* в popup.js — держите их в
// синхроне при редактировании, это два независимых контекста выполнения).
// ---------------------------------------------------------------------------
const DEFAULT_SCAM_WORDS = [
  'бесплатно', 'бесплатн', 'чит', 'взлом', 'халява',
  'free robux', 'free money', 'hack', 'free robux generator', 'cheat',
  'free generator', 'giveaway', 'free', 
];

const DEFAULT_CLICKBAIT_WORDS = [
  'тунг', 'сахур', 'шок', 'smash', 'нажми', 'subway surfers', 'смотреть всем',
  'tung tung sahur', '100% real', 'shock', 'viral meme', 'click here',
  'tralalero', 'tralala', 'orcalero', 'orcala', 'sigma', 'bombardiro',
  
];

const DEFAULT_WHITELIST_WORDS = [
  'разбор', 'реакция', 'история', 'обзор', 'анализ', 'подкаст',
  'что будет если', 'я установил', 'я построил', 'проверка', 'посмотрел',
  'review', 'history', 'analysis', 'podcast', 'what if', 'i installed',
  'i built', 'testing', 'reaction', 'caver', 'кавер',
];

let currentSettings = {
  isRu: false,
  bannerHidden: false,
  discoveryVideoEnabled: true,
  discoveryStreamsEnabled: true,
  scamFilterEnabled: true,
  scamWords: DEFAULT_SCAM_WORDS,
  clickbaitFilterEnabled: true,
  clickbaitWords: DEFAULT_CLICKBAIT_WORDS,
  whitelistWords: DEFAULT_WHITELIST_WORDS,
  blacklistEnabled: true,
  blacklistWords: [],
};

let currentTexts = {};

function defaultLanguage() {
  const lang = navigator.language || navigator.userLanguage || '';
  return lang.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

function computeTexts(isRu) {
  return {
    banner: isRu
      ? 'Платформа от людей для людей. Мы нагружаем ПК локально лишь для того, чтобы очищать ленту от кликбейтов, скама и нежелательных тем.'
      : 'Platform by people for people. We load your CPU locally just to clean the feed from clickbait, scams, and unwanted topics.',
    clickbaitBadge: isRu ? '⚠️ Возможный кликбейт / Контент-ферма' : '⚠️ Potential Clickbait / Content Farm',
    scamBadge: isRu ? '⚠️ Возможный скам / Опасное ПО' : '⚠️ Potential Scam / Dangerous Software',
    discoveryVideoBadge: isRu ? '🌟 Открытие дня (Новый автор)' : '🌟 Discovery of the Day (New Author)',
    discoveryStreamBadge: isRu ? '🌟 Открытие дня (Новый стрим)' : '🌟 Discovery of the Day (New Stream)',
    blacklistHidden: isRu ? 'Скрыто вашим фильтром' : 'Hidden by your filter',
    bannerCloseTitle: isRu
      ? 'Скрыть (можно включить обратно в настройках)'
      : 'Hide (can be re-enabled in settings)',
  };
}

async function loadSettings() {
  let stored = {};
  try {
    stored = await browser.storage.local.get([
      'language',
      'bannerHidden',
      'discoveryVideoEnabled',
      'discoveryStreamsEnabled',
      'scamFilterEnabled',
      'scamWords',
      'clickbaitFilterEnabled',
      'clickbaitWords',
      'whitelistWords',
      'blacklistEnabled',
      'blacklistWords',
    ]);
  } catch (err) {
    console.warn("[People's YouTube] Не удалось прочитать настройки, использую значения по умолчанию.", err);
  }

  const language = stored.language || defaultLanguage();
  const isRu = language === 'ru';

  currentSettings = {
    isRu,
    bannerHidden: !!stored.bannerHidden,
    discoveryVideoEnabled: stored.discoveryVideoEnabled !== false,
    discoveryStreamsEnabled: stored.discoveryStreamsEnabled !== false,
    scamFilterEnabled: stored.scamFilterEnabled !== false,
    scamWords: Array.isArray(stored.scamWords) ? stored.scamWords : DEFAULT_SCAM_WORDS,
    clickbaitFilterEnabled: stored.clickbaitFilterEnabled !== false,
    clickbaitWords: Array.isArray(stored.clickbaitWords) ? stored.clickbaitWords : DEFAULT_CLICKBAIT_WORDS,
    whitelistWords: Array.isArray(stored.whitelistWords) ? stored.whitelistWords : DEFAULT_WHITELIST_WORDS,
    blacklistEnabled: stored.blacklistEnabled !== false,
    blacklistWords: Array.isArray(stored.blacklistWords) ? stored.blacklistWords : [],
  };
  currentTexts = computeTexts(isRu);

  console.log(
    `[People's YouTube] Настройки: язык=${language}, скам=${currentSettings.scamFilterEnabled}` +
      `(${currentSettings.scamWords.length}), кликбейт=${currentSettings.clickbaitFilterEnabled}` +
      `(${currentSettings.clickbaitWords.length}), ЧС=${currentSettings.blacklistEnabled}` +
      `(${currentSettings.blacklistWords.length}), открытия видео=${currentSettings.discoveryVideoEnabled}, ` +
      `открытия стримов=${currentSettings.discoveryStreamsEnabled}`
  );
}

// ---------------------------------------------------------------------------
// Матчинг стоп-слов
// ---------------------------------------------------------------------------
function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function collapseRepeats(text) {
  // "saHUUUUUUUR" -> "sahur"
  return text.replace(/([a-zа-яё])\1{2,}/gi, '$1');
}

function stripNonAlnum(text) {
  return text.replace(/[^a-zа-яё0-9]/gi, '');
}

// Литеральные стоп-слова (кликбейт, ЧС, whitelist): границы слова +
// доп. проверка "без пробелов" для многословных фраз (ловит лишний повтор
// слова внутри мема, напр. "tung TUNG tung sahur").
function matchesStopword(normalizedTitle, rawWord) {
  const word = collapseRepeats(normalize(rawWord));
  if (!word) return false;

  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const boundaryRe = new RegExp(`(^|[^a-zа-яё0-9])${escaped}([^a-zа-яё0-9]|$)`, 'i');
  if (boundaryRe.test(normalizedTitle)) return true;

  if (word.includes(' ')) {
    const strippedWord = stripNonAlnum(word);
    const strippedTitle = stripNonAlnum(normalizedTitle);
    if (strippedWord.length >= 8 && strippedTitle.includes(strippedWord)) return true;
  }
  return false;
}

// Скам-слова — это КОРНИ, заданные как regex-паттерны напрямую (например,
// "роб.кс" — точка это regex-wildcard, ловит "робуксы"/"робаксы"). Никакого
// экранирования спецсимволов — пользователь сам решает, что писать.
//
// ВАЖНО: требуем границу СЛЕВА от совпадения (начало строки или не-буква/
// не-цифра перед ним), но НЕ справа. Это принципиально: короткие корни вроде
// "чит" должны матчить "читы"/"читерство" (продолжение справа — это и есть
// смысл "поиска по корню"), но не должны срабатывать внутри случайных слов,
// где корень идёт не с начала — "слу-ЧИТ-ся", "у-ЧИТ-ель", "полу-ЧИТ" —
// там перед корнем стоит буква, и левая граница это отсекает.
function matchesScamPattern(normalizedTitle, pattern) {
  if (!pattern) return false;
  try {
    const re = new RegExp(`(^|[^a-zа-яё0-9])(?:${pattern})`, 'i');
    return re.test(normalizedTitle);
  } catch (err) {
    console.warn(`[People's YouTube] Невалидный regex в списке скама: "${pattern}", ищу как обычную подстроку.`, err);
    return normalizedTitle.toLowerCase().includes(pattern.toLowerCase());
  }
}

// ---------------------------------------------------------------------------
// Классификация заголовка. Порядок проверок — жёсткий приоритет:
// ЧС > скам > кликбейт > (если ничего не сработало) режим открытий.
// ---------------------------------------------------------------------------
function classifyTitle(titleRaw) {
  const normalizedTitle = collapseRepeats(normalize(titleRaw));

  if (currentSettings.blacklistEnabled && currentSettings.blacklistWords.length) {
    const isBlacklisted = currentSettings.blacklistWords.some((w) => matchesStopword(normalizedTitle, w));
    if (isBlacklisted) return 'blacklist';
  }

  if (currentSettings.scamFilterEnabled && currentSettings.scamWords.length) {
    const isScam = currentSettings.scamWords.some((w) => matchesScamPattern(normalizedTitle, w));
    if (isScam) return 'scam';
  }

  if (currentSettings.clickbaitFilterEnabled) {
    const keywordHit = currentSettings.clickbaitWords.some((w) => matchesStopword(normalizedTitle, w));

    const hasWhitelistWord = currentSettings.whitelistWords.some((w) => matchesStopword(normalizedTitle, w));

    const lettersOnly = titleRaw.replace(/[^a-zа-яё]/gi, '');
    const capsRatio =
      lettersOnly.length >= 10 ? titleRaw.replace(/[^A-ZА-ЯЁ]/g, '').length / lettersOnly.length : 0;
    const capsHit = !hasWhitelistWord && capsRatio > 0.65;

    const emojiCount = (titleRaw.match(/[🔥😱🛑‼]/gu) || []).length;
    const emojiHit = emojiCount > 4;

    if (keywordHit || capsHit || emojiHit) return 'clickbait';
  }

  return null;
}

// ---------------------------------------------------------------------------
// Режим открытий (Приоритет №3) — отдельная ветка для видео и стримов.
// ---------------------------------------------------------------------------
function cleanMetaText(raw) {
  return raw
    .replace(/[\u00A0\u200B]/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Маркеры "популярности". Латинские k/m и кириллические к/м намеренно не
// смешиваются с обычным текстом: требуем цифру непосредственно перед буквой
// и проверяем, что после неё не идёт ещё одна буква того же алфавита —
// иначе "10 месяцев" (кириллическая "м") ложно считалось бы миллионом.
const POPULAR_MARKER_PATTERNS = [
  /тыс/i,
  /млн/i,
  /млрд/i,
  /\d\s*к(?![а-яё])/i,
  /\d\s*м(?![а-яё])/i,
  /\d\s*[km](?![a-z])/i,
];

function isPopularText(cleaned) {
  return POPULAR_MARKER_PATTERNS.some((re) => re.test(cleaned));
}

// Берём ПЕРВУЮ числовую группу в строке — это и есть счётчик просмотров/
// зрителей, идущий в начале ("523 просмотра • 2 дня назад"). Если бы брали
// все цифры из всей строки, дата в конце ("2 дня назад") склеилась бы со
// счётчиком и ломала бы сравнение с порогом.
function extractLeadingNumber(cleaned) {
  const match = cleaned.match(/[\d\s.,]+/);
  if (!match) return null;
  const digits = match[0].replace(/\D/g, '');
  if (!digits) return null;
  return parseInt(digits, 10);
}

function markDiscovery(card, badgeText) {
  card.style.border = '2px solid #ffaa00';
  card.style.borderRadius = '8px';
  card.style.padding = '4px';
  const badge = document.createElement('div');
  badge.className = 'discovery-badge';
  badge.innerText = badgeText;
  card.insertBefore(badge, card.firstChild);
}

function applyDiscoveryMode(card, cleanedMetaText) {
  if (isPopularText(cleanedMetaText)) return; // популярное — не трогаем

  const isStreamMeta = /(зрител|watching|live)/i.test(cleanedMetaText);
  const isVideoMeta = /(просмотр|view)/i.test(cleanedMetaText);

  if (isStreamMeta && currentSettings.discoveryStreamsEnabled) {
    const count = extractLeadingNumber(cleanedMetaText);
    if (count !== null && count > 0 && count < 50) {
      markDiscovery(card, currentTexts.discoveryStreamBadge);
    }
    return;
  }

  if (isVideoMeta && currentSettings.discoveryVideoEnabled) {
    const count = extractLeadingNumber(cleanedMetaText);
    if (count !== null && count > 0 && count < 1000) {
      markDiscovery(card, currentTexts.discoveryVideoBadge);
    }
  }
}

// ---------------------------------------------------------------------------
// Баннер
// ---------------------------------------------------------------------------
const MASTHEAD_SELECTORS = [
  '#masthead-container',
  'ytd-masthead#masthead',
  'ytd-masthead',
  '#masthead',
  'tp-yt-app-header',
  'header#masthead',
];

function findMasthead() {
  for (const selector of MASTHEAD_SELECTORS) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}

async function dismissBanner() {
  const el = document.getElementById('peoples-banner');
  if (el) el.remove();
  currentSettings.bannerHidden = true;
  try {
    await browser.storage.local.set({ bannerHidden: true });
  } catch (err) {
    console.warn("[People's YouTube] Не удалось сохранить закрытие баннера.", err);
  }
}

function injectBanner() {
  if (currentSettings.bannerHidden) return;

  const existing = document.getElementById('peoples-banner');
  if (existing) {
    const textSpan = existing.querySelector('.peoples-banner-text');
    if (textSpan) textSpan.innerText = currentTexts.banner;
    return;
  }

  const banner = document.createElement('div');
  banner.id = 'peoples-banner';

  const textSpan = document.createElement('span');
  textSpan.className = 'peoples-banner-text';
  textSpan.innerText = currentTexts.banner;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'peoples-banner-close';
  closeBtn.type = 'button';
  closeBtn.innerText = '×';
  closeBtn.title = currentTexts.bannerCloseTitle;
  closeBtn.addEventListener('click', dismissBanner);

  banner.appendChild(textSpan);
  banner.appendChild(closeBtn);

  const masthead = findMasthead();
  if (masthead && masthead.parentNode) {
    masthead.parentNode.insertBefore(banner, masthead.nextSibling);
    return;
  }
  if (document.body) document.body.prepend(banner);
}

// ---------------------------------------------------------------------------
// Карточки: главная, поиск (/results), боковая панель "предложенные" на /watch
// ---------------------------------------------------------------------------
const CARD_SELECTORS = [
  'ytd-rich-item-renderer',
  'ytd-video-renderer',
  'ytd-grid-video-renderer',
  'compact-video-renderer',
  'ytd-compact-video-renderer',
  'ytd-playlist-renderer',
  'ytd-radio-renderer',
  'ytd-compact-playlist-renderer',
  'ytd-playlist-video-renderer',
  'yt-lockup-view-model',
];

const TITLE_SELECTORS = [
  '#video-title',
  '#video-title-link',
  'a#video-title',
  'yt-formatted-string#video-title',
  '.yt-lockup-metadata-view-model-wiz__title',
  'h3 a',
];

const VIEWS_SELECTORS = [
  '#metadata-line span',
  '.inline-metadata-item',
  '#metadata',
  '.ytd-video-meta-block',
  '#live-badge',
  '.yt-content-metadata-view-model-wiz__metadata-text',
];

function queryFirst(root, selectors) {
  for (const selector of selectors) {
    const el = root.querySelector(selector);
    if (el) return el;
  }
  return null;
}

function clearCardMarkup(card) {
  card.style.opacity = '';
  card.style.border = '';
  card.style.borderRadius = '';
  card.style.padding = '';
  card.style.position = '';
  card.querySelectorAll('.clickbait-badge, .scam-badge, .discovery-badge, .blacklist-overlay').forEach((el) =>
    el.remove()
  );
}

function applyBlacklistOverlay(card) {
  card.style.position = 'relative';
  const overlay = document.createElement('div');
  overlay.className = 'blacklist-overlay';
  overlay.innerText = currentTexts.blacklistHidden;
  card.appendChild(overlay);
}

function applyScamMarkup(card) {
  card.style.opacity = '0.15';
  const badge = document.createElement('div');
  badge.className = 'scam-badge';
  badge.innerText = currentTexts.scamBadge;
  card.insertBefore(badge, card.firstChild);
}

function applyClickbaitMarkup(card) {
  card.style.opacity = '0.25';
  const badge = document.createElement('div');
  badge.className = 'clickbait-badge';
  badge.innerText = currentTexts.clickbaitBadge;
  card.insertBefore(badge, card.firstChild);
}

function processVideoCards() {
  const cards = document.querySelectorAll(CARD_SELECTORS.join(', '));
  const counts = { blacklist: 0, scam: 0, clickbait: 0, discovery: 0, skipped: 0 };

  cards.forEach((card) => {
    const titleElement = queryFirst(card, TITLE_SELECTORS);
    if (!titleElement) {
      counts.skipped++;
      return;
    }

    const titleRaw = (titleElement.innerText || titleElement.textContent || '').trim();
    if (!titleRaw) return;

    // Фикс виртуального скролла: YouTube переиспользует DOM-узлы карточек,
    // подставляя в них новое видео. Сверяем текст заголовка, а не булев флаг.
    if (card.dataset.lastTitle === titleRaw) return;
    card.dataset.lastTitle = titleRaw;
    clearCardMarkup(card);

    const category = classifyTitle(titleRaw);

    if (category === 'blacklist') {
      counts.blacklist++;
      applyBlacklistOverlay(card);
      return;
    }
    if (category === 'scam') {
      counts.scam++;
      applyScamMarkup(card);
      return;
    }
    if (category === 'clickbait') {
      counts.clickbait++;
      applyClickbaitMarkup(card);
      return;
    }

    const metaElement = queryFirst(card, VIEWS_SELECTORS);
    if (metaElement) {
      const cleaned = cleanMetaText(metaElement.innerText || metaElement.textContent || '');
      const badgesBefore = card.querySelectorAll('.discovery-badge').length;
      applyDiscoveryMode(card, cleaned);
      if (card.querySelectorAll('.discovery-badge').length > badgesBefore) counts.discovery++;
    }
  });

  if (cards.length) {
    console.log(
      `[People's YouTube] Видео/поиск — ЧС: ${counts.blacklist}, скам: ${counts.scam}, ` +
        `кликбейт: ${counts.clickbait}, открытий: ${counts.discovery}, без заголовка: ${counts.skipped}, ` +
        `всего карточек: ${cards.length}`
    );
  }
}

// ---------------------------------------------------------------------------
// Shorts (/shorts) — ЧС, скам, кликбейт. Режим открытий здесь не применяется.
// ---------------------------------------------------------------------------
const SHORTS_CARD_SELECTORS = ['ytd-reel-video-renderer', 'reel-player'];
const SHORTS_TITLE_SELECTORS = [
  '#shorts-title',
  'yt-shorts-video-title-view-model h2',
  '.ytShortsVideoTitleViewModelShortsVideoTitle',
  'ytd-reel-player-header-renderer h2',
  'h2.ytd-reel-player-header-renderer',
];

function processShorts() {
  const cards = document.querySelectorAll(SHORTS_CARD_SELECTORS.join(', '));
  const counts = { blacklist: 0, scam: 0, clickbait: 0, skipped: 0 };

  cards.forEach((card) => {
    const titleElement = queryFirst(card, SHORTS_TITLE_SELECTORS);
    if (!titleElement) {
      counts.skipped++;
      return;
    }

    const titleRaw = (titleElement.innerText || titleElement.textContent || '').trim();
    if (!titleRaw) return;

    if (card.dataset.lastTitle === titleRaw) return;
    card.dataset.lastTitle = titleRaw;
    clearCardMarkup(card);

    const category = classifyTitle(titleRaw);
    if (category === 'blacklist') {
      counts.blacklist++;
      applyBlacklistOverlay(card);
    } else if (category === 'scam') {
      counts.scam++;
      applyScamMarkup(card);
    } else if (category === 'clickbait') {
      counts.clickbait++;
      applyClickbaitMarkup(card);
    }
  });

  if (cards.length) {
    console.log(
      `[People's YouTube] Shorts — ЧС: ${counts.blacklist}, скам: ${counts.scam}, ` +
        `кликбейт: ${counts.clickbait}, без заголовка: ${counts.skipped}, всего: ${cards.length}`
    );
  }
}

function forceRescanAll() {
  document.querySelectorAll([...CARD_SELECTORS, ...SHORTS_CARD_SELECTORS].join(', ')).forEach((card) => {
    delete card.dataset.lastTitle;
  });
  processVideoCards();
  processShorts();
}

// ---------------------------------------------------------------------------
// Реакция на изменения в попапе — мгновенно, без перезагрузки вкладки
// ---------------------------------------------------------------------------
if (browser.storage && browser.storage.onChanged) {
  browser.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local') return;
    console.log("[People's YouTube] Настройки изменились в попапе, перечитываю и пересканирую...");
    await loadSettings();

    const existingBanner = document.getElementById('peoples-banner');
    if (existingBanner) existingBanner.remove();
    if (!currentSettings.bannerHidden) injectBanner();

    forceRescanAll();
  });
}

// SPA-навигация YouTube (переход на /results, /shorts, конкретное видео и т.д.
// не перезагружает страницу) — сбрасываем кэш и сканируем заново немедленно.
window.addEventListener('yt-navigate-finish', () => {
  console.log("[People's YouTube] SPA-навигация завершена, сбрасываю кэш и пересканирую.");
  injectBanner();
  forceRescanAll();
});

// ---------------------------------------------------------------------------
// Инициализация
// ---------------------------------------------------------------------------
async function init() {
  await loadSettings();
  setInterval(() => {
    injectBanner();
    processVideoCards();
    processShorts();
  }, 1500);
  console.log("[People's YouTube] Инициализация v0.5.0 завершена, таймер запущен.");
}

init();