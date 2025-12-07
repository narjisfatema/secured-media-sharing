// services/blockchain.ts

import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import CryptoJS from 'crypto-js';

// Define FileSystem directories with proper types
const documentDirectory = FileSystem.documentDirectory || '';
const cacheDirectory = FileSystem.cacheDirectory || '';

// Mock BSV SDK functionality (replace with actual @bsv/sdk when wallet is connected)
interface WatermarkData {
  timestamp: string;
  hash: string;
  owner: string;
  position: { x: number; y: number };
}

interface BlockchainSaveParams {
  imageUri: string;
  watermarkData: WatermarkData;
}

interface BlockchainResult {
  txid: string;
  hash: string;
  timestamp: number;
  encryptedUri?: string;
}

/**
 * Generate a unique transaction ID (mock - replace with actual BSV transaction)
 */
function generateTxId(): string {
  return `bsv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Hash the image content for blockchain verification
 */
async function hashImage(imageUri: string): Promise<string> {
  try {
    // Read image as base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });

    // Generate SHA-256 hash
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      base64
    );

    return hash;
  } catch (error) {
    console.error('Error hashing image:', error);
    throw error;
  }
}

/**
 * Encrypt image for local storage
 */
async function encryptImage(imageUri: string, key: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });

    const encrypted = CryptoJS.AES.encrypt(base64, key).toString();
    return encrypted;
  } catch (error) {
    console.error('Error encrypting image:', error);
    throw error;
  }
}

/**
 * Save encrypted image to device storage
 */
async function saveEncryptedImage(
  encryptedData: string,
  txid: string
): Promise<string> {
  try {
    const directory = `${documentDirectory}secure_media/`;
    
    // Create directory if it doesn't exist
    const dirInfo = await FileSystem.getInfoAsync(directory);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    }

    const filePath = `${directory}${txid}.enc`;
    await FileSystem.writeAsStringAsync(filePath, encryptedData);
    
    return filePath;
  } catch (error) {
    console.error('Error saving encrypted image:', error);
    throw error;
  }
}

/**
 * Main function: Save image to blockchain and local storage
 */
export async function saveToBlockchain(
  params: BlockchainSaveParams
): Promise<BlockchainResult> {
  const { imageUri, watermarkData } = params;

  try {
    console.log('📸 Starting blockchain save process...');

    // Step 1: Generate content hash
    const contentHash = await hashImage(imageUri);
    console.log('✅ Image hashed:', contentHash.substring(0, 16) + '...');

    // Step 2: Create mock BSV transaction (replace with actual transaction)
    const txid = generateTxId();
    console.log('✅ Transaction ID generated:', txid);

    // Step 3: Encrypt image for local storage
    const encryptionKey = contentHash; // Use hash as encryption key
    const encryptedData = await encryptImage(imageUri, encryptionKey);
    console.log('✅ Image encrypted');

    // Step 4: Save encrypted image
    const encryptedUri = await saveEncryptedImage(encryptedData, txid);
    console.log('✅ Encrypted image saved:', encryptedUri);

    // Step 5: Store metadata in AsyncStorage
    const metadata = {
      txid,
      hash: contentHash,
      timestamp: Date.now(),
      watermarkData,
      originalUri: imageUri,
      encryptedUri,
      isCreator: true,
    };

    await AsyncStorage.setItem(`media_${txid}`, JSON.stringify(metadata));
    console.log('✅ Metadata saved to AsyncStorage');

    // Step 6: Update media index
    await updateMediaIndex(txid);

    return {
      txid,
      hash: contentHash,
      timestamp: Date.now(),
      encryptedUri,
    };
  } catch (error) {
    console.error('❌ Blockchain save failed:', error);
    throw new Error('Failed to save to blockchain: ' + (error as Error).message);
  }
}

/**
 * Update the global media index
 */
async function updateMediaIndex(txid: string): Promise<void> {
  try {
    const indexJson = await AsyncStorage.getItem('media_index');
    const index: string[] = indexJson ? JSON.parse(indexJson) : [];
    
    if (!index.includes(txid)) {
      index.unshift(txid); // Add to beginning
      await AsyncStorage.setItem('media_index', JSON.stringify(index));
    }
  } catch (error) {
    console.error('Error updating media index:', error);
  }
}

/**
 * Get all media from blockchain storage
 */
export async function getAllMedia(): Promise<any[]> {
  try {
    const indexJson = await AsyncStorage.getItem('media_index');
    const index: string[] = indexJson ? JSON.parse(indexJson) : [];

    const mediaPromises = index.map(async (txid) => {
      const metadataJson = await AsyncStorage.getItem(`media_${txid}`);
      return metadataJson ? JSON.parse(metadataJson) : null;
    });

    const media = await Promise.all(mediaPromises);
    return media.filter(Boolean); // Remove null values
  } catch (error) {
    console.error('Error getting all media:', error);
    return [];
  }
}

/**
 * Get single media item by txid
 */
export async function getMediaByTxid(txid: string): Promise<any | null> {
  try {
    const metadataJson = await AsyncStorage.getItem(`media_${txid}`);
    return metadataJson ? JSON.parse(metadataJson) : null;
  } catch (error) {
    console.error('Error getting media:', error);
    return null;
  }
}

/**
 * Decrypt image for viewing
 */
export async function decryptImage(encryptedUri: string, hash: string): Promise<string> {
  try {
    const encryptedData = await FileSystem.readAsStringAsync(encryptedUri);
    const decrypted = CryptoJS.AES.decrypt(encryptedData, hash).toString(CryptoJS.enc.Utf8);
    
    // Save decrypted image temporarily
    const tempUri = `${cacheDirectory}temp_${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(tempUri, decrypted, {
      encoding: 'base64',
    });
    
    return tempUri;
  } catch (error) {
    console.error('Error decrypting image:', error);
    throw error;
  }
}

/**
 * Delete media (for testing/cleanup)
 */
export async function deleteMedia(txid: string): Promise<void> {
  try {
    // Remove from index
    const indexJson = await AsyncStorage.getItem('media_index');
    const index: string[] = indexJson ? JSON.parse(indexJson) : [];
    const newIndex = index.filter(id => id !== txid);
    await AsyncStorage.setItem('media_index', JSON.stringify(newIndex));

    // Get metadata to find encrypted file
    const metadata = await getMediaByTxid(txid);
    if (metadata?.encryptedUri) {
      await FileSystem.deleteAsync(metadata.encryptedUri, { idempotent: true });
    }

    // Remove metadata
    await AsyncStorage.removeItem(`media_${txid}`);
    
    console.log('✅ Media deleted:', txid);
  } catch (error) {
    console.error('Error deleting media:', error);
  }
}