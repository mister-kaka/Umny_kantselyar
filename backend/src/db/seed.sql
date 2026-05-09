-- Удаление старых таблицы (чтобы при повторном запуске не было ошибок)

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


-- Создание таблиц бд

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Тестовые данные

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

INSERT INTO documents (registration_number, title, received_date, document_type_id, category_id, sender_name, current_status, confidence_score, created_by) VALUES 
('ВХ-2026-001', 'Договор на поставку оборудования', '2026-04-01', 1, 3, 'ООО "ТехноПоставка"', 'in_review', 0.95, 1),
('ВХ-2026-002', 'Письмо о согласовании графика работ', '2026-04-02', 2, 4, 'АО "СтройИнвест"', 'approved', 0.87, 2),
('ВХ-2026-003', 'Обращение по поводу технической неисправности', '2026-04-03', 3, 2, 'ООО "Автопарк"', 'in_review', 0.92, 3),
('ВХ-2026-004', 'Уведомление о проверке', '2026-04-04', 4, 5, 'Ространснадзор', 'in_review', 0.78, 4),
('ВХ-2026-005', 'Счёт на оплату топлива', '2026-04-05', 5, 6, 'ООО "Лукойл"', 'approved', 0.99, 5),
('ВХ-2026-006', 'Акт приёма-передачи оборудования', '2026-04-06', 6, 3, 'ООО "ТехноПоставка"', 'completed', 0.88, 6),
('ВХ-2026-007', 'Соглашение о конфиденциальности', '2026-04-07', 7, 5, 'ИП Петров', 'in_review', 0.91, 7),
('ВХ-2026-008', 'Счёт-фактура за март', '2026-04-07', 8, 6, 'ООО "ЭнергоСбыт"', 'sent', 0.85, 1),
('ВХ-2026-009', 'Предписание об устранении нарушений', '2026-04-08', 9, 5, 'ГИБДД', 'in_review', 0.94, 2),
('ВХ-2026-010', 'Договор аренды помещения', '2026-04-08', 1, 5, 'ООО "ТрансСтрой"', 'approved', 0.82, 3),
('ВХ-2026-011', 'Письмо о продлении гарантии', '2026-04-09', 2, 4, 'ООО "ТехноПоставка"', 'in_review', 0.96, 4),
('ВХ-2026-012', 'Обращение сотрудника по кадровому вопросу', '2026-04-09', 3, 1, 'Иванова Е.С.', 'in_review', 0.89, 5),
('ВХ-2026-013', 'Уведомление о повышении цен', '2026-04-10', 4, 6, 'ООО "Поставщик"', 'pending', 0.77, 6),
('ВХ-2026-014', 'Счёт на оплату услуг связи', '2026-04-10', 5, 6, 'ПАО "Ростелеком"', 'approved', 0.98, 7),
('ВХ-2026-015', 'Акт сверки взаимных расчётов', '2026-04-11', 6, 6, 'ООО "ТрансЛайн"', 'completed', 0.84, 1);

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

-- api_key пока заглушка
INSERT INTO ai_settings (provider_code, model_name, api_key, base_url, is_active) VALUES
('deepseek', 'deepseek-4-flash', 'placeholder_api', 'https://api.deepseek.com', TRUE);