import { checkStorageHealth } from './storageService.js';
import { config } from '../config/config.js';

function mapStatus(flag) {
  return flag ? 'ok' : 'down';
}

export async function getSystemHealth() {
  const storageOk = await checkStorageHealth();
  const realtimeConfigured = Boolean(config.supabase?.url);

  return {
    api: 'ok',
    storage: mapStatus(storageOk),
    realtime: mapStatus(realtimeConfigured)
  };
}

