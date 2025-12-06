import { useEffect, useState } from 'react';
import { fetchSupervisorInsights } from '../services/supervisorService';

export default function useSupervisorAI(caseId: string) {
  const [insight, setInsight] = useState(null);
  useEffect(() => {
    if (!caseId) return;
    void (async () => {
      const data = await fetchSupervisorInsights(caseId);
      setInsight(data);
    })();
  }, [caseId]);
  return insight;
}

