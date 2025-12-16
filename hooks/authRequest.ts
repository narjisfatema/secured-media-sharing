import { WalletClient } from '@bsv/sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL = "http://localhost:3000";

/**
 * Make an authenticated BRC-103 request to the server
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
 * Upload media file
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
 * Get all media for current user
 */
export async function getMyMedia() {
  return makeAuthenticatedRequest('/my-media', 'GET');
}

/**
 * Delete a media item
 */
export async function deleteMedia(mediaId: string) {
  return makeAuthenticatedRequest(`/media/${mediaId}`, 'DELETE');
}

/**
 * Get user profile
 */
export async function getProfile() {
  return makeAuthenticatedRequest('/profile', 'GET');
}

/**
 * Get server stats
 */
export async function getStats() {
  return makeAuthenticatedRequest('/stats', 'GET');
}