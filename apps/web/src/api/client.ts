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
      // Seul l'admin est renvoyé vers le login ; un visiteur dont la session expire reste sur le site
      if (window.location.pathname.startsWith('/admin')) window.location.href = '/admin/login';
    }
    return Promise.reject(err);
  },
);
