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
      serverClientId: '456986323375-qd087acsddmk1ich4mn6dv8vm1bs7mot.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    }
  }
};

export default config;
