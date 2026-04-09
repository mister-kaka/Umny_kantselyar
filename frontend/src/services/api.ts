import axios from 'axios';

// создаю экземпляр axios с базовым URL
export const api = axios.create({
  baseURL: 'http://localhost:3000',  // адрес бэкенда
  headers: {
    'Content-Type': 'application/json'
  }
});