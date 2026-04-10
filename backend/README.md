# Backend для Умного канцеляра

## Быстрый запуск проекта (части бека):

### 1. Установка зависимостей
- cd backend
- npm install

### 2. Настройка окружения
cp .env.example .env 

В файле .env необходимо внести следующие переменные следующие переменные:
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=12345
DB_NAME=umny_kan_db
PORT=3000
JWT_SECRET=your_secret_key_here //любой секретный ключ

Важно: .env - твои личные настройки (не в Git), как должен выглядеть файл .evn можно посмотреть в файле .env.exmple

### 3. Запуск PostgreSQL в Docker
-docker run --name umny_kan_postgres -e POSTGRES_PASSWORD=12345 -e POSTGRES_USER=postgres -e POSTGRES_DB=umny_kan_db -p 5432:5432 -d postgres:15

 Требования:
- Установленный Docker Desktop
- PostgreSQL 15 (запускается в Docker)
  
### 4. Инициализация базы данных (только при первом запуске)
- docker cp src/db/seed.sql umny_kan_postgres:/seed.sql
- docker exec -it umny_kan_postgres psql -U postgres -d umny_kan_db -c "\encoding UTF8" -f /seed.sql

### 5. Запуск бэкенда
- npm run start:dev

### Проверка работоспособности 
Открой браузер: http://localhost:3000 - должна появиться надпись "Hello World!"
После инициализации в базе данных будут:
- 7 таблиц (roles, users, departments, document_types, document_categories, documents, document_routes)
- 2 роли (Администратор, Пользователь)
- 7 пользователей (разработчики)
- 15 документов
- 17 маршрутов

### Полезные команды
- docker ps // Проверить, что контейнер запущен 
- docker exec -it umny_kan_postgres psql -U postgres -d umny_kan_db -c "\dt" // Посмотреть список таблиц
- docker exec -it umny_kan_postgres psql -U postgres -d umny_kan_db // Подключиться к PostgreSQL внутри контейнера
- docker stop umny_kan_postgres // Остановить контейнер
- docker start umny_kan_postgres // Запустить остановленный контейнер
- docker rm umny_kan_postgres // Удалить контейнер 

## Текущий статус части бекэнда
1. Уже готово и работает:
- PostgreSQL в Docker, база данных umny_kan_db
- Все 7 таблиц созданы
- Тестовые данные загружены
- TypeORM подключён и настроен
- Все 7 сущностей с корректными типами
- Бэкенд запускается без ошибок, эндпоинт GET / работает
- Модуль Auth с эндпоинтом POST /auth/login (JWT + bcrypt)
- Модуль Dashboard с защищённым эндпоинтом GET /dashboard/data
- CORS настроен (фронт может стучаться к бэку)

3. В процессе (часть Мейсарош Карины):
- Написание API-функций для фронтенда (login, getDashboardData)
- Настройка axios и перехватчиков для токенов
- Интеграция API с фронтендом
 
