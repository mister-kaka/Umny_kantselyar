import axios from 'axios';
import { LoginResponse, DashboardData } from '../types';

export const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token'); // берем токен
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`; // добавляем в заголовок
  }
  return config;
});

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await api.post<LoginResponse>('/api/auth/login', {  email, password });
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