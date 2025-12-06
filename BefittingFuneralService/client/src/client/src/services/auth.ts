import axios from 'axios';
import { StaffRole } from './staff';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export interface LoginResponse {
  success: boolean;
  data: {
    mfaRequired?: boolean;
    staffId?: string;
    staff?: {
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
      role: StaffRole;
    };
    accessToken?: string;
    refreshToken?: string;
    otp?: string;
  };
}

export async function loginStaff(phone: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', { phone, password });
  return response.data;
}

export async function verifyStaffMfa(staffId: string, otp: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/mfa/verify', {
    staffId,
    otp
  });
  return response.data;
}


