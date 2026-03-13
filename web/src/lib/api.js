import axios from 'axios';
import { getUserIdFromLocalStorage, showError } from './utils';

function createAPIInstance() {
  const instance = axios.create({
    baseURL: import.meta.env.VITE_REACT_APP_SERVER_URL
      ? import.meta.env.VITE_REACT_APP_SERVER_URL
      : '',
    headers: {
      'Nox-API-User': getUserIdFromLocalStorage(),
      'Cache-Control': 'no-store',
    },
  });

  // Dedup in-flight GET requests
  const originalGet = instance.get.bind(instance);
  const inFlightGetRequests = new Map();

  const genKey = (url, config = {}) => {
    const params = config.params ? JSON.stringify(config.params) : '{}';
    return `${url}?${params}`;
  };

  instance.get = (url, config = {}) => {
    if (config?.disableDuplicate) {
      return originalGet(url, config);
    }
    const key = genKey(url, config);
    if (inFlightGetRequests.has(key)) {
      return inFlightGetRequests.get(key);
    }
    const reqPromise = originalGet(url, config).finally(() => {
      inFlightGetRequests.delete(key);
    });
    inFlightGetRequests.set(key, reqPromise);
    return reqPromise;
  };

  // Response interceptor — handle errors globally
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.config && error.config.skipErrorHandler) {
        return Promise.reject(error);
      }
      showError(error);
      return Promise.reject(error);
    },
  );

  return instance;
}

export let API = createAPIInstance();

export function updateAPI() {
  API = createAPIInstance();
}
