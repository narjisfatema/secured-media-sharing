import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { WalletClient } from '@bsv/sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
// Import our unified URL logic
import { verifyMobileKey as verifyMobileKeyAPI, API_BASE_URL } from '@/hooks/authRequest';

export default function AuthScreen() {
  const [identityKey, setIdentityKey] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [pastedKey, setPastedKey] = useState('');
  const [showPasteInput, setShowPasteInput] = useState(false);

  // 1. Desktop / Web Wallet Logic
  const connectWallet = async () => {
    setConnecting(true);

    try {
      console.log('🔄 Starting wallet connection...');
      const walletClient = new WalletClient();
      
      console.log('📞 Requesting identity key from wallet...');
      const key = await walletClient.getPublicKey({ identityKey: true });
      const pubKey = key.publicKey;

      console.log('✅ Got identity key:', pubKey);
      setIdentityKey(pubKey);
      await AsyncStorage.setItem("identityKey", pubKey);

      console.log(`📝 Registering user at ${API_BASE_URL}...`);
      
      // Use our unified URL
      const registerResponse = await fetch(`${API_BASE_URL}/auto-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identityKey: pubKey }),
      });

      if (!registerResponse.ok) {
        const errText = await registerResponse.text();
        throw new Error(`Server error (${registerResponse.status}): ${errText}`);
      }

      const registerData = await registerResponse.json();
      if (!registerData.success) {
        throw new Error('Registration failed: ' + (registerData.error || 'Unknown error'));
      }

      console.log('✅ Registered:', registerData.user);
      setSuccessModal(true);
    } catch (error: any) {
      console.error('❌ Connect wallet error:', error);
      Alert.alert('Connection Error', error?.message || String(error));
    }

    setConnecting(false);
  };

  // 2. Mobile Logic
  const verifyMobileKey = async () => {
    if (!pastedKey.trim()) {
      return Alert.alert('Error', 'Please enter an identity key');
    }

    if (!/^(02|03)[0-9a-fA-F]{64}$/.test(pastedKey.trim())) {
      return Alert.alert(
        'Invalid Format', 
        'Identity key should be 66 hex characters starting with 02 or 03.'
      );
    }

    setConnecting(true);

    try {
      const result = await verifyMobileKeyAPI(pastedKey.trim());
      
      if (!result.success) {
        throw new Error(result.error || 'Verification failed');
      }

      await AsyncStorage.setItem("identityKey", pastedKey.trim());
      setIdentityKey(pastedKey.trim());

      console.log('Mobile authentication successful:', result.user);
      setSuccessModal(true);
      setShowPasteInput(false);
      setPastedKey('');
    } catch (error: any) {
      console.error('❌ Mobile verification error:', error);
      
      if (error.message.includes('not found') || error.message.includes('Desktop Wallet')) {
        Alert.alert(
          "Not Registered",
          "This key isn't registered yet.\n\nPlease register on Desktop first.",
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Verification Failed", error.message);
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleOK = () => {
    setSuccessModal(false);
    router.replace("/dashboard");
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgGradient} />
      
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.iconContainer}>
            <IconSymbol size={64} name="lock.shield.fill" color="#f7931a" />
          </View>
          <Text style={styles.title}>Secure Media Vault</Text>
          <Text style={styles.subtitle}>Server: {API_BASE_URL.replace('http://', '')}</Text>
        </View>

        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.primaryButton, connecting && styles.buttonDisabled]}
            onPress={connectWallet}
            disabled={connecting}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              {connecting ? (
                <>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.buttonText}>Connecting...</Text>
                </>
              ) : (
                <>
                  <IconSymbol size={24} name="wallet.pass.fill" color="#fff" />
                  <Text style={styles.buttonText}>Connect BSV Desktop Wallet</Text>
                </>
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.helperContainer}>
            <IconSymbol size={16} name="info.circle" color="#888" />
            <Text style={styles.helperText}>
              Ensure BSV Desktop Wallet is running
            </Text>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.mobileSection}>
            <IconSymbol size={28} name="iphone" color="#f7931a" />
            <Text style={styles.mobileTitle}>Using Mobile?</Text>
            <Text style={styles.mobileSubtitle}>
              Paste your identity key to access your vault
            </Text>
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setShowPasteInput(true)}
            disabled={connecting}
            activeOpacity={0.7}
          >
            <IconSymbol size={20} name="doc.on.clipboard" color="#f7931a" />
            <Text style={styles.secondaryButtonText}>Paste Identity Key</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Success Modal */}
      <Modal visible={successModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIconContainer}>
              <IconSymbol size={80} name="checkmark.circle.fill" color="#22c55e" />
            </View>
            <Text style={styles.successTitle}>Authentication Successful!</Text>
            <View style={styles.keyDisplay}>
              <Text style={styles.keyLabel}>Your Identity Key</Text>
              <Text style={styles.keyText}>
                {identityKey.slice(0, 20)}...{identityKey.slice(-12)}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.continueButton} 
              onPress={handleOK}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>Continue to Dashboard</Text>
              <IconSymbol size={20} name="arrow.right.circle.fill" color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Input Modal */}
      <Modal visible={showPasteInput} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.inputModal}>
            <View style={styles.modalHeader}>
              <IconSymbol size={32} name="key.fill" color="#f7931a" />
              <Text style={styles.inputModalTitle}>Enter Identity Key</Text>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={pastedKey}
                onChangeText={setPastedKey}
                placeholder="02a1b2c3d4e5f6..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                editable={!connecting}
                textAlignVertical="top"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowPasteInput(false);
                  setPastedKey('');
                }}
                disabled={connecting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.verifyButton, connecting && styles.buttonDisabled]}
                onPress={verifyMobileKey}
                disabled={connecting}
              >
                {connecting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Text style={styles.verifyButtonText}>Login</Text>
                    <IconSymbol size={18} name="arrow.right" color="#fff" />
                  </>
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
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  bgGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 400, backgroundColor: '#1a1a1a', opacity: 0.5 },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  hero: { alignItems: 'center', marginBottom: 40 },
  iconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(247, 147, 26, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 2, borderColor: 'rgba(247, 147, 26, 0.3)' },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#888', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  card: { backgroundColor: '#1a1a1a', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#2a2a2a' },
  primaryButton: { backgroundColor: '#f7931a', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 24, ...Platform.select({ android: { elevation: 8 }, web: { boxShadow: '0 8px 12px rgba(247, 147, 26, 0.3)' } }) },
  buttonDisabled: { backgroundColor: '#3a3a3a' },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  helperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  helperText: { fontSize: 13, color: '#888' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 32 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#2a2a2a' },
  dividerText: { color: '#666', paddingHorizontal: 16, fontSize: 14, fontWeight: '600' },
  mobileSection: { alignItems: 'center', marginBottom: 20 },
  mobileTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 12, marginBottom: 6 },
  mobileSubtitle: { fontSize: 14, color: '#888', textAlign: 'center' },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(247, 147, 26, 0.1)', borderRadius: 16, paddingVertical: 16, borderWidth: 1.5, borderColor: 'rgba(247, 147, 26, 0.3)' },
  secondaryButtonText: { color: '#f7931a', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  successModal: { backgroundColor: '#1a1a1a', borderRadius: 32, padding: 32, width: '100%', maxWidth: 400, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a' },
  successIconContainer: { marginBottom: 24 },
  successTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 24, textAlign: 'center' },
  keyDisplay: { backgroundColor: '#0a0a0a', borderRadius: 16, padding: 20, width: '100%', marginBottom: 28, borderWidth: 1, borderColor: '#2a2a2a' },
  keyLabel: { fontSize: 12, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  keyText: { fontSize: 14, color: '#f7931a', fontFamily: 'monospace', lineHeight: 20 },
  continueButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#22c55e', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, width: '100%' },
  continueButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  inputModal: { backgroundColor: '#1a1a1a', borderRadius: 32, padding: 28, width: '100%', maxWidth: 440, borderWidth: 1, borderColor: '#2a2a2a' },
  modalHeader: { alignItems: 'center', marginBottom: 24 },
  inputModalTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 12 },
  inputContainer: { marginBottom: 24 },
  input: { backgroundColor: '#0a0a0a', borderRadius: 16, padding: 16, color: '#fff', fontSize: 14, minHeight: 100, textAlignVertical: 'top', fontFamily: 'monospace', borderWidth: 1, borderColor: '#2a2a2a' },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, backgroundColor: '#2a2a2a', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  cancelButtonText: { color: '#888', fontSize: 16, fontWeight: '600' },
  verifyButton: { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f7931a', borderRadius: 16, paddingVertical: 16 },
  verifyButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});