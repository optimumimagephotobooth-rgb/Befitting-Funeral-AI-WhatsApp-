import { useCallback, useEffect, useRef, useState } from 'react';
import {
  QuietThresholdConfig,
  defaultQuietThresholds,
  loadQuietThresholds,
  saveQuietThresholds
} from '../settings/quietThresholds';
import { fetchQuietSettings, saveQuietSettings } from '../services/adminSettings';
import { subscribeQuietSettings, unsubscribeChannel } from '../services/supabaseRealtime';

type SyncState = {
  config: QuietThresholdConfig;
  updatedAt: string | null;
  loading: boolean;
  error: string | null;
};

const LOCAL_FALLBACK: SyncState = {
  config: loadQuietThresholds(),
  updatedAt: null,
  loading: false,
  error: null
};

type SyncOptions = {
  autoSync?: boolean;
  readOnly?: boolean;
};

export function useRealtimeQuietThresholds(options: SyncOptions = {}) {
  const { autoSync = true, readOnly = false } = options;
  const [state, setState] = useState<SyncState>({
    ...LOCAL_FALLBACK,
    config: loadQuietThresholds()
  });
  const versionRef = useRef<string | null>(null);
  const pendingSaveRef = useRef(false);

  const applyConfig = useCallback((config: QuietThresholdConfig, updatedAt: string | null) => {
    saveQuietThresholds(config);
    versionRef.current = updatedAt;
    setState((prev) => ({
      ...prev,
      config,
      updatedAt
    }));
  }, []);

  const hydrateFromServer = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { config, updatedAt } = await fetchQuietSettings();
      applyConfig(config, updatedAt);
    } catch (error: any) {
      const message =
        error?.response?.data?.error || 'Unable to load organization quiet settings.';
    setState((prev) => ({ ...prev, error: message }));
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [applyConfig]);

  const saveForOrg = useCallback(
    async (config: QuietThresholdConfig) => {
      if (readOnly) {
        throw new Error('Read-only quiet threshold hook cannot save organization settings.');
      }
      pendingSaveRef.current = true;
      setState((prev) => ({ ...prev, error: null }));
      try {
        const { config: saved, updatedAt } = await saveQuietSettings(config);
        applyConfig(saved, updatedAt);
      } catch (error: any) {
        const message =
          error?.response?.data?.error || 'Unable to save organization quiet settings.';
        setState((prev) => ({ ...prev, error: message }));
        throw error;
      } finally {
        pendingSaveRef.current = false;
      }
    },
    [applyConfig, readOnly]
  );

  const updateLocal = useCallback(
    (partial: Partial<QuietThresholdConfig>) => {
      if (readOnly) {
        return;
      }
      applyConfig({ ...state.config, ...partial }, state.updatedAt);
    },
    [applyConfig, readOnly, state.config, state.updatedAt]
  );

  useEffect(() => {
    if (!autoSync) {
      return;
    }
    hydrateFromServer();
  }, [autoSync, hydrateFromServer]);

  useEffect(() => {
    const channel = subscribeQuietSettings((payload) => {
      if (!payload?.new || pendingSaveRef.current) {
        return;
      }
      if (payload.new.org_id && payload.new.org_id !== 'default') {
        return;
      }
      const updatedAt = payload.new.updated_at;
      if (!updatedAt || (versionRef.current && updatedAt <= versionRef.current)) {
        return;
      }

      const nextConfig: QuietThresholdConfig = {
        ...defaultQuietThresholds,
        ...(payload.new.quiet_thresholds || {})
      };

      applyConfig(nextConfig, updatedAt);
    });

    return () => {
      unsubscribeChannel(channel);
    };
  }, [applyConfig]);

  return {
    config: state.config,
    updatedAt: state.updatedAt,
    loading: state.loading,
    error: state.error,
    updateLocal,
    hydrateFromServer,
    saveForOrg
  };
}

