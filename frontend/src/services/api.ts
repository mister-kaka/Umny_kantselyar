import axios from 'axios';
import { LoginResponse, DashboardData } from '../types';
import { DocumentsListResponse, DocumentCard } from '../types';
import { DocumentType, DocumentCategory } from '../types';
import { Department } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(config => {
 const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');// берем токен
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

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await api.post<LoginResponse>('/auth/login', {  email, password });
    return response.data;
  } catch (error) {
    console.error('Ошибка логина', error);
    throw error;
  }
};

export const getDashboard = async (): Promise<DashboardData> => {
  try {
    const response = await api.get<DashboardData>('/dashboard/data');
    return response.data;
  } catch (error) {
    console.error('Ошибка получения данных дашборда', error);
    throw error;
  }
};

export const getDocuments = async (filters?: {
  typeId?: number;
  categoryId?: number;
  status?: string;
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

export const getDepartments = async (): Promise<Department[]> => {
  try {
    const response = await api.get<Department[]>('/departments');
    return response.data;
  } catch (error) {
    console.error('Ошибка получения списка подразделений', error);
    throw error;
  }
};