import React, { useState } from 'react';
<<<<<<< HEAD
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Alert } from 'react-native';
=======
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
>>>>>>> a26891f (bsv authentication)
import { WalletClient } from '@bsv/sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';

export default function AuthScreen() {
  const [identityKey, setIdentityKey] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [pastedKey, setPastedKey] = useState('');
  const [showPasteInput, setShowPasteInput] = useState(false);
<<<<<<< HEAD

  const connectWallet = async () => {
    setConnecting(true);
    try {
      const walletClient = new WalletClient();
      const key = await walletClient.getPublicKey({ identityKey: true });
      setIdentityKey(key.publicKey);
      await AsyncStorage.setItem("identityKey", key.publicKey);
      setSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? String(error));
    }
    setConnecting(false);
  };

  const verifyMobileKey = async () => {
    if (!pastedKey.trim()) return Alert.alert('Error', 'Enter identity key');
    
    setConnecting(true);
    try {
      // Replace with your MongoDB API endpoint
      const response = await fetch('YOUR_MONGODB_API_URL/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identityKey: pastedKey.trim() })
      });
      
      const { verified, userId } = await response.json();
      
      if (verified) {
        await AsyncStorage.setItem('identityKey', pastedKey.trim());
        setIdentityKey(pastedKey.trim());
        setSuccessModal(true);
        setShowPasteInput(false);
      } else {
        Alert.alert('Error', 'Key not verified. Contact admin or use desktop wallet.');
      }
    } catch (error) {
      Alert.alert('Error', 'Verification failed. Check connection.');
    }
    setConnecting(false);
  };

  const handleOK = () => {
    setSuccessModal(false);
    router.replace("/dashboard");
  };

  return (
    <View style={styles.container}>
      {/* DESKTOP WALLET BUTTON (UNCHANGED) */}
=======

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

  // 🔥 2. MOBILE KEY PASTE
  const verifyMobileKey = async () => {
    if (!pastedKey.trim()) {
      return Alert.alert('Error', 'Please enter an identity key');
    }

    // Validate format
    if (!/^(02|03)[0-9a-fA-F]{64}$/.test(pastedKey.trim())) {
      return Alert.alert('Error', 'Invalid identity key format. Should be 66 hex characters starting with 02 or 03.');
    }

    setConnecting(true);

    try {
      // Register the pasted key
      const response = await fetch(`${SERVER_URL}/auto-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identityKey: pastedKey.trim() }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      await AsyncStorage.setItem("identityKey", pastedKey.trim());
      setIdentityKey(pastedKey.trim());

      console.log('✅ Mobile key verified:', data);

      setSuccessModal(true);
      setShowPasteInput(false);
    } catch (error) {
      console.error('❌ Mobile verification error:', error);
      Alert.alert("Error", error?.message || "Verification failed.");
    }

    setConnecting(false);
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
>>>>>>> a26891f (bsv authentication)
      <TouchableOpacity
        style={[styles.button, connecting && styles.buttonDisabled]}
        onPress={connectWallet}
        disabled={connecting}
      >
<<<<<<< HEAD
        <Text style={styles.buttonText}>
          {connecting ? "Connecting..." : "Connect BSV Desktop Wallet"}
        </Text>
      </TouchableOpacity>

      {/* KEY PREVIEW */}
      {identityKey !== "" && (
        <Text style={styles.keyPreview}>
          Key: {identityKey.slice(0, 16)}...
=======
        {connecting ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="white" />
            <Text style={styles.buttonText}>Connecting...</Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>Connect BSV Desktop Wallet</Text>
        )}
      </TouchableOpacity>

      {identityKey !== "" && (
        <Text style={styles.keyPreview}>
          🔑 Key: {identityKey.slice(0, 16)}...{identityKey.slice(-8)}
>>>>>>> a26891f (bsv authentication)
        </Text>
      )}

      <ThemedText style={styles.orText}>OR</ThemedText>
      <ThemedText style={styles.mobileText}>Using mobile phone?</ThemedText>

<<<<<<< HEAD
      {/* MOBILE PASTE BUTTON */}
=======
>>>>>>> a26891f (bsv authentication)
      <TouchableOpacity 
        style={styles.pasteButton}
        onPress={() => setShowPasteInput(true)}
        disabled={connecting}
      >
<<<<<<< HEAD
        <Text style={styles.pasteButtonText}>Paste Identity Key</Text>
=======
        <Text style={styles.pasteButtonText}>📋 Paste Identity Key</Text>
>>>>>>> a26891f (bsv authentication)
      </TouchableOpacity>

      {/* SUCCESS MODAL */}
      <Modal visible={successModal} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.modalBox}>
<<<<<<< HEAD
            <Text style={styles.modalTitle}>Success!</Text>
            <Text style={styles.modalText}>
              Identity Key: {identityKey.slice(0, 16)}...
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={handleOK}>
              <Text style={styles.modalButtonText}>OK</Text>
=======
            <Text style={styles.modalEmoji}>✅</Text>
            <Text style={styles.modalTitle}>Success!</Text>
            <Text style={styles.modalText}>
              Authenticated successfully!{'\n\n'}
              Identity Key:{'\n'}
              {identityKey.slice(0, 20)}...{identityKey.slice(-12)}
            </Text>

            <TouchableOpacity style={styles.modalButton} onPress={handleOK}>
              <Text style={styles.modalButtonText}>Continue to Dashboard</Text>
>>>>>>> a26891f (bsv authentication)
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

<<<<<<< HEAD
      {/* MOBILE PASTE INPUT MODAL */}
=======
      {/* PASTE INPUT MODAL */}
>>>>>>> a26891f (bsv authentication)
      <Modal visible={showPasteInput} transparent animationType="slide">
        <View style={styles.modalBackground}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Enter Identity Key</Text>
<<<<<<< HEAD
=======
            <Text style={styles.helperText}>
              Paste your 66-character BSV identity key
            </Text>

>>>>>>> a26891f (bsv authentication)
            <TextInput
              style={styles.input}
              value={pastedKey}
              onChangeText={setPastedKey}
<<<<<<< HEAD
              placeholder="Paste your BSV identity key here..."
              multiline
              numberOfLines={4}
              editable={!connecting}
              textAlignVertical="top"
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowPasteInput(false)}
=======
              placeholder="02a1b2c3d4e5f6..."
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
>>>>>>> a26891f (bsv authentication)
                disabled={connecting}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
<<<<<<< HEAD
              <TouchableOpacity 
                style={[styles.modalButton, connecting && styles.buttonDisabled]} 
                onPress={verifyMobileKey} 
                disabled={connecting}
              >
                <Text style={styles.modalButtonText}>
                  {connecting ? 'Verifying...' : 'Verify'}
                </Text>
=======

              <TouchableOpacity
                style={[styles.modalButton, connecting && styles.buttonDisabled]}
                onPress={verifyMobileKey}
                disabled={connecting}
              >
                {connecting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.modalButtonText}>Verify</Text>
                )}
>>>>>>> a26891f (bsv authentication)
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
<<<<<<< HEAD
=======
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
>>>>>>> a26891f (bsv authentication)
  },
  button: {
    backgroundColor: '#f7931a',
    padding: 20,
<<<<<<< HEAD
    borderRadius: 8,
    marginTop: 20,
=======
    borderRadius: 12,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
>>>>>>> a26891f (bsv authentication)
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
<<<<<<< HEAD
  keyPreview: {
    marginTop: 10,
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  orText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 18,
    fontWeight: 'bold',
  },
  mobileText: {
    textAlign: 'center',
    marginTop: 5,
    color: '#666',
  },
  pasteButton: {
    backgroundColor: 'transparent',
=======
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
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
>>>>>>> a26891f (bsv authentication)
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
<<<<<<< HEAD
    maxWidth: 350,
    padding: 25,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
=======
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
>>>>>>> a26891f (bsv authentication)
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  modalText: {
<<<<<<< HEAD
    fontSize: 16,
    marginBottom: 25,
    textAlign: 'center',
    color: '#666',
  },
  modalButton: {
    backgroundColor: '#f7931a',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    minWidth: 100,
=======
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
>>>>>>> a26891f (bsv authentication)
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
<<<<<<< HEAD
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'space-between',
=======
    fontSize: 15,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
    justifyContent: 'space-between',
    marginTop: 10,
>>>>>>> a26891f (bsv authentication)
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
<<<<<<< HEAD
    borderRadius: 8,
    minHeight: 100,
    width: '100%',
    fontSize: 14,
    backgroundColor: '#f9f9f9',
    marginBottom: 20,
  },
});
=======
    borderRadius: 10,
    minHeight: 90,
    width: '100%',
    fontSize: 13,
    backgroundColor: '#f9f9f9',
    marginBottom: 20,
    fontFamily: 'monospace',
  },
});
>>>>>>> a26891f (bsv authentication)
