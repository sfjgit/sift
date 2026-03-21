import axios from 'axios';
import env from '@/config/env';

const api = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL + '/core/api',
  withCredentials: true, // sends cookies automatically on every request
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
