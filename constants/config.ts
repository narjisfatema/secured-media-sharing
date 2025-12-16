// app/constants/config.ts - CENTRALIZED APP CONFIGURATION
export const config = {
  // Backend API (change for production/deployed server)
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
  
  // Blockchain explorers
  BLOCKCHAIN_EXPLORER: 'https://whatsonchain.com',
  WHATSONCHAIN_API: 'https://api.whatsonchain.com/v1/bsv/main',
  
  // App settings
  APP_NAME: 'Secure Media MVP',
  VERSION: '1.0.0',
  
  // Media settings
  MAX_IMAGE_SIZE: 1024, // pixels
  WATERMARK_FONT_SIZE: 20,
  
  // Storage keys
  STORAGE_KEYS: {
    IDENTITY_KEY: 'identityKey',
    USER_SESSION: 'userSession',
    MEDIA_PREFIX: 'media_'
  } as const,
  
  // Feature flags (for hackathon MVP)
  FEATURES: {
    UHRP_ENABLED: true,
    WATERMARK_DRAG: true,
  } as const,
};

// Export individual constants for convenience
export const {
  API_URL,
  BLOCKCHAIN_EXPLORER,
  WHATSONCHAIN_API,
  STORAGE_KEYS,
  FEATURES
} = config;

// Environment check helper
export const isDevelopment = __DEV__;
export const isProduction = !isDevelopment;

export default config;
