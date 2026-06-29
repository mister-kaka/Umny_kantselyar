# Бэкенд Умного Канцеляра

## Быстрый старт

Требования: Node.js 18+, Docker Desktop, npm 9+

1. Запуск базы данных:
    - docker run --name umny_kan_postgres -e POSTGRES_PASSWORD=12345 -e POSTGRES_USER=postgres -e POSTGRES_DB=umny_kan_db -p 5432:5432 -d pgvector/pgvector:pg15

2. Инициализация базы данных:
   - docker cp src/db/seed.sql umny_kan_postgres:/seed.sql
   - docker exec -it umny_kan_postgres psql -U postgres -d umny_kan_db -c "\encoding UTF8" -f /seed.sql

3. Установка и запуск:
   - npm install
   - cp .env.example .env
   - npm run start:dev

Бэкенд будет доступен на http://localhost:3000.

## Полезные команды

- docker ps - проверить, что контейнер запущен
- docker exec -it umny_kan_postgres psql -U postgres -d umny_kan_db -c "\dt" - посмотреть список таблиц
- docker exec -it umny_kan_postgres psql -U postgres -d umny_kan_db - подключиться к PostgreSQL
- docker stop umny_kan_postgres - остановить контейнер
- docker start umny_kan_postgres - запустить остановленный контейнер
- docker rm umny_kan_postgres - удалить контейнер

## Документация

Полная документация находится в папке docs/ в корне проекта.