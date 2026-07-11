import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true, // send the HttpOnly session cookie with every request
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const url: string = err.config?.url ?? '';
    const isPublicUnlock = url.includes('/unlock');
    if (err.response?.status === 401 && !isPublicUnlock) {
      useAuthStore.getState().logout();
      window.location.href = '/admin/login';
    }
    return Promise.reject(err);
  },
);
