import axios from 'axios';
import { LoginResponse, DashboardData } from '../types';

export const api = axios.create({
  baseURL: 'http://localhost:3000',
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