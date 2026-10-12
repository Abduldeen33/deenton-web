import api from './client';

export const getReservations = async () => {
  const response = await api.get('/reservations');
  return response.data;
};

export const getTodayReservations = async () => {
  const response = await api.get('/reservations/today');
  return response.data;
};

export const createReservation = async (data: any) => {
  const response = await api.post('/reservations', data);
  return response.data;
};

export const updateReservation = async (id: string, data: any) => {
  const response = await api.patch(`/reservations/${id}`, data);
  return response.data;
};

export const sendReservationEmail = async (id: string, email?: string) => {
  const response = await api.post(`/reservations/${id}/send-email`, { email });
  return response.data;
};

export const checkIn = async (id: string) => {
  const response = await api.patch(`/reservations/${id}/checkin`);
  return response.data;
};

export const checkOut = async (id: string) => {
  const response = await api.patch(`/reservations/${id}/checkout`);
  return response.data;
};