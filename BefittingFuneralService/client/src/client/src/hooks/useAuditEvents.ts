import { useEffect, useState } from 'react';
import { fetchAuditEvents } from '../services/auditService';

export default function useAuditEvents() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await fetchAuditEvents();
      setEvents(data);
    };
    void load();
  }, []);

  return events;
}

