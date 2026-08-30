import api from './client';
import type { DashboardSummary } from '../types';

export const getDashboard = async (): Promise<DashboardSummary> => {
  const response = await api.get('/reports/dashboard');
  return response.data;
};

export const getOccupancy = async () => {
  const response = await api.get('/reports/occupancy');
  return response.data;
};

export const getDailyRevenue = async (date?: string) => {
  const response = await api.get('/reports/daily-revenue', {
    params: { date },
  });
  return response.data;
};