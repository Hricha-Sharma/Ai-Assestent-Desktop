import { apiClient } from './client';
import type { AuthResponse, User } from '@/types/auth';

export const authAPI = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  async register(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/register', {
      email,
      password,
    });
    return response.data;
  },

  async refresh(): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

