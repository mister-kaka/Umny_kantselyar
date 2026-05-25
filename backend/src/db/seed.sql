-- Удаление старых таблицы (чтобы при повторном запуске не было ошибок)

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
    received_date DATE NOT NULL,
    document_type_id INTEGER REFERENCES document_types(id),
    category_id INTEGER REFERENCES document_categories(id),
    sender_name VARCHAR(200) NOT NULL,
    current_status VARCHAR(50) DEFAULT 'in_review',
    confidence_score DECIMAL(5,2),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    routed_at TIMESTAMP,
    current_department_id INTEGER REFERENCES departments(id),
    search_vector tsvector
);

CREATE TABLE document_routes (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id),
    route_status VARCHAR(50) NOT NULL,
    route_reason TEXT,
    routed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    search_vector tsvector
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- индексы

CREATE INDEX IF NOT EXISTS idx_ocr_text_trgm ON ocr_results USING gin (normalized_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ai_summary_trgm ON document_ai_results USING gin (summary_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_docs_title_trgm ON documents USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_docs_sender_trgm ON documents USING gin (sender_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_documents_search_vector ON documents USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_ocr_search_vector ON ocr_results USING GIN(search_vector);

-- функции и тригерры

CREATE OR REPLACE FUNCTION update_document_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('russian',
        coalesce(NEW.title, '') || ' ' ||
        coalesce(NEW.sender_name, '') || ' ' ||
        coalesce(NEW.registration_number, '')
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

INSERT INTO documents (registration_number, title, received_date, document_type_id, category_id, sender_name, current_status, confidence_score, created_by, verified_at, routed_at, current_department_id) VALUES 
('ВХ-2026-001', 'Договор на поставку оборудования', '2026-04-01', 1, 3, 'ООО "ТехноПоставка"', 'in_review', 0.95, 1, '2026-04-01 14:00:00', NULL, 4),
('ВХ-2026-002', 'Письмо о согласовании графика работ', '2026-04-02', 2, 4, 'АО "СтройИнвест"', 'approved', 0.87, 2, NULL, NULL, NULL),
('ВХ-2026-003', 'Обращение по поводу технической неисправности', '2026-04-03', 3, 2, 'ООО "Автопарк"', 'in_review', 0.92, 3, '2026-04-03 10:00:00', NULL, 2),
('ВХ-2026-004', 'Уведомление о проверке', '2026-04-04', 4, 5, 'Ространснадзор', 'in_review', 0.78, 4, NULL, NULL, NULL),
('ВХ-2026-005', 'Счёт на оплату топлива', '2026-04-05', 5, 6, 'ООО "Лукойл"', 'approved', 0.99, 5, '2026-04-05 16:00:00', '2026-04-06 10:00:00', 3),
('ВХ-2026-006', 'Акт приёма-передачи оборудования', '2026-04-06', 6, 3, 'ООО "ТехноПоставка"', 'completed', 0.88, 6, '2026-04-06 15:00:00', '2026-04-07 09:00:00', 4),
('ВХ-2026-007', 'Соглашение о конфиденциальности', '2026-04-07', 7, 5, 'ИП Петров', 'in_review', 0.91, 7, '2026-04-07 14:00:00', NULL, 5),
('ВХ-2026-008', 'Счёт-фактура за март', '2026-04-07', 8, 6, 'ООО "ЭнергоСбыт"', 'sent', 0.85, 1, NULL, NULL, NULL),
('ВХ-2026-009', 'Предписание об устранении нарушений', '2026-04-08', 9, 5, 'ГИБДД', 'in_review', 0.94, 2, '2026-04-08 12:00:00', '2026-04-09 10:00:00', 5),
('ВХ-2026-010', 'Договор аренды помещения', '2026-04-08', 1, 5, 'ООО "ТрансСтрой"', 'approved', 0.82, 3, NULL, NULL, NULL),
('ВХ-2026-011', 'Письмо о продлении гарантии', '2026-04-09', 2, 4, 'ООО "ТехноПоставка"', 'in_review', 0.96, 4, NULL, NULL, NULL),
('ВХ-2026-012', 'Обращение сотрудника по кадровому вопросу', '2026-04-09', 3, 1, 'Иванова Е.С.', 'in_review', 0.89, 5, '2026-04-09 11:00:00', NULL, 6),
('ВХ-2026-013', 'Уведомление о повышении цен', '2026-04-10', 4, 6, 'ООО "Поставщик"', 'pending', 0.77, 6, NULL, NULL, NULL),
('ВХ-2026-014', 'Счёт на оплату услуг связи', '2026-04-10', 5, 6, 'ПАО "Ростелеком"', 'approved', 0.98, 7, NULL, NULL, NULL),
('ВХ-2026-015', 'Акт сверки взаимных расчётов', '2026-04-11', 6, 6, 'ООО "ТрансЛайн"', 'completed', 0.84, 1, '2026-04-10 16:00:00', '2026-04-11 14:00:00', 3);

INSERT INTO document_routes (document_id, department_id, route_status, route_reason) VALUES 
(1, 4, 'in_progress', 'Договор на поставку - на рассмотрении в отделе закупок'),
(1, 5, 'pending', 'Юридическая проверка договора'),
(2, 4, 'completed', 'Письмо согласовано, ответ отправлен'),
(3, 2, 'in_progress', 'Техническая неисправность - проверка техотделом'),
(4, 5, 'in_progress', 'Уведомление о проверке - юристам'),
(5, 3, 'completed', 'Счёт оплачен'),
(6, 4, 'completed', 'Акт подписан, оборудование принято'),
(7, 5, 'in_progress', 'Соглашение на юридической проверке'),
(8, 3, 'completed', 'Счёт-фактура проведена'),
(9, 5, 'in_progress', 'Предписание - требуется ответ'),
(9, 2, 'pending', 'Техническая часть предписания'),
(10, 5, 'completed', 'Договор аренды согласован'),
(11, 4, 'in_progress', 'Письмо о гарантии - в работе'),
(12, 6, 'in_progress', 'Кадровый вопрос - отдел кадров'),
(13, 3, 'pending', 'Уведомление о ценах - бухгалтерия'),
(14, 3, 'completed', 'Счёт оплачен'),
(15, 3, 'completed', 'Акт сверки подписан');

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
(1, 'Договор на поставку оборудования г. Москва 01.04.2026. Стороны: ООО "ТехноПоставка" и Умный Канцеляр. Предмет: поставка оборудования на сумму 2 500 000 руб.', 'Договор на поставку оборудования г. Москва 01.04.2026. Стороны: ООО "ТехноПоставка" и Умный Канцеляр. Предмет: поставка оборудования на сумму 2 500 000 руб.', 'ru', 98.5, CURRENT_TIMESTAMP),
(2, 'Письмо о согласовании графика работ. Просим согласовать график работ на апрель-май 2026 года.', 'Письмо о согласовании графика работ. Просим согласовать график работ на апрель-май 2026 года.', 'ru', 95.2, CURRENT_TIMESTAMP),
(3, 'Обращение по поводу технической неисправности автобуса госномер А123ВВ. Просим провести ремонт в кратчайшие сроки.', 'Обращение по поводу технической неисправности автобуса госномер А123ВВ. Просим провести ремонт в кратчайшие сроки.', 'ru', 92.8, CURRENT_TIMESTAMP),
(4, 'Уведомление о проведении проверки соблюдения транспортного законодательства. Дата проверки: 15.04.2026.', 'Уведомление о проведении проверки соблюдения транспортного законодательства. Дата проверки: 15.04.2026.', 'ru', 96.3, CURRENT_TIMESTAMP),
(5, 'Счёт на оплату топлива №123 от 05.04.2026 на сумму 45 000 руб. Оплатить до 20.04.2026.', 'Счёт на оплату топлива №123 от 05.04.2026 на сумму 45 000 руб. Оплатить до 20.04.2026.', 'ru', 99.1, CURRENT_TIMESTAMP),
(6, 'Акт приёма-передачи оборудования. Оборудование принято без замечаний. Дата: 06.04.2026.', 'Акт приёма-передачи оборудования. Оборудование принято без замечаний. Дата: 06.04.2026.', 'ru', 94.5, CURRENT_TIMESTAMP),
(7, 'Соглашение о конфиденциальности. Стороны обязуются не разглашать коммерческую тайну и персональные данные.', 'Соглашение о конфиденциальности. Стороны обязуются не разглашать коммерческую тайну и персональные данные.', 'ru', 97.2, CURRENT_TIMESTAMP),
(8, 'Счёт-фактура №45 от 07.04.2026 на сумму 12 500 руб. за электроэнергию за март 2026 года.', 'Счёт-фактура №45 от 07.04.2026 на сумму 12 500 руб. за электроэнергию за март 2026 года.', 'ru', 98.0, CURRENT_TIMESTAMP),
(9, 'Предписание об устранении нарушений. Срок устранения: до 30.04.2026. Нарушения: превышение скорости, отсутствие тахографа.', 'Предписание об устранении нарушений. Срок устранения: до 30.04.2026. Нарушения: превышение скорости, отсутствие тахографа.', 'ru', 91.5, CURRENT_TIMESTAMP),
(10, 'Договор аренды помещения. Предмет: аренда офисного помещения. Срок: 11 месяцев. Сумма: 50 000 руб./мес.', 'Договор аренды помещения. Предмет: аренда офисного помещения. Срок: 11 месяцев. Сумма: 50 000 руб./мес.', 'ru', 96.8, CURRENT_TIMESTAMP),
(11, 'Письмо о продлении гарантии. Гарантия на оборудование продлена до 31.12.2026.', 'Письмо о продлении гарантии. Гарантия на оборудование продлена до 31.12.2026.', 'ru', 97.5, CURRENT_TIMESTAMP),
(12, 'Обращение сотрудника по кадровому вопросу. Прошу пересчитать заработную плату за март 2026 года.', 'Обращение сотрудника по кадровому вопросу. Прошу пересчитать заработную плату за март 2026 года.', 'ru', 89.5, CURRENT_TIMESTAMP),
(13, 'Уведомление о повышении цен. Новые цены действуют с 01.05.2026. Повышение составляет 15%.', 'Уведомление о повышении цен. Новые цены действуют с 01.05.2026. Повышение составляет 15%.', 'ru', 77.5, CURRENT_TIMESTAMP),
(14, 'Счёт на оплату услуг связи №678 от 10.04.2026 на сумму 8 500 руб. за интернет и телефонию.', 'Счёт на оплату услуг связи №678 от 10.04.2026 на сумму 8 500 руб. за интернет и телефонию.', 'ru', 98.8, CURRENT_TIMESTAMP),
(15, 'Акт сверки взаимных расчётов. Сальдо: 0 руб. Расчёты подтверждены.', 'Акт сверки взаимных расчётов. Сальдо: 0 руб. Расчёты подтверждены.', 'ru', 84.5, CURRENT_TIMESTAMP);

INSERT INTO document_classifications (document_id, type_id, category_id, type_confidence, category_confidence, is_verified) VALUES
(1, 1, 3, 95.2, 92.5, TRUE),
(2, 2, 4, 88.7, 85.3, TRUE),
(3, 3, 2, 92.4, 90.1, FALSE),
(4, 4, 5, 78.5, 82.0, FALSE),
(5, 5, 6, 99.0, 98.2, TRUE),
(6, 6, 3, 91.2, 89.5, TRUE),
(7, 7, 5, 94.8, 92.3, FALSE),
(8, 8, 6, 96.5, 95.0, TRUE),
(9, 9, 5, 85.2, 83.7, FALSE),
(10, 1, 5, 89.5, 87.2, TRUE),
(11, 2, 4, 97.2, 94.5, FALSE),
(12, 3, 1, 88.5, 86.0, TRUE),
(13, 4, 6, 77.2, 80.5, FALSE),
(14, 5, 6, 98.5, 97.2, TRUE),
(15, 6, 6, 85.5, 83.0, TRUE);

-- api_key (пока тестовый бесплатный ключ от OpenRouter)
INSERT INTO ai_settings (provider_code, model_name, api_key, base_url, is_active) VALUES
('deepseek', 'deepseek/deepseek-chat', 'd82134df1601e0540ac2687f7b0ca6d4:5e2b45c666275aea6d76fc81c0bf3cb92b2605798c5d26dc6e301910501c4f96f268946f61c112bf494baac5921c4769774e99762ca6cec908c5a4bc2117891c0b30055dd8a3245d1c1d2b813aecd4cc', 'https://openrouter.ai/api/v1', TRUE);

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
(1, 5, 'Проверил юридическую часть — требуется доработка пункта 4.2.', '2026-04-02 10:30:00'),
(1, 1, 'Доработал пункт 4.2, отправил контрагенту на согласование.', '2026-04-02 16:00:00'),
(3, 2, 'Автобус А123ВВ уже третий раз за месяц ломается. Нужна комплексная диагностика.', '2026-04-03 11:00:00'),
(3, 4, 'Диагностика запланирована на 08.04.2026.', '2026-04-04 09:00:00'),
(9, 1, 'Предписание ГИБДД — срок до 30.04. Нужно срочно устранить нарушения.', '2026-04-08 14:00:00'),
(9, 5, 'Готовлю ответ по юридической части. Техотделу — заняться тахографом.', '2026-04-09 10:00:00'),
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