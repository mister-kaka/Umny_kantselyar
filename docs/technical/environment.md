# Переменные окружения

## Бэкенд (backend/.env)

Файл .env создаётся при первом запуске из .env.example. Содержит настройки подключения к базе данных, JWT, шифрования и AI.

- DB_HOST - хост базы данных. По умолчанию localhost. При использовании Docker Compose указывается имя сервиса postgres
- DB_PORT - порт базы данных. По умолчанию 5432
- DB_USER - имя пользователя базы данных. По умолчанию postgres
- DB_PASSWORD - пароль пользователя базы данных
- DB_NAME - название базы данных. По умолчанию umny_kan_db
- PORT - порт, на котором запускается бэкенд. По умолчанию 3000
- JWT_SECRET - секретный ключ для подписи JWT-токенов. Должен быть длинной случайной строкой. Используется для аутентификации пользователей
- ENCRYPTION_KEY - ключ шифрования API-ключа AI-провайдера. 32 байта в hex-формате (64 символа). Используется для AES-256-CBC шифрования. Сгенерировать новый ключ можно командой: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
- AI_MOCK_MODE - режим мок-анализа AI. Значения:
  - true - тестирование без реального API-ключа, возвращает фиктивные результаты
  - false - реальные запросы к AI-провайдеру

## Фронтенд (frontend/.env)

Файл .env создаётся автоматически при установке зависимостей.

- VITE_API_URL - URL бэкенда. По умолчанию http://localhost:3000. В продакшне указывается реальный домен

## Пример .env для разработки

Бэкенд (backend/.env):
- DB_HOST=localhost
- DB_PORT=5432
- DB_USER=postgres
- DB_PASSWORD=12345
- DB_NAME=umny_kan_db
- PORT=3000
- JWT_SECRET=my-super-secret-jwt-key-2026
- ENCRYPTION_KEY=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0
- AI_MOCK_MODE=false

Фронтенд (frontend/.env):
- VITE_API_URL=http://localhost:3000

## Пример .env для продакшна

Бэкенд (backend/.env):
- DB_HOST=localhost
- DB_PORT=5432
- DB_USER=umny_kan_user
- DB_PASSWORD=secure_password_here
- DB_NAME=umny_kan_db
- PORT=3000
- JWT_SECRET=long-random-string-here-minimum-32-characters
- ENCRYPTION_KEY=64-character-hex-string-here-for-aes-256-encryption
- AI_MOCK_MODE=false

Фронтенд (frontend/.env):
- VITE_API_URL=https://api.umny-kan.ru

## Примечания по безопасности

- Файл .env не должен храниться в репозитории Git. Добавлен в .gitignore
- JWT_SECRET и ENCRYPTION_KEY должны быть уникальными для каждого развёртывания
- В продакшне использовать сложные пароли для базы данных
- ENCRYPTION_KEY нельзя менять после первого запуска - все сохранённые API-ключи зашифрованы этим ключом и будут потеряны при смене
