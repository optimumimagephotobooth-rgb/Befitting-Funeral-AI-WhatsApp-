import { useState } from 'react';

export type QuietThresholdConfig = {
  businessWarningHours: number;
  businessAlertHours: number;
  offHoursWarningHours: number;
  offHoursAlertHours: number;
};

export const defaultQuietThresholds: QuietThresholdConfig = {
  businessWarningHours: 12,
  businessAlertHours: 24,
  offHoursWarningHours: 36,
  offHoursAlertHours: 72
};

const STORAGE_KEY = 'quiet_threshold_config';

export function loadQuietThresholds(): QuietThresholdConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultQuietThresholds;
    const parsed = JSON.parse(raw);
    return {
      ...defaultQuietThresholds,
      ...parsed
    };
  } catch {
    return defaultQuietThresholds;
  }
}

export function saveQuietThresholds(cfg: QuietThresholdConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export function exportQuietThresholds(): string {
  const cfg = loadQuietThresholds();
  return JSON.stringify(cfg, null, 2);
}

export function importQuietThresholds(json: string): QuietThresholdConfig {
  const data = JSON.parse(json);
  const allowed = [
    'businessWarningHours',
    'businessAlertHours',
    'offHoursWarningHours',
    'offHoursAlertHours'
  ];

  if (!Object.keys(data).every((k) => allowed.includes(k))) {
    throw new Error('Invalid quiet threshold JSON structure.');
  }

  const merged = { ...defaultQuietThresholds, ...data };
  saveQuietThresholds(merged);
  return merged;
}

export function useQuietThresholds() {
  const [config, setConfig] = useState(loadQuietThresholds());

  function update(partial: Partial<QuietThresholdConfig>) {
    const next = { ...config, ...partial };
    setConfig(next);
    saveQuietThresholds(next);
  }

  return { config, update };
}

