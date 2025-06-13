import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.amigomontador.app',
  appName: 'AmigoMontador',
  webDir: 'dist/client',
  server: {
    androidScheme: 'https',
    allowNavigation: ['*']
  },
  android: {
    buildOptions: {
      keystorePath: 'android/app/keystore.jks',
      keystoreAlias: 'amigomontador',
      keystorePassword: process.env.KEYSTORE_PASSWORD || '',
      keystoreAliasPassword: process.env.KEY_PASSWORD || ''
    }
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP"
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF"
    }
  }
};

export default config;