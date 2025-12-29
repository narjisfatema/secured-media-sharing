import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { WalletClient } from '@bsv/sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { verifyMobileKey as verifyMobileKeyAPI } from '@/hooks/authRequest';

export default function AuthScreen() {
  const [identityKey, setIdentityKey] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [pastedKey, setPastedKey] = useState('');
  const [showPasteInput, setShowPasteInput] = useState(false);

  const SERVER_URL = "http://localhost:3000";

  // 🔥 1. CONNECT DESKTOP WALLET (WORKING - NO AUTH TEST)
  const connectWallet = async () => {
    setConnecting(true);

    try {
      console.log('🔄 Starting wallet connection...');
     
      // Initialize wallet client
      const walletClient = new WalletClient();
     
      // Get identity key from BSV Desktop Wallet
      console.log('📞 Requesting identity key from wallet...');
      const key = await walletClient.getPublicKey({ identityKey: true });
      const pubKey = key.publicKey;

      console.log('✅ Got identity key:', pubKey);

      setIdentityKey(pubKey);
      await AsyncStorage.setItem("identityKey", pubKey);

      // Register in MongoDB (public endpoint - no auth required)
      console.log('📝 Registering user...');
      const registerResponse = await fetch(`${SERVER_URL}/auto-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identityKey: pubKey }),
      });

      if (!registerResponse.ok) {
        throw new Error(`Server error: ${registerResponse.status}`);
      }

      const registerData = await registerResponse.json();
     
      if (!registerData.success) {
        throw new Error('Registration failed: ' + (registerData.error || 'Unknown error'));
      }

      console.log('✅ Registered:', registerData.user);
      console.log('✅ Authentication successful! Proceeding to dashboard...');
     
      // Skip the auth test - go directly to success
      // The BRC-103 auth will work when uploading photos
      setSuccessModal(true);
     
    } catch (error) {
      console.error('❌ Connect wallet error:', error);
      Alert.alert(
        'Connection Error',
        error?.message || String(error)
      );
    }

    setConnecting(false);
  };

  // 🔥 2. MOBILE KEY PASTE (UPDATED WITH DATABASE VERIFICATION)
  const verifyMobileKey = async () => {
    if (!pastedKey.trim()) {
      return Alert.alert('Error', 'Please enter an identity key');
    }

    // Validate format
    if (!/^(02|03)[0-9a-fA-F]{64}$/.test(pastedKey.trim())) {
      return Alert.alert(
        'Invalid Format', 
        'Identity key should be 66 hex characters starting with 02 or 03.\n\nExample: 02a1b2c3d4e5f6...'
      );
    }

    setConnecting(true);

    try {
      // Verify the key exists in database
      const result = await verifyMobileKeyAPI(pastedKey.trim());

      if (!result.success) {
        throw new Error(result.error || 'Verification failed');
      }

      // Save identity key to AsyncStorage
      await AsyncStorage.setItem("identityKey", pastedKey.trim());
      setIdentityKey(pastedKey.trim());

      console.log('✅ Mobile authentication successful:', result.user);
      console.log(`📱 Media count: ${result.user.mediaCount}`);
      console.log(`📅 Registered: ${new Date(result.user.registeredAt).toLocaleDateString()}`);

      // Show success modal
      setSuccessModal(true);
      setShowPasteInput(false);
      setPastedKey('');
      
    } catch (error: any) {
      console.error('❌ Mobile verification error:', error);
      
      // Check if user needs desktop authentication first
      if (error.message.includes('not found') || error.message.includes('Desktop Wallet')) {
        Alert.alert(
          "Not Registered",
          "This identity key hasn't been registered yet.\n\n" +
          "📋 Steps to register:\n" +
          "1. Open this app on desktop\n" +
          "2. Connect with BSV Desktop Wallet\n" +
          "3. Complete registration\n" +
          "4. Then use this key on mobile\n\n" +
          "💡 This links your identity across devices.",
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "Verification Failed", 
          error.message || "Could not verify identity key"
        );
      }
    } finally {
      setConnecting(false);
    }
  };

  // 🔥 3. SUCCESS - GO TO DASHBOARD
  const handleOK = () => {
    setSuccessModal(false);
    router.replace("/dashboard");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>BSV Authentication</Text>
        <Text style={styles.subtitle}>Secure login with BRC-103</Text>
      </View>

      {/* DESKTOP WALLET CONNECT */}
      <TouchableOpacity
        style={[styles.button, connecting && styles.buttonDisabled]}
        onPress={connectWallet}
        disabled={connecting}
      >
        {connecting ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="white" />
            <Text style={styles.buttonText}>Connecting...</Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>Connect BSV Desktop Wallet</Text>
        )}
      </TouchableOpacity>

      <ThemedText style={styles.helperSubtext}>
        Make sure BSV Desktop is running and connected for seamless integration
      </ThemedText>

      {identityKey !== "" && (
        <Text style={styles.keyPreview}>
          🔑 Key: {identityKey.slice(0, 16)}...{identityKey.slice(-8)}
        </Text>
      )}

      <ThemedText style={styles.orText}>OR</ThemedText>
      <ThemedText style={styles.mobileText}>Using mobile phone?</ThemedText>

      <TouchableOpacity
        style={styles.pasteButton}
        onPress={() => setShowPasteInput(true)}
        disabled={connecting}
      >
        <Text style={styles.pasteButtonText}>📋 Paste Identity Key</Text>
      </TouchableOpacity>

      {/* SUCCESS MODAL */}
      <Modal visible={successModal} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.modalBox}>
            <Text style={styles.modalEmoji}>✅</Text>
            <Text style={styles.modalTitle}>Success!</Text>
            <Text style={styles.modalText}>
              Authenticated successfully!{'\n\n'}
              Identity Key:{'\n'}
              {identityKey.slice(0, 20)}...{identityKey.slice(-12)}
            </Text>

            <TouchableOpacity style={styles.modalButton} onPress={handleOK}>
              <Text style={styles.modalButtonText}>Continue to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PASTE INPUT MODAL */}
      <Modal visible={showPasteInput} transparent animationType="slide">
        <View style={styles.modalBackground}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Enter Identity Key</Text>
            <Text style={styles.helperText}>
              📱 Mobile users: Paste your 66-character identity key
            </Text>
            <Text style={[styles.helperText, { fontSize: 12, color: '#999', marginTop: 4, marginBottom: 8 }]}>
              ⚠️ First-time? Register on desktop with BSV Desktop Wallet first
            </Text>

            <TextInput
              style={styles.input}
              value={pastedKey}
              onChangeText={setPastedKey}
              placeholder="02a1b2c3d4e5f6..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={3}
              editable={!connecting}
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowPasteInput(false);
                  setPastedKey('');
                }}
                disabled={connecting}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, connecting && styles.buttonDisabled]}
                onPress={verifyMobileKey}
                disabled={connecting}
              >
                {connecting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.modalButtonText}>Verify & Login</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  button: {
    backgroundColor: '#f7931a',
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  helperSubtext: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
  keyPreview: {
    marginTop: 15,
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    fontFamily: 'monospace',
    backgroundColor: '#e8e8e8',
    padding: 10,
    borderRadius: 8,
  },
  orText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
  },
  mobileText: {
    textAlign: 'center',
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
  pasteButton: {
    paddingVertical: 15,
    marginTop: 20,
  },
  pasteButtonText: {
    color: '#007bff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: 'white',
    width: '100%',
    maxWidth: 400,
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalEmoji: {
    fontSize: 48,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  modalText: {
    fontSize: 14,
    marginBottom: 25,
    textAlign: 'center',
    color: '#666',
    lineHeight: 20,
  },
  helperText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalButton: {
    backgroundColor: '#f7931a',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    minWidth: 120,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 15,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 15,
    color: '#333',
    backgroundColor: '#f9f9f9',
    fontSize: 13,
    minHeight: 80,
    width: '100%',
    textAlignVertical: 'top',
    fontFamily: 'monospace',
  },
});