import { apiClient } from './api';

export type StaffRole = 'admin' | 'coordinator' | 'director' | 'agent';

export interface StaffRecord {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: StaffRole;
  isActive: boolean;
  lastLogin?: string | null;
  createdAt: string;
}

export type CreateStaffPayload = {
  name: string;
  phone: string;
  email?: string;
  role: StaffRole;
  password: string;
};

export const STAFF_ROLES: StaffRole[] = ['admin', 'coordinator', 'director', 'agent'];

export async function fetchStaffList() {
  const response = await apiClient.get<{ success: boolean; data: StaffRecord[] }>('/admin/staff');
  return response.data.data;
}

export async function createStaff(payload: CreateStaffPayload) {
  const response = await apiClient.post<{ success: boolean; data: StaffRecord }>('/admin/staff', payload);
  return response.data.data;
}

export async function updateStaff(id: string, payload: Partial<Pick<StaffRecord, 'name' | 'phone' | 'email' | 'role' | 'isActive'>>) {
  const response = await apiClient.patch<{ success: boolean; data: StaffRecord }>(`/admin/staff/${id}`, payload);
  return response.data.data;
}

export async function resetStaffPassword(id: string, newPassword?: string) {
  const response = await apiClient.post<{ success: boolean; message: string }>(`/admin/staff/${id}/reset-password`, {
    password: newPassword
  });
  return response.data;
}

export interface StaffEvent {
  id: string;
  action: string;
  metadata: Record<string, any> | null;
  created_at: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  target_id: string | null;
  target_name: string | null;
  target_email: string | null;
}

export interface StaffEventPage {
  success: boolean;
  data: StaffEvent[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listStaffEvents(page = 1, limit = 20) {
  const response = await apiClient.get<StaffEventPage>('/admin/staff/events', {
    params: { page, limit }
  });
  return response.data;
}


