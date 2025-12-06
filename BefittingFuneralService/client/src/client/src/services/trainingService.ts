import { apiClient } from './api';

export async function fetchTrainingModules() {
  const res = await apiClient.get('/training/modules');
  return res.data.modules;
}

export async function fetchTrainingProgress() {
  const res = await apiClient.get('/training/progress');
  return res.data.progress;
}

