// services/saveImageToApp.ts - ✅ COMPLETE IMAGE SAVE SOLUTION
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ App private directory (NOT device gallery)
const APP_GALLERY_DIR = `${FileSystem.documentDirectory}BSV_Private_Gallery/`;

// ✅ Image metadata structure
interface ImageMetadata {
  id: string;
  uri: string;
  thumbnailUri: string;
  filename: string;
  timestamp: string;
  isVerified: boolean;
  imageKey: string;
  width?: number;
  height?: number;
}

/**
 * ✅ MAIN FUNCTION: Save captured image to app storage
 * 
 * @param sourceUri - The temporary URI from camera (e.g., from expo-camera or expo-image-picker)
 * @returns The new permanent URI in app storage
 */
export async function saveImageToAppStorage(sourceUri: string): Promise<{
  savedUri: string;
  imageKey: string;
  metadata: ImageMetadata;
}> {
  try {
    console.log('📸 Starting image save process...');
    console.log('📍 Source URI:', sourceUri);

    // ====
    // STEP 1: CREATE DIRECTORY IF NEEDED
    // ====
    console.log('📁 Step 1: Checking directory...');
    const dirInfo = await FileSystem.getInfoAsync(APP_GALLERY_DIR);
    
    if (!dirInfo.exists) {
      console.log('📁 Creating directory:', APP_GALLERY_DIR);
      await FileSystem.makeDirectoryAsync(APP_GALLERY_DIR, { intermediates: true });
      console.log('✅ Directory created');
    } else {
      console.log('✅ Directory exists');
    }

    // ====
    // STEP 2: GENERATE UNIQUE IMAGE KEY
    // ====
    console.log('🔑 Step 2: Generating image key...');
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const imageKey = `img_${timestamp}_${random}`;
    console.log('✅ Image key:', imageKey);

    // ====
    // STEP 3: CREATE PERMANENT FILE PATH
    // ====
    console.log('📍 Step 3: Creating file path...');
    const fileExtension = sourceUri.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
    const fileName = `${imageKey}.${fileExtension}`;
    const destinationUri = `${APP_GALLERY_DIR}${fileName}`;
    console.log('✅ Destination:', destinationUri);

    // ====
    // STEP 4: VERIFY SOURCE FILE EXISTS
    // ====
    console.log('🔍 Step 4: Verifying source file...');
    const sourceInfo = await FileSystem.getInfoAsync(sourceUri);
    
    if (!sourceInfo.exists) {
      throw new Error(`Source file does not exist: ${sourceUri}`);
    }
    console.log('✅ Source file exists');
    console.log('📊 Source size:', (sourceInfo.size || 0) / 1024, 'KB');

    // ====
    // STEP 5: COPY FILE TO APP STORAGE
    // ====
    console.log('💾 Step 5: Copying file to app storage...');
    
    await FileSystem.copyAsync({
      from: sourceUri,
      to: destinationUri
    });
    
    console.log('✅ File copied successfully');

    // ====
    // STEP 6: VERIFY FILE WAS SAVED
    // ====
    console.log('🔍 Step 6: Verifying saved file...');
    const savedInfo = await FileSystem.getInfoAsync(destinationUri);
    
    if (!savedInfo.exists) {
      throw new Error('File copy verification failed - file not found at destination');
    }
    console.log('✅ File verified at destination');
    console.log('📊 Saved size:', (savedInfo.size || 0) / 1024, 'KB');

    // ====
    // STEP 7: GET IMAGE DIMENSIONS (OPTIONAL)
    // ====
    let imageWidth: number | undefined;
    let imageHeight: number | undefined;

    try {
      // If you have expo-image-manipulator, you can get dimensions
      // For now, we'll skip this and set it later if needed
      console.log('⏭️ Step 7: Skipping dimensions (optional)');
    } catch (e) {
      console.log('⚠️ Could not read dimensions (ok)');
    }

    // ====
    // STEP 8: CREATE METADATA
    // ====
    console.log('📝 Step 8: Creating metadata...');
    const metadata: ImageMetadata = {
      id: imageKey,
      uri: destinationUri,
      thumbnailUri: destinationUri, // Same for now, can create thumbnail later
      filename: `Capture-${new Date().toLocaleDateString()}`,
      timestamp: new Date().toISOString(),
      isVerified: false,
      imageKey: imageKey,
      width: imageWidth,
      height: imageHeight,
    };
    console.log('✅ Metadata created');

    // ====
    // STEP 9: SAVE METADATA TO ASYNCSTORAGE
    // ====
    console.log('💾 Step 9: Saving metadata...');
    const metadataKey = `gallery_${imageKey}`;
    await AsyncStorage.setItem(metadataKey, JSON.stringify(metadata));
    console.log('✅ Metadata saved with key:', metadataKey);

    // ====
    // STEP 10: DELETE TEMPORARY SOURCE FILE
    // ====
    console.log('🗑️ Step 10: Cleaning up temp file...');
    try {
      // Only delete if it's in a temp/cache directory
      if (sourceUri.includes('Cache') || sourceUri.includes('tmp')) {
        await FileSystem.deleteAsync(sourceUri, { idempotent: true });
        console.log('✅ Temp file deleted');
      } else {
        console.log('⏭️ Source file kept (not a temp file)');
      }
    } catch (e) {
      console.log('⚠️ Could not delete temp file (ok)');
    }

    // ====
    // STEP 11: VERIFY COMPLETE SAVE
    // ====
    console.log('🔍 Step 11: Final verification...');
    
    // Check file still exists
    const finalCheck = await FileSystem.getInfoAsync(destinationUri);
    if (!finalCheck.exists) {
      throw new Error('Final verification failed - file disappeared');
    }

    // Check metadata can be retrieved
    const retrievedMetadata = await AsyncStorage.getItem(metadataKey);
    if (!retrievedMetadata) {
      throw new Error('Final verification failed - metadata not retrievable');
    }

    console.log('✅✅✅ IMAGE SAVE COMPLETE ✅✅✅');
    console.log('📍 Saved to:', destinationUri);
    console.log('🔑 Image key:', imageKey);
    console.log('💾 Metadata key:', metadataKey);

    return {
      savedUri: destinationUri,
      imageKey: imageKey,
      metadata: metadata,
    };

  } catch (error: any) {
    console.error('❌❌❌ IMAGE SAVE FAILED ❌❌❌');
    console.error('Error:', error.message);
    throw new Error(`Failed to save image: ${error.message}`);
  }
}

/**
 * ✅ HELPER: List all saved images
 */
export async function listSavedImages(): Promise<ImageMetadata[]> {
  try {
    console.log('📂 Listing saved images...');
    
    // Check directory exists
    const dirInfo = await FileSystem.getInfoAsync(APP_GALLERY_DIR);
    if (!dirInfo.exists) {
      console.log('📂 Directory does not exist');
      return [];
    }

    // Read all files
    const files = await FileSystem.readDirectoryAsync(APP_GALLERY_DIR);
    console.log(`📂 Found ${files.length} files`);

    const images: ImageMetadata[] = [];

    for (const file of files) {
      if (!file.endsWith('.jpg') && !file.endsWith('.png')) {
        continue;
      }

      const imageKey = file.replace(/\.(jpg|png)$/, '');
      const metadataKey = `gallery_${imageKey}`;

      try {
        const metadataJson = await AsyncStorage.getItem(metadataKey);
        if (metadataJson) {
          const metadata: ImageMetadata = JSON.parse(metadataJson);
          images.push(metadata);
        }
      } catch (e) {
        console.warn(`⚠️ Could not load metadata for ${file}`);
      }
    }

    console.log(`✅ Loaded ${images.length} images`);
    return images.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

  } catch (error: any) {
    console.error('❌ Failed to list images:', error.message);
    return [];
  }
}

/**
 * ✅ HELPER: Delete a saved image
 */
export async function deleteSavedImage(imageKey: string): Promise<void> {
  try {
    console.log('🗑️ Deleting image:', imageKey);

    // Get metadata to find file path
    const metadataKey = `gallery_${imageKey}`;
    const metadataJson = await AsyncStorage.getItem(metadataKey);
    
    if (!metadataJson) {
      throw new Error('Image metadata not found');
    }

    const metadata: ImageMetadata = JSON.parse(metadataJson);

    // Delete file
    await FileSystem.deleteAsync(metadata.uri, { idempotent: true });
    console.log('✅ File deleted');

    // Delete metadata
    await AsyncStorage.removeItem(metadataKey);
    console.log('✅ Metadata deleted');

  } catch (error: any) {
    console.error('❌ Failed to delete image:', error.message);
    throw error;
  }
}

/**
 * ✅ DIAGNOSTIC: Check storage status
 */
export async function checkStorageStatus(): Promise<{
  directoryExists: boolean;
  directoryPath: string;
  totalFiles: number;
  imageFiles: number;
  metadataCount: number;
  totalSizeKB: number;
}> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(APP_GALLERY_DIR);
    
    if (!dirInfo.exists) {
      return {
        directoryExists: false,
        directoryPath: APP_GALLERY_DIR,
        totalFiles: 0,
        imageFiles: 0,
        metadataCount: 0,
        totalSizeKB: 0,
      };
    }

    const files = await FileSystem.readDirectoryAsync(APP_GALLERY_DIR);
    const imageFiles = files.filter(f => f.endsWith('.jpg') || f.endsWith('.png'));

    let totalSize = 0;
    for (const file of imageFiles) {
      const fileInfo = await FileSystem.getInfoAsync(`${APP_GALLERY_DIR}${file}`, { size: true });
      if ('size' in fileInfo) {
        totalSize += fileInfo.size || 0;
      }
    }

    const allKeys = await AsyncStorage.getAllKeys();
    const metadataCount = allKeys.filter(k => k.startsWith('gallery_')).length;

    return {
      directoryExists: true,
      directoryPath: APP_GALLERY_DIR,
      totalFiles: files.length,
      imageFiles: imageFiles.length,
      metadataCount: metadataCount,
      totalSizeKB: Math.round(totalSize / 1024),
    };

  } catch (error: any) {
    console.error('❌ Storage check failed:', error.message);
    throw error;
  }
}