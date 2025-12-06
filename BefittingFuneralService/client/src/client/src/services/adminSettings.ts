import { apiClient } from './api';
import type { QuietThresholdConfig } from '../settings/quietThresholds';

type QuietSettingsResponse = {
  success: boolean;
  data: {
    config: QuietThresholdConfig;
    updatedAt: string;
  };
};

export async function fetchQuietSettings() {
  const response = await apiClient.get<QuietSettingsResponse>('/admin/settings/quiet');
  return response.data.data;
}

export async function saveQuietSettings(payload: QuietThresholdConfig) {
  const response = await apiClient.put<QuietSettingsResponse>('/admin/settings/quiet', payload);
  return response.data.data;
}

