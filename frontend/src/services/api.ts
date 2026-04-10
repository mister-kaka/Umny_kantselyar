import axios from 'axios';
import { LoginResponse, DashboardData } from '../types';

export const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' }
});

export const login = async (username: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await api.post<LoginResponse>('/auth/login', { username, password });
    return response.data;
  } catch (error) {
    console.error('Ошибка логина', error);
    throw error;
  }
};

export const getDashboard = async (): Promise<DashboardData> => {
  try {
    const token = localStorage.getItem('token');
    const response = await api.get<DashboardData>('/dashboard/data', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Ошибка получения данных дашборда', error);
    throw error;
  }
};