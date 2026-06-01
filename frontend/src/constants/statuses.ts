// Список статусов
export const STATUSES = {
    IN_REVIEW: 'in_review',
    PENDING_VERIFICATION: 'pending_verification',
    VERIFIED: 'verified',
    ROUTED: 'routed',
    REJECTED: 'rejected',
} as const;

export type DocumentStatus = typeof STATUSES[keyof typeof STATUSES];

// Перевод на русский
export const STATUS_TRANSLATIONS: Record<DocumentStatus, string> = {
    [STATUSES.IN_REVIEW]: 'На рассмотрении',
    [STATUSES.PENDING_VERIFICATION]: 'Ожидает проверки',
    [STATUSES.VERIFIED]: 'Проверено',
    [STATUSES.ROUTED]: 'Направлен в отдел',
    [STATUSES.REJECTED]: 'Отклонено',
};

// CSS классы для бейджа
export const STATUS_CSS_CLASS: Record<DocumentStatus, string> = {
    [STATUSES.IN_REVIEW]: 'status-data-refinement', 
    [STATUSES.PENDING_VERIFICATION]: 'status-low-confidence', 
    [STATUSES.VERIFIED]: 'status-assigned',           
    [STATUSES.ROUTED]: 'status-loaded',               
    [STATUSES.REJECTED]: 'status-rejected',           
};

// HEX цвета для графиков ApexCharts
export const STATUS_HEX_COLORS: Record<DocumentStatus, string> = {
    [STATUSES.IN_REVIEW]: '#f6c681',
    [STATUSES.PENDING_VERIFICATION]: '#FAB25F',
    [STATUSES.VERIFIED]: '#7EADE2',
    [STATUSES.ROUTED]: '#7EE29F',
    [STATUSES.REJECTED]: '#E87373',
};

// Порядок статусов для отображения
export const STATUS_ORDER: DocumentStatus[] = [
    STATUSES.IN_REVIEW,
    STATUSES.PENDING_VERIFICATION,
    STATUSES.VERIFIED,
    STATUSES.ROUTED,
    STATUSES.REJECTED,
];

// Функция перевода статуса на русский
export const translateStatus = (status: string): string => {
  return STATUS_TRANSLATIONS[status as DocumentStatus] || status;
};

// Функция получения CSS класса для бейджа
export const getStatusColorClass = (status: string): string => {
  return STATUS_CSS_CLASS[status as DocumentStatus] || 'status-archived';
};

// Функция получения HEX цвета (для графиков)
export const getStatusHexColor = (status: string): string => {
  return STATUS_HEX_COLORS[status as DocumentStatus] || '#979797';
};

// Проверка, является ли статус валидным
export const isValidStatus = (status: string): boolean => {
  return Object.values(STATUSES).includes(status as DocumentStatus);
};

// Получить все статусы для фильтров (массив объектов)
export const getAllStatusesForFilter = () => {
  return Object.entries(STATUS_TRANSLATIONS).map(([value, label]) => ({
    value,
    label,
  }));
};

// Получить статусы для определённого этапа (например, только активные)
export const getActiveStatuses = (): DocumentStatus[] => {
  return [STATUSES.IN_REVIEW, STATUSES.PENDING_VERIFICATION, STATUSES.VERIFIED];
};

// Получить финальные статусы
export const getFinalStatuses = (): DocumentStatus[] => {
  return [STATUSES.ROUTED, STATUSES.REJECTED];
};