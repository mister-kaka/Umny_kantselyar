import axios from 'axios';
import { LoginResponse, DashboardData } from '../types';
import { DocumentsListResponse, DocumentCard } from '../types';
import { DocumentType, DocumentCategory } from '../types';
import { Department, AiSettings, AiProvider, SearchResult } from '../types';

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


export const getAiSettings = async (): Promise<AiSettings> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: 1,
        provider_code: "openai",
        model_name: "gpt-4",
        api_key: "********",
        base_url: "https://api.openai.com/v1",
        is_active: true,
      });
    }, 300);
  });
};


export const updateAiSettings = async (data: AiSettings): Promise<AiSettings> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ...data,
      });
    }, 300);
  });
};


export const getAiProviders = async (): Promise<AiProvider[]> => {
  return [
    {
      provider_code: "openai",
      provider_name: "OpenAI",
      models: [
        { model_code: "gpt-3", model_name: "GPT-3" },
        { model_code: "gpt-4", model_name: "GPT-4" }
      ]
    },
    {
      provider_code: "anthropic",
      provider_name: "Anthropic",
      models: [
        { model_code: "claude-1", model_name: "Claude-1" },
        { model_code: "claude-2", model_name: "Claude-2" }
      ]
    }
  ];
};

export const searchDocuments = async (query: string): Promise<SearchResult> => {
  return {
    items: [
      {
        id: 1,
        registrationNumber: "DOC-001",
        title: `Результат поиска по "${query}"`,
        senderName: "Иванов И.И.",
        receivedDate: "2026-05-10",
        documentType: "Договор",
        category: "Счет",
        currentStatus: "В работе",
        department: "Отдел продаж"
      }
    ]
  };
};