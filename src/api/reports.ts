import api from './client';

export interface DashboardSummary {
  arrivalsToday: number;
  departuresToday: number;
  inHouse: number;
  todayRevenue: number;
  outstandingBalance: number;
  occupancy: {
    vacant: number;
    occupied: number;
    reserved: number;
    dirty: number;
    blocked: number;
    occupancyRate: string;
  };
}

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
