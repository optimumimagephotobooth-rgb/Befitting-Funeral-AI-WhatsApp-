import { useEffect, useState } from 'react';
import { fetchTrainingModules, fetchTrainingProgress } from '../services/trainingService';

export default function useTrainingEngine(staffId: string) {
  const [modules, setModules] = useState([]);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    void (async () => {
      const [modulesData, progressData] = await Promise.all([
        fetchTrainingModules(),
        fetchTrainingProgress(staffId)
      ]);
      setModules(modulesData);
      setProgress(progressData);
    })();
  }, [staffId]);

  return { modules, progress };
}

