import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.amigomontador.app',
  appName: 'Amigo Montador',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
    hostname: 'app.amigomontador.com',
    url: process.env.NODE_ENV === 'production' ? 'https://your-production-url.replit.app' : undefined
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV === 'development',
    buildOptions: {
      keystorePath: 'android/app/keystore.jks',
      keystoreAlias: 'amigomontador',
      keystorePassword: process.env.KEYSTORE_PASSWORD || '',
      keystoreAliasPassword: process.env.KEY_PASSWORD || ''
    }
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#ffffff'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#2563eb",
      sound: "notification.mp3"
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#ffffff'
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true
    },
    App: {
      launchUrl: '/'
    }
  }
};

export default config;