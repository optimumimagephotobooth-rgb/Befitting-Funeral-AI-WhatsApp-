import { useState, useEffect } from 'react';
import { listCases } from '../services/api';

export const useCases = () => {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    listCases()
      .then((res) => setCases(res.data.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return { cases, loading };
};



