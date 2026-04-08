-- Удаление старых таблицы (чтобы при повторном запуске не было ошибок)

DROP TABLE IF EXISTS document_routes CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS document_categories CASCADE;
DROP TABLE IF EXISTS document_types CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS roles CASCADE;


-- Создание таблиц бд

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
('Москалева Александра', 'alexandra@umny-kan.ru', 'admin123', 1, 1, 'active'),
('Нехланова Алина', 'alina@umny-kan.ru', 'user123', 2, 5, 'active'),
('Мельникова Виолетта', 'violetta@umny-kan.ru', 'user123', 2, 2, 'active'),
('Ефанов Егор', 'egor@umny-kan.ru', 'user123', 2, 2, 'active'),
('Мейсарош Карина', 'karina@umny-kan.ru', 'user123', 2, 4, 'active'),
('Мотовилова Мария', 'maria.m@umny-kan.ru', 'user123', 2, 6, 'active'),
('Начинова Мария', 'maria.n@umny-kan.ru', 'admin123', 1, 1, 'active');

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
