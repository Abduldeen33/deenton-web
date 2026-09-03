export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  propertyCode: string;
  propertyName: string;
}

export const getToken = (): string | null => {
  return localStorage.getItem('deenton_token');
};

export const getUser = (): User | null => {
  const user = localStorage.getItem('deenton_user');
  return user ? JSON.parse(user) : null;
};

export const setAuth = (token: string, user: User): void => {
  localStorage.setItem('deenton_token', token);
  localStorage.setItem('deenton_user', JSON.stringify(user));
};

export const clearAuth = (): void => {
  localStorage.removeItem('deenton_token');
  localStorage.removeItem('deenton_user');
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};