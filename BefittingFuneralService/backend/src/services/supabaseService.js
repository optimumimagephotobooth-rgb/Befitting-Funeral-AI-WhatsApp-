import { createClient } from '@supabase/supabase-js';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

const hasSupabase = config.supabase.url && config.supabase.serviceKey;
const supabaseClient = hasSupabase
  ? createClient(config.supabase.url, config.supabase.serviceKey)
  : null;

export async function insertMessageToSupabase(payload) {
  if (!supabaseClient) {
    return null;
  }

  try {
    const { data, error } = await supabaseClient
      .from('messages')
      .insert({
        case_id: payload.case_id,
        direction: payload.direction,
        from_number: payload.from_number,
        body: payload.body,
        raw: payload.raw ? JSON.stringify(payload.raw) : null,
        logged_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.warn('Supabase message insert failed', error);
      return null;
    }

    return data;
  } catch (error) {
    logger.warn('Error sending message to Supabase', error);
    return null;
  }
}

export async function logCaseEvent(payload) {
  if (!supabaseClient) {
    return null;
  }

  try {
    const { data, error } = await supabaseClient
      .from('case_events')
      .insert({
        case_id: payload.case_id,
        event_type: payload.event_type,
        stage: payload.stage,
        metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.warn('Supabase case event insert failed', error);
      return null;
    }

    return data;
  } catch (error) {
    logger.warn('Error logging case event to Supabase', error);
    return null;
  }
}

export async function listCaseEvents(caseId, limit = 50) {
  if (!supabaseClient) {
    return [];
  }

  try {
    const { data, error } = await supabaseClient
      .from('case_events')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.warn('Supabase case events fetch failed', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.warn('Error fetching case events from Supabase', error);
    return [];
  }
}

export async function insertAnnouncement(payload) {
  if (!supabaseClient) {
    return null;
  }

  try {
    const { data, error } = await supabaseClient
      .from('announcements')
      .insert({
        title: payload.title,
        body: payload.body,
        channel: payload.channel,
        scheduled_at: payload.scheduledAt || null,
        // capture additional metadata if needed
        metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.warn('Supabase announcement insert failed', error);
      return null;
    }

    return data;
  } catch (error) {
    logger.warn('Error logging announcement to Supabase', error);
    return null;
  }
}

export async function listAnnouncements(limit = 20) {
  if (!supabaseClient) {
    return [];
  }

  try {
    const { data, error } = await supabaseClient
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.warn('Supabase announcement list failed', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.warn('Error fetching announcements from Supabase', error);
    return [];
  }
}

export function isSupabaseEnabled() {
  return !!supabaseClient;
}

export async function logStaffEvent(payload) {
  if (!supabaseClient) {
    return null;
  }

  try {
    const { data, error } = await supabaseClient
      .from('staff_events')
      .insert({
        staff_id: payload.staff_id,
        actor_id: payload.actor_id,
        actor_name: payload.actor_name,
        event_type: payload.event_type,
        metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.warn('Supabase staff event insert failed', error);
      return null;
    }

    return data;
  } catch (error) {
    logger.warn('Error logging staff event to Supabase', error);
    return null;
  }
}

export async function listStaffEvents(limit = 20) {
  if (!supabaseClient) {
    return [];
  }

  try {
    const { data, error } = await supabaseClient
      .from('staff_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.warn('Supabase staff events fetch failed', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.warn('Error fetching staff events from Supabase', error);
    return [];
  }
}

export const defaultQuietThresholds = {
  businessWarningHours: 12,
  businessAlertHours: 24,
  offHoursWarningHours: 36,
  offHoursAlertHours: 72
};

export async function listPaymentAudits({ limit = 10 } = {}) {
  if (!supabaseClient) {
    return { caseEvents: [], staffEvents: [] };
  }

  const paymentTypes = ['PAYMENT_INSTRUCTIONS_SENT', 'PAYMENT_AUTO_DETECTED', 'PAYMENT_CONFIRMED'];

  try {
    const [caseEventsResult, staffEventsResult] = await Promise.all([
      supabaseClient
        .from('case_events')
        .select('*')
        .in('event_type', paymentTypes)
        .order('created_at', { ascending: false })
        .limit(limit),
      supabaseClient
        .from('staff_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
    ]);

    return {
      caseEvents: caseEventsResult.data || [],
      staffEvents: staffEventsResult.data || []
    };
  } catch (error) {
    logger.warn('Failed to fetch payment audit events from Supabase', error);
    return { caseEvents: [], staffEvents: [] };
  }
}

export async function fetchQuietThresholds() {
  if (!supabaseClient) {
    return {
      config: defaultQuietThresholds,
      updatedAt: new Date().toISOString()
    };
  }

  try {
    const { data, error } = await supabaseClient
      .from('admin_settings')
      .select('quiet_thresholds, updated_at')
      .eq('org_id', 'default')
      .single();

    if (error) {
      logger.warn('Supabase quiet threshold fetch failed', error);
      return {
        config: defaultQuietThresholds,
        updatedAt: new Date().toISOString()
      };
    }

    return {
      config: {
        ...defaultQuietThresholds,
        ...(data?.quiet_thresholds || {})
      },
      updatedAt: data?.updated_at || new Date().toISOString()
    };
  } catch (error) {
    logger.warn('Error fetching quiet thresholds from Supabase', error);
    return {
      config: defaultQuietThresholds,
      updatedAt: new Date().toISOString()
    };
  }
}

export async function persistQuietThresholds(config) {
  if (!supabaseClient) {
    return {
      config: defaultQuietThresholds,
      updatedAt: new Date().toISOString()
    };
  }

  try {
    const payload = {
      org_id: 'default',
      quiet_thresholds: config,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseClient
      .from('admin_settings')
      .upsert(payload, { onConflict: 'org_id' })
      .select('quiet_thresholds, updated_at')
      .single();

    if (error) {
      logger.warn('Supabase quiet threshold save failed', error);
      return {
        config: defaultQuietThresholds,
        updatedAt: new Date().toISOString()
      };
    }

    return {
      config: {
        ...defaultQuietThresholds,
        ...(data?.quiet_thresholds || {})
      },
      updatedAt: data?.updated_at || new Date().toISOString()
    };
  } catch (error) {
    logger.warn('Error saving quiet thresholds to Supabase', error);
    return {
      config: defaultQuietThresholds,
      updatedAt: new Date().toISOString()
    };
  }
}

