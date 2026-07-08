import axios from 'axios';

const client = axios.create({ baseURL: '/api' });

client.interceptors.request.use(config => {
  const token = localStorage.getItem('physc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && !err.config?.url?.startsWith('/auth/')) {
      localStorage.removeItem('physc_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;
