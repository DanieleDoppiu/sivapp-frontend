import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.Sivapp.android',
  appName: 'Sivapp',
  webDir: "www/browser",

  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }

};

export default config;

