import { getApiUrl } from './api';

// Keeps the Render backend awake by pinging /health periodically
let pingerInterval: any = null;

export const startBackendPinger = (intervalMinutes: number = 4) => {
  if (pingerInterval) return;

  const ping = async () => {
    try {
      const url = getApiUrl('/health');
      await fetch(url, { method: 'GET', cache: 'no-store' });
      // Successfully pinged backend
    } catch (e) {
      // Backend may be waking up
    }
  };

  // Immediate ping on boot
  ping();

  // Recurring ping every 4-5 minutes
  pingerInterval = setInterval(ping, intervalMinutes * 60 * 1000);
};

export const stopBackendPinger = () => {
  if (pingerInterval) {
    clearInterval(pingerInterval);
    pingerInterval = null;
  }
};
