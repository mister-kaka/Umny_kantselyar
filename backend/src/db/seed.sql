-- Удаление старых таблицы (чтобы при повторном запуске не было ошибок)

DROP TABLE IF EXISTS search_log CASCADE;
DROP TABLE IF EXISTS search_synonyms CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS document_comments CASCADE;
DROP TABLE IF EXISTS route_templates CASCADE;
DROP TABLE IF EXISTS login_history CASCADE;
DROP TABLE IF EXISTS user_interface_settings CASCADE;
DROP TABLE IF EXISTS user_notification_settings CASCADE;
DROP TABLE IF EXISTS document_ai_results CASCADE;
DROP TABLE IF EXISTS ai_settings CASCADE;
DROP TABLE IF EXISTS document_classifications CASCADE;
DROP TABLE IF EXISTS ocr_results CASCADE;
DROP TABLE IF EXISTS document_files CASCADE;
DROP TABLE IF EXISTS document_sources CASCADE;
DROP TABLE IF EXISTS document_routes CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS document_categories CASCADE;
DROP TABLE IF EXISTS document_types CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- расширния

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- Таблицы этапа 1

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE document_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE document_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    department_id INTEGER REFERENCES departments(id),
    status VARCHAR(20) DEFAULT 'active',
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    received_date DATE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    document_type_id INTEGER REFERENCES document_types(id),
    category_id INTEGER REFERENCES document_categories(id),
    sender_name VARCHAR(200) NOT NULL,
    current_status VARCHAR(50) DEFAULT 'in_review',
    confidence_score DECIMAL(5,2),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    routed_at TIMESTAMP,
    rejected_at TIMESTAMP,
    current_department_id INTEGER REFERENCES departments(id),
    search_vector tsvector,
    embedding vector(1536)
    CONSTRAINT chk_current_status CHECK (current_status IN ('in_review', 'pending_verification', 'verified', 'routed', 'rejected'))
);

CREATE TABLE document_routes (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id),
    route_status VARCHAR(50) NOT NULL,
    route_reason TEXT,
    routed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

    CONSTRAINT chk_route_status CHECK (route_status IN ('in_review', 'pending_verification', 'verified', 'routed', 'rejected'))
);

-- Таблицы этапа 2

CREATE TABLE document_sources (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL,
    organization_name VARCHAR(200),
    sender_name VARCHAR(200),
    contact_info VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_files (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ocr_results (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
    raw_text TEXT,
    normalized_text TEXT,
    language VARCHAR(10) DEFAULT 'ru',
    ocr_confidence DECIMAL(5,2),
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    search_vector tsvector,
    embedding vector(1536)
);

CREATE TABLE document_classifications (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    type_id INTEGER REFERENCES document_types(id),
    category_id INTEGER REFERENCES document_categories(id),
    type_confidence DECIMAL(5,2),
    category_confidence DECIMAL(5,2),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблицы этапа 3

CREATE TABLE ai_settings (
    id SERIAL PRIMARY KEY,
    provider_code VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(500) NOT NULL,
    base_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_ai_results (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    document_type_suggested VARCHAR(200),
    category_suggested VARCHAR(200),
    summary_text TEXT,
    department_suggested VARCHAR(200),
    confidence_score DECIMAL(5,2),
    provider_code VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    embedding vector(1536),
    extracted_date DATE,
    extracted_amount DECIMAL(15,2),
    extracted_counterparty VARCHAR(200),
    key_phrases TEXT[],
    source_type_suggested VARCHAR(50),
    source_organization_suggested VARCHAR(200),
    source_sender_suggested VARCHAR(200),
    source_contact_suggested VARCHAR(500)
);

-- Таблицы этапа 5

CREATE TABLE user_notification_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    new_document BOOLEAN DEFAULT TRUE,
    ai_complete BOOLEAN DEFAULT TRUE,
    extract_error BOOLEAN DEFAULT TRUE,
    pending_verification BOOLEAN DEFAULT TRUE,
    routed_to_department BOOLEAN DEFAULT TRUE,
    low_confidence BOOLEAN DEFAULT FALSE,
    route_error BOOLEAN DEFAULT TRUE,
    overdue_verification BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_interface_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    compact_view BOOLEAN DEFAULT FALSE,
    show_confidence BOOLEAN DEFAULT TRUE,
    default_page_limit INTEGER DEFAULT 10,
    theme VARCHAR(20) DEFAULT 'light',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE login_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE route_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    department_ids INTEGER[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_comments (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE search_synonyms (
    id SERIAL PRIMARY KEY,
    term VARCHAR(100) NOT NULL UNIQUE,
    synonyms TEXT[] NOT NULL,
    created_by VARCHAR(20) DEFAULT 'manual',
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE search_log (
    id SERIAL PRIMARY KEY,
    query TEXT NOT NULL,
    results_count INTEGER NOT NULL DEFAULT 0,
    clicked_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    source VARCHAR(20) DEFAULT 'fast',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- индексы

CREATE INDEX IF NOT EXISTS idx_search_log_created_at ON search_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_log_user_id ON search_log (user_id);

CREATE INDEX IF NOT EXISTS idx_ocr_text_trgm ON ocr_results USING gin (normalized_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ai_summary_trgm ON document_ai_results USING gin (summary_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_docs_title_trgm ON documents USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_docs_sender_trgm ON documents USING gin (sender_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_documents_search_vector ON documents USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_ocr_search_vector ON ocr_results USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_ocr_embedding ON ocr_results USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_ai_results_embedding ON document_ai_results USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_search_synonyms_term ON search_synonyms (term);

-- функции и тригерры

CREATE OR REPLACE FUNCTION update_document_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('russian',
        coalesce(NEW.title, '') || ' ' ||
        coalesce(NEW.sender_name, '') || ' ' ||
        coalesce(NEW.registration_number, '')
    ) || to_tsvector('simple',
        coalesce(NEW.title, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_ocr_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('russian',
        coalesce(NEW.normalized_text, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_documents_search_vector ON documents;
CREATE TRIGGER trg_documents_search_vector
    BEFORE INSERT OR UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_document_search_vector();

DROP TRIGGER IF EXISTS trg_ocr_search_vector ON ocr_results;
CREATE TRIGGER trg_ocr_search_vector
    BEFORE INSERT OR UPDATE ON ocr_results
    FOR EACH ROW EXECUTE FUNCTION update_ocr_search_vector();

-- тестовые данные

INSERT INTO roles (name, code) VALUES 
('Администратор', 'admin'),
('Пользователь', 'user');

INSERT INTO departments (name, code, is_active) VALUES 
('Управление', 'management', TRUE),
('Технический отдел', 'tech', TRUE),
('Бухгалтерия', 'accounting', TRUE),
('Отдел закупок', 'procurement', TRUE),
('Юридический отдел', 'legal', TRUE),
('Отдел кадров', 'hr', TRUE);

INSERT INTO document_types (name, code, description) VALUES 
('Договор', 'contract', 'Договор с контрагентом'),
('Письмо', 'letter', 'Официальное письмо'),
('Обращение', 'appeal', 'Обращение гражданина или организации'),
('Уведомление', 'notice', 'Уведомление о чём-либо'),
('Счёт', 'invoice', 'Счёт на оплату'),
('Акт', 'act', 'Акт выполненных работ или приёма-передачи'),
('Соглашение', 'agreement', 'Соглашение между сторонами'),
('Счёт-фактура', 'invoice_tax', 'Налоговый документ'),
('Предписание', 'prescription', 'Предписание от контролирующих органов');

INSERT INTO document_categories (name, code, description) VALUES 
('Кадровые вопросы', 'hr_issues', 'Документы, связанные с персоналом'),
('Техническое обслуживание', 'maintenance', 'Документы по обслуживанию техники'),
('Поставка оборудования', 'supply', 'Документы по закупке и поставке оборудования'),
('Административная переписка', 'admin_correspondence', 'Внутренняя и внешняя переписка'),
('Юридические документы', 'legal_docs', 'Документы, требующие юридической оценки'),
('Финансовые документы', 'financial_docs', 'Документы, связанные с финансами и оплатами');

INSERT INTO users (full_name, email, password_hash, role_id, department_id, status) VALUES 
('Москалева Александра', 'alexandra@umny-kan.ru', '$2b$10$G70RruFQNq18oV58y7MLoeCtiIxA2YmYRNWGrXwhML3h80cia18V6', 1, 1, 'active'),
('Нехланова Алина', 'alina@umny-kan.ru', '$2b$10$Ipreo3ft1R7xgknwKeAl.uhN/wUQXDqqgfe4YGLB4MCYaBSyy9j7G', 2, 5, 'active'),
('Мельникова Виолетта', 'violetta@umny-kan.ru', '$2b$10$Ipreo3ft1R7xgknwKeAl.uhN/wUQXDqqgfe4YGLB4MCYaBSyy9j7G', 2, 2, 'active'),
('Ефанов Егор', 'egor@umny-kan.ru', '$2b$10$Ipreo3ft1R7xgknwKeAl.uhN/wUQXDqqgfe4YGLB4MCYaBSyy9j7G', 2, 2, 'active'),
('Мейсарош Карина', 'karina@umny-kan.ru', '$2b$10$Ipreo3ft1R7xgknwKeAl.uhN/wUQXDqqgfe4YGLB4MCYaBSyy9j7G', 2, 4, 'active'),
('Мотовилова Мария', 'maria.m@umny-kan.ru', '$2b$10$Ipreo3ft1R7xgknwKeAl.uhN/wUQXDqqgfe4YGLB4MCYaBSyy9j7G', 2, 6, 'active'),
('Начинова Мария', 'maria.n@umny-kan.ru', '$2b$10$G70RruFQNq18oV58y7MLoeCtiIxA2YmYRNWGrXwhML3h80cia18V6', 1, 1, 'active');

INSERT INTO documents (registration_number, title, received_date, document_type_id, category_id, sender_name, current_status, confidence_score, created_by, verified_at, routed_at, rejected_at, current_department_id) VALUES 
('ВХ-2026-001', 'Договор на поставку оборудования', '2026-04-01', 1, 3, 'ООО "ТехноПоставка"', 'in_review', 0.95, 1, NULL, NULL, NULL, 4),
('ВХ-2026-002', 'Письмо о согласовании графика работ', '2026-04-02', 2, 4, 'АО "СтройИнвест"', 'verified', 0.87, 2, '2026-04-02 14:00:00', NULL, NULL, NULL),
('ВХ-2026-003', 'Обращение по поводу технической неисправности', '2026-04-03', 3, 2, 'ООО "Автопарк"', 'pending_verification', 0.92, 3, NULL, NULL, NULL, 2),
('ВХ-2026-004', 'Уведомление о проверке', '2026-04-04', 4, 5, 'Ространснадзор', 'pending_verification', 0.78, 4, NULL, NULL, NULL, NULL),
('ВХ-2026-005', 'Счёт на оплату топлива', '2026-04-05', 5, 6, 'ООО "Лукойл"', 'routed', 0.99, 5, '2026-04-05 16:00:00', '2026-04-06 10:00:00', NULL, 3),
('ВХ-2026-006', 'Акт приёма-передачи оборудования', '2026-04-06', 6, 3, 'ООО "ТехноПоставка"', 'routed', 0.88, 6, '2026-04-06 15:00:00', '2026-04-07 09:00:00', NULL, 4),
('ВХ-2026-007', 'Соглашение о конфиденциальности', '2026-04-07', 7, 5, 'ИП Петров', 'pending_verification', 0.91, 7, NULL, NULL, NULL, 5),
('ВХ-2026-008', 'Счёт-фактура за март', '2026-04-07', 8, 6, 'ООО "ЭнергоСбыт"', 'in_review', 0.85, 1, NULL, NULL, NULL, NULL),
('ВХ-2026-009', 'Предписание об устранении нарушений', '2026-04-08', 9, 5, 'ГИБДД', 'verified', 0.94, 2, '2026-04-08 12:00:00', NULL, NULL, 5),
('ВХ-2026-010', 'Договор аренды помещения', '2026-04-08', 1, 5, 'ООО "ТрансСтрой"', 'rejected', 0.82, 3, NULL, NULL, '2026-04-09 10:00:00', NULL),
('ВХ-2026-011', 'Письмо о продлении гарантии', '2026-04-09', 2, 4, 'ООО "ТехноПоставка"', 'pending_verification', 0.96, 4, NULL, NULL, NULL, NULL),
('ВХ-2026-012', 'Обращение сотрудника по кадровому вопросу', '2026-04-09', 3, 1, 'Иванова Е.С.', 'pending_verification', 0.89, 5, NULL, NULL, NULL, 6),
('ВХ-2026-013', 'Уведомление о повышении цен', '2026-04-10', 4, 6, 'ООО "Поставщик"', 'in_review', 0.77, 6, NULL, NULL, NULL, NULL),
('ВХ-2026-014', 'Счёт на оплату услуг связи', '2026-04-10', 5, 6, 'ПАО "Ростелеком"', 'verified', 0.98, 7, '2026-04-11 09:00:00', NULL, NULL, NULL),
('ВХ-2026-015', 'Акт сверки взаимных расчётов', '2026-04-11', 6, 6, 'ООО "ТрансЛайн"', 'routed', 0.84, 1, '2026-04-10 16:00:00', '2026-04-11 14:00:00', NULL, 3);

INSERT INTO document_routes (document_id, department_id, route_status, route_reason) VALUES 
(5, 3, 'routed', 'Счёт оплачен'),
(6, 4, 'routed', 'Акт подписан, оборудование принято'),
(10, NULL, 'rejected', 'Договор аренды согласован'),
(15, 3, 'routed', 'Акт сверки подписан');

INSERT INTO document_sources (document_id, source_type, organization_name, sender_name, contact_info) VALUES
(1, 'organization', 'ООО "ТехноПоставка"', 'Менеджер Начинова М.', 'г. Москва, ул. Промышленная, д. 15, тел: +7 (495) 123-45-61, email: maria.n@umny-kan.ru'),
(2, 'organization', 'АО "СтройИнвест"', 'Директор Москалева А.', 'г. Санкт-Петербург, Невский пр., д. 100, email: alexandra@umny-kan.ru'),
(3, 'organization', 'ООО "Автопарк"', 'Начальник автопарка Ефанов Е.', 'г. Казань, ул. Вокзальная, д. 5, тел: +7 (495) 123-45-62, email: egor@umny-kan.ru'),
(4, 'organization', 'Ространснадзор', 'Инспектор Мейсарош К.', 'г. Москва, ул. Рождественка, д. 1, тел: +7 (495) 123-45-63, email: karina@umny-kan.ru'),
(5, 'organization', 'ООО "Лукойл"', 'Менеджер Мотовилова М.', 'г. Москва, ул. Сретенка, д. 12, email: maria.m@umny-kan.ru'),
(6, 'organization', 'ООО "ТехноПоставка"', 'Менеджер Нехланова А.', 'г. Москва, ул. Промышленная, д. 15, тел: +7 (495) 123-45-64, email: alina@umny-kan.ru'),
(7, 'individual', 'ИП Мельникова', 'Мельникова В.', 'г. Москва, ул. Тверская, д. 10, тел: +7 (495) 123-45-65, email: violetta@umny-kan.ru'),
(8, 'organization', 'ООО "ЭнергоСбыт"', 'Бухгалтер Мейсарош К.', 'г. Москва, ул. Электрозаводская, д. 20, email: karina@umny-kan.ru'),
(9, 'organization', 'ГИБДД', 'Инспектор Начинова М.', 'г. Москва, ул. Садовая-Самотёчная, д. 1, email: maria.n@umny-kan.ru'),
(10, 'organization', 'ООО "ТрансСтрой"', 'Директор Москалева А.', 'г. Москва, ул. Строителей, д. 5, email: alexandra@umny-kan.ru'),
(11, 'organization', 'ООО "ТехноПоставка"', 'Менеджер Ефанов Е.', 'г. Москва, ул. Промышленная, д. 15, тел: +7 (495) 123-45-66, email: egor@umny-kan.ru'),
(12, 'individual', 'Иванова Е.С.', 'Мотовилова М.', 'тел: +7 (495) 123-45-67, email: maria.m@umny-kan.ru'),
(13, 'organization', 'ООО "Поставщик"', 'Коммерческий директор Нехланова А.', 'г. Москва, ул. Поставщиков, д. 8, тел: +7 (495) 123-45-68, email: alina@umny-kan.ru'),
(14, 'organization', 'ПАО "Ростелеком"', 'Менеджер Мельникова В.', 'г. Москва, ул. Гончарная, д. 30, email: violetta@umny-kan.ru'),
(15, 'organization', 'ООО "ТрансЛайн"', 'Главный бухгалтер Начинова М.', 'г. Новосибирск, ул. Деповская, д. 8, тел: +7 (495) 123-45-69, email: maria.n@umny-kan.ru');

INSERT INTO document_files (document_id, file_name, file_type, file_path, file_size) VALUES
(1, 'dogovor_postavka.pdf', 'pdf', '/uploads/documents/1/dogovor_postavka.pdf', 245760),
(1, 'specifikaciya.pdf', 'pdf', '/uploads/documents/1/specifikaciya.pdf', 102400),
(2, 'pisemo_soglasovanie.pdf', 'pdf', '/uploads/documents/2/pisemo_soglasovanie.pdf', 89000),
(3, 'zhaloba_avtopark.pdf', 'pdf', '/uploads/documents/3/zhaloba_avtopark.pdf', 156000),
(4, 'uvedomlenie_proverka.pdf', 'pdf', '/uploads/documents/4/uvedomlenie_proverka.pdf', 67000),
(5, 'schet_toplivo.pdf', 'pdf', '/uploads/documents/5/schet_toplivo.pdf', 45000),
(6, 'akt_priema.pdf', 'pdf', '/uploads/documents/6/akt_priema.pdf', 234000),
(7, 'soglashenie_conf.pdf', 'pdf', '/uploads/documents/7/soglashenie_conf.pdf', 123000),
(8, 'schet_faktura.pdf', 'pdf', '/uploads/documents/8/schet_faktura.pdf', 56000),
(9, 'predpisanie.pdf', 'pdf', '/uploads/documents/9/predpisanie.pdf', 89000),
(10, 'dogovor_arendy.pdf', 'pdf', '/uploads/documents/10/dogovor_arendy.pdf', 345000),
(11, 'pisemo_garantiya.pdf', 'pdf', '/uploads/documents/11/pisemo_garantiya.pdf', 78000),
(12, 'obrashenie_kadry.pdf', 'pdf', '/uploads/documents/12/obrashenie_kadry.pdf', 123000),
(13, 'uvedomlenie_ceny.pdf', 'pdf', '/uploads/documents/13/uvedomlenie_ceny.pdf', 34000),
(14, 'schet_svyaz.pdf', 'pdf', '/uploads/documents/14/schet_svyaz.pdf', 29000),
(15, 'akt_sverki.pdf', 'pdf', '/uploads/documents/15/akt_sverki.pdf', 187000);

INSERT INTO ocr_results (document_id, raw_text, normalized_text, language, ocr_confidence, processed_at) VALUES
(1, 'Договор на поставку оборудования г. Москва 01.04.2026. Стороны: ООО "ТехноПоставка" и Умный Канцеляр. Предмет: поставка оборудования на сумму 2 500 000 руб.', 'Договор на поставку оборудования г. Москва 01.04.2026. Стороны: ООО "ТехноПоставка" и Умный Канцеляр. Предмет: поставка оборудования на сумму 2 500 000 руб.', 'ru', 0.985, CURRENT_TIMESTAMP),
(2, 'Письмо о согласовании графика работ. Просим согласовать график работ на апрель-май 2026 года.', 'Письмо о согласовании графика работ. Просим согласовать график работ на апрель-май 2026 года.', 'ru', 0.952, CURRENT_TIMESTAMP),
(3, 'Обращение по поводу технической неисправности автобуса госномер А123ВВ. Просим провести ремонт в кратчайшие сроки.', 'Обращение по поводу технической неисправности автобуса госномер А123ВВ. Просим провести ремонт в кратчайшие сроки.', 'ru', 0.928, CURRENT_TIMESTAMP),
(4, 'Уведомление о проведении проверки соблюдения транспортного законодательства. Дата проверки: 15.04.2026.', 'Уведомление о проведении проверки соблюдения транспортного законодательства. Дата проверки: 15.04.2026.', 'ru', 0.963, CURRENT_TIMESTAMP),
(5, 'Счёт на оплату топлива №123 от 05.04.2026 на сумму 45 000 руб. Оплатить до 20.04.2026.', 'Счёт на оплату топлива №123 от 05.04.2026 на сумму 45 000 руб. Оплатить до 20.04.2026.', 'ru', 0.991, CURRENT_TIMESTAMP),
(6, 'Акт приёма-передачи оборудования. Оборудование принято без замечаний. Дата: 06.04.2026.', 'Акт приёма-передачи оборудования. Оборудование принято без замечаний. Дата: 06.04.2026.', 'ru', 0.945, CURRENT_TIMESTAMP),
(7, 'Соглашение о конфиденциальности. Стороны обязуются не разглашать коммерческую тайну и персональные данные.', 'Соглашение о конфиденциальности. Стороны обязуются не разглашать коммерческую тайну и персональные данные.', 'ru', 0.972, CURRENT_TIMESTAMP),
(8, 'Счёт-фактура №45 от 07.04.2026 на сумму 12 500 руб. за электроэнергию за март 2026 года.', 'Счёт-фактура №45 от 07.04.2026 на сумму 12 500 руб. за электроэнергию за март 2026 года.', 'ru', 0.980, CURRENT_TIMESTAMP),
(9, 'Предписание об устранении нарушений. Срок устранения: до 30.04.2026. Нарушения: превышение скорости, отсутствие тахографа.', 'Предписание об устранении нарушений. Срок устранения: до 30.04.2026. Нарушения: превышение скорости, отсутствие тахографа.', 'ru', 0.915, CURRENT_TIMESTAMP),
(10, 'Договор аренды помещения. Предмет: аренда офисного помещения. Срок: 11 месяцев. Сумма: 50 000 руб./мес.', 'Договор аренды помещения. Предмет: аренда офисного помещения. Срок: 11 месяцев. Сумма: 50 000 руб./мес.', 'ru', 0.968, CURRENT_TIMESTAMP),
(11, 'Письмо о продлении гарантии. Гарантия на оборудование продлена до 31.12.2026.', 'Письмо о продлении гарантии. Гарантия на оборудование продлена до 31.12.2026.', 'ru', 0.975, CURRENT_TIMESTAMP),
(12, 'Обращение сотрудника по кадровому вопросу. Прошу пересчитать заработную плату за март 2026 года.', 'Обращение сотрудника по кадровому вопросу. Прошу пересчитать заработную плату за март 2026 года.', 'ru', 0.895, CURRENT_TIMESTAMP),
(13, 'Уведомление о повышении цен. Новые цены действуют с 01.05.2026. Повышение составляет 15%.', 'Уведомление о повышении цен. Новые цены действуют с 01.05.2026. Повышение составляет 15%.', 'ru', 0.775, CURRENT_TIMESTAMP),
(14, 'Счёт на оплату услуг связи №678 от 10.04.2026 на сумму 8 500 руб. за интернет и телефонию.', 'Счёт на оплату услуг связи №678 от 10.04.2026 на сумму 8 500 руб. за интернет и телефонию.', 'ru', 0.988, CURRENT_TIMESTAMP),
(15, 'Акт сверки взаимных расчётов. Сальдо: 0 руб. Расчёты подтверждены.', 'Акт сверки взаимных расчётов. Сальдо: 0 руб. Расчёты подтверждены.', 'ru', 0.845, CURRENT_TIMESTAMP);

INSERT INTO document_classifications (document_id, type_id, category_id, type_confidence, category_confidence, is_verified) VALUES
(1, 1, 3, 0.952, 0.925, TRUE),
(2, 2, 4, 0.887, 0.853, TRUE),
(3, 3, 2, 0.924, 0.901, FALSE),
(4, 4, 5, 0.785, 0.820, FALSE),
(5, 5, 6, 0.990, 0.982, TRUE),
(6, 6, 3, 0.912, 0.895, TRUE),
(7, 7, 5, 0.948, 0.923, FALSE),
(8, 8, 6, 0.965, 0.950, TRUE),
(9, 9, 5, 0.852, 0.837, FALSE),
(10, 1, 5, 0.895, 0.872, TRUE),
(11, 2, 4, 0.972, 0.945, FALSE),
(12, 3, 1, 0.885, 0.860, TRUE),
(13, 4, 6, 0.772, 0.805, FALSE),
(14, 5, 6, 0.985, 0.972, TRUE),
(15, 6, 6, 0.855, 0.830, TRUE);

-- api_key (пока тестовый бесплатный ключ от OpenRouter)
INSERT INTO ai_settings (provider_code, model_name, api_key, base_url, is_active) VALUES
('deepseek', 'deepseek/deepseek-chat', '4558000b00d96913b37183c820b702dc:9b3d3789052db89c280d580d7b3d4c4adfaa6a90ed8356b407e67883d9a60f595b0cf04b586cfea26a76a62a199180d888d54d4bb5bd21b7117223e4df593feaba108edbff83660b1078b8ed02253af8', 'https://openrouter.ai/api/v1', TRUE);

INSERT INTO user_notification_settings (user_id, new_document, ai_complete, extract_error, pending_verification, routed_to_department, low_confidence, route_error, overdue_verification) VALUES
(1, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(2, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, FALSE),
(3, TRUE, TRUE, FALSE, TRUE, TRUE, FALSE, TRUE, FALSE),
(4, TRUE, FALSE, TRUE, FALSE, TRUE, FALSE, FALSE, FALSE),
(5, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(6, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE, TRUE, FALSE),
(7, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE);

INSERT INTO user_interface_settings (user_id, compact_view, show_confidence, default_page_limit, theme) VALUES
(1, FALSE, TRUE, 20, 'light'),
(2, FALSE, TRUE, 10, 'light'),
(3, TRUE, FALSE, 10, 'light'),
(4, FALSE, TRUE, 50, 'dark'),
(5, FALSE, TRUE, 20, 'light'),
(6, FALSE, TRUE, 10, 'light'),
(7, FALSE, TRUE, 20, 'light');

INSERT INTO login_history (user_id, ip_address, user_agent, login_time) VALUES
(1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0', '2026-04-15 08:30:00'),
(1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0', '2026-04-16 09:15:00'),
(2, '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', '2026-04-15 08:45:00'),
(3, '192.168.1.102', 'Mozilla/5.0 (X11; Linux x86_64) Firefox/121.0', '2026-04-15 10:00:00'),
(1, '10.0.0.1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile/15E148', '2026-04-17 07:20:00'),
(5, '192.168.1.105', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/120.0.0.0', '2026-04-15 11:30:00'),
(7, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0', '2026-04-17 08:00:00');

INSERT INTO route_templates (name, description, department_ids, is_active) VALUES
('Стандартная проверка договора', 'Юридический отдел → Отдел закупок', '{5, 4}', TRUE),
('Финансовый документ', 'Бухгалтерия', '{3}', TRUE),
('Техническое обращение', 'Технический отдел', '{2}', TRUE),
('Кадровый вопрос', 'Отдел кадров', '{6}', TRUE),
('Административная переписка', 'Управление → Юридический отдел', '{1, 5}', TRUE),
('Предписание контролирующего органа', 'Юридический отдел → Технический отдел → Управление', '{5, 2, 1}', TRUE);

INSERT INTO document_comments (document_id, user_id, text, created_at) VALUES
(1, 1, 'Договор требует срочного согласования, поставка уже задерживается.', '2026-04-01 14:00:00'),
(1, 5, 'Проверил юридическую часть - требуется доработка пункта 4.2.', '2026-04-02 10:30:00'),
(1, 1, 'Доработал пункт 4.2, отправил контрагенту на согласование.', '2026-04-02 16:00:00'),
(3, 2, 'Автобус А123ВВ уже третий раз за месяц ломается. Нужна комплексная диагностика.', '2026-04-03 11:00:00'),
(3, 4, 'Диагностика запланирована на 08.04.2026.', '2026-04-04 09:00:00'),
(9, 1, 'Предписание ГИБДД - срок до 30.04. Нужно срочно устранить нарушения.', '2026-04-08 14:00:00'),
(9, 5, 'Готовлю ответ по юридической части. Техотделу - заняться тахографом.', '2026-04-09 10:00:00'),
(12, 6, 'Запросила расчётный лист за март у бухгалтерии.', '2026-04-09 15:30:00'),
(12, 3, 'Расчётный лист готов, передала сотруднику.', '2026-04-10 12:00:00');

INSERT INTO audit_log (user_id, action, document_id, details, created_at) VALUES
(1, 'document_upload', 1, '{"fileName": "dogovor_postavka.pdf", "fileSize": 245760}', '2026-04-01 13:30:00'),
(1, 'ai_analysis_start', 1, '{"provider": "deepseek", "model": "deepseek/deepseek-chat"}', '2026-04-01 13:35:00'),
(1, 'ai_analysis_complete', 1, '{"confidence": 0.95}', '2026-04-01 13:37:00'),
(1, 'document_verify', 1, '{"typeId": 1, "categoryId": 3, "departmentId": 4}', '2026-04-01 14:00:00'),
(2, 'document_upload', 3, '{"fileName": "zhaloba_avtopark.pdf", "fileSize": 156000}', '2026-04-03 10:00:00'),
(2, 'ai_analysis_complete', 3, '{"confidence": 0.92}', '2026-04-03 10:03:00'),
(5, 'document_route', 1, '{"departmentId": 5, "reason": "Юридическая проверка договора"}', '2026-04-02 09:00:00'),
(7, 'document_delete', NULL, '{"reason": "Дубликат документа ВХ-2026-005"}', '2026-04-12 16:00:00'),
(1, 'settings_update', NULL, '{"section": "ai", "provider": "deepseek"}', '2026-04-15 09:00:00'),
(3, 'login', NULL, '{"ip": "192.168.1.102"}', '2026-04-15 10:00:00');

INSERT INTO notifications (user_id, type, title, message, document_id, is_read, created_at) VALUES
(1, 'new_document', 'Новый документ загружен', 'Договор на поставку оборудования (ВХ-2026-001)', 1, TRUE, '2026-04-01 13:30:00'),
(1, 'ai_complete', 'AI-анализ завершён', 'Документ ВХ-2026-001: Договор / Поставка оборудования / Уверенность 95%', 1, TRUE, '2026-04-01 13:37:00'),
(1, 'pending_verification', 'Документ требует проверки', 'ВХ-2026-001 ожидает проверки оператором', 1, FALSE, '2026-04-01 13:38:00'),
(2, 'new_document', 'Новый документ загружен', 'Обращение по технической неисправности (ВХ-2026-003)', 3, FALSE, '2026-04-03 10:00:00'),
(4, 'new_document', 'Новый документ загружен', 'Уведомление о проверке (ВХ-2026-004)', 4, FALSE, '2026-04-04 09:00:00'),
(5, 'ai_complete', 'AI-анализ завершён', 'Документ ВХ-2026-013: низкая уверенность (78%)', 13, FALSE, '2026-04-10 11:00:00'),
(1, 'overdue_verification', 'Просроченная проверка', 'Документ ВХ-2026-009 ожидает проверки более 24 часов', 9, FALSE, '2026-04-10 08:00:00'),
(7, 'routed_to_department', 'Документ направлен в отдел', 'ВХ-2026-015 направлен в Бухгалтерию', 15, TRUE, '2026-04-11 14:00:00');

-- синонимы для поиска

-- Аббревиатуры госорганов
INSERT INTO search_synonyms (term, synonyms) VALUES
('гибдд', ARRAY['госавтоинспекция', 'гаи', 'дорожная инспекция', 'госавтонадзор']),
('мчс', ARRAY['министерство чрезвычайных ситуаций', 'пожарная служба', 'пожарные']),
('фнс', ARRAY['налоговая', 'федеральная налоговая служба', 'ифнс', 'налоговая инспекция']),
('роспотребнадзор', ARRAY['санэпидемстанция', 'сэс', 'потребнадзор']),
('ростехнадзор', ARRAY['технадзор', 'технический надзор']),
('мвд', ARRAY['полиция', 'министерство внутренних дел', 'увд', 'отдел полиции']),
('фас', ARRAY['антимонопольная служба', 'антимонопольный комитет']),
('фсс', ARRAY['фонд социального страхования', 'соцстрах']),
('пфр', ARRAY['пенсионный фонд', 'сфр', 'социальный фонд']),
('фтс', ARRAY['таможня', 'таможенная служба', 'федеральная таможенная служба']),
('роскомнадзор', ARRAY['ркн', 'надзор за связью']);

-- Профессиональный сленг
INSERT INTO search_synonyms (term, synonyms) VALUES
('первичка', ARRAY['первичный документ', 'акт', 'накладная', 'счёт-фактура', 'квитанция', 'ордер']),
('счф', ARRAY['счёт-фактура', 'счет-фактура', 'налоговый документ']),
('платёжка', ARRAY['платёжное поручение', 'платёж', 'оплата', 'квитанция об оплате']),
('акт сверки', ARRAY['сверка', 'взаимозачёт', 'сальдо', 'акт взаимных расчётов']),
('закрывашка', ARRAY['закрывающий документ', 'акт', 'закрытие', 'завершающий акт']),
('допник', ARRAY['дополнительное соглашение', 'доп соглашение', 'приложение к договору']),
('спецификация', ARRAY['спека', 'приложение', 'перечень', 'спецификация к договору']),
('просрочка', ARRAY['просроченный', 'просрочка платежа', 'задолженность', 'долг']),
('дебиторка', ARRAY['дебиторская задолженность', 'дебитор', 'должник']),
('кредиторка', ARRAY['кредиторская задолженность', 'кредитор', 'долг перед']),
('аванс', ARRAY['предоплата', 'предварительная оплата', 'задаток']),
('тендер', ARRAY['конкурс', 'аукцион', 'закупка', 'торги', 'госзакупка']),
('техзадание', ARRAY['тз', 'техническое задание', 'задание', 'спецификация требований']);

-- Профессиональные сокращения и аббревиатуры
INSERT INTO search_synonyms (term, synonyms) VALUES
('дтп', ARRAY['авария', 'дорожно-транспортное происшествие', 'столкновение', 'происшествие', 'наезд']),
('осаго', ARRAY['страховка', 'автогражданка', 'страхование', 'полис']),
('каско', ARRAY['страховка', 'страхование', 'полис']),
('ндс', ARRAY['налог', 'налог на добавленную стоимость']),
('кпп', ARRAY['код причины постановки', 'реквизиты']),
('инн', ARRAY['идентификационный номер', 'реквизиты']),
('бик', ARRAY['банковский идентификационный код', 'реквизиты']),
('снилс', ARRAY['страховой номер', 'пенсионный']),
('то', ARRAY['техосмотр', 'технический осмотр', 'диагностика']),
('гсм', ARRAY['горюче-смазочные материалы', 'топливо', 'бензин', 'дизель']),
('дс', ARRAY['дополнительное соглашение', 'допник']),
('тз', ARRAY['техническое задание', 'техзадание']),
('кп', ARRAY['коммерческое предложение', 'оферта']),
('коап', ARRAY['административный кодекс', 'штраф']),
('пдд', ARRAY['правила дорожного движения', 'нарушение']),
('ж/д', ARRAY['железная дорога', 'жд', 'ржд']),
('мкад', ARRAY['московская кольцевая', 'кольцевая дорога']),
('метро', ARRAY['метрополитен', 'подземка', 'станция']),
('электродепо', ARRAY['депо', 'отстойник', 'ремонтное депо']);

-- Типы документов с латинскими версиями
INSERT INTO search_synonyms (term, synonyms) VALUES
('жалоба', ARRAY['заявление', 'обращение', 'претензия', 'рекламация']),
('zhaloba', ARRAY['жалоба', 'заявление', 'обращение', 'претензия']),
('договор', ARRAY['контракт', 'соглашение', 'contract', 'agreement', 'договор подряда', 'договор поставки', 'договор аренды']),
('dogovor', ARRAY['договор', 'контракт', 'соглашение', 'contract', 'agreement']),
('акт', ARRAY['акт приёма', 'акт сдачи', 'акт выполненных работ', 'акт приёма-передачи', 'акт сверки']),
('akt', ARRAY['акт', 'act']),
('счёт', ARRAY['счет', 'инвойс', 'invoice', 'счёт на оплату', 'квитанция', 'счёт-фактура']),
('schet', ARRAY['счёт', 'счет', 'invoice', 'квитанция']),
('письмо', ARRAY['послание', 'корреспонденция', 'уведомление', 'извещение', 'letter']),
('pisemo', ARRAY['письмо', 'letter', 'корреспонденция']),
('претензия', ARRAY['жалоба', 'рекламация', 'требование', 'complaint']),
('заявка', ARRAY['заявление', 'обращение', 'запрос', 'request', 'application', 'ходатайство']),
('приказ', ARRAY['распоряжение', 'указ', 'постановление', 'order', 'директива']),
('prikaz', ARRAY['приказ', 'order', 'распоряжение']),
('протокол', ARRAY['протокол совещания', 'протокол собрания', 'протокол заседания', 'акт']),
('protokol', ARRAY['протокол', 'protocol']),
('доверенность', ARRAY['доверенность на подписание', 'доверенность на получение', 'power of attorney', 'полномочия']),
('инструкция', ARRAY['руководство', 'регламент', 'правила', 'instruction', 'manual', 'положение']),
('instrukciya', ARRAY['инструкция', 'instruction', 'руководство']);

-- Категории
INSERT INTO search_synonyms (term, synonyms) VALUES
('бухгалтерия', ARRAY['финансы', 'бухучёт', 'учёт', 'финансовый отдел', 'казначейство']),
('finansy', ARRAY['финансы', 'бухгалтерия', 'finance', 'accounting']),
('кадры', ARRAY['отдел кадров', 'персонал', 'hr', 'human resources', 'сотрудники']),
('kadry', ARRAY['кадры', 'персонал', 'hr', 'human resources']),
('логистика', ARRAY['перевозки', 'транспорт', 'доставка', 'груз', 'маршрут']),
('юридический', ARRAY['юрист', 'правовой', 'legal', 'law', 'законодательство']),
('yuridicheskiy', ARRAY['юридический', 'legal', 'law', 'правовой']),
('технический', ARRAY['техотдел', 'техподдержка', 'обслуживание', 'ремонт', 'technical']),
('tekhnicheskiy', ARRAY['технический', 'technical', 'техотдел']),
('безопасность', ARRAY['охрана', 'служба безопасности', 'security', 'защита']),
('bezopasnost', ARRAY['безопасность', 'security', 'safety', 'охрана']),
('закупки', ARRAY['снабжение', 'поставки', 'procurement', 'закуп', 'тендер']),
('zakupki', ARRAY['закупки', 'procurement', 'purchasing', 'снабжение']);

-- Транспортная специфика с латинскими версиями
INSERT INTO search_synonyms (term, synonyms) VALUES
('электричка', ARRAY['электропоезд', 'пригородный поезд', 'пригородный состав', 'рельсовый автобус']),
('автобус', ARRAY['автотранспорт', 'bus', 'пассажирский транспорт', 'маршрутка']),
('avtobus', ARRAY['автобус', 'bus', 'автотранспорт']),
('маршрут', ARRAY['путь', 'направление', 'рейс', 'route', 'линия']),
('водитель', ARRAY['шофёр', 'driver', 'персонал', 'сотрудник']),
('транспорт', ARRAY['автомобиль', 'машина', 'vehicle', 'car', 'грузовик']),
('transport', ARRAY['транспорт', 'перевозки', 'transportation']),
('топливо', ARRAY['бензин', 'дизель', 'гсм', 'горючее', 'fuel', 'заправка']),
('ремонт', ARRAY['починка', 'восстановление', 'обслуживание', 'repair', 'fix']),
('remont', ARRAY['ремонт', 'repair', 'починка', 'обслуживание']),
('запчасти', ARRAY['детали', 'комплектующие', 'parts', 'spare parts', 'автозапчасти']),
('техосмотр', ARRAY['то', 'технический осмотр', 'диагностика', 'проверка']),
('страховка', ARRAY['осаго', 'каско', 'страхование', 'insurance', 'полис']),
('тариф', ARRAY['цена', 'стоимость', 'расценка', 'прайс', 'ставка']),
('путевой лист', ARRAY['путевка', 'маршрутный лист', 'задание водителю']),
('пассажир', ARRAY['гражданин', 'пассажирский', 'passenger']),
('passazhir', ARRAY['пассажир', 'гражданин', 'passenger']),
('поставка', ARRAY['снабжение', 'доставка', 'supply', 'delivery']),
('postavka', ARRAY['поставка', 'снабжение', 'supply', 'delivery']),
('оплата', ARRAY['платёж', 'payment', 'оплатить']),
('oplata', ARRAY['оплата', 'платёж', 'payment']),
('записка', ARRAY['служебная записка', 'докладная', 'пояснительная']),
('zapiska', ARRAY['записка', 'служебная записка', 'note']),
('запрос', ARRAY['обращение', 'требование', 'request', 'заявка']),
('zapros', ARRAY['запрос', 'обращение', 'request']);

-- Статусы
INSERT INTO search_synonyms (term, synonyms) VALUES
('одобрен', ARRAY['согласован', 'утверждён', 'подписан', 'approved', 'принят']),
('отклонён', ARRAY['отказ', 'rejected', 'не принят', 'возврат']),
('в работе', ARRAY['обрабатывается', 'на исполнении', 'в процессе', 'in progress']),
('завершён', ARRAY['закрыт', 'выполнен', 'готов', 'completed', 'done']),
('просрочен', ARRAY['просрочка', 'истёк срок', 'overdue', 'expired']);