# peoples-youtube
# People's YouTube v0.5.0 

> **Project Slogan:** Platform by people for people / Платформа от людей для людей.

English version below | [Перейти к русской версии](#русская-версия)

---

## English Version

###  Description
**People's YouTube** is a cross-browser extension (Manifest V3) designed to clean YouTube from scams, clickbaits, and brainrot content. Unlike corporate algorithms that capture user attention with digital garbage, this plugin restores the platform's original human soul.

All calculations and filtering happen **strictly locally on the user's CPU**. The plugin respects the YouTube economy and **does NOT block official ads**, preserving revenue for honest creators.

###  Core Features
* **Super-Priority #0 (Custom Blacklist "Don't Want to See"):** Users can input any keywords or creator names in the settings popup. The video card will be completely covered by a solid grey overlay saying *"Hidden by your filter"*.
* **Priority #1 (Scam & Dangerous Software Protection):** A hard regex-based filter identifies gaming currency scams (hacks, cheats, free robux/v-bucks/gems/minecoins). The video card fades to opacity 0.15 and receives a bright red safety badge.
* **Priority #2 (Anti-Clickbait & Anti-Brainrot):** 
  * Collapses stretched words via the `collapseRepeats` function (*sahuuuuuuur -> sahur*).
  * Detects total Caps Lock in titles (above 65% uppercase letters) and excessive emoji spam.
  * **Smart Whitelist (Exceptions):** Caps Lock is forgiven for high-quality video formats (analysis, history, podcast, what if, i installed, i built, etc.).
* **Priority #3 (Split "Discovery Mode"):** A real radar to support beginners. If a video is clean from scams and clickbait, the plugin frames it with a gold border and attaches a *“Discovery of the Day”* badge.
  * **For regular videos:** Limit strictly under 1000 views.
  * **For Live Streams:** A separate, dedicated limit strictly under 50 live viewers.

###  Technical Insights v0.5.0
1. **Cross-Browser Compatibility:** Powered by a built-in shim (`var browser = chrome`), the exact same codebase runs flawlessly in **Firefox, Google Chrome, Microsoft Edge, Yandex Browser, and Opera**.
2. **Instant Settings Sync:** Popup configuration applies to all open YouTube tabs instantly without manual page reloads via `browser.storage.onChanged`.
3. **Virtual Scroll Shield:** Handles YouTube's SPA navigation (`yt-navigate-finish`) and dynamic DOM node reuse, preventing false positives when scrolling.
4. **Smart Metadata Parsing:** Extracts the exact first digit group of views (preventing concatenation with video release dates) and correctly parses multilingual localization keys (`млн`, `тыс`, `K`, `M`) in any text case.

###  Installation Guide (Firefox Developer Mode)
1. Download all files from this repository into a single folder on your PC.
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
3. Click the **"Load Temporary Add-on..."** button.
4. Select the `manifest.json` file from your project folder.
5. Open YouTube and manage filters using the extension icon in your browser's toolbar.

---

## Русская Версия

###  Описание проекта
**People's YouTube** — это кроссбраузерное расширение (Manifest V3), созданное для очистки YouTube от мошенничества, кликбейта и «брэйнрот»-контента. В отличие от корпоративных алгоритмов, которые удерживают внимание пользователя мусорными роликами, этот плагин возвращает платформе её первоначальную человеческую душу.

Все вычисления и фильтрация происходят **строго локально на процессоре пользователя**. Плагин уважает экономику YouTube и **НЕ блокирует официальную рекламу**, сохраняя доход честным авторам.

###  Главные функции и возможности
* **Сверхприоритет №0 (Чёрный список «Не хочу видеть»):** Пользователь может вписать любые стоп-слова или имена блогеров в меню настроек. Видео полностью перекрывается серым оверлеем с надписью *"Скрыто вашим фильтром"*.
* **Приоритет №1 (Защита от Скама и Опасного ПО):** Жесткий фильтр регулярных выражений (Regex) вычисляет падежи и корни мошеннических слов (чит, взлом, халява, бесплатные робуксы/гемы/в-баксы). Видео становится блеклым (opacity 0.15) и получает ярко-красный бейдж безопасности.
* **Приоритет №2 (Анти-Кликбейт и Анти-Брэйнрот):** 
  * Схлопывание растянутых букв (функция `collapseRepeats`: *sahuuuuuuur -> sahur*).
  * Детект тотального Капса в заголовках (более 65% заглавных букв) и засилья эмодзи.
  * **Умный белый список (Исключения):** Капс прощается качественным форматам (разбор, реакция, история, обзор, анализ, подкаст, что будет если, я установил и т.д.).
* **Приоритет №3 (Раздельный «Режим открытий»):** Настоящий радар для поддержки новичков. Если видео чистое от скама и кликбейта, плагин обводит его золотой рамкой и вешает бейдж *«Открытие дня»*.
  * **Для обычных видео:** Лимит строго до 1000 просмотров.
  * **Для прямых трансляций (Стримов):** Отдельный лимит до 50 зрителей в эфире.

---

### 🛠️ Технические особенности v0.5.0
1. **Кроссбраузерность:** Благодаря встроенному шиму (`var browser = chrome`) один и тот же код без изменений работает в **Firefox, Google Chrome, Microsoft Edge, Яндекс.Браузере и Opera**.
2. **Мгновенное применение:** Настройки из Popup-меню применяются ко всем открытым вкладкам YouTube сразу без перезагрузки страниц (через `browser.storage.onChanged`).
3. **Защита от виртуального скролла:** Плагин отслеживает SPA-навигацию YouTube (`yt-navigate-finish`) и динамическую подмену видео в старых DOM-узлах, предотвращая ложные срабатывания.
4. **Умный парсинг метаданных:** Вытаскивает чистые цифры просмотров (защита от склеивания с датой ролика) и корректно обрабатывает русскую локализацию (`млн`, `тыс`) в любом регистре.

---

###  Как запустить в режиме разработчика (на примере Firefox)
1. Скачайте все файлы репозитория в одну папку на компьютере.
2. Откройте Firefox и перейдите по адресу `about:debugging#/runtime/this-firefox`.
3. Нажмите кнопку **«Загрузить временное расширение...»** (Load Temporary Add-on...).
4. Выберите файл `manifest.json` из папки проекта.
5. Откройте YouTube и управляйте фильтрами через иконку расширения на панели инструментов браузера.

*Разработано независимым автором для защиты пользователей от цифрового шума.*
