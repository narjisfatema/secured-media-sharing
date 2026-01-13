import { WalletClient } from '@bsv/sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from "expo-constants";

// 🔧 INTELLIGENT IP DETECTION
const getBaseUrl = () => {
  const PORT = "3000";

  // 1. Web always uses localhost
  if (Platform.OS === 'web') {
    return `http://localhost:${PORT}`;
  }

  // 2. MOBILE (Physical & Emulator)
  // We grab the IP address directly from the Expo Metro Bundler.
  // This ensures it ALWAYS matches the IP you see in VSCode (e.g., 192.168.68.103).
  const debuggerHost = Constants.expoConfig?.hostUri;
  
  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0]; // Extract IP from "192.168.x.x:8081"
    return `http://${ip}:${PORT}`;
  }

  // 3. Fallback (Only used if the above fails)
  // Update this only if you are running a standalone production build
  return `http://192.168.68.103:${PORT}`; 
};

export const API_BASE_URL = getBaseUrl();
/**
 * Make an authenticated BRC-103 request
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

  const walletClient = new WalletClient();

  const authRequest = await walletClient.createAction({
    description: `${method} ${endpoint}`,
    action: 'makeRequest',
    data: body || {}
  });

  console.log(`🔐 Auth Request: ${method} ${API_BASE_URL}${endpoint}`);

  try {
    // Set a timeout so it doesn't hang forever
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-bsv-auth-nonce': authRequest.nonce,
        'x-bsv-auth-signature': authRequest.signature,
        'x-bsv-auth-timestamp': authRequest.timestamp,
        'x-bsv-auth-identitykey': identityKey
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Request failed (${response.status}): ${errorText}`);
    }

    return response.json();
  } catch (error: any) {
    console.error("Auth Request Error:", error);
    if (error.name === 'AbortError') {
      throw new Error("Request timed out. Check your computer firewall.");
    }
    throw new Error(`Network Error: ${error.message}`);
  }
}

/**
 * Verify mobile identity key
 */
export async function verifyMobileKey(identityKey: string) {
  const url = `${API_BASE_URL}/verify-mobile-key`;
  console.log(`🔍 Verifying at: ${url}`);
  
  try {
    // 10 Second Timeout to prevent infinite loading
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identityKey: identityKey.trim() }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Verification failed (${response.status})`);
    }

    return data;
  } catch (error: any) {
    console.error("Fetch Error:", error);
    
    if (error.name === 'AbortError') {
      throw new Error(`Connection Timed Out.\n\nYour phone cannot reach ${API_BASE_URL}.\n\nSOLUTION:\n1. Open Windows Firewall settings\n2. Allow 'Node.js' on Private & Public networks.`);
    }

    if (error.message.includes('Network request failed')) {
      throw new Error(`Connection Failed.\n\nPhone is trying to reach: ${API_BASE_URL}\n\n1. Ensure Phone & Laptop are on SAME WiFi.\n2. Disable Computer Firewall temporarily to test.`);
    }
    throw error;
  }
}

// API WRAPPERS
export async function uploadMedia(fileHash: string, fileName: string, fileUrl?: string, mimeType?: string, fileSize?: number) {
  return makeAuthenticatedRequest('/upload-media', 'POST', { fileHash, fileName, fileUrl, mimeType, fileSize });
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