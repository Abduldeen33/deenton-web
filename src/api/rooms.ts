import api from './client';

export const getRooms = async () => {
  const response = await api.get('/rooms');
  return response.data;
};

export const getRoomSummary = async () => {
  const response = await api.get('/rooms/summary');
  return response.data;
};

export const getRoomTypes = async () => {
  const response = await api.get('/rooms/types');
  return response.data;
};

export const updateRoomStatus = async (id: string, data: any) => {
  const response = await api.patch(`/rooms/${id}/status`, data);
  return response.data;
};