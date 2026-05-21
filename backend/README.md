# Backend для Умного канцеляра

# Быстрый старт проекта (Backend): 

ВАЖНО: для ПОЛНОЦЕННОГО запуска проекта, необходимо поднять и бэкенд и фронтенд.

### Требования
- Node.js 18+
- Docker Desktop
- npm 9+

### 1. Запуск базы данных (PostgreSQL в Docker) 
- docker должен быть запущен фоново
- docker run --name umny_kan_postgres -e POSTGRES_PASSWORD=12345 -e POSTGRES_USER=postgres -e POSTGRES_DB=umny_kan_db -p 5432:5432 -d postgres:15 

### 2 Инициализация базы данных
- docker cp backend/src/db/seed.sql umny_kan_postgres:/seed.sql
- docker exec -it umny_kan_postgres psql -U postgres -d umny_kan_db -c "\encoding UTF8" -f /seed.sql

### 3. Запуск бэкенда
- cd backend
- npm install
- cp .env.example .env
- npm run start:dev
- Бэкенд будет доступен на **http://localhost:3000**


### Полезные команды
- docker ps // Проверить, что контейнер запущен 
- docker exec -it umny_kan_postgres psql -U postgres -d umny_kan_db -c "\dt" // Посмотреть список таблиц
- docker exec -it umny_kan_postgres psql -U postgres -d umny_kan_db // Подключиться к PostgreSQL внутри контейнера
- docker stop umny_kan_postgres // Остановить контейнер
- docker start umny_kan_postgres // Запустить остановленный контейнер
- docker rm umny_kan_postgres // Удалить контейнер 

## Текущий статус бэкенда

### Этап 1: 
- Локально поднятый NestJS-бэкенд
- Подключённая PostgreSQL-база (Docker)
- Тестовые данные в базе
- Два рабочих эндпоинта: POST /auth/login и GET /dashboard/data
- JWT-токены (настоящие, с истечением срока)
- bcrypt для хэширования паролей
- Валидация DTO (class-validator: email, длина пароля)
- Защита эндпоинта /dashboard/data через JWT
- Promise.all() для параллельных запросов
- CORS настроен для связи с фронтом
- Логирование попыток входа и запросов дашборда (московское время, пароль и токен скрыты)

### Этап 2:
- 2 новых эндпоинта: GET /documents, GET /documents/:id
- 3 справочных эндпоинта: GET /document-types, GET /document-categories, GET /departments
- 4 новые таблицы: document_sources, document_files, ocr_results, document_classifications
- Фильтрация по typeId, categoryId, status в GET /documents
- Пагинация (page, limit) с возвратом total и totalPages
- Полная информация о документе: файлы, OCR, классификация, маршруты, источник
- Все новые эндпоинты защищены JWT
- Обновлён seed.sql: 15+ записей в каждой новой таблице
- Логирование всех новых эндпоинтов

### Этап 3:
- AI-модуль: анализ документа через DeepSeek, промпт, парсинг ответа
- Таблицы: ai_settings, document_ai_results
- Шифрование API-ключа через AES-256-CBC
- Мок-режим (AI_MOCK_MODE) для тестирования без ключа
- Модуль Settings: получение, сохранение и проверка настроек AI, список провайдеров
- Поиск по документам 
- aiResult в карточке документа
- Логирование всех новых эндпоинтов

### Этап 4
- Загрузка файлов: POST /documents/upload (multipart/form-data, до 20 МБ)
- Валидация форматов: PDF, DOCX, TXT, XLSX, JPG, PNG, TIFF
- Извлечение текста: POST /documents/:id/extract-text (pdf-parse, mammoth, xlsx, tesseract.js)
- Сохранение OCR-результатов в таблицу ocr_results
- Автоматическая генерация регистрационного номера (ВХ-2026-XXX)
- Удаление документа: DELETE /documents/:id (удаление из БД и папки uploads)
- Лимит загрузки до 20 МБ
- Логирование всех новых эндпоинтов
