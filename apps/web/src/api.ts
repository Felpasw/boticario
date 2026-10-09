import axios from 'axios';

import { API_URL } from './globals';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  paramsSerializer: { indexes: null },
});

const LOGIN_PATH = '/login';

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status === 401 && typeof window !== 'undefined' && window.location.pathname !== LOGIN_PATH) {
      // hard reload clears TanStack cache + Zustand state on session loss
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = LOGIN_PATH;
    }
    return Promise.reject(error);
  },
);

export default api;
