// services/gallery.ts - ✅ FIXED APP PRIVATE GALLERY
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/constants/api';

const APP_GALLERY_DIR = `${FileSystem.documentDirectory}BSV_Gallery/`;

interface GalleryImage {
  id: string;
  uri: string;
  thumbnailUri: string;
  filename: string;
  timestamp: string;
  uhrpTxId?: string;
  verifiedPosition?: { x: number; y: number };
  blockchainHash?: string;
  owner?: string;
  isVerified: boolean;
  imageKey: string;
}

interface SaveGalleryMetadata {
  imageKey: string;
  uhrpTxId?: string;
  blockchainHash?: string;
  filename?: string;
  timestamp: string;
  owner?: string;
  position?: { x: number; y: number };
}

// ✅ Initialize app private gallery directory
export async function initAppGallery() {
  try {
    const dirInfo = await FileSystem.getInfoAsync(APP_GALLERY_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(APP_GALLERY_DIR, { intermediates: true });
      console.log('✅ Gallery directory created');
    }
  } catch (error) {
    console.error('❌ Failed to create gallery dir:', error);
    throw error;
  }
}

// ✅ NEW: Save captured image IMMEDIATELY (before blockchain)
export async function saveCapturedImage(imageUri: string, imageKey: string): Promise<string> {
  await initAppGallery();
  
  const fileName = `${imageKey}.jpg`;
  const localPath = `${APP_GALLERY_DIR}${fileName}`;
  
  try {
    // Copy image to app private directory
    await FileSystem.copyAsync({
      from: imageUri,
      to: localPath
    });
    
    // Save minimal metadata (unverified)
    const galleryData: GalleryImage = {
      id: imageKey,
      uri: localPath,
      thumbnailUri: localPath,
      filename: `Captured ${new Date().toLocaleDateString()}`,
      timestamp: new Date().toISOString(),
      isVerified: false,
      imageKey: imageKey,
    };
    
    await AsyncStorage.setItem(`gallery_${imageKey}`, JSON.stringify(galleryData));
    console.log('✅ Captured image saved to app gallery:', localPath);
    
    return localPath;
  } catch (error) {
    console.error('❌ Failed to save captured image:', error);
    throw error;
  }
}

// ✅ Update image after blockchain verification
export async function updateGalleryWithBlockchain(
  imageKey: string, 
  metadata: SaveGalleryMetadata
): Promise<void> {
  try {
    // Load existing gallery entry
    const existingData = await AsyncStorage.getItem(`gallery_${imageKey}`);
    if (!existingData) {
      console.error('❌ No existing gallery entry for:', imageKey);
      return;
    }
    
    const galleryData: GalleryImage = JSON.parse(existingData);
    
    // Update with blockchain data
    galleryData.uhrpTxId = metadata.uhrpTxId;
    galleryData.verifiedPosition = metadata.position;
    galleryData.blockchainHash = metadata.blockchainHash;
    galleryData.owner = metadata.owner;
    galleryData.isVerified = !!metadata.uhrpTxId;
    galleryData.filename = metadata.filename || galleryData.filename;
    
    await AsyncStorage.setItem(`gallery_${imageKey}`, JSON.stringify(galleryData));
    
    // Sync to backend with retries
    await syncToBackend(imageKey, metadata, 3);
    
    console.log('✅ Gallery updated with blockchain data:', imageKey);
  } catch (error) {
    console.error('❌ Failed to update gallery:', error);
    throw error;
  }
}

// ✅ Backend sync with retry logic
async function syncToBackend(
  imageKey: string, 
  metadata: SaveGalleryMetadata,
  retries: number = 3
): Promise<void> {
  const identityKey = await AsyncStorage.getItem('identityKey');
  if (!identityKey) {
    console.warn('⚠️ No identity key, skipping backend sync');
    return;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${API_URL}/store-media`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Identity-Key': identityKey 
        },
        body: JSON.stringify({
          identityKey,
          imageKey,
          uhrpTxId: metadata.uhrpTxId,
          verifiedWatermarkPosition: metadata.position,
          blockchainHash: metadata.blockchainHash,
          timestamp: metadata.timestamp,
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend sync failed: ${response.status}`);
      }

      console.log(`✅ Backend synced (attempt ${attempt})`);
      return;
    } catch (error) {
      console.error(`❌ Backend sync attempt ${attempt} failed:`, error);
      
      if (attempt === retries) {
        console.warn('⚠️ All backend sync attempts failed, data saved locally only');
        return;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// ✅ LOAD all images from APP PRIVATE gallery
export async function getAppGalleryImages(): Promise<GalleryImage[]> {
  await initAppGallery();
  
  try {
    const files = await FileSystem.readDirectoryAsync(APP_GALLERY_DIR);
    const images: GalleryImage[] = [];
    const identityKey = await AsyncStorage.getItem('identityKey');
    
    for (const file of files) {
      if (!file.endsWith('.jpg') && !file.endsWith('.png')) continue;
      
      // Extract imageKey from filename (e.g., "imageKey.jpg" -> "imageKey")
      const imageKey = file.replace(/\.(jpg|png)$/, '');
      const metadataKey = `gallery_${imageKey}`;
      
      try {
        const metadata = await AsyncStorage.getItem(metadataKey);
        if (!metadata) {
          console.warn(`⚠️ No metadata for ${file}, skipping`);
          continue;
        }
        
        const imageData: GalleryImage = JSON.parse(metadata);
        
        // Verify file still exists
        const fileInfo = await FileSystem.getInfoAsync(imageData.uri);
        if (!fileInfo.exists) {
          console.warn(`⚠️ File missing: ${imageData.uri}, cleaning up metadata`);
          await AsyncStorage.removeItem(metadataKey);
          continue;
        }
        
        // Optional: Fetch latest verification status from backend
        if (identityKey && imageData.imageKey && imageData.isVerified) {
          try {
            const response = await fetch(
              `${API_URL}/media/${identityKey}/${imageData.imageKey}`,
              { 
                method: 'GET',
                headers: { 'X-Identity-Key': identityKey },
                signal: AbortSignal.timeout(5000) // 5s timeout
              }
            );
            
            if (response.ok) {
              const backendData = await response.json();
              imageData.uhrpTxId = backendData.uhrpTxId;
              imageData.verifiedPosition = backendData.verifiedWatermarkPosition;
              imageData.blockchainHash = backendData.blockchainHash;
            }
          } catch (e) {
            // Silently fail - use cached data
            console.log(`Using cached data for ${imageKey}`);
          }
        }
        
        images.push(imageData);
      } catch (error) {
        console.error(`❌ Failed to load metadata for ${file}:`, error);
      }
    }
    
    // Sort by timestamp (newest first)
    images.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    console.log(`✅ App gallery loaded: ${images.length} images`);
    return images;
  } catch (error) {
    console.error('❌ App gallery load failed:', error);
    return [];
  }
}

// ✅ Delete image from gallery
export async function deleteFromGallery(imageKey: string): Promise<void> {
  try {
    const metadata = await AsyncStorage.getItem(`gallery_${imageKey}`);
    if (metadata) {
      const imageData: GalleryImage = JSON.parse(metadata);
      
      // Delete file
      await FileSystem.deleteAsync(imageData.uri, { idempotent: true });
      
      // Delete metadata
      await AsyncStorage.removeItem(`gallery_${imageKey}`);
      
      console.log('✅ Deleted from gallery:', imageKey);
    }
  } catch (error) {
    console.error('❌ Failed to delete from gallery:', error);
    throw error;
  }
}

// ✅ DEPRECATED: Old saveToAppGallery (use saveCapturedImage + updateGalleryWithBlockchain instead)
export async function saveToAppGallery(imageUri: string, metadata: any): Promise<string> {
  console.warn('⚠️ saveToAppGallery is deprecated, use saveCapturedImage + updateGalleryWithBlockchain');
  await initAppGallery();
  
  const fileName = `${metadata.imageKey || Date.now()}.jpg`;
  const localPath = `${APP_GALLERY_DIR}${fileName}`;
  
  await FileSystem.copyAsync({ from: imageUri, to: localPath });
  
  const galleryData: GalleryImage = {
    id: metadata.imageKey || fileName,
    uri: localPath,
    thumbnailUri: localPath,
    filename: metadata.filename || 'BSV Verified',
    timestamp: metadata.timestamp,
    uhrpTxId: metadata.uhrpTxId,
    verifiedPosition: metadata.position,
    blockchainHash: metadata.blockchainHash,
    owner: metadata.owner,
    isVerified: !!metadata.uhrpTxId,
    imageKey: metadata.imageKey || fileName,
  };
  
  await AsyncStorage.setItem(`gallery_${galleryData.imageKey}`, JSON.stringify(galleryData));
  return localPath;
}