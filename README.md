# Умный канцеляр - автоматизация обработки входящих документов
## О проекте
Проект направлен на автоматизацию обработки входящих документов в транспортной компании: от загрузки файла и распознавания текста до классификации, извлечения ключевых данных и маршрутизации в нужное подразделение.

1. На Этапе 1 реализован базовый сценарий: авторизация пользователя, получение данных дашборда с бэкенда и их отображение на фронтенде.
2. На Этапе 2 реализован основной рабочий функционал: список документов с фильтрацией и пагинацией, карточка документа с полной информацией, расширенная база данных.

## Технологический стек
- **Бэкенд**: NestJS, TypeScript, TypeORM, PostgreSQL, JWT, bcrypt 
- **Фронтенд**: React, TypeScript, Vite, React Router, Axios 
- **База данных**: PostgreSQL (запускается в Docker) 
- **Стили**: CSS, CSS-переменные, адаптивная вёрстка 

## Запуск проекта

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

### 4. Запуск фронтенда
- cd frontend
- npm install
- npm run dev
- Фронтенд будет доступен на **http://localhost:3001**

## Тестовые данные для входа 
- **почта**: alexandra@umny-kan.ru; **пароль**: admin123
- **почта**: maria.n@umny-kan.ru; **пароль**: admin123
- **почта**: alina@umny-kan.ru; **пароль**: user123	
- **почта**: violetta@umny-kan.ru; **пароль**: user123	
- **почта**: egor@umny-kan.ru; **пароль**: user123	
- **почта**: karina@umny-kan.ru; **пароль**: user123
- **почта**: maria.m@umny-kan.ru; **пароль**: user123	

## Данные в БД
- 7 пользователей
- 15 документов
- 17 маршрутов
- 6 отделов
- 9 типов документов
- 6 категорий документов
- 15 источников документов
- 16 файлов документов
- 15 OCR-результатов
- 15 классификаций документов

## API эндпоинты

### 1. Авторизация
- POST /auth/login - вход в систему

### 2. Дашборд
- GET /dashboard/data - данные главной страницы

### 3. Документы
- GET /documents - список документов (фильтры: typeId, categoryId, status, page, limit)
- GET /documents/:id - карточка документа

### 4. Справочники
- GET /document-types - типы документов
- GET /document-categories - категории документов
- GET /departments - подразделения

Все эндпоинты кроме /auth/login защищены JWT.

## Логирование
Все запросы логируются в папку backend/logs/ в файлы по дням (logs-YYYY-MM-DD.json).
Каждая запись содержит: время (московское), модуль, тип запроса, URL, действие, статус, код и сообщение.

## Структура проекта 

### Корень проекта
- README.md - основная документация проекта
- .gitignore - игнорируемые файлы
  
### Backend (/backend)
#### 1. Конфигурация
- .env.example - пример переменных окружения 
- .env - переменные окружения (не в Git)
- .gitignore - игнорируемые файлы
- package.json - зависимости
- tsconfig.json - настройки TypeScript
#### 2. Исходный код (/src)
- main.ts - точка входа
- app.module.ts - главный модуль
- app.controller.ts - тестовый эндпоинт
- app.service.ts - тестовый сервис
- ##### Папка Auth (/auth)
  - auth.controller.ts - эндпоинт /auth/login
  - auth.service.ts - логика входа (JWT, bcrypt, логирование)
  - auth.module.ts - регистрация модуля
  - /dto/login.dto.ts - валидация email/пароля
  - /strategies/jwt.strategy.ts - проверка JWT-токенов
- ##### Папка Dashboard (/dashboard)
  - dashboard.controller.ts - эндпоинт /dashboard/data
  - dashboard.service.ts - логика дашборда
  - dashboard.module.ts - регистрация модуля
  - /dto/dashboard.dto.ts - типы ответа
- ##### Папка Documents (/documents) **(Этап 2)**
  - documents.controller.ts - эндпоинты /documents, /documents/:id
  - documents.service.ts - логика списка и карточки документа
  - documents.module.ts - регистрация модуля
  - /dto/document-card.dto.ts - DTO карточки
  - /dto/document-list.dto.ts - DTO списка
  - /dto/get-documents.dto.ts - DTO query-параметров
- ###### Папка Departments (/departments) **(Этап 2)**
  - departments.controller.ts - эндпоинт /departments
  - departments.service.ts - логика справочника отделов
  - departments.module.ts - регистрация модуля
  - /dto/department.dto.ts - DTO ответа
- ##### Папка Document Types (/document-types) **(Этап 2)**
  - document-types.controller.ts - эндпоинт /document-types
  - document-types.service.ts - логика справочника типов
  - document-types.module.ts  регистрация модуля
  - /dto/document-type.dto.ts - DTO ответа
- ##### Папка Document Categories (/document-categories) **(Этап 2)**
  - document-categories.controller.ts - эндпоинт /document-categories
  - document-categories.service.ts - логика справочника категорий
  - document-categories.module.ts - регистрация модуля
  - /dto/document-category.dto.ts - DTO ответа
- ##### Сущности БД (/entities)
  - user.entity.ts - пользователи
  - role.entity.ts - роли
  - department.entity.ts - отделы
  - document.entity.ts - документы
  - document-route.entity.ts - маршруты
  - document-type.entity.ts - типы документов
  - document-category.entity.ts - категории
  - document-source.entity.ts - источники документов **(Этап 2)**
  - document-file.entity.ts - файлы документов **(Этап 2)**
  - ocr-result.entity.ts - результаты OCR **(Этап 2)**
  - document-classification.entity.ts - классификации **(Этап 2)**
- ##### Логгер (/logger) **(Этап 2)**
  - app-logger.service.ts - сервис логирования
  - logger.module.ts - модуль логирования 
- ##### База данных (/db)
  - seed.sql - инициализация таблиц и тестовые данные **(обновлён для Этапа 2)**
#### 4. Документация
- README.md - инструкция по запуску части бекэнда 
#### 5. Тесты (/test)
- app.e2e-spec.ts - e2e тесты (пока заглушка)
#### 6. Загрузки (/uploads)
- /documents/ - файлы документов (по папкам с id документа)

### Frontend (/frontend)
#### 1. Конфигурация
- .gitignore - игнорируемые файлы
- package.json - зависимости
- tsconfig.json - настройки TypeScript
- vite.config.ts - настройки Vite
- index.html - точка входа
#### 2. Исходный код (/src)
- index.tsx - точка входа React
- App.tsx - корневой компонент 
- declarations.d.ts - объявления типов
- ##### Страницы (/pages)
  - LoginPage.tsx - страница входа (форма, API, запомнить меня)
  - DashboardPage.tsx - страница дашборда 
  - DocumentCardPage.tsx - карточка документа с вкладками **(Этап 2)**
- ##### Компоненты (/components)
  - Card.tsx - универсальная карточка
  - Table.tsx - универсальная таблица
  - Sidebar.tsx - боковое меню (сворачивание, навигация)
  - Header.tsx - верхняя панель (поиск, профиль)
  - ProtectedRoute.tsx - защита маршрутов
  - DropdownButton.tsx выпадающий список для фильтров **(Этап 2)**
  - Pagination.tsx - пагинация для списка **(Этап 2)**
  - Подстраницы дашборда (/SubPages)
    - MainMenu.tsx - главная страница (карточки, таблица, статусы) 
    - DocumentsListPage.tsx - список документов с фильтрами и пагинацией **(Этап 2)**
- ##### API сервисы (/services)
  - api.ts - axios, перехватчики, все API-функции  **(обновлён для Этапа 2)**
- ##### Типы (/types)
  - index.ts - TypeScript интерфейсы  **(обновлён для Этапа 2)**
- #### Стили (/styles)
  - global.css - глобальные переменные и стили
  - LoginPage.css - стили логина (с адаптивом)
  - Dashboard.css - стили дашборда (с адаптивом)
  - DocumentsListPage.css - стили списка документов (с адаптивом) **(Этап 2)**
  - DocumentCard.css — стили карточки документа (с адаптивом) **(Этап 2)**
- ##### Контексты (/contexts)
  - SidebarContexts.tsx - состояние сворачивания sidebar
#### 3. Публичные файлы (/public)
- icon.ico - иконка сайта
- /LoginPage_Images - изображения для страницы логина
- /DashboardPage_Images - изображения для дашборда
#### 4. Документация
- README.md - инструкция по запуску части фронтенда

### Папка docs 
#### 1. Дизайн-макеты (/design) 
  Содержит выгруженные из Figma макеты страниц и UI-правила:
  - Макеты страниц - логин (обычный и с ошибкой), дашборд, подразделения
  - UI-правила - компоненты, статусы, типографика, цветовая палитра
#### 2. Документация
- README.md - описание папки и ссылка на рабочий дизайн в Figma
  
## Что сделано на Этапе 1
### 1. Бэкенд
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

### 2. Фронтенд
- Локально поднятый фронтенд-проект (React + TypeScript + Vite)
- Экран логина с проверкой пользователя
- Валидация формы (email, пароль не менее 6 символов)
- Адаптив страницы логина
- Базовый layout после входа (sidebar, header, контентная часть)
- Дашборд с данными из API
- Карточки: всего документов, в обработке, требуют проверки
- Таблица последних документов
- Статусы маршрутов по отделам (с группировкой)
- Перевод статусов на русский язык
- Защита дашборда - перекидывает на логин без токена
- Работающая кнопка "Запомнить меня" (localStorage / sessionStorage)
- Обработка 401 - автоматический перекид на логин при протухании токена
- Состояния loading и error
- Кнопка "Повторить" при ошибке загрузки
-  Адаптив страницы дашборда

### 3. Инфраструктура
- TypeScript на всём проекте
- TypeORM с корректными связями (OneToMany, ManyToOne)
- Переменные окружения (.env)
- CSS-переменные и единый дизайн

## Что сделано на Этапе 2
### 1. Бэкенд
- 2 новых эндпоинта: GET /documents, GET /documents/:id
- 3 справочных эндпоинта: GET /document-types, GET /document-categories, GET /departments
- 4 новые таблицы: document_sources, document_files, ocr_results, document_classifications
- Фильтрация по typeId, categoryId, status в GET /documents
- Пагинация (page, limit) с возвратом total и totalPages
- Полная информация о документе: файлы, OCR, классификация, маршруты, источник
- Подгрузка связанных данных через relations TypeORM
- Валидация query-параметров через class-validator (GetDocumentsDto)
- Все новые эндпоинты защищены JWT
- Обновлён seed.sql: 15+ записей в каждой новой таблице
- Логирование всех новых эндпоинтов

### 2. Фронтенд
- Страница списка документов (/dashboard/documents):
  - Таблица с 8 колонками: Рег. номер, Тема, Отправитель, Дата, Тип, Категория, Статус, Отдел
  - Выпадающие фильтры: тип документа, категория, статус
  - Пагинация с кнопками «Назад/Вперёд»
  - Сброс фильтров
  - Кликабельные строки с переходом в карточку
  - Состояния: loading, error (с кнопкой «Повторить»), пустой список
  - Адаптив: 7 брейкпоинтов, горизонтальный скролл, скрытие колонок
- Страница карточки документа (/dashboard/documents/:id):
  - Две колонки: основная информация + вкладки
  - 4 вкладки: Обзор, Текст OCR, Сущности, История маршрутов
  - Отображение: общая информация, файлы, OCR-текст, классификация, источник, история маршрутов
  - Блок «О процентах»
  - Скачивание файлов
  - Состояния: loading, error, 404
  - Адаптив: 7 брейкпоинтов, горизонтальный скролл, вкладки с прокруткой
- Дашборд (обновления Этапа 2):
  - Единые цвета статусов через CSS-переменные
  - Регистрационный номер вместо ID в таблице
  - Статусы с цветными бейджами

## Команда
- Начинова Мария (Тимлид, Бэкенд-лид, БД, Эндпоинты /documents, Логирование)
- Москалева Александра	(Фронтенд-лид, Эндопоинты справочников, Роутинг)
- Нехланова Алина	Фронтенд (Логин, Карточка документа )
- Ефанов Егор	Фронтенд (Дашборд, Список документов)
- Мельникова Виолетта	Фронтенд (Адаптив логина и карточки документа)
- Мотовилова Мария	(Адаптив списка документов и дашборда)
- Мейсарош Карина	(API функции, типы, интеграция)

