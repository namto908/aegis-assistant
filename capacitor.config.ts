import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aegis.assistant',
  appName: 'Aegis Assistant',
  webDir: 'dist',
  server: {
    cleartext: true,
    androidScheme: 'http'
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '456986323375-dqpvgatucco4pv54ccmptne7mhlnqco9.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    }
  }
};

export default config;
