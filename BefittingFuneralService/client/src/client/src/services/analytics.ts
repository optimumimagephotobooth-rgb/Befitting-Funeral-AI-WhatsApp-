import { apiClient } from './api';

export interface OverallStats {
  contacts: {
    total: number;
    new: number;
  };
  cases: {
    total: number;
    active: number;
    completed: number;
    conversionRate: number;
  };
  messages: {
    total: number;
    inbound: number;
    outbound: number;
    averagePerCase: number;
  };
  referrals: {
    total: number;
    used: number;
    conversionRate: number;
  };
}

type OverallStatsResponse = {
  success: boolean;
  data: {
    contacts: { total: number; new: number };
    cases: { total: number; active: number; completed: number; conversionRate: string | number };
    messages: {
      total: number;
      inbound: number;
      outbound: number;
      averagePerCase: string | number;
    };
    referrals: { total: number; used: number; conversionRate: string | number };
  };
};

function normalizeStats(payload: OverallStatsResponse['data']): OverallStats {
  return {
    contacts: {
      total: payload.contacts.total,
      new: payload.contacts.new
    },
    cases: {
      total: payload.cases.total,
      active: payload.cases.active,
      completed: payload.cases.completed,
      conversionRate: Number(payload.cases.conversionRate ?? 0)
    },
    messages: {
      total: payload.messages.total,
      inbound: payload.messages.inbound,
      outbound: payload.messages.outbound,
      averagePerCase: Number(payload.messages.averagePerCase ?? 0)
    },
    referrals: {
      total: payload.referrals.total,
      used: payload.referrals.used,
      conversionRate: Number(payload.referrals.conversionRate ?? 0)
    }
  };
}

export async function fetchOverallStats(params?: { startDate?: string; endDate?: string }) {
  const response = await apiClient.get<OverallStatsResponse>('/api/analytics/stats', {
    params
  });
  return normalizeStats(response.data.data);
}

