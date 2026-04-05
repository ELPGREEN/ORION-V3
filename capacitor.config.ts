import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.a9011a39281d4fa990b80890e1648690',
  appName: 'ORION IA',
  webDir: 'dist',
  server: {
    url: 'https://a9011a39-281d-4fa9-90b8-0890e1648690.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0a0f',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0f',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#c9a84c',
    },
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0a0a0f',
  },
  ios: {
    backgroundColor: '#0a0a0f',
    contentInset: 'always',
    preferredContentMode: 'mobile',
  },
};

export default config;
