# GreenChat

Тестовое задание «Фронтенд разработчик React»: интерфейс для отправки и получения текстовых сообщений через [GREEN-API](https://green-api.com/en/telegram/docs/api/).

**Демо:** https://daria-aleksandrovna-k.github.io/GreenChat/

ТЗ разрешает вместо MAX выполнить задание для WhatsApp или Telegram — **выбран Telegram**. Поэтому:

- прототип интерфейса — [web.telegram.org](https://web.telegram.org/) вместо web.max.ru;
- отправка — метод [SendMessage](https://green-api.com/en/telegram/docs/api/sending/SendMessage/) для Telegram;
- получение — HTTP API: [ReceiveNotification](https://green-api.com/en/telegram/docs/api/receiving/technology-http-api/ReceiveNotification/) + [DeleteNotification](https://green-api.com/en/telegram/docs/api/receiving/technology-http-api/DeleteNotification/).

## Возможности

Интерфейс минимальный: форма входа, список чатов, окно переписки.

- Вход по `idInstance` и `apiTokenInstance`.
- Создание чата по номеру телефона получателя.
- Отправка текстовых сообщений методом `SendMessage`: Enter — отправить, Shift+Enter — новая строка.
- Получение ответов через HTTP API (`ReceiveNotification` + `DeleteNotification`): ответ получателя появляется в чате.

## Подготовка GREEN-API

1. Зарегистрируйтесь в [консоли GREEN-API](https://console.green-api.com) и создайте инстанс **Telegram**.
2. Авторизуйте инстанс: в Telegram на телефоне откройте Настройки → Устройства → Подключить устройство и отсканируйте QR-код из консоли («Get QR»).
3. В настройках инстанса включите «Получать уведомления о входящих сообщениях и файлах», поле Webhook URL оставьте пустым.
4. Скопируйте из консоли `apiUrl`, `idInstance` и `apiTokenInstance`.

## Запуск локально

Нужен Node.js 20+.

```bash
cp .env.example .env   # укажите apiUrl инстанса в VITE_GREEN_API_URL
npm i && npm run dev
```

Откройте http://localhost:5173, введите `idInstance` и `apiTokenInstance`, создайте чат по номеру и отправьте сообщение.

Проверки: `npm run lint`, `npm run format:check`, `npm test`, `npm run build`.

## Деплой

Сайт публикуется на GitHub Pages workflow-ом `.github/workflows/deploy.yml` при каждом push в `main`: lint, тесты, сборка и публикация.

Однократная настройка репозитория:

1. Settings → Pages → Source: **GitHub Actions**.
2. Settings → Secrets and variables → Actions → Variables: `VITE_GREEN_API_URL` = `apiUrl` инстанса.

## Стек

React 18, TypeScript, Vite · Radix Themes + CSS Modules · Zustand (состояние в `localStorage`) · TanStack Query (отправка и последовательный опрос входящих) · React Router · Vitest · ESLint + Prettier.

Архитектура — Feature-Sliced Design; границы слоёв проверяет `npm run lint`:

```
src/
  app/        провайдеры, маршруты, глобальные стили
  pages/      login, chat
  widgets/    chat-list, chat-window
  features/   auth-login, create-chat, send-message, receive-messages, load-history, sync-chats
  entities/   session, chat, message
  shared/     api (клиент GREEN-API), lib, config
```

## Ограничения

- `apiUrl` у каждого инстанса свой и задаётся при сборке (`VITE_GREEN_API_URL`), а форма входа содержит два поля из ТЗ. Развёрнутая версия работает с инстансами на том хосте, под который собрана; для инстанса на другом хосте запустите проект локально со своим `apiUrl`.
- Поддерживаются только личные чаты и текстовые сообщения; уведомления другого типа удаляются из очереди.
- `apiTokenInstance` хранится в `localStorage` браузера — упрощение для тестового задания. В продакшене токен должен храниться на сервере.
