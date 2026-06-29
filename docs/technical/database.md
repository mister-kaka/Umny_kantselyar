# Схема базы данных

## Общая информация

- СУБД: PostgreSQL с расширениями pgvector и pg_trgm
- Количество таблиц: 25
- Кодировка: UTF-8
- Временная зона: Europe/Moscow

## Таблицы

### 1. roles

Роли пользователей системы.

- id - SERIAL PRIMARY KEY
- name - VARCHAR(100) NOT NULL
- code - VARCHAR(50) UNIQUE NOT NULL

Связи:
- users.role_id - roles.id

### 2. users

Пользователи системы.

- id - SERIAL PRIMARY KEY
- full_name - VARCHAR(200) NOT NULL
- email - VARCHAR(100) UNIQUE NOT NULL
- password_hash - VARCHAR(255) NOT NULL
- role_id - INTEGER REFERENCES roles(id)
- department_id - INTEGER REFERENCES departments(id)
- status - VARCHAR(20) DEFAULT 'active'
- is_blocked - BOOLEAN DEFAULT FALSE
- password_reset_token - VARCHAR(255)
- password_reset_expires - TIMESTAMP
- avatar_url - VARCHAR(500)
- created_at - TIMESTAMP DEFAULT CURRENT_TIMESTAMP

Связи:
- users.role_id - roles.id
- users.department_id - departments.id
- documents.created_by - users.id
- document_comments.user_id - users.id
- notifications.user_id - users.id
- user_sessions.user_id - users.id
- login_history.user_id - users.id
- audit_log.user_id -> users.id
- user_notification_settings.user_id - users.id
- user_interface_settings.user_id - users.id
- search_log.user_id - users.id

### 3. departments

Подразделения компании.

- id - SERIAL PRIMARY KEY
- name - VARCHAR(100) NOT NULL
- code - VARCHAR(50) UNIQUE NOT NULL
- is_active - BOOLEAN DEFAULT TRUE

Связи:
- users.department_id - departments.id
- documents.current_department_id - departments.id
- document_routes.department_id - departments.id

### 4. document_types

Типы документов.

- id - SERIAL PRIMARY KEY
- name - VARCHAR(100) NOT NULL
- code - VARCHAR(50) UNIQUE NOT NULL
- description - TEXT

Связи:
- documents.document_type_id - document_types.id
- document_classifications.type_id - document_types.id

### 5. document_categories

Категории документов.

- id - SERIAL PRIMARY KEY
- name - VARCHAR(100) NOT NULL
- code - VARCHAR(50) UNIQUE NOT NULL
- description - TEXT

Связи:
- documents.category_id - document_categories.id
- document_classifications.category_id - document_categories.id

### 6. documents

Документы.

- id - SERIAL PRIMARY KEY
- registration_number - VARCHAR(50) UNIQUE NOT NULL
- title - VARCHAR(255) NOT NULL
- received_date - DATE
- uploaded_at - TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- document_type_id - INTEGER REFERENCES document_types(id)
- category_id - INTEGER REFERENCES document_categories(id)
- sender_name - VARCHAR(200) NOT NULL
- current_status - VARCHAR(50) DEFAULT 'in_review'
- confidence_score - DECIMAL(5,2)
- created_by - INTEGER REFERENCES users(id)
- created_at - TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- verified_at - TIMESTAMP
- routed_at - TIMESTAMP
- rejected_at - TIMESTAMP
- current_department_id - INTEGER REFERENCES departments(id)
- search_vector - tsvector
- embedding - vector(1536)

Ограничения:
- current_status IN ('in_review', 'pending_verification', 'verified', 'routed', 'rejected')

Связи:
- documents.document_type_id - document_types.id
- documents.category_id - document_categories.id
- documents.current_department_id - departments.id
- documents.created_by - users.id
- document_files.document_id - documents.id
- ocr_results.document_id - documents.id
- document_classifications.document_id - documents.id
- document_ai_results.document_id - documents.id
- document_routes.document_id - documents.id
- document_sources.document_id - documents.id
- document_comments.document_id - documents.id
- notifications.document_id - documents.id
- audit_log.document_id - documents.id
- search_log.clicked_document_id - documents.id

### 7. document_routes

Маршруты документов по отделам.

- id - SERIAL PRIMARY KEY
- document_id - INTEGER REFERENCES documents(id) ON DELETE CASCADE
- department_id - INTEGER REFERENCES departments(id)
- route_status - VARCHAR(50) NOT NULL
- route_reason - TEXT
- routed_at - TIMESTAMP DEFAULT CURRENT_TIMESTAMP

Ограничения:
- route_status IN ('in_review', 'pending_verification', 'verified', 'routed', 'rejected')

Связи:
- document_routes.document_id - documents.id
- document_routes.department_id - departments.id

### 8. document_sources

Источники документов.

- id - SERIAL PRIMARY KEY
- document_id - INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE
- source_type - VARCHAR(50) NOT NULL
- organization_name - VARCHAR(200)
- sender_name - VARCHAR(200)
- contact_info - VARCHAR(255)
- created_at - TIMESTAMP DEFAULT CURRENT_TIMESTAMP

Связи:
- document_sources.document_id - documents.id

### 9. document_files

Файлы документов.

- id - SERIAL PRIMARY KEY
- document_id - INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE
- file_name - VARCHAR(255) NOT NULL
- file_type - VARCHAR(50) NOT NULL
- file_path - VARCHAR(500) NOT NULL
- file_size - INTEGER NOT NULL
- uploaded_at - TIMESTAMP DEFAULT CURRENT_TIMESTAMP

Связи:
- document_files.document_id - documents.id

### 10. ocr_results

Результаты распознавания текста.

- id - SERIAL PRIMARY KEY
- document_id - INTEGER NOT NULL UNIQUE REFERENCES documents(id) ON DELETE CASCADE
- raw_text - TEXT
- normalized_text - TEXT
- language - VARCHAR(10) DEFAULT 'ru'
- ocr_confidence - DECIMAL(5,2)
- processed_at - TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- search_vector - tsvector
- embedding - vector(1536)

Связи:
- ocr_results.document_id - documents.id

### 11. document_classifications

Классификации документов.

- id - SERIAL PRIMARY KEY
- document_id - INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE
- type_id - INTEGER REFERENCES document_types(id)
- category_id - INTEGER REFERENCES document_categories(id)
- type_confidence - DECIMAL(5,2)
- category_confidence - DECIMAL(5,2)
- is_verified - BOOLEAN DEFAULT FALSE
- created_at - TIMESTAMP DEFAULT CURRENT_TIMESTAMP

Связи:
- document_classifications.document_id - documents.id
- document_classifications.type_id - document_types.id
- document_classifications.category_id - document_categories.id

### 12. ai_settings

Настройки AI-провайдера.

- id - SERIAL PRIMARY KEY
- provider_code - VARCHAR(50) NOT NULL
- model_name - VARCHAR(100) NOT NULL
- api_key - VARCHAR(500) NOT NULL
- base_url - VARCHAR(500)
- is_active - BOOLEAN DEFAULT TRUE
- updated_at - TIMESTAMP DEFAULT CURRENT_TIMESTAMP

### 13. document_ai_results

Результаты AI-анализа документов.

- id - SERIAL PRIMARY KEY
- document_id - INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE
- document_type_suggested - VARCHAR(200)
- category_suggested - VARCHAR(200)
- summary_text - TEXT
- department_suggested - VARCHAR(200)
- confidence_score - DECIMAL(5,2)
- provider_code - VARCHAR(50) NOT NULL
- model_name - VARCHAR(100) NOT NULL
- created_at - TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- embedding - vector(1536)
- extracted_date - DATE
- extracted_amount - DECIMAL(15,2)
- extracted_counterparty - VARCHAR(200)
- key_phrases - TEXT[]
- source_type_suggested - VARCHAR(50)
- source_organization_suggested - VARCHAR(200)
- source_sender_suggested - VARCHAR(200)
- source_contact_suggested - VARCHAR(500)

Связи:
- document_ai_results.document_id - documents.id

### 14. user_notification_settings

Настройки уведомлений пользователя.

- id - SERIAL PRIMARY KEY
- user_id - INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE
- new_document - BOOLEAN DEFAULT TRUE
- document_ready - BOOLEAN DEFAULT TRUE
- extract_error - BOOLEAN DEFAULT TRUE
- pending_verification - BOOLEAN DEFAULT TRUE
- routed_to_department - BOOLEAN DEFAULT TRUE
- rejected - BOOLEAN DEFAULT TRUE
- verified - BOOLEAN DEFAULT TRUE
- low_confidence - BOOLEAN DEFAULT FALSE
- password_changed - BOOLEAN DEFAULT TRUE
- profile_updated - BOOLEAN DEFAULT TRUE
- settings_changed - BOOLEAN DEFAULT FALSE
- new_login - BOOLEAN DEFAULT TRUE
- comment_added - BOOLEAN DEFAULT TRUE
- document_deleted - BOOLEAN DEFAULT FALSE
- reference_created - BOOLEAN DEFAULT TRUE
- reference_deleted - BOOLEAN DEFAULT TRUE
- updated_at - TIMESTAMP DEFAULT CURRENT_TIMESTAMP

Связи:
- user_notification_settings.user_id - users.id

### 15. user_interface_settings

Настройки интерфейса пользователя.

- id - SERIAL PRIMARY KEY
- user_id - INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE
- compact_view - BOOLEAN DEFAULT FALSE
- show_confidence - BOOLEAN DEFAULT TRUE
- default_page_limit - INTEGER DEFAULT 10
- theme - VARCHAR(20) DEFAULT 'light'
- updated_at - TIMESTAMP DEFAULT CURRENT_TIMESTAMP

Связи:
- user_interface_settings.user_id - users.id

### 16. login_history

История входов пользователей.

- id - SERIAL PRIMARY KEY
- user_id - INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
- ip_address - VARCHAR(45)
- user_agent - TEXT
- login_time - TIMESTAMP DEFAULT CURRENT_TIMESTAMP

Связи:
- login_history.user_id - users.id

### 17. route_templates

Шаблоны маршрутизации.

- id - SERIAL PRIMARY KEY
- name - VARCHAR(200) NOT NULL
- description - TEXT
- department_ids - INTEGER[] NOT NULL DEFAULT '{}'
- is_active - BOOLEAN DEFAULT TRUE
- created_at - TIMESTAMP DEFAULT CURRENT_TIMESTAMP

### 18. document_comments

Комментарии к документам.

- id - SERIAL PRIMARY KEY
- document_id - INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE
- user_id - INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
- text - TEXT NOT NULL
- created_at - TIMESTAMP DEFAULT CURRENT_TIMESTAMP

Связи:
- document_comments.document_id - documents.id
- document_comments.user_id - users.id

### 19. audit_log

Журнал действий пользователей.

- id - SERIAL PRIMARY KEY
- user_id - INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
- action - VARCHAR(100) NOT NULL
- document_id - INTEGER REFERENCES documents(id) ON DELETE SET NULL
- details - JSONB DEFAULT '{}'
- created_at - TIMESTAMP DEFAULT CURRENT_TIMESTAMP

Связи:
- audit_log.user_id - users.id
- audit_log.document_id - documents.id

### 20. notifications

Уведомления пользователей.

- id - SERIAL PRIMARY KEY
- user_id - INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
- type - VARCHAR(50) NOT NULL
- title - VARCHAR(255) NOT NULL
- message - TEXT
- document_id - INTEGER REFERENCES documents(id) ON DELETE SET NULL
- is_read - BOOLEAN DEFAULT FALSE
- created_at - TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP

Ограничения:
- type IN ('new_document', 'document_ready', 'ai_complete', 'extract_error', 'pending_verification', 'routed', 'rejected', 'comment_added', 'verified', 'low_confidence', 'route_error', 'overdue_verification', 'password_changed', 'profile_updated', 'settings_changed', 'new_login', 'document_deleted', 'reference_created', 'reference_deleted')

Связи:
- notifications.user_id - users.id
- notifications.document_id - documents.id

### 21. user_sessions

Сессии пользователей.

- id - SERIAL PRIMARY KEY
- user_id - INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
- token - VARCHAR(500) NOT NULL UNIQUE
- ip_address - VARCHAR(45)
- user_agent - TEXT
- created_at - TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- expires_at - TIMESTAMP NOT NULL

Связи:
- user_sessions.user_id - users.id

### 22. search_synonyms

Синонимы для улучшения поиска.

- id - SERIAL PRIMARY KEY
- term - VARCHAR(100) NOT NULL UNIQUE
- synonyms - TEXT[] NOT NULL
- created_by - VARCHAR(20) DEFAULT 'manual'
- usage_count - INTEGER DEFAULT 0
- created_at - TIMESTAMP DEFAULT CURRENT_TIMESTAMP

### 23. search_log

Лог поисковых запросов.

- id - SERIAL PRIMARY KEY
- query - TEXT NOT NULL
- results_count - INTEGER NOT NULL DEFAULT 0
- clicked_document_id - INTEGER REFERENCES documents(id) ON DELETE SET NULL
- user_id - INTEGER REFERENCES users(id) ON DELETE SET NULL
- source - VARCHAR(20) DEFAULT 'fast'
- created_at - TIMESTAMP DEFAULT CURRENT_TIMESTAMP

Связи:
- search_log.clicked_document_id - documents.id
- search_log.user_id - users.id

### 24. system_settings

Системные настройки приложения.

- id - SERIAL PRIMARY KEY
- key - VARCHAR(100) UNIQUE NOT NULL
- value - JSONB NOT NULL
- description - TEXT
- updated_at - TIMESTAMP DEFAULT CURRENT_TIMESTAMP

### 25. vector_embeddings

embeddings хранятся непосредственно в таблицах documents, ocr_results и document_ai_results через столбец embedding типа vector(1536). Отдельная таблица не создаётся.

## Индексы

- GIN-индексы для полнотекстового поиска (search_vector) на таблицах documents и ocr_results
- GIN-индексы с gin_trgm_ops для нечёткого поиска по тексту на таблицах documents, ocr_results и document_ai_results
- ivfflat-индексы для векторного поиска (embedding vector_cosine_ops) на таблицах documents, ocr_results и document_ai_results
- B-tree индексы для внешних ключей и часто фильтруемых полей (user_id, created_at, expires_at, token, login_time, document_id, type, current_status)

## Триггеры и функции

- update_document_search_vector - автоматически обновляет search_vector в таблице documents при вставке или обновлении. Включает title, sender_name, registration_number с использованием словарей russian и simple
- update_ocr_search_vector - автоматически обновляет search_vector в таблице ocr_results при вставке или обновлении. Включает normalized_text с использованием словарей russian и simple
- Оба триггера срабатывают BEFORE INSERT OR UPDATE

## ER-диаграмма

ER-диаграмма находится в файле database.erd. Для просмотра используйте расширение ERD Editor для VS Code.
