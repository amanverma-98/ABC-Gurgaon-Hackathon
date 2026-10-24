import apiClient from '../lib/axios';
import { ApiResponse, AuthLoginResponse, User } from '../types/api';

export const authService = {
  login: async (credentials: { email: string; password: string }): Promise<AuthLoginResponse> => {
    const response = await apiClient.post<ApiResponse<AuthLoginResponse>>('/auth/login', credentials);
    return response.data.data;
  },

  registerAdmin: async (payload: {
    hospitalName: string;
    stateCode: string;
    name: string;
    email: string;
    password: string;
  }): Promise<User> => {
    const response = await apiClient.post<ApiResponse<User>>('/auth/register-admin', payload);
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post<ApiResponse<any>>('/auth/logout');
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me');
    return response.data.data;
  },
};
