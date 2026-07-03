import axios from 'axios';
import { 
  LoginResponse, 
  DashboardData,
  DocumentsListResponse, 
  DocumentCard,
  DocumentType, 
  DocumentCategory,
  Department, 
  AiSettings, 
  AiProvider, 
  UpdateAiSettings, 
  DocumentAiResult, 
  DocumentListItem,
  VerifyDocumentData,
  RouteDocumentData,
  RoutingDocument,
  UpdateRouteStatusData,
  UpdateDocumentData,
  Profile,
  UpdateProfileData,
  ChangePasswordData,
  NotificationSettings,
  InterfaceSettings,
  Session,
  LoginHistoryResponse,
  AuditLogResponse,
  Comment,
  ExportFilters,
  UnreadCount,
  AppNotification,
  UploadResponse,
  ExtractTextResponse,
  AiSearchResponse,
  AnalyticsData,
  RouteTemplate,
  DepartmentStats,
  DepartmentDetail,
  RoutingResponse,
  DepartmentDto,
  AdminAuditLogResponse,
  AdminUser,
  AdminUserStats,
  AdminStats,
  AdminBackupStatus,
  AdminNotificationHistoryResponse,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      if (!error.config?.url?.includes('/auth/login')) {
        localStorage.removeItem('access_token');
        sessionStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

//аутеннтификация
export const login = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    console.error('Ошибка логина', error);
    throw error;
  }
};

export const getProfile = async (): Promise<Profile> => {
  try {
    const response = await api.get<Profile>('/auth/profile');
    return response.data;
  } catch (error) {
    console.error('Ошибка получения профиля', error);
    throw error;
  }
};

export const updateProfile = async (data: UpdateProfileData): Promise<Profile> => {
  try {
    const response = await api.put<Profile>('/auth/profile', data);
    return response.data;
  } catch (error) {
    console.error('Ошибка обновления профиля', error);
    throw error;
  }
};

export const changePassword = async (data: ChangePasswordData): Promise<{ message: string }> => {
  try {
    const response = await api.post<{ message: string }>('/auth/change-password', data);
    return response.data;
  } catch (error) {
    console.error('Ошибка смены пароля', error);
    throw error;
  }
};

export const uploadAvatar = async (file: File): Promise<{ avatarUrl: string }> => {
  try {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post<{ avatarUrl: string }>('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    console.error('Ошибка загрузки аватара', error);
    throw error;
  }
};

//дашборд
export const getDashboard = async (): Promise<DashboardData> => {
  try {
    const response = await api.get<DashboardData>('/dashboard/data');
    return response.data;
  } catch (error) {
    console.error('Ошибка получения данных дашборда', error);
    throw error;
  }
};

//документы
export const getDocuments = async (filters?: {
  typeId?: number;
  categoryId?: number;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  dateField?: string;
  page?: number;
  limit?: number;
}): Promise<DocumentsListResponse> => {
  try {
    const response = await api.get<DocumentsListResponse>('/documents', {
      params: filters || {}
    });
    return response.data;
  } catch (error) {
    console.error('Ошибка получения списка документов', error);
    throw error;
  }
};

export const getDocumentById = async (id: number): Promise<DocumentCard> => {
  try {
    const response = await api.get<DocumentCard>(`/documents/${id}`);
    return response.data;
  } catch (error) {
    console.error('Ошибка получения карточки документа', error);
    throw error;
  }
};

export const deleteDocument = async (id: number): Promise<void> => {
  await api.delete(`/documents/${id}`);
};

export const updateDocument = async (id: number, data: UpdateDocumentData): Promise<void> => {
  try {
    await api.put(`/documents/${id}`, data);
  } catch (error) {
    console.error('Ошибка обновления документа', error);
    throw error;
  }
};

export const verifyDocument = async (id: number, data: VerifyDocumentData): Promise<{ message: string }> => {
  const res = await api.put<{ message: string }>(`/documents/${id}/verify`, data);
  return res.data;
};

export const routeDocument = async (id: number, data: RouteDocumentData): Promise<{ message: string }> => {
  const res = await api.post<{ message: string }>(`/documents/${id}/route`, data);
  return res.data;
};

export const rejectDocument = async (id: number, comment?: string): Promise<{ message: string }> => {
  const res = await api.post<{ message: string }>(`/documents/${id}/reject`, { comment });
  return res.data;
};

//типы и категории
export const getDocumentTypes = async (): Promise<DocumentType[]> => {
  try {
    const response = await api.get<DocumentType[]>('/document-types');
    return response.data;
  } catch (error) {
    console.error('Ошибка получения типов документов', error);
    throw error;
  }
};

export const getDocumentCategories = async (): Promise<DocumentCategory[]> => {
  try {
    const response = await api.get<DocumentCategory[]>('/document-categories');
    return response.data;
  } catch (error) {
    console.error('Ошибка получения категорий документов', error);
    throw error;
  }
};

export const createDocumentType = async (name: string): Promise<DocumentType> => {
  const res = await api.post<DocumentType>('/document-types', { name });
  return res.data;
};

export const createDocumentCategory = async (name: string): Promise<DocumentCategory> => {
  const res = await api.post<DocumentCategory>('/document-categories', { name });
  return res.data;
};

//подразделения
export const getDepartments = async (showArchived?: boolean): Promise<Department[]> => {
  try {
    const params: any = {};
    if (showArchived) params.showArchived = showArchived;
    const response = await api.get<Department[]>('/departments', { params });
    return response.data;
  } catch (error) {
    console.error('Ошибка получения списка подразделений', error);
    throw error;
  }
};

export const getDepartmentStats = async (showArchived?: boolean): Promise<DepartmentStats[]> => {
  try {
    const params: any = {};
    if (showArchived) params.showArchived = showArchived;
    const response = await api.get<DepartmentStats[]>('/departments/stats', { params });
    return response.data;
  } catch (error) {
    console.error('Ошибка получения статистики подразделений', error);
    throw error;
  }
};

export const getDepartmentDetail = async (
    id: number,
    page?: number,
    limit?: number,
    dateFrom?: string,
    dateTo?: string,
): Promise<DepartmentDetail> => {
    try {
        const params: any = {};
        if (page) params.page = page;
        if (limit) params.limit = limit;
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;
        const response = await api.get<DepartmentDetail>(`/departments/${id}/detail`, { params });
        return response.data;
    } catch (error) {
        console.error('Ошибка получения детализации отдела', error);
        throw error;
    }
};

export const createDepartment = async (name: string): Promise<Department> => {
    const res = await api.post<Department>('/departments', { name });
    return res.data;
};

export const deleteDepartment = async (id: number): Promise<DepartmentDto> => {
  const res = await api.delete<DepartmentDto>(`/departments/${id}`);
  return res.data;
};

export const restoreDepartment = async (id: number): Promise<DepartmentDto> => {
  const res = await api.patch<DepartmentDto>(`/departments/${id}/restore`);
  return res.data;
};

//аи
export const getAiSettings = async (): Promise<AiSettings> => {
  const res = await api.get<AiSettings>('/settings/ai');
  return res.data;
};

export const updateAiSettings = async (data: UpdateAiSettings): Promise<AiSettings> => {
  const res = await api.put<AiSettings>('/settings/ai', data);
  return res.data;
};

export const getAiProviders = async (): Promise<AiProvider[]> => {
  const res = await api.get<AiProvider[]>('/settings/ai/providers');
  return res.data;
};

export const testAiConnection = async (data: UpdateAiSettings): Promise<{ status: string; message: string }> => {
  const res = await api.post<{ status: string; message: string }>('/settings/ai/test-connection', data);
  return res.data;
};

export const analyzeDocument = async (id: number): Promise<DocumentAiResult> => {
  const res = await api.post<DocumentAiResult>(`/documents/${id}/analyze-ai`);
  return res.data;
};

export const getDocumentAiResult = async (id: number): Promise<DocumentAiResult | null> => {
  const res = await api.get<DocumentAiResult | null>(`/documents/${id}/ai-result`);
  return res.data;
};

//поиск
export const searchDocuments = async (query: string): Promise<DocumentListItem[]> => {
  const res = await api.get<DocumentListItem[]>('/documents/search', {
    params: { q: query }
  });
  return res.data;
};

export const searchAi = async (q: string): Promise<AiSearchResponse> => {
  const response = await api.get<AiSearchResponse>('/documents/search/ai', {
    params: { q }
  });
  return response.data;
};

//маршрутизация
export const getRoutingDocuments = async (departmentId?: number): Promise<RoutingDocument[]> => {
  try {
    const params = departmentId ? { departmentId } : {};
    const response = await api.get<RoutingDocument[]>('/documents/routing', { params });
    return response.data;
  } catch (error) {
    console.error('Ошибка получения документов в маршрутизации', error);
    throw error;
  }
};

export const getRoutingDocumentsNew = async (params?: {
  departmentId?: number;
  operatorId?: number;
  filter?: 'all' | 'matched' | 'mismatched';
  page?: number;
  limit?: number;
}): Promise<RoutingResponse> => {
  try {
    const response = await api.get<RoutingResponse>('/documents/routing', { params: params || {} });
    return response.data;
  } catch (error) {
    console.error('Ошибка получения маршрутизации', error);
    throw error;
  }
};

export const updateRouteStatus = async (routeId: number, data: UpdateRouteStatusData): Promise<void> => {
  try {
    await api.put(`/document-routes/${routeId}/status`, data);
  } catch (error) {
    console.error('Ошибка обновления статуса маршрута', error);
    throw error;
  }
};

export const getRouteTemplates = async (): Promise<RouteTemplate[]> => {
  try {
    const response = await api.get<RouteTemplate[]>('/documents/route-templates');
    return response.data;
  } catch (error) {
    console.error('Ошибка получения шаблонов маршрутизации', error);
    throw error;
  }
};

//загрузка и извлечение текста
export const uploadDocument = async (file: File): Promise<UploadResponse> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post<UploadResponse>("/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  } catch (error) {
    console.error("Ошибка загрузки документа", error);
    throw error;
  }
};

export const extractText = async (id: number): Promise<ExtractTextResponse> => {
  try {
    const res = await api.post<ExtractTextResponse>(`/documents/${id}/extract-text`);
    return res.data;
  } catch (error) {
    console.error("Ошибка извлечения текста", error);
    throw error;
  }
};

//информация о загрузке
export const getUploadInfo = async (): Promise<{
  maxFileSizeMb: number;
  maxFilesPerBatch: number;
  allowedFormats: string[];
}> => {
  const response = await api.get('/settings/upload-info');
  return response.data;
};

//экспорт
export const exportDocuments = async (filters?: ExportFilters): Promise<Blob> => {
  try {
    const response = await api.get<Blob>('/documents/export', {
      params: filters,
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    console.error('Ошибка экспорта документов', error);
    throw error;
  }
};

//настройки уведомлений
export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  try {
    const response = await api.get<NotificationSettings>('/settings/notifications');
    return response.data;
  } catch (error) {
    console.error('Ошибка получения настроек уведомлений', error);
    throw error;
  }
};

export const updateNotificationSettings = async (data: NotificationSettings): Promise<NotificationSettings> => {
  try {
    const response = await api.put<NotificationSettings>('/settings/notifications', data);
    return response.data;
  } catch (error) {
    console.error('Ошибка обновления настроек уведомлений', error);
    throw error;
  }
};

//настройки интерфейса
export const getInterfaceSettings = async (): Promise<InterfaceSettings> => {
  try {
    const response = await api.get<InterfaceSettings>('/settings/interface');
    return response.data;
  } catch (error) {
    console.error('Ошибка получения настроек интерфейса', error);
    throw error;
  }
};

export const updateInterfaceSettings = async (data: InterfaceSettings): Promise<InterfaceSettings> => {
  try {
    const response = await api.put<InterfaceSettings>('/settings/interface', data);
    return response.data;
  } catch (error) {
    console.error('Ошибка обновления настроек интерфейса', error);
    throw error;
  }
};

//безопасность
export const getSessions = async (): Promise<Session[]> => {
  try {
    const response = await api.get<Session[]>('/security/sessions');
    return response.data;
  } catch (error) {
    console.error('Ошибка получения сессий', error);
    throw error;
  }
};

export const getLoginHistory = async (page?: number, limit?: number): Promise<LoginHistoryResponse> => {
  try {
    const params: any = {};
    if (page) params.page = page;
    if (limit) params.limit = limit;
    const response = await api.get<LoginHistoryResponse>('/security/login-history', { params });
    return response.data;
  } catch (error) {
    console.error('Ошибка получения истории входов', error);
    throw error;
  }
};

export const logoutAll = async (): Promise<{ message: string }> => {
  try {
    const response = await api.post<{ message: string }>('/security/logout-all');
    return response.data;
  } catch (error) {
    console.error('Ошибка выхода со всех устройств', error);
    throw error;
  }
};

export const getAuditLog = async (
  page?: number, 
  limit?: number, 
  action?: string, 
  documentId?: number
): Promise<AuditLogResponse> => {
  try {
    const params: any = {};
    if (page) params.page = page;
    if (limit) params.limit = limit;
    if (action) params.action = action;
    if (documentId) params.documentId = documentId;
    const response = await api.get<AuditLogResponse>('/security/audit-log', { params });
    return response.data;
  } catch (error) {
    console.error('Ошибка получения журнала действий', error);
    throw error;
  }
};

export const deleteSession = async (sessionId: number): Promise<void> => {
    await api.delete(`/security/sessions/${sessionId}`);
};

//комментарии
export const getComments = async (documentId: number): Promise<Comment[]> => {
  try {
    const response = await api.get<Comment[]>(`/documents/${documentId}/comments`);
    return response.data;
  } catch (error) {
    console.error('Ошибка получения комментариев', error);
    throw error;
  }
};

export const addComment = async (documentId: number, text: string): Promise<Comment> => {
  try {
    const response = await api.post<Comment>(`/documents/${documentId}/comments`, { text });
    return response.data;
  } catch (error) {
    console.error('Ошибка добавления комментария', error);
    throw error;
  }
};

export const deleteComment = async (documentId: number, commentId: number): Promise<{ message: string }> => {
  try {
    const response = await api.delete<{ message: string }>(`/documents/${documentId}/comments/${commentId}`);
    return response.data;
  } catch (error) {
    console.error('Ошибка удаления комментария', error);
    throw error;
  }
};

//уведомления
export const getNotifications = async (page?: number, limit?: number, extraParams?: any): Promise<{ items: AppNotification[]; total: number; page: number; limit: number; totalPages: number }> => {
    const params: any = {};
    if (page !== undefined) params.page = page;
    if (limit !== undefined) params.limit = limit;
    if (extraParams) {
        if (extraParams.type) params.type = extraParams.type;
        if (extraParams.isRead) params.isRead = extraParams.isRead;
        if (extraParams.dateFrom) params.dateFrom = extraParams.dateFrom;
        if (extraParams.dateTo) params.dateTo = extraParams.dateTo;
    }
    const response = await api.get('/notifications', { params });
    return response.data;
};

export const getUnreadCount = async (): Promise<UnreadCount> => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
};

export const markAsRead = async (notificationId: number): Promise<void> => {
    await api.put(`/notifications/${notificationId}/read`);
};

export const markAllAsRead = async (): Promise<void> => {
    await api.put('/notifications/read-all');
};

export const deleteNotification = async (notificationId: number): Promise<void> => {
    await api.delete(`/notifications/${notificationId}`);
};

export const deleteAllRead = async (): Promise<{ message: string; deletedCount: number }> => {
    const response = await api.delete('/notifications/read');
    return response.data;
};

//аналитика
export const getAnalyticsData = async (): Promise<AnalyticsData> => {
  try {
    const response = await api.get<AnalyticsData>('/analytics/data');
    return response.data;
  } catch (error) {
    console.error('Ошибка получения данных аналитики', error);
    throw error;
  }
}; 

//удаление типов и категорий
export const deleteDocumentType = async (id: number): Promise<void> => {
  await api.delete(`/document-types/${id}`);
};

export const deleteDocumentCategory = async (id: number): Promise<void> => {
  await api.delete(`/document-categories/${id}`);
};

//шаблоны маршрутизации
export const createRouteTemplate = async (data: { name: string; description?: string; departmentIds: number[] }): Promise<RouteTemplate> => {
  const res = await api.post<RouteTemplate>('/documents/route-templates', data);
  return res.data;
};

export const deleteRouteTemplate = async (id: number): Promise<void> => {
  await api.delete(`/documents/route-templates/${id}`);
};

//экспорт / импорт
export const exportData = async (): Promise<Blob> => {
  const response = await api.get('/settings/export', { responseType: 'blob' });
  return response.data;
};

export const importData = async (file: File): Promise<{ message: string; counts: Record<string, number> }> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post<{ message: string; counts: Record<string, number> }>('/settings/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

//о системе
export const getAbout = async (): Promise<{ version: string }> => {
  const res = await api.get<{ version: string }>('/settings/about');
  return res.data;
};

//админ-панель
export const getAdminAuditLog = async (params?: {
  page?: number;
  limit?: number;
  userId?: number;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  userName?: string;
}): Promise<AdminAuditLogResponse> => {
  const response = await api.get<AdminAuditLogResponse>('/admin/audit-log', { params: params || {} });
  return response.data;
};

export const getAdminUsers = async (): Promise<AdminUser[]> => {
  const response = await api.get<AdminUser[]>('/admin/users');
  return response.data;
};

export const getAdminUserStats = async (id: number): Promise<AdminUserStats> => {
  const response = await api.get<AdminUserStats>(`/admin/users/${id}/stats`);
  return response.data;
};

export const updateAdminUserRole = async (id: number, role: string): Promise<{ message: string }> => {
  const response = await api.put<{ message: string }>(`/admin/users/${id}/role`, { role });
  return response.data;
};

export const toggleAdminUserBlock = async (id: number, isBlocked: boolean): Promise<{ message: string }> => {
  const response = await api.put<{ message: string }>(`/admin/users/${id}/block`, { isBlocked });
  return response.data;
};

export const createAdminUser = async (data: {
  fullName: string;
  email: string;
  password: string;
  role: string;
  departmentId?: number;
}): Promise<AdminUser> => {
  const response = await api.post<AdminUser>('/admin/users', data);
  return response.data;
};

export const resetAdminUserPassword = async (id: number, newPassword: string): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>(`/admin/users/${id}/reset-password`, { newPassword });
  return response.data;
};

export const deleteAdminUser = async (id: number): Promise<{ message: string }> => {
  const response = await api.delete<{ message: string }>(`/admin/users/${id}`);
  return response.data;
};

export const getAdminSystemSettings = async (): Promise<Record<string, any>> => {
  const response = await api.get<Record<string, any>>('/admin/system-settings');
  return response.data;
};

export const updateAdminSystemSettings = async (data: Record<string, any>): Promise<{ message: string }> => {
  const response = await api.put<{ message: string }>('/admin/system-settings', data);
  return response.data;
};

export const adminCleanup = async (type: string, olderThanMonths: number): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>('/admin/cleanup', { type, olderThanMonths });
  return response.data;
};

export const getAdminLogs = async (date?: string, from?: string, to?: string): Promise<Blob> => {
  const params: any = {};
  if (date) params.date = date;
  if (from) params.from = from;
  if (to) params.to = to;
  const response = await api.get('/admin/logs', { params, responseType: 'blob' });
  return response.data;
};

export const adminExport = async (sections: string[]): Promise<any> => {
  const response = await api.post('/admin/export', { sections });
  return response.data;
};

export const adminImport = async (file: File, sections: string[]): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('sections', JSON.stringify(sections));
  const response = await api.post('/admin/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getAdminBackupStatus = async (): Promise<AdminBackupStatus> => {
  const response = await api.get<AdminBackupStatus>('/admin/backup-status');
  return response.data;
};

export const updateAdminBackupConfig = async (data: {
  enabled: boolean;
  time: string;
  keepCount: number;
}): Promise<{ message: string }> => {
  const response = await api.put<{ message: string }>('/admin/backup-config', data);
  return response.data;
};

export const restoreAdminBackup = async (): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>('/admin/backup/restore');
  return response.data;
};

export const getAdminStats = async (): Promise<AdminStats> => {
  const response = await api.get<AdminStats>('/admin/stats');
  return response.data;
};

export const sendAdminNotification = async (data: {
  target: string;
  userIds?: number[];
  title: string;
  message: string;
}): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>('/admin/notifications/send', data);
  return response.data;
};

export const getAdminNotificationHistory = async (page?: number, limit?: number): Promise<AdminNotificationHistoryResponse> => {
  const params: any = {};
  if (page) params.page = page;
  if (limit) params.limit = limit;
  const response = await api.get<AdminNotificationHistoryResponse>('/admin/notifications/history', { params });
  return response.data;
};