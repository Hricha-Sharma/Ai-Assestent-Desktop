import { create } from 'zustand';
import { authAPI } from '@/api/auth';
import { apiClient } from '@/api/client';
import type { User } from '@/types/auth';

interface AuthStoreState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setTokens: (accessToken, refreshToken) => {
    set({ accessToken, refreshToken, isAuthenticated: true });
    apiClient.setTokens(accessToken, refreshToken);
  },

  setUser: (user) => {
    set({ user });
  },

  setError: (error) => {
    set({ error });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authAPI.login(email, password);
      
      get().setTokens(response.access_token, response.refresh_token);
      set({ user: response.user, isAuthenticated: true });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Login failed';
      set({ error: errorMessage, isLoading: false });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authAPI.register(email, password);
      
      get().setTokens(response.access_token, response.refresh_token);
      set({ user: response.user, isAuthenticated: true });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Registration failed';
      set({ error: errorMessage, isLoading: false });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true });
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      set({ 
        user: null, 
        accessToken: null, 
        refreshToken: null, 
        isAuthenticated: false,
        isLoading: false,
        error: null 
      });
      apiClient.clearTokens();
    }
  },

  initializeAuth: async () => {
    try {
      set({ isLoading: true });
      // Try to restore tokens from localStorage
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      if (accessToken && refreshToken) {
        set({ accessToken, refreshToken, isAuthenticated: true });
        apiClient.setTokens(accessToken, refreshToken);

        // Verify token is still valid
        try {
          const user = await authAPI.getCurrentUser();
          set({ user });
        } catch (error) {
          // Token might be expired, clear it
          set({ 
            accessToken: null, 
            refreshToken: null, 
            isAuthenticated: false,
            user: null 
          });
          apiClient.clearTokens();
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));

