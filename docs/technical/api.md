# API-документация

## Базовый URL

http://localhost:3000

## Аутентификация

- Все эндпоинты, кроме /auth/login, требуют JWT-токен.
- Токен передаётся в заголовке: Authorization: Bearer {token}
- Токен можно получить из localStorage('access_token') или sessionStorage('access_token').

## Формат ответов

- Все ответы в формате JSON.
- Успешные ответы имеют HTTP-статусы 200 (GET, PUT, PATCH), 201 (POST), 204 (DELETE без тела).
- Ошибки возвращают соответствующий HTTP-статус и тело { message: string, statusCode: number }.

## Пагинация

- Эндпоинты с пагинацией принимают параметры page и limit.
- Ответ содержит поля total, page, limit, totalPages.
- По умолчанию page=1, limit=10 (или 20 для некоторых эндпоинтов).

## Роли

- Административные эндпоинты требуют роль admin. Оператор получит 403 Forbidden.
- Все эндпоинты /admin/* доступны только администратору.


## 1. Авторизация

### POST /auth/login

Вход в систему. Возвращает JWT-токен.

Запрос:
{
  "email": "alexandra@umny-kan.ru",
  "password": "admin123"
}

Ответ (200):
{
  "access_token": "eyJhbGciOiJIUzI1NiIs..."
}

Ошибки:
- 401: неверный email или пароль
- 403: пользователь заблокирован
- 400: ошибка валидации (email не указан или неверный формат, пароль менее 6 символов)

### GET /auth/profile

Получить профиль текущего пользователя.

Ответ (200):
{
  "id": 1,
  "fullName": "Москалева Александра",
  "email": "alexandra@umny-kan.ru",
  "role": "Администратор",
  "department": "Бухгалтерия",
  "avatarUrl": "/uploads/avatars/1-1234567890.jpg",
  "createdAt": "2026-04-01T10:00:00.000Z"
}

### PUT /auth/profile

Обновить профиль текущего пользователя.

Запрос:
{
  "fullName": "Новое имя",
  "email": "newemail@umny-kan.ru"
}

Ответ (200): обновлённый профиль (такой же как GET)

Ошибки:
- 400: fullName или email не указаны

### POST /auth/change-password

Сменить пароль.

Запрос:
{
  "oldPassword": "старый_пароль",
  "newPassword": "новый_пароль"
}

Ответ (200):
{
  "message": "Пароль успешно изменён"
}

Ошибки:
- 400: старый пароль неверный
- 400: новый пароль менее 6 символов

### POST /auth/avatar

Загрузить аватар. Content-Type: multipart/form-data.
Поле формы: avatar (файл изображения).

Ответ (200):
{
  "avatarUrl": "/uploads/avatars/1-1234567890.jpg"
}

Ошибки:
- 400: файл не является изображением
- 400: размер файла превышает 5 МБ


## 2. Дашборд

### GET /dashboard/data

Получить данные для главной страницы дашборда.

Ответ (200):
{
  "totalDocuments": 33,
  "inProgress": 5,
  "pendingCheck": 8,
  "routedCount": 14,
  "recentDocuments": [
    {
      "id": 34,
      "registrationNumber": "ВХ-2026-034",
      "title": "predpisanie_pozharnaya_bezopasnost.pdf",
      "status": "pending_verification",
      "date": "2026-04-08",
      "uploadedAt": "2026-06-15T03:11:38.243Z"
    }
  ],
  "departmentRouteStatuses": [
    {
      "departmentId": 1,
      "departmentName": "Бухгалтерия",
      "routeStatus": "routed",
      "count": 4
    }
  ]
}


## 3. Документы

### GET /documents

Получить список документов с фильтрами и пагинацией.

Параметры запроса:
- typeId (number, опционально) - фильтр по ID типа документа
- categoryId (number, опционально) - фильтр по ID категории
- status (string, опционально) - фильтр по статусу
- dateFrom (string, опционально) - дата начала (YYYY-MM-DD)
- dateTo (string, опционально) - дата конца (YYYY-MM-DD)
- dateField (string, опционально) - поле для фильтрации по дате (upload или received)
- page (number, опционально, по умолчанию 1)
- limit (number, опционально, по умолчанию 10)

Ответ (200):
{
  "items": [
    {
      "id": 34,
      "registrationNumber": "ВХ-2026-034",
      "title": "predpisanie_pozharnaya_bezopasnost.pdf",
      "senderName": "Управление надзорной деятельности",
      "receivedDate": "2026-04-08",
      "uploadedAt": "2026-06-15T03:11:38.243Z",
      "documentType": "Обращение",
      "category": "Кадровые вопросы",
      "currentStatus": "pending_verification",
      "department": null,
      "confidenceScore": 0.96
    }
  ],
  "total": 33,
  "page": 1,
  "limit": 10,
  "totalPages": 4
}

### GET /documents/:id

Получить карточку документа со всей информацией.

Ответ (200):
{
  "id": 1,
  "registrationNumber": "ВХ-2026-001",
  "title": "Договор на поставку оборудования",
  "senderName": "ООО Техноснаб",
  "receivedDate": "2026-04-01",
  "documentType": "Договор",
  "category": "Финансовые документы",
  "currentStatus": "routed",
  "files": [
    {
      "id": 1,
      "fileName": "dogovor.pdf",
      "fileType": "application/pdf",
      "filePath": "/uploads/documents/1/dogovor.pdf",
      "fileSize": 245760,
      "uploadedAt": "2026-04-01T10:30:00.000Z"
    }
  ],
  "createdBy": "Москалева Александра",
  "createdAt": "2026-04-01T10:30:00.000Z",
  "confidenceScore": 0.95,
  "ocrResult": {
    "id": 1,
    "rawText": "ДОГОВОР НА ПОСТАВКУ...",
    "normalizedText": "договор на поставку...",
    "language": "rus",
    "ocrConfidence": 0.92
  },
  "classification": {
    "id": 1,
    "type": "Договор",
    "category": "Финансовые документы",
    "typeConfidence": 0.98,
    "categoryConfidence": 0.95,
    "isVerified": true,
    "createdAt": "2026-04-01T10:35:00.000Z"
  },
  "routes": [
    {
      "departmentName": "Бухгалтерия",
      "routeStatus": "routed",
      "routeReason": "Направлен оператором",
      "routedAt": "2026-04-01T11:00:00.000Z"
    }
  ],
  "source": {
    "sourceType": "organization",
    "organizationName": "ООО Техноснаб",
    "senderName": "Иванов И.И.",
    "contactInfo": "тел: +7(999)123-45-67"
  },
  "aiResult": {
    "id": 1,
    "documentId": 1,
    "documentTypeSuggested": "Договор",
    "categorySuggested": "Финансовые документы",
    "summaryText": "Договор на поставку оборудования...",
    "departmentSuggested": "Бухгалтерия",
    "confidenceScore": 0.95,
    "providerCode": "deepseek",
    "modelName": "deepseek-chat",
    "createdAt": "2026-04-01T10:35:00.000Z",
    "extractedDate": "2026-03-28",
    "extractedAmount": 150000,
    "extractedCounterparty": "ООО Техноснаб",
    "keyPhrases": ["договор", "поставка", "оборудование"]
  },
  "uploadedAt": "2026-04-01T10:30:00.000Z",
  "currentDepartment": "Бухгалтерия"
}

Ошибки:
- 404: документ не найден

### POST /documents/upload

Загрузить файл документа. Content-Type: multipart/form-data.
Поле формы: file.

Ответ (201):
{
  "id": 35,
  "registrationNumber": "ВХ-2026-035",
  "fileName": "dogovor.pdf",
  "fileSize": 245760,
  "filePath": "/uploads/documents/35/dogovor.pdf",
  "uploadedAt": "2026-06-15T12:00:00.000Z"
}

Ошибки:
- 400: файл не прикреплён
- 400: неподдерживаемый формат
- 400: размер файла превышает максимально допустимый

### POST /documents/:id/extract-text

Извлечь текст из загруженного файла документа.

Ответ (201):
{
  "id": 35,
  "documentId": 35,
  "rawText": "ДОГОВОР НА ПОСТАВКУ...",
  "normalizedText": "договор на поставку...",
  "language": "rus",
  "ocrConfidence": 0.92,
  "processedAt": "2026-06-15T12:01:00.000Z"
}

Ошибки:
- 404: документ не найден
- 422: у документа нет файла для распознавания

### POST /documents/:id/analyze-ai

Запустить AI-анализ документа.

Ответ (201): такой же как aiResult в GET /documents/:id

Ошибки:
- 404: документ не найден
- 422: нет OCR-текста для анализа
- 503: AI-провайдер не настроен

### GET /documents/:id/ai-result

Получить результат AI-анализа документа.

Ответ (200): такой же как aiResult в GET /documents/:id
Ответ (200): null - если анализ ещё не проводился

### PUT /documents/:id/verify

Подтвердить проверку документа оператором.

Запрос:
{
  "typeId": 1,
  "categoryId": 3,
  "departmentId": 4,
  "receivedDate": "2026-04-01",
  "senderName": "ООО Техноснаб",
  "comment": "Проверено"
}

Ответ (200):
{
  "message": "Документ проверен"
}

Ошибки:
- 404: документ не найден

### POST /documents/:id/route

Направить документ в отдел.

Запрос:
{
  "departmentId": 4,
  "comment": "Направлен в бухгалтерию"
}

Ответ (201):
{
  "message": "Документ направлен в отдел"
}

Ошибки:
- 404: документ не найден
- 400: не указан отдел

### POST /documents/:id/reject

Отклонить документ.

Запрос:
{
  "comment": "Неверный тип документа"
}

Ответ (201):
{
  "message": "Документ отклонён"
}

Ошибки:
- 404: документ не найден

### PUT /documents/:id

Редактировать документ.

Запрос:
{
  "title": "Новое название",
  "senderName": "Новый отправитель",
  "documentTypeId": 1,
  "categoryId": 3,
  "receivedDate": "2026-04-01"
}

Ответ (200): обновлённый документ (как GET /documents/:id)

Ошибки:
- 404: документ не найден

### DELETE /documents/:id

Удалить документ и связанные файлы.

Ответ (200):
{
  "message": "Документ удалён"
}

Ошибки:
- 404: документ не найден

### GET /documents/search

Поиск по документам.

Параметры запроса:
- q (string, обязательно) - поисковый запрос

Ответ (200): массив DocumentListItem (как в GET /documents)

### GET /documents/search/ai

AI-поиск по документам.

Параметры запроса:
- q (string, обязательно) - поисковый запрос

Ответ (200):
{
  "items": [...],
  "total": 5,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}

### GET /documents/export

Экспорт документов в Excel.

Параметры запроса: такие же как GET /documents (фильтры)

Ответ (200): файл .xlsx
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename=documents.xlsx

### POST /documents/generate-embeddings

Генерация векторных эмбеддингов для всех документов.

Ответ (200):
{
  "message": "Эмбеддинги сгенерированы",
  "count": 33
}

### GET /documents/route-templates

Получить список шаблонов маршрутизации.

Ответ (200):
[
  {
    "id": 1,
    "name": "Финансовые договоры",
    "description": "Автоматическая маршрутизация в бухгалтерию",
    "departmentIds": [1],
    "isActive": true
  }
]

### POST /documents/route-templates

Создать шаблон маршрутизации.

Запрос:
{
  "name": "Новый шаблон",
  "description": "Описание",
  "departmentIds": [1, 2]
}

Ответ (201): созданный шаблон

### DELETE /documents/route-templates/:id

Удалить шаблон маршрутизации.

Ответ (200):
{
  "message": "Шаблон удалён"
}

Ошибки:
- 404: шаблон не найден

### GET /documents/routing

Получить список документов в маршрутизации.

Параметры запроса:
- departmentId (number, опционально)
- operatorId (number, опционально)
- filter (string, опционально) - all, matched, mismatched
- page (number, опционально, по умолчанию 1)
- limit (number, опционально, по умолчанию 10)

Ответ (200):
{
  "stats": {
    "total": 13,
    "matched": 3,
    "mismatched": 7
  },
  "items": [
    {
      "id": 20,
      "registrationNumber": "ВХ-2026-020",
      "title": "prikaz_o_naznachenii.pdf",
      "currentDepartment": "Транспортный отдел",
      "suggestedDepartment": "Отдел кадров",
      "routeStatus": "routed",
      "operatorName": "Начинова Мария Дмитриевна",
      "operatorAvatarUrl": "/uploads/avatars/7.jpg",
      "routedAt": "2026-06-12T22:42:51.428Z",
      "routeReason": "Направлен оператором"
    }
  ],
  "operators": [
    { "id": 1, "fullName": "Москалева Александра" }
  ],
  "page": 1,
  "totalPages": 3,
  "totalItems": 13
}

### PUT /document-routes/:id/status

Обновить статус маршрута.

Запрос:
{
  "status": "delivered"
}

Ответ (200):
{
  "message": "Статус маршрута обновлён"
}

Ошибки:
- 404: маршрут не найден

### GET /documents/:id/comments

Получить комментарии к документу.

Ответ (200):
[
  {
    "id": 1,
    "documentId": 1,
    "userId": 1,
    "userName": "Москалева Александра",
    "text": "Тестовый комментарий",
    "createdAt": "2026-06-15T10:00:00.000Z"
  }
]

### POST /documents/:id/comments

Добавить комментарий к документу.

Запрос:
{
  "text": "Текст комментария"
}

Ответ (201): созданный комментарий

### DELETE /documents/:id/comments/:commentId

Удалить комментарий.

Ответ (200):
{
  "message": "Комментарий удалён"
}

Ошибки:
- 404: комментарий не найден


## 4. Типы документов

### GET /document-types

Получить список типов документов.

Ответ (200):
[
  {
    "id": 1,
    "name": "Договор",
    "code": "dogovor",
    "description": null
  }
]

### POST /document-types

Создать новый тип документа. Доступно оператору и администратору.

Запрос:
{
  "name": "Новый тип"
}

Ответ (201):
{
  "id": 10,
  "name": "Новый тип",
  "code": "novyy_tip",
  "description": "Создан оператором"
}

Ошибки:
- 409: тип с таким кодом уже существует

### DELETE /document-types/:id

Удалить тип документа. Только администратор.

Ответ (200):
{
  "message": "Тип документа удалён"
}

Ошибки:
- 404: тип не найден
- 409: есть документы этого типа, удаление невозможно


## 5. Категории документов

### GET /document-categories

Получить список категорий.

Ответ (200): аналогично типам документов

### POST /document-categories

Создать новую категорию. Доступно оператору и администратору.

Запрос:
{
  "name": "Новая категория"
}

Ответ (201): аналогично созданию типа

Ошибки:
- 409: категория с таким кодом уже существует

### DELETE /document-categories/:id

Удалить категорию. Только администратор.

Ответ (200):
{
  "message": "Категория удалена"
}

Ошибки:
- 404: категория не найдена
- 409: есть документы этой категории, удаление невозможно


## 6. Подразделения

### GET /departments

Получить список подразделений.

Параметры запроса:
- showArchived (boolean, опционально) - показать архивные отделы

Ответ (200):
[
  {
    "id": 1,
    "name": "Бухгалтерия",
    "code": "buhgalteriya",
    "isActive": true
  }
]

### GET /departments/stats

Получить статистику подразделений.

Параметры запроса:
- showArchived (boolean, опционально)

Ответ (200):
[
  {
    "id": 1,
    "name": "Бухгалтерия",
    "code": "buhgalteriya",
    "routedCount": 4,
    "lastRoutedTitle": "Договор на поставку",
    "lastRoutedAt": "2026-04-11T11:00:00.000Z"
  }
]

### GET /departments/:id/detail

Получить детальную информацию об отделе.

Параметры запроса:
- page (number, опционально, по умолчанию 1)
- limit (number, опционально, по умолчанию 10)
- dateFrom (string, опционально) - YYYY-MM для фильтрации графика
- dateTo (string, опционально) - YYYY-MM для фильтрации графика

Ответ (200):
{
  "id": 1,
  "name": "Бухгалтерия",
  "code": "buhgalteriya",
  "isActive": true,
  "totalRouted": 4,
  "firstRoutedAt": "2026-04-01T10:00:00.000Z",
  "lastRoutedAt": "2026-04-11T11:00:00.000Z",
  "employees": [
    {
      "id": 1,
      "fullName": "Москалева Александра",
      "email": "alexandra@umny-kan.ru",
      "avatarUrl": "/uploads/avatars/1.jpg"
    }
  ],
  "documents": {
    "items": [...],
    "total": 4,
    "page": 1,
    "totalPages": 1
  },
  "monthlyStats": [
    { "month": "2026-04", "count": 4 }
  ]
}

### POST /departments

Создать новый отдел. Только администратор.

Запрос:
{
  "name": "Новый отдел"
}

Ответ (201):
{
  "id": 7,
  "name": "Новый отдел",
  "code": "novyy_otdel",
  "isActive": true
}

Ошибки:
- 409: отдел с таким кодом уже существует

### DELETE /departments/:id

Архивировать отдел (мягкое удаление). Только администратор.

Ответ (200):
{
  "id": 7,
  "name": "Новый отдел",
  "code": "novyy_otdel",
  "isActive": false
}

Ошибки:
- 404: отдел не найден
- 400: отдел уже архивирован

### PATCH /departments/:id/restore

Восстановить архивированный отдел. Только администратор.

Ответ (200):
{
  "id": 7,
  "name": "Новый отдел",
  "code": "novyy_otdel",
  "isActive": true
}

Ошибки:
- 404: отдел не найден
- 400: отдел уже активен


## 7. Уведомления

### GET /notifications

Получить уведомления текущего пользователя.

Параметры запроса:
- page (number, опционально, по умолчанию 1)
- limit (number, опционально, по умолчанию 10)
- type (string, опционально) - фильтр по типу
- isRead (boolean, опционально) - фильтр по статусу прочтения
- dateFrom (string, опционально) - дата начала (YYYY-MM-DD)
- dateTo (string, опционально) - дата конца (YYYY-MM-DD)

Ответ (200):
{
  "items": [
    {
      "id": 124,
      "type": "new_login",
      "title": "Новый вход в систему",
      "message": "Выполнен вход в учётную запись...",
      "documentId": null,
      "isRead": false,
      "createdAt": "2026-06-15T09:30:04.000Z"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 10,
  "totalPages": 2
}

### GET /notifications/unread-count

Получить количество непрочитанных уведомлений по типам.

Ответ (200):
{
  "total": 5,
  "newDocument": 1,
  "documentReady": 0,
  "extractError": 0,
  "pendingVerification": 2,
  "routedToDepartment": 1,
  "rejected": 0,
  "verified": 0,
  "lowConfidence": 1
}

### PUT /notifications/:id/read

Отметить уведомление как прочитанное.

Ответ (200):
{
  "message": "Уведомление отмечено как прочитанное"
}

### PUT /notifications/read-all

Отметить все уведомления как прочитанные.

Ответ (200):
{
  "message": "Все уведомления отмечены как прочитанные"
}

### DELETE /notifications/:id

Удалить уведомление.

Ответ (200):
{
  "message": "Уведомление удалено"
}

### DELETE /notifications/read

Удалить все прочитанные уведомления.

Ответ (200):
{
  "message": "Прочитанные уведомления удалены",
  "deletedCount": 10
}


## 8. Настройки

### GET /settings/ai

Получить текущие настройки AI-провайдера.

Ответ (200):
{
  "id": 1,
  "providerCode": "deepseek",
  "modelName": "deepseek-chat",
  "apiKey": "sk-...abc",
  "baseUrl": "https://api.deepseek.com",
  "isActive": true,
  "updatedAt": "2026-06-10T12:00:00.000Z"
}

### PUT /settings/ai

Обновить настройки AI-провайдера. Только администратор.

Запрос:
{
  "providerCode": "deepseek",
  "modelName": "deepseek-chat",
  "apiKey": "sk-новыйключ",
  "baseUrl": "https://api.deepseek.com"
}

Ответ (200): обновлённые настройки

### GET /settings/ai/providers

Получить список доступных AI-провайдеров и моделей.

Ответ (200):
[
  {
    "providerCode": "deepseek",
    "providerName": "DeepSeek",
    "models": [
      { "modelCode": "deepseek-chat", "modelName": "DeepSeek Chat" },
      { "modelCode": "deepseek-reasoner", "modelName": "DeepSeek Reasoner" }
    ]
  }
]

### POST /settings/ai/test-connection

Проверить подключение к AI-провайдеру.

Запрос:
{
  "providerCode": "deepseek",
  "modelName": "deepseek-chat",
  "apiKey": "sk-ключ",
  "baseUrl": "https://api.deepseek.com"
}

Ответ (200):
{
  "status": "success",
  "message": "Подключение успешно"
}

### GET /settings/upload-info

Получить настройки загрузки файлов (доступно оператору и администратору).

Ответ (200):
{
  "maxFileSizeMb": 50,
  "maxFilesPerBatch": 15,
  "allowedFormats": ["pdf", "docx", "txt", "xlsx", "jpg", "jpeg", "png", "tiff"]
}

### GET /settings/notifications

Получить настройки уведомлений пользователя.

Ответ (200):
{
  "id": 1,
  "userId": 1,
  "newDocument": true,
  "documentReady": true,
  "extractError": true,
  "pendingVerification": true,
  "routedToDepartment": true,
  "rejected": false,
  "verified": false,
  "lowConfidence": false,
  "passwordChanged": false,
  "profileUpdated": false,
  "settingsChanged": false,
  "newLogin": false,
  "commentAdded": false,
  "documentDeleted": false,
  "referenceCreated": true,
  "referenceDeleted": true,
  "adminMessage": true,
  "updatedAt": "2026-06-15T12:00:00.000Z"
}

### PUT /settings/notifications

Обновить настройки уведомлений.

Запрос:
{
  "newDocument": true,
  "documentReady": false
}

Ответ (200): обновлённые настройки

### GET /settings/interface

Получить настройки интерфейса пользователя.

Ответ (200):
{
  "id": 1,
  "userId": 1,
  "compactView": false,
  "showConfidence": true,
  "defaultPageLimit": 10,
  "theme": "light",
  "updatedAt": "2026-06-15T12:00:00.000Z"
}

### PUT /settings/interface

Обновить настройки интерфейса.

Запрос:
{
  "compactView": true,
  "showConfidence": true,
  "defaultPageLimit": 20,
  "theme": "dark"
}

Ответ (200): обновлённые настройки

### GET /settings/export

Экспортировать все данные системы в JSON. Только администратор.

Ответ (200): JSON-файл со всеми данными
Content-Type: application/json
Content-Disposition: attachment; filename=umny-kan-backup.json

### POST /settings/import

Импортировать данные из JSON-файла. Content-Type: multipart/form-data. Только администратор.
Поле формы: file.

Ответ (200):
{
  "message": "Данные успешно импортированы",
  "counts": {
    "documents": 33,
    "documentTypes": 9,
    "documentCategories": 6,
    "departments": 6
  }
}

Ошибки:
- 400: неверный формат файла

### GET /settings/about

Получить версию системы.

Ответ (200):
{
  "version": "1.6.0"
}


## 9. Безопасность

### GET /security/sessions

Получить активные сессии пользователя.

Ответ (200):
[
  {
    "id": 1,
    "userId": 1,
    "token": "...abc",
    "createdAt": "2026-06-15T09:00:00.000Z",
    "expiresAt": "2026-06-16T09:00:00.000Z",
    "ipAddress": "::ffff:127.0.0.1",
    "userAgent": "Mozilla/5.0..."
  }
]

### DELETE /security/sessions/:id

Завершить конкретную сессию.

Ответ (200):
{
  "message": "Сессия завершена"
}

### POST /security/logout-all

Завершить все сессии кроме текущей.

Ответ (200):
{
  "message": "Завершено 2 сессий"
}

### GET /security/login-history

Получить историю входов пользователя.

Параметры запроса:
- page (number, опционально, по умолчанию 1)
- limit (number, опционально, по умолчанию 20)

Ответ (200):
{
  "items": [
    {
      "id": 1,
      "userId": 1,
      "ipAddress": "::ffff:127.0.0.1",
      "userAgent": "Mozilla/5.0...",
      "loginTime": "2026-06-15T09:00:00.000Z"
    }
  ],
  "total": 15,
  "page": 1,
  "totalPages": 2
}

### GET /security/audit-log

Получить журнал действий пользователя.

Параметры запроса:
- page (number, опционально, по умолчанию 1)
- limit (number, опционально, по умолчанию 20)
- action (string, опционально) - фильтр по действию
- documentId (number, опционально) - фильтр по документу

Ответ (200):
{
  "items": [
    {
      "id": 1,
      "userId": 1,
      "userName": "Москалева Александра",
      "userAvatarUrl": "/uploads/avatars/1.jpg",
      "action": "document_upload",
      "documentId": 34,
      "details": {},
      "createdAt": "2026-06-15T09:00:00.000Z"
    }
  ],
  "total": 50,
  "page": 1,
  "totalPages": 3
}


## 10. Аналитика

### GET /analytics/data

Получить данные для страницы аналитики.

Ответ (200):
{
  "totalDocuments": 33,
  "avgConfidence": 85,
  "rejectedCount": 3,
  "last7Days": 12,
  "pendingVerificationCount": 8,
  "aiProcessedCount": 28
}


## 11. Администрирование

Все эндпоинты требуют роль admin.

### GET /admin/audit-log

Получить журнал действий всех пользователей.

Параметры запроса:
- page (number, опционально, по умолчанию 1)
- limit (number, опционально, по умолчанию 20)
- userId (number, опционально) - фильтр по ID пользователя
- action (string, опционально) - фильтр по действию
- dateFrom (string, опционально) - дата начала (YYYY-MM-DD)
- dateTo (string, опционально) - дата конца (YYYY-MM-DD)
- userName (string, опционально) - поиск по ФИО или email

Ответ (200):
{
  "items": [
    {
      "id": 1,
      "userId": 1,
      "userName": "Москалева Александра",
      "userAvatarUrl": "/uploads/avatars/1.jpg",
      "action": "document_upload",
      "documentId": 34,
      "details": {},
      "createdAt": "2026-06-15T09:00:00.000Z"
    }
  ],
  "total": 50,
  "page": 1,
  "totalPages": 3
}

### GET /admin/users

Получить список всех пользователей.

Ответ (200):
[
  {
    "id": 1,
    "fullName": "Москалева Александра",
    "email": "alexandra@umny-kan.ru",
    "role": "admin",
    "isBlocked": false,
    "avatarUrl": "/uploads/avatars/1.jpg",
    "departmentId": 1,
    "createdAt": "2026-04-01T10:00:00.000Z"
  }
]

### GET /admin/users/:id/stats

Получить статистику пользователя.

Ответ (200):
{
  "documentCount": 15,
  "commentCount": 23,
  "sessionCount": 2
}

### PUT /admin/users/:id/role

Изменить роль пользователя.

Запрос:
{
  "role": "admin"
}

Ответ (200):
{
  "message": "Роль обновлена"
}

### PUT /admin/users/:id/block

Заблокировать или разблокировать пользователя.

Запрос:
{
  "isBlocked": true
}

Ответ (200):
{
  "message": "Пользователь заблокирован"
}

### POST /admin/users

Создать нового пользователя.

Запрос:
{
  "fullName": "Иванов Иван",
  "email": "ivanov@umny-kan.ru",
  "password": "password123",
  "role": "operator",
  "departmentId": 1
}

Ответ (201):
{
  "id": 8,
  "fullName": "Иванов Иван",
  "email": "ivanov@umny-kan.ru",
  "role": "operator"
}

### POST /admin/users/:id/reset-password

Сбросить пароль пользователя.

Запрос:
{
  "newPassword": "newpassword123"
}

Ответ (200):
{
  "message": "Пароль сброшен"
}

### DELETE /admin/users/:id

Удалить пользователя.

Ответ (200):
{
  "message": "Пользователь удалён"
}

### GET /admin/system-settings

Получить системные настройки.

Ответ (200):
{
  "upload.max_file_size_mb": "50",
  "upload.max_files_per_batch": "15",
  "upload.allowed_formats": ["pdf", "docx", "txt", "xlsx", "jpg", "jpeg", "png", "tiff"]
}

### PUT /admin/system-settings

Обновить системные настройки.

Запрос:
{
  "upload.max_file_size_mb": "25",
  "upload.allowed_formats": ["pdf", "docx", "jpg", "png"]
}

Ответ (200):
{
  "message": "Настройки сохранены"
}

### POST /admin/cleanup

Очистка данных.

Запрос:
{
  "type": "documents",
  "olderThanMonths": 12
}

Ответ (200):
{
  "message": "Удалено 5 записей"
}

Типы очистки:
- documents - удалить документы старше N месяцев
- notifications - удалить прочитанные уведомления старше N месяцев
- audit - удалить записи журнала старше N месяцев

### GET /admin/logs

Скачать логи сервера.

Параметры запроса:
- date (string, опционально) - дата в формате YYYY-MM-DD
- from (string, опционально) - дата начала периода
- to (string, опционально) - дата конца периода

Ответ (200): файл логов

### POST /admin/export

Экспортировать выбранные разделы данных.

Запрос:
{
  "sections": ["documents", "references", "users", "settings"]
}

Ответ (200): JSON-файл с выбранными данными

### POST /admin/import

Импортировать данные из файла. Content-Type: multipart/form-data.
Поля формы: file (файл JSON), sections (JSON-массив разделов).

Запрос:
FormData:
  file: backup.json
  sections: ["documents", "references"]

Ответ (200):
{
  "message": "Данные импортированы",
  "counts": { "documents": 33, "documentTypes": 9 }
}

### GET /admin/stats

Получить статистику системы.

Ответ (200):
{
  "totalDocuments": 33,
  "totalUsers": 7,
  "averageConfidence": 85,
  "totalRoutes": 15,
  "statusStats": [
    { "status": "routed", "count": 14 },
    { "status": "pending_verification", "count": 8 }
  ],
  "userActivity": [
    { "userId": 1, "userName": "Москалева Александра", "count": 42 }
  ]
}

### POST /admin/notifications/send

Отправить уведомление пользователям.

Запрос:
{
  "target": "all",
  "title": "Заголовок",
  "message": "Текст сообщения"
}

Значения target: all, admins, operators, selected
При target=selected указать userIds: [1, 2, 3]

Ответ (200):
{
  "message": "Отправлено 7 получателям"
}

### GET /admin/notifications/history

Получить историю рассылок.

Параметры запроса:
- page (number, опционально, по умолчанию 1)
- limit (number, опционально, по умолчанию 10)

Ответ (200):
{
  "items": [...],
  "total": 5,
  "page": 1,
  "totalPages": 1
}


## 12. Статусы документов

- in_review - На рассмотрении
- pending_verification - Ожидает проверки
- verified - Проверено
- routed - Направлен в отдел
- rejected - Отклонено


## 13. Типы уведомлений

- new_document - Новый документ загружен
- document_ready - Документ обработан
- extract_error - Ошибка распознавания
- pending_verification - Требуется проверка
- routed - Направлен в отдел
- rejected - Отклонён
- verified - Проверен
- low_confidence - Низкая уверенность
- password_changed - Пароль изменён
- profile_updated - Профиль обновлён
- settings_changed - Настройки изменены
- new_login - Новый вход в систему
- comment_added - Новый комментарий
- document_deleted - Документ удалён
- reference_created - Справочник создан
- reference_deleted - Справочник удалён
- admin_message - Сообщение администратора