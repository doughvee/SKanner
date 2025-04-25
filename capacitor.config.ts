import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'receipt-scanner',
  webDir: 'build',
  plugins: {
    Camera: {
      correctOrientation: true,
      saveToGallery: false,
      width: 1280,
      height: 720,
      quality: 85
    }
  }
};

export default config;
