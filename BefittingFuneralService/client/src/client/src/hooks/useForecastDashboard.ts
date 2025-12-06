import { useQuery } from '@tanstack/react-query';
import { fetchForecastDashboard } from '../services/api';

export function useForecastDashboard() {
  return useQuery({
    queryKey: ['forecast-dashboard'],
    queryFn: async () => {
      const response = await fetchForecastDashboard();
      return response.data;
    },
    refetchInterval: 1000 * 60,
    staleTime: 1000 * 30
  });
}

