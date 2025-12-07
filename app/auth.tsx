import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Alert } from 'react-native';
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
      <TouchableOpacity
        style={[styles.button, connecting && styles.buttonDisabled]}
        onPress={connectWallet}
        disabled={connecting}
      >
        <Text style={styles.buttonText}>
          {connecting ? "Connecting..." : "Connect BSV Desktop Wallet"}
        </Text>
      </TouchableOpacity>

      {/* KEY PREVIEW */}
      {identityKey !== "" && (
        <Text style={styles.keyPreview}>
          Key: {identityKey.slice(0, 16)}...
        </Text>
      )}

      <ThemedText style={styles.orText}>OR</ThemedText>
      <ThemedText style={styles.mobileText}>Using mobile phone?</ThemedText>

      {/* MOBILE PASTE BUTTON */}
      <TouchableOpacity 
        style={styles.pasteButton}
        onPress={() => setShowPasteInput(true)}
        disabled={connecting}
      >
        <Text style={styles.pasteButtonText}>Paste Identity Key</Text>
      </TouchableOpacity>

      {/* SUCCESS MODAL */}
      <Modal visible={successModal} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Success!</Text>
            <Text style={styles.modalText}>
              Identity Key: {identityKey.slice(0, 16)}...
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={handleOK}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MOBILE PASTE INPUT MODAL */}
      <Modal visible={showPasteInput} transparent animationType="slide">
        <View style={styles.modalBackground}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Enter Identity Key</Text>
            <TextInput
              style={styles.input}
              value={pastedKey}
              onChangeText={setPastedKey}
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
                disabled={connecting}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, connecting && styles.buttonDisabled]} 
                onPress={verifyMobileKey} 
                disabled={connecting}
              >
                <Text style={styles.modalButtonText}>
                  {connecting ? 'Verifying...' : 'Verify'}
                </Text>
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
  },
  button: {
    backgroundColor: '#f7931a',
    padding: 20,
    borderRadius: 8,
    marginTop: 20,
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
    maxWidth: 350,
    padding: 25,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  modalText: {
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
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'space-between',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    minHeight: 100,
    width: '100%',
    fontSize: 14,
    backgroundColor: '#f9f9f9',
    marginBottom: 20,
  },
});
