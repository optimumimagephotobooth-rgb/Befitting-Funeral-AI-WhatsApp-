import { apiClient } from './api';

export async function fetchAuditEvents() {
  const res = await apiClient.get('/audit/events');
  return res.data.events;
}

