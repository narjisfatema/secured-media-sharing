// utils/WalletConnection.js
import { Platform, Linking, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Storage } from './storage';

const API_URL = __DEV__ 
  ? 'http://localhost:8081/api' 
  : 'https://your-production-api.com/api';

export class WalletConnection {
  
  /**
   * Main connection method
   * Detects platform and uses appropriate method
   */
  static async connect() {
    try {
      console.log('🔗 Initiating wallet connection...');
      
      // Step 1: Request authentication session from backend
      const response = await fetch(`${API_URL}/wallet/auth/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to create authentication session');
      }
      
      const { sessionId, challenge, walletUrl } = await response.json();
      
      console.log('📱 Session created:', sessionId);
      console.log('🔗 Wallet URL:', walletUrl);
      
      // Step 2: Open desktop wallet
      if (Platform.OS === 'web') {
        // Web: Open in new window
        window.open(walletUrl, '_blank');
      } else {
        // Mobile: Try to open wallet app
        const canOpen = await Linking.canOpenURL(walletUrl);
        
        if (canOpen) {
          await Linking.openURL(walletUrl);
        } else {
          // Fallback: Open in browser
          await WebBrowser.openBrowserAsync(walletUrl);
        }
      }
      
      // Step 3: Poll for authentication completion
      const result = await this.pollAuthStatus(sessionId);
      
      if (result.status === 'completed') {
        // Store credentials
        await Storage.setItem('authToken', result.token);
        await Storage.setItem('address', result.address);
        await Storage.setItem('publicKey', result.publicKey);
        await Storage.setItem('walletConnected', 'true');
        
        console.log('✅ Wallet connected:', result.address);
        
        return {
          success: true,
          address: result.address,
          publicKey: result.publicKey
        };
      }
      
      throw new Error('Authentication failed or timed out');
      
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      throw error;
    }
  }
  
  /**
   * Poll backend for authentication status
   */
  static async pollAuthStatus(sessionId, maxAttempts = 60, interval = 2000) {
    console.log('⏳ Polling for authentication...');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`${API_URL}/wallet/auth/status/${sessionId}`);
        const data = await response.json();
        
        console.log(`📊 Attempt ${attempt}/${maxAttempts}: ${data.status}`);
        
        if (data.status === 'completed') {
          return data;
        }
        
        if (data.status === 'expired') {
          throw new Error('Authentication session expired');
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, interval));
        
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
      }
    }
    
    throw new Error('Authentication timeout');
  }
  
  /**
   * Sign transaction with desktop wallet
   */
  static async signTransaction(unsignedTx, description = 'Sign Transaction') {
    try {
      const token = await Storage.getItem('authToken');
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      console.log('✍️ Requesting transaction signature...');
      
      // Step 1: Request signing
      const response = await fetch(`${API_URL}/wallet/transaction/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          transaction: unsignedTx,
          description
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create signing request');
      }
      
      const { txId, walletUrl } = await response.json();
      
      console.log('📝 Signing request created:', txId);
      
      // Step 2: Open wallet for signing
      if (Platform.OS === 'web') {
        window.open(walletUrl, '_blank');
      } else {
        const canOpen = await Linking.canOpenURL(walletUrl);
        if (canOpen) {
          await Linking.openURL(walletUrl);
        } else {
          await WebBrowser.openBrowserAsync(walletUrl);
        }
      }
      
      // Step 3: Poll for signed transaction
      const signedTx = await this.pollTransactionStatus(txId);
      
      console.log('✅ Transaction signed');
      
      return signedTx;
      
    } catch (error) {
      console.error('❌ Transaction signing failed:', error);
      throw error;
    }
  }
  
  /**
   * Poll for signed transaction
   */
  static async pollTransactionStatus(txId, maxAttempts = 60, interval = 2000) {
    console.log('⏳ Waiting for signature...');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`${API_URL}/wallet/transaction/status/${txId}`);
        const data = await response.json();
        
        console.log(`📊 Attempt ${attempt}/${maxAttempts}: ${data.status}`);
        
        if (data.status === 'signed') {
          return data.signedTransaction;
        }
        
        if (data.status === 'expired') {
          throw new Error('Signing request expired');
        }
        
        await new Promise(resolve => setTimeout(resolve, interval));
        
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
      }
    }
    
    throw new Error('Signing timeout');
  }
  
  /**
   * Check if wallet is connected
   */
  static async isConnected() {
    const connected = await Storage.getItem('walletConnected');
    return connected === 'true';
  }
  
  /**
   * Get current address
   */
  static async getAddress() {
    return await Storage.getItem('address');
  }
  
  /**
   * Get auth token
   */
  static async getAuthToken() {
    return await Storage.getItem('authToken');
  }
  
  /**
   * Disconnect wallet
   */
  static async disconnect() {
    await Storage.deleteItem('authToken');
    await Storage.deleteItem('address');
    await Storage.deleteItem('publicKey');
    await Storage.deleteItem('walletConnected');
    
    console.log('🔌 Wallet disconnected');
  }
}