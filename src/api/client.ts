import axios from 'axios';
import { getUser } from '../store/auth';
import { can, canOperate } from '../store/permissions';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const permittedPayment = config.method?.toLowerCase() === 'post' && can('record_payments') && (config.url === '/billing/payment' || /^\/billing\/house-accounts\/[^/]+\/payments$/.test(config.url || ''));
  const permittedNightAudit = config.url === '/night-audit/run' && config.method?.toLowerCase() === 'post' && can('night_audit');
  const permittedReservation = config.url === '/reservations' && config.method?.toLowerCase() === 'post' && can('create_reservations');
  const permittedPosSale = ['RESTAURANT', 'BAR'].includes(getUser()?.role || '') && config.method?.toLowerCase() === 'post' && /^(\/pos\/orders|\/pos\/orders\/[^/]+\/(settle|split-bill)|\/pos\/shifts|\/pos\/shifts\/[^/]+\/close)$/.test(config.url || '');
  if (getUser() && !canOperate() && !permittedPosSale && !permittedPayment && !permittedNightAudit && !permittedReservation && !['get', 'head', 'options'].includes((config.method || 'get').toLowerCase()) && !config.url?.startsWith('/auth/')) {
    return Promise.reject(new axios.AxiosError('Your staff account is view-only. Ask your supervisor or manager.', 'ERR_FORBIDDEN', config, undefined, { status: 403, statusText: 'Forbidden', data: { message: 'Your staff account is view-only. Ask your supervisor or manager.' }, headers: {}, config }));
  }
  const token = localStorage.getItem('deenton_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('deenton_token');
      localStorage.removeItem('deenton_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
