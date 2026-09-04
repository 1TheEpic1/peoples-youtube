// Кросс-браузерная совместимость.
if (typeof browser === 'undefined') {
  var browser = chrome;
}

const DEFAULT_SCAM_WORDS = [
  'бесплатно', 'бесплатн', 'роб.кс', 'робукс', 'чит', 'взлом', 'халява',
  'free robux', 'free money', 'hack', 'free robux generator', 'cheat',
  'free generator', 'giveaway',
];

const DEFAULT_CLICKBAIT_WORDS = [
  'тунг', 'сахур', 'шок', 'smash', 'subway surfers', 'смотреть всем',
  'tung tung sahur', '100% real', 'shock', 'viral meme', 'click here',
];

const DEFAULT_WHITELIST_WORDS = [
  'разбор', 'реакция', 'история', 'обзор', 'анализ', 'подкаст',
  'что будет если', 'я установил', 'я построил', 'проверка',
  'review', 'history', 'analysis', 'podcast', 'what if', 'i installed',
  'i built', 'testing', 'reaction',
];

// ---------------------------------------------------------------------------
// Переводы интерфейса самого попапа (раньше он всегда был на русском вне
// зависимости от выбора в селекте — это и было причиной бага на скриншоте).
// ---------------------------------------------------------------------------
const TEXTS = {
  ru: {
    title: "People's YouTube — настройки",
    languageLabel: 'Язык плагина',
    bannerLabel: 'Показывать плашку сверху',
    discoveryHeading: 'Режим открытий',
    discoveryVideoLabel: 'Для видео (< 1000 просмотров)',
    discoveryStreamsLabel: 'Для стримов (< 50 зрителей)',
    scamHeading: 'Скам / опасное ПО',
    scamEnableLabel: 'Включить фильтр',
    scamWordsLabel: 'Стоп-слова (через запятую; можно regex, ищется с флагом /i)',
    clickbaitHeading: 'Кликбейт / брейнрот',
    clickbaitEnableLabel: 'Включить фильтр',
    clickbaitWordsLabel: 'Стоп-слова (через запятую)',
    whitelistLabel: 'Исключения из фильтра капса (через запятую)',
    whitelistHint:
      'Если в названии есть такое слово — проверка на капс не сработает (сам кликбейт по стоп-словам и эмодзи всё равно проверяется).',
    blacklistHeading: 'Чёрный список («не хочу видеть»)',
    blacklistEnableLabel: 'Включить чёрный список',
    blacklistWordsLabel: 'Слова (через запятую)',
    blacklistPlaceholder: 'изначально пусто',
    saveButton: 'Сохранить',
    savedStatus: 'Сохранено! Открытые вкладки YouTube обновятся сами.',
  },
  en: {
    title: "People's YouTube — Settings",
    languageLabel: 'Plugin language',
    bannerLabel: 'Show top banner',
    discoveryHeading: 'Discovery Mode',
    discoveryVideoLabel: 'For videos (< 1000 views)',
    discoveryStreamsLabel: 'For streams (< 50 viewers)',
    scamHeading: 'Scam / Dangerous Software',
    scamEnableLabel: 'Enable filter',
    scamWordsLabel: 'Stop words (comma-separated; regex allowed, matched with /i flag)',
    clickbaitHeading: 'Clickbait / Brainrot',
    clickbaitEnableLabel: 'Enable filter',
    clickbaitWordsLabel: 'Stop words (comma-separated)',
    whitelistLabel: 'Caps-filter exceptions (comma-separated)',
    whitelistHint:
      'If the title contains one of these words, the caps check is skipped (keyword- and emoji-based clickbait checks still apply).',
    blacklistHeading: "Blacklist (\"don't want to see\")",
    blacklistEnableLabel: 'Enable blacklist',
    blacklistWordsLabel: 'Words (comma-separated)',
    blacklistPlaceholder: 'empty by default',
    saveButton: 'Save',
    savedStatus: 'Saved! Open YouTube tabs will update automatically.',
  },
};

function defaultLanguage() {
  const lang = navigator.language || navigator.userLanguage || '';
  return lang.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

function applyTranslations(lang) {
  const t = TEXTS[lang] || TEXTS.en;
  document.getElementById('txt-title').textContent = t.title;
  document.getElementById('txt-language-label').textContent = t.languageLabel;
  document.getElementById('txt-banner-label').textContent = t.bannerLabel;
  document.getElementById('txt-discovery-heading').textContent = t.discoveryHeading;
  document.getElementById('txt-discovery-video-label').textContent = t.discoveryVideoLabel;
  document.getElementById('txt-discovery-streams-label').textContent = t.discoveryStreamsLabel;
  document.getElementById('txt-scam-heading').textContent = t.scamHeading;
  document.getElementById('txt-scam-enable-label').textContent = t.scamEnableLabel;
  document.getElementById('txt-scam-words-label').textContent = t.scamWordsLabel;
  document.getElementById('txt-clickbait-heading').textContent = t.clickbaitHeading;
  document.getElementById('txt-clickbait-enable-label').textContent = t.clickbaitEnableLabel;
  document.getElementById('txt-clickbait-words-label').textContent = t.clickbaitWordsLabel;
  document.getElementById('txt-whitelist-label').textContent = t.whitelistLabel;
  document.getElementById('txt-whitelist-hint').textContent = t.whitelistHint;
  document.getElementById('txt-blacklist-heading').textContent = t.blacklistHeading;
  document.getElementById('txt-blacklist-enable-label').textContent = t.blacklistEnableLabel;
  document.getElementById('txt-blacklist-words-label').textContent = t.blacklistWordsLabel;
  els.blacklistWords.placeholder = t.blacklistPlaceholder;
  els.save.textContent = t.saveButton;
  document.documentElement.lang = lang;
}

const els = {
  language: document.getElementById('language'),
  bannerEnabled: document.getElementById('bannerEnabled'),
  discoveryVideoEnabled: document.getElementById('discoveryVideoEnabled'),
  discoveryStreamsEnabled: document.getElementById('discoveryStreamsEnabled'),
  scamFilterEnabled: document.getElementById('scamFilterEnabled'),
  scamWords: document.getElementById('scamWords'),
  clickbaitFilterEnabled: document.getElementById('clickbaitFilterEnabled'),
  clickbaitWords: document.getElementById('clickbaitWords'),
  whitelistWords: document.getElementById('whitelistWords'),
  blacklistEnabled: document.getElementById('blacklistEnabled'),
  blacklistWords: document.getElementById('blacklistWords'),
  save: document.getElementById('save'),
  status: document.getElementById('status'),
};

function toTextarea(list) {
  return (list || []).join(', ');
}

function fromTextarea(text) {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function load() {
  const stored = await browser.storage.local.get([
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

  const lang = stored.language || defaultLanguage();
  els.language.value = lang;
  applyTranslations(lang);

  els.bannerEnabled.checked = !stored.bannerHidden;
  els.discoveryVideoEnabled.checked = stored.discoveryVideoEnabled !== false;
  els.discoveryStreamsEnabled.checked = stored.discoveryStreamsEnabled !== false;
  els.scamFilterEnabled.checked = stored.scamFilterEnabled !== false;
  els.scamWords.value = toTextarea(Array.isArray(stored.scamWords) ? stored.scamWords : DEFAULT_SCAM_WORDS);
  els.clickbaitFilterEnabled.checked = stored.clickbaitFilterEnabled !== false;
  els.clickbaitWords.value = toTextarea(
    Array.isArray(stored.clickbaitWords) ? stored.clickbaitWords : DEFAULT_CLICKBAIT_WORDS
  );
  els.whitelistWords.value = toTextarea(
    Array.isArray(stored.whitelistWords) ? stored.whitelistWords : DEFAULT_WHITELIST_WORDS
  );
  els.blacklistEnabled.checked = stored.blacklistEnabled !== false;
  els.blacklistWords.value = toTextarea(Array.isArray(stored.blacklistWords) ? stored.blacklistWords : []);
}

async function save() {
  await browser.storage.local.set({
    language: els.language.value,
    bannerHidden: !els.bannerEnabled.checked,
    discoveryVideoEnabled: els.discoveryVideoEnabled.checked,
    discoveryStreamsEnabled: els.discoveryStreamsEnabled.checked,
    scamFilterEnabled: els.scamFilterEnabled.checked,
    scamWords: fromTextarea(els.scamWords.value),
    clickbaitFilterEnabled: els.clickbaitFilterEnabled.checked,
    clickbaitWords: fromTextarea(els.clickbaitWords.value),
    whitelistWords: fromTextarea(els.whitelistWords.value),
    blacklistEnabled: els.blacklistEnabled.checked,
    blacklistWords: fromTextarea(els.blacklistWords.value),
  });
  els.status.textContent = TEXTS[els.language.value].savedStatus;
  setTimeout(() => (els.status.textContent = ''), 2500);
}

// Перевод применяется сразу при переключении селекта — не нужно жать
// "Сохранить", чтобы увидеть, как будет выглядеть попап на другом языке.
els.language.addEventListener('change', () => applyTranslations(els.language.value));
els.save.addEventListener('click', save);
load();
