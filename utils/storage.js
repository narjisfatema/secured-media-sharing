// utils/storage.js
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cross-platform secure storage
 * Uses SecureStore on native, AsyncStorage on web
 */
export const Storage = {
  async setItem(key, value) {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.error(`Storage.setItem failed for key: ${key}`, error);
      throw error;
    }
  },

  async getItem(key) {
    try {
      if (Platform.OS === 'web') {
        return await AsyncStorage.getItem(key);
      } else {
        return await SecureStore.getItemAsync(key);
      }
    } catch (error) {
      console.error(`Storage.getItem failed for key: ${key}`, error);
      return null;
    }
  },

  async deleteItem(key) {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.error(`Storage.deleteItem failed for key: ${key}`, error);
      throw error;
    }
  },

  async clear() {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.clear();
      } else {
        // SecureStore doesn't have clear, delete known keys
        const keys = ['authToken', 'address', 'publicKey', 'walletConnected'];
        await Promise.all(keys.map(key => SecureStore.deleteItemAsync(key)));
      }
    } catch (error) {
      console.error('Storage.clear failed', error);
      throw error;
    }
  }
};