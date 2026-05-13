import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.goalpick.app',
  appName: 'Goalpick',
  webDir: 'dist',
  // For local dev hot-reload against the Lovable preview, temporarily add:
  // server: { url: 'https://2f94f408-73f5-4835-a8f9-d0a49fb713b5.lovableproject.com?forceHideBadge=true', cleartext: true },
};

export default config;
