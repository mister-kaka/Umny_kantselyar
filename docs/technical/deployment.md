# Инструкция по развёртыванию

## Требования

Для развёртывания системы необходимы:
- Node.js версии 18 или выше
- npm версии 9 или выше
- Docker Desktop (для PostgreSQL)
- Git (для клонирования репозитория)

Проверка установленных версий:
- node --version
- npm --version
- docker --version

## Клонирование репозитория

- git clone https://github.com/mister-kaka/Umny_kantselyar.git
- cd Umny_kantselyar

## Установка и запуск базы данных

Запуск PostgreSQL с расширением pgvector в Docker:

- docker run --name umny_kan_postgres -e POSTGRES_PASSWORD=12345 -e POSTGRES_USER=postgres -e POSTGRES_DB=umny_kan_db -p 5432:5432 -d pgvector/pgvector:pg15

Инициализация базы данных тестовыми данными:

- docker cp backend/src/db/seed.sql umny_kan_postgres:/seed.sql
- docker exec -it umny_kan_postgres psql -U postgres -d umny_kan_db -c "\encoding UTF8" -f /seed.sql

Остановка и повторный запуск контейнера:

- docker stop umny_kan_postgres
- docker start umny_kan_postgres

Полная очистка и пересоздание:

- docker rm -f umny_kan_postgres
- docker run --name umny_kan_postgres -e POSTGRES_PASSWORD=12345 -e POSTGRES_USER=postgres -e POSTGRES_DB=umny_kan_db -p 5432:5432 -d pgvector/pgvector:pg15
- docker cp backend/src/db/seed.sql umny_kan_postgres:/seed.sql
- docker exec -it umny_kan_postgres psql -U postgres -d umny_kan_db -c "\encoding UTF8" -f /seed.sql

## Установка и запуск бэкенда

- cd backend
- npm install
- cp .env.example .env

При необходимости отредактировать файл .env, указав параметры подключения к базе данных и другие настройки.

Переменные окружения в .env:
1. DB_HOST=localhost - хост базы данных
2. DB_PORT=5432 - порт PostgreSQL
3. DB_USER=postgres - имя пользователя базы данных
4. DB_PASSWORD=12345 - пароль базы данных
5. DB_NAME=umny_kan_db - название базы данных
6. PORT=3000 - порт, на котором запускается бэкенд (NestJS)
7. JWT_SECRET=your_secret_key - секретный ключ для подписи JWT-токенов. Должен быть длинной случайной строкой
8. ENCRYPTION_KEY=your_encryption_key_here - ключ шифрования API-ключа AI-провайдера. 32 байта в hex-формате (64 символа), используется для AES-256-CBC шифрования. Сгенерировать новый ключ можно командой:
   - node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
9. AI_MOCK_MODE=false - режим мок-анализа AI. true для тестирования без реального API-ключа (возвращает фиктивные результаты), false для реальных запросов к AI-провайдеру

Запуск в режиме разработки:

- npm run start:dev

Бэкенд будет доступен на http://localhost:3000.

## Установка и запуск фронтенда

- cd frontend
- npm install

В файле .env (создаётся автоматически):
- VITE_API_URL=http://localhost:3000

Запуск в режиме разработки:

- npm run dev

Фронтенд будет доступен на http://localhost:3001.

## Продакшн-сборка

### Бэкенд

Сборка:
- cd backend
- npm run build

Продакшн-файлы будут в папке backend/dist/.

Запуск продакшн-версии:
- npm run start:prod

### Фронтенд

Сборка:
- cd frontend
- npm run build

Продакшн-файлы будут в папке frontend/dist/.

## Тестовые данные для входа

После развёртывания доступны следующие пользователи:

Администратор:
- email: alexandra@umny-kan.ru, пароль: admin123
- email: maria.n@umny-kan.ru, пароль: admin123

Операторы:
- email: alina@umny-kan.ru, пароль: user123
- email: violetta@umny-kan.ru, пароль: user123
- email: egor@umny-kan.ru, пароль: user123
- email: karina@umny-kan.ru, пароль: user123
- email: maria.m@umny-kan.ru, пароль: user123

## Обновление зависимостей

Бэкенд:
- cd backend
- npm update

Фронтенд:
- cd frontend
- npm update

Проверка устаревших пакетов:
- npm outdated
