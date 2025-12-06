import {
  createClient,
  RealtimeChannel,
  RealtimePostgresChangesPayload
} from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseClient =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

type RealtimeConnectionStatus = 'connected' | 'connecting' | 'disconnected';
const realtimeStatusListeners = new Set<(status: RealtimeConnectionStatus) => void>();
let realtimeStatus: RealtimeConnectionStatus = supabaseClient ? 'connecting' : 'disconnected';

function setRealtimeStatus(status: RealtimeConnectionStatus) {
  realtimeStatus = status;
  realtimeStatusListeners.forEach((listener) => listener(status));
}

if (supabaseClient) {
  const realtimeClient = (supabaseClient.realtime as unknown) as {
    onOpen?: (callback: () => void) => void;
    onClose?: (callback: () => void) => void;
    onError?: (callback: () => void) => void;
  };
  realtimeClient?.onOpen?.(() => setRealtimeStatus('connected'));
  realtimeClient?.onClose?.(() => setRealtimeStatus('disconnected'));
  realtimeClient?.onError?.(() => setRealtimeStatus('disconnected'));
} else {
  setRealtimeStatus('disconnected');
}

export function subscribeMessages(handler: (event: RealtimePostgresChangesPayload<any>) => void) {
  if (!supabaseClient) {
    return null;
  }

  const subscription = supabaseClient
    .channel('realtime-messages')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages' },
      handler
    )
    .subscribe();

  return subscription;
}

export function subscribeMessagesForCase(
  caseId: string,
  handler: (event: RealtimePostgresChangesPayload<any>) => void
) {
  if (!supabaseClient) {
    return null;
  }
  const channel = supabaseClient
    .channel(`realtime-messages-${caseId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `case_id=eq.${caseId}` },
      handler
    )
    .subscribe();
  return channel;
}

export function subscribeCaseEvents(handler: (event: RealtimePostgresChangesPayload<any>) => void) {
  if (!supabaseClient) {
    return null;
  }

  const subscription = supabaseClient
    .channel('realtime-case-events')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'case_events' },
      handler
    )
    .subscribe();

  return subscription;
}

export function subscribeCaseEventsForCase(
  caseId: string,
  handler: (event: RealtimePostgresChangesPayload<any>) => void
) {
  if (!supabaseClient) {
    return null;
  }
  const channel = supabaseClient
    .channel(`realtime-case-events-${caseId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'case_events', filter: `case_id=eq.${caseId}` },
      handler
    )
    .subscribe();
  return channel;
}

export function subscribeStaffEvents(handler: (event: RealtimePostgresChangesPayload<any>) => void) {
  if (!supabaseClient) {
    return null;
  }

  const subscription = supabaseClient
    .channel('realtime-staff-events')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'staff_events' },
      handler
    )
    .subscribe();

  return subscription;
}

export function subscribeQuietSettings(handler: (event: RealtimePostgresChangesPayload<any>) => void) {
  if (!supabaseClient) {
    return null;
  }

  const subscription = supabaseClient
    .channel('realtime-admin-settings')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'admin_settings' },
      handler
    )
    .subscribe();

  return subscription;
}

export function unsubscribeChannel(channel: RealtimeChannel | null) {
  if (!supabaseClient || !channel) {
    return;
  }

  supabaseClient.removeChannel(channel);
}

export function onRealtimeStatusChange(callback: (status: RealtimeConnectionStatus) => void) {
  realtimeStatusListeners.add(callback);
  callback(realtimeStatus);
  return () => {
    realtimeStatusListeners.delete(callback);
  };
}

export function getRealtimeStatus() {
  return realtimeStatus;
}

export { supabaseClient };

