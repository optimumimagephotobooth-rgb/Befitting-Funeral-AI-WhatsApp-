import { useEffect, useState } from 'react';
import { getRealtimeStatus, onRealtimeStatusChange } from '../services/supabaseRealtime';

type ServiceStatus = 'ok' | 'down' | 'unknown';

export interface HeartbeatHistoryEntry {
  timestamp: number;
  overall: 'ok' | 'degraded' | 'down';
  statuses: {
    api: ServiceStatus;
    storage: ServiceStatus;
    realtime: ServiceStatus;
  };
}

export interface HeartbeatSnapshot {
  statuses: {
    api: ServiceStatus;
    storage: ServiceStatus;
    realtime: ServiceStatus;
  };
  lastChecked: number | null;
  offline: boolean;
  overall: 'ok' | 'degraded' | 'down';
  history: HeartbeatHistoryEntry[];
}

const BASE_INTERVAL = 10000;
const MAX_INTERVAL = 60000;

const defaultState: HeartbeatSnapshot = {
  statuses: {
    api: 'unknown',
    storage: 'unknown',
    realtime: mapRealtimeStatus(getRealtimeStatus())
  },
  lastChecked: null,
  offline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
  overall: 'down',
  history: []
};

let currentState: HeartbeatSnapshot = {
  ...defaultState,
  overall: computeOverall(defaultState.statuses)
};

const subscribers = new Set<(state: HeartbeatSnapshot) => void>();
const HISTORY_WINDOW = 24 * 60 * 60 * 1000;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let pollDelay = BASE_INTERVAL;
let realtimeUnsubscribe: (() => void) | null = null;
let onlineHandlersAttached = false;

function mapSystemStatus(status?: string | null): ServiceStatus {
  if (status === 'ok') return 'ok';
  if (status === 'down') return 'down';
  return 'unknown';
}

function mapRealtimeStatus(status: string | null | undefined): ServiceStatus {
  if (status === 'connected') return 'ok';
  if (status === 'connecting') return 'unknown';
  if (status === 'disconnected') return 'down';
  return 'unknown';
}

function computeOverall(statuses: HeartbeatSnapshot['statuses']): 'ok' | 'degraded' | 'down' {
  if (statuses.api === 'down') {
    return 'down';
  }
  if (statuses.storage === 'down' || statuses.realtime === 'down') {
    return 'degraded';
  }
  if (
    statuses.api === 'unknown' ||
    statuses.storage === 'unknown' ||
    statuses.realtime === 'unknown'
  ) {
    return 'degraded';
  }
  return 'ok';
}

function setHeartbeatState(
  updater:
    | HeartbeatSnapshot
    | ((prev: HeartbeatSnapshot) => HeartbeatSnapshot | Partial<HeartbeatSnapshot>)
) {
  const nextValue =
    typeof updater === 'function' ? updater(currentState) : (updater as HeartbeatSnapshot);
  const nextStatuses = nextValue.statuses || currentState.statuses;
  const historyEntry: HeartbeatHistoryEntry = {
    timestamp: nextValue.lastChecked ?? Date.now(),
    overall: computeOverall(nextStatuses),
    statuses: nextStatuses
  };

  const updatedHistory = [...(nextValue.history || currentState.history || []), historyEntry].filter(
    (entry) => entry.timestamp >= Date.now() - HISTORY_WINDOW
  );

  currentState = {
    ...currentState,
    ...nextValue,
    statuses: nextStatuses,
    overall: computeOverall(nextStatuses),
    history: updatedHistory
  };
  subscribers.forEach((listener) => listener(currentState));
}

function startHeartbeat() {
  if (pollTimer) {
    return;
  }
  attachRealtimeListener();
  attachOnlineListeners();
  schedulePoll(0);
}

function stopHeartbeat() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  detachRealtimeListener();
  detachOnlineListeners();
}

function attachRealtimeListener() {
  if (realtimeUnsubscribe) {
    return;
  }
  realtimeUnsubscribe = onRealtimeStatusChange((status) => {
    const mapped = mapRealtimeStatus(status);
    setHeartbeatState((prev) => {
      if (prev.statuses.realtime === mapped) {
        return prev;
      }
      return {
        ...prev,
        statuses: {
          ...prev.statuses,
          realtime: mapped
        }
      };
    });
  });
}

function detachRealtimeListener() {
  if (realtimeUnsubscribe) {
    realtimeUnsubscribe();
    realtimeUnsubscribe = null;
  }
}

let onlineHandler: (() => void) | null = null;
let offlineHandler: (() => void) | null = null;

function attachOnlineListeners() {
  if (onlineHandlersAttached || typeof window === 'undefined') {
    return;
  }

  onlineHandler = () => {
    setHeartbeatState({ offline: false });
    pollDelay = BASE_INTERVAL;
    schedulePoll(0);
  };

  offlineHandler = () => {
    setHeartbeatState((prev) => ({
      ...prev,
      offline: true,
      statuses: {
        ...prev.statuses,
        api: 'down'
      }
    }));
  };

  window.addEventListener('online', onlineHandler);
  window.addEventListener('offline', offlineHandler);
  onlineHandlersAttached = true;
}

function detachOnlineListeners() {
  if (!onlineHandlersAttached || typeof window === 'undefined') {
    return;
  }
  if (onlineHandler) {
    window.removeEventListener('online', onlineHandler);
    onlineHandler = null;
  }
  if (offlineHandler) {
    window.removeEventListener('offline', offlineHandler);
    offlineHandler = null;
  }
  onlineHandlersAttached = false;
}

function schedulePoll(delay = pollDelay) {
  if (pollTimer) {
    clearTimeout(pollTimer);
  }
  pollTimer = window.setTimeout(async () => {
    await runHealthCheck();
    schedulePoll(pollDelay);
  }, Math.max(0, delay));
}

async function runHealthCheck() {
  const offline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
  let statuses = { ...currentState.statuses };

  try {
    if (offline) {
      throw new Error('offline');
    }

    const response = await fetch('/health', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Health check failed');
    }

    const payload = await response.json();
    statuses = {
      api: mapSystemStatus(payload.status),
      storage: mapSystemStatus(payload?.systems?.storage),
      realtime: combineRealtimeStatus(mapSystemStatus(payload?.systems?.realtime))
    };
    pollDelay = BASE_INTERVAL;
  } catch (error) {
    statuses = {
      api: 'down',
      storage: statuses.storage === 'ok' ? statuses.storage : 'down',
      realtime: statuses.realtime === 'ok' ? statuses.realtime : 'down'
    };
    pollDelay = Math.min(pollDelay * 2, MAX_INTERVAL);
  }

  setHeartbeatState({
    statuses,
    lastChecked: Date.now(),
    offline
  });
}

function combineRealtimeStatus(serverStatus: ServiceStatus): ServiceStatus {
  const clientStatus = mapRealtimeStatus(getRealtimeStatus());
  if (serverStatus === 'down' || clientStatus === 'down') {
    return 'down';
  }
  if (serverStatus === 'ok' && clientStatus === 'ok') {
    return 'ok';
  }
  return 'unknown';
}

export function useHeartbeatStatus() {
  const [snapshot, setSnapshot] = useState(currentState);

  useEffect(() => {
    subscribers.add(setSnapshot);
    startHeartbeat();
    return () => {
      subscribers.delete(setSnapshot);
      if (!subscribers.size) {
        stopHeartbeat();
      }
    };
  }, []);

  return snapshot;
}

