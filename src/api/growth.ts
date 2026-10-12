import api from './client';

export const getGrowthRoadmap = async () => {
  const response = await api.get('/growth');
  return response.data;
};

export const getGrowthFeature = async (id: string) => {
  const response = await api.get(`/growth/${id}`);
  return response.data;
};

export const getGrowthSummary = async () => {
  const response = await api.get('/growth/summary');
  return response.data;
};
