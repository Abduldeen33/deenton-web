import api from './client';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  propertyCode: string;
  propertyName: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export const login = async (
  propertyCode: string,
  email: string,
  password: string
): Promise<AuthResponse> => {
  const response = await api.post('/auth/login', {
    propertyCode,
    email,
    password,
  });
  return response.data;
};