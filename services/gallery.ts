import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'blockchain_images';

export async function saveToGallery(
  imageUri: string,
  watermarkData: any
): Promise<void> {
  // Request permissions
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Gallery permission not granted');
  }

  // Save to device gallery
  await MediaLibrary.saveToLibraryAsync(imageUri);

  // Save metadata locally
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  const images = stored ? JSON.parse(stored) : [];
  
  images.push({
    id: Date.now().toString(),
    uri: imageUri,
    watermarkData,
    createdAt: new Date().toISOString(),
  });

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(images));
}

export async function getStoredImages(): Promise<any[]> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}