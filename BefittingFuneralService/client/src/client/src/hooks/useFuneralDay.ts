import { useQuery } from '@tanstack/react-query';
import { fetchFuneralDay } from '../services/api';

export function useFuneralDay(caseId: string) {
  return useQuery(['funeral-day', caseId], () => fetchFuneralDay(caseId), {
    enabled: !!caseId,
    staleTime: 1000 * 60 * 5
  });
}

