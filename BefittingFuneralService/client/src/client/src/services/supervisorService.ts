import { apiClient } from './api';

export async function fetchSupervisorInsights(caseId: string) {
  const res = await apiClient.post('/ai/supervisor', { caseId });
  return res.data.insight;
}

