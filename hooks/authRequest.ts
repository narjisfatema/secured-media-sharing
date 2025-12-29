import { WalletClient } from '@bsv/sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// 🔧 CONFIGURE YOUR SERVER URL HERE
// 
// IMPORTANT: Replace 192.168.1.XXX with your computer's actual IP address!
// 
// To find your IP:
// - Mac/Linux: Open Terminal and run: ifconfig | grep "inet " | grep -v 127.0.0.1
// - Windows: Open Command Prompt and run: ipconfig
// 
// Look for IPv4 Address like: 192.168.1.105 or 10.0.0.5
//
const SERVER_URL = Platform.select({
  ios: "http://localhost:3000",        // iOS Simulator (same machine)
  android: "http://10.0.2.2:3000",     // Android Emulator (special address)
  default: "http://192.168.1.XXX:3000" // Physical device - REPLACE XXX!
});

// 🚨 FOR TESTING: If above doesn't work, uncomment this and use your actual IP:
// const SERVER_URL = "http://192.168.1.105:3000";  // Replace with YOUR IP!

/**
 * Make an authenticated BRC-103 request to the server
 * NOTE: This requires BSV Desktop Wallet (desktop only)
 */
export async function makeAuthenticatedRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: any
) {
  const identityKey = await AsyncStorage.getItem("identityKey");

  if (!identityKey) {
    throw new Error('No identity key found. Please authenticate first.');
  }

  // Initialize wallet client
  const walletClient = new WalletClient();

  // Create BRC-103 authentication
  const authRequest = await walletClient.createAction({
    description: `${method} ${endpoint}`,
    action: 'makeRequest',
    data: body || {}
  });

  console.log(`🔐 Making authenticated ${method} request to ${endpoint}`);

  // Make authenticated request
  const response = await fetch(`${SERVER_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-bsv-auth-nonce': authRequest.nonce,
      'x-bsv-auth-signature': authRequest.signature,
      'x-bsv-auth-timestamp': authRequest.timestamp,
      'x-bsv-auth-identitykey': identityKey
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Verify mobile identity key (no wallet client needed)
 * This checks if the identity key exists in the database
 * Works on both mobile and desktop
 */
export async function verifyMobileKey(identityKey: string) {
  console.log('🔍 Verifying mobile key...');
  
  const response = await fetch(`${SERVER_URL}/verify-mobile-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ identityKey: identityKey.trim() })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Verification failed (${response.status})`);
  }

  return data;
}

/**
 * Upload media file (requires wallet authentication)
 */
export async function uploadMedia(
  fileHash: string,
  fileName: string,
  fileUrl?: string,
  mimeType?: string,
  fileSize?: number
) {
  return makeAuthenticatedRequest('/upload-media', 'POST', {
    fileHash,
    fileName,
    fileUrl,
    mimeType,
    fileSize
  });
}

/**
 * Get all media for current user (requires wallet authentication)
 */
export async function getMyMedia() {
  return makeAuthenticatedRequest('/my-media', 'GET');
}

/**
 * Delete a media item (requires wallet authentication)
 */
export async function deleteMedia(mediaId: string) {
  return makeAuthenticatedRequest(`/media/${mediaId}`, 'DELETE');
}

/**
 * Get user profile (requires wallet authentication)
 */
export async function getProfile() {
  return makeAuthenticatedRequest('/profile', 'GET');
}

/**
 * Get server stats (requires wallet authentication)
 */
export async function getStats() {
  return makeAuthenticatedRequest('/stats', 'GET');
}