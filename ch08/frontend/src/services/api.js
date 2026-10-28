import axios from 'axios';
import { clearToken, getToken } from './authStorage'

// Override with VITE_API_URL in frontend/.env when the API is not on localhost.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && getToken()) {
      clearToken()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:expired'))
      }
    } else if (error.response?.status === 403 && getToken()) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:refresh'))
      }
    }
    return Promise.reject(error)
  },
)
