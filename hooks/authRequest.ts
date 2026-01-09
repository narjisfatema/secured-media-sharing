import { WalletClient } from '@bsv/sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔧 CONFIGURATION
// This uses the IP address you provided.
// If your router gives your laptop a new IP in the future, update this line.
export const API_BASE_URL = "http://192.168.68.107:3000";

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

  console.log(`🔐 Auth Request to: ${API_BASE_URL}${endpoint}`);

  try {
    // Make authenticated request
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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
  } catch (error: any) {
    console.error("Auth Request Error:", error);
    throw new Error(`Network Error: ${error.message}. Is server running at ${API_BASE_URL}?`);
  }
}

/**
 * Verify mobile identity key (no wallet client needed)
 */
export async function verifyMobileKey(identityKey: string) {
  console.log(`🔍 Verifying at: ${API_BASE_URL}/verify-mobile-key`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/verify-mobile-key`, {
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
  } catch (error: any) {
    console.error("Fetch Error:", error);
    // Give a clear error message about connectivity
    if (error.message.includes('Network request failed')) {
      throw new Error(`Could not reach server at ${API_BASE_URL}. Check WiFi and Firewall.`);
    }
    throw error;
  }
}

// API WRAPPERS
export async function uploadMedia(fileHash: string, fileName: string, fileUrl?: string, mimeType?: string, fileSize?: number) {
  return makeAuthenticatedRequest('/upload-media', 'POST', {
    fileHash,
    fileName,
    fileUrl,
    mimeType,
    fileSize
  });
}

export async function getMyMedia() {
  return makeAuthenticatedRequest('/my-media', 'GET');
}

export async function deleteMedia(mediaId: string) {
  return makeAuthenticatedRequest(`/media/${mediaId}`, 'DELETE');
}

export async function getProfile() {
  return makeAuthenticatedRequest('/profile', 'GET');
}

export async function getStats() {
  return makeAuthenticatedRequest('/stats', 'GET');
}