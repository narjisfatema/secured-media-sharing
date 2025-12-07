// app/watermarkeditor.tsx - ✅ APP-PRIVATE FLOW (Image already in gallery!)
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Pressable,
  Animated,
  PanResponder,
  Alert,
  ActivityIndicator,
  Share,
  Modal,
  ScrollView,
  Platform,
  Linking,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { uploadToBlockchainUHRP } from "@/services/uhrp-blockchain";
import { updateGalleryWithBlockchain } from "@/services/gallery";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface UHRPRecord {
  txid: string;
  imageHash: string;
  watermarkData: any;
  timestamp: string;
  verifiedPosition?: { x: number; y: number };
}

interface LocalSearchParams {
  imageUri: string;
  imageKey: string;
  captureTimestamp?: string;
}

export default function WatermarkEditorScreen() {
  const params = useLocalSearchParams() as LocalSearchParams;
  const router = useRouter();
  const { imageUri, imageKey, captureTimestamp } = params;

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [savedTxid, setSavedTxid] = useState<string | null>(null);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [uhrpRecord, setUhrpRecord] = useState<UHRPRecord | null>(null);
  const [identityKey, setIdentityKey] = useState<string | null>(null);

  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  useEffect(() => {
    loadIdentityKey();
  }, []);

  const loadIdentityKey = async () => {
    try {
      const key = await AsyncStorage.getItem('identityKey');
      setIdentityKey(key || null);
    } catch (error) {
      console.error('❌ Failed to load identity key:', error);
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !savedTxid,
    onMoveShouldSetPanResponder: () => !savedTxid,
    onPanResponderGrant: () => {
      pan.setOffset({
        x: pan.x._value,
        y: pan.y._value,
      });
    },
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
      useNativeDriver: false,
    }),
    onPanResponderRelease: () => {
      pan.flattenOffset();
      const maxX = containerSize.width - 150;
      const maxY = containerSize.height - 80;
      const newX = Math.max(0, Math.min(pan.x._value, maxX));
      const newY = Math.max(0, Math.min(pan.y._value, maxY));
      
      Animated.spring(pan, {
        toValue: { x: newX, y: newY },
        useNativeDriver: false,
      }).start();
    },
  });

  const watermarkData = {
    timestamp: captureTimestamp || new Date().toISOString(),
    hash: `UHRP-${Date.now()}`,
    owner: identityKey ? `${identityKey.slice(0, 16)}...` : "Your Wallet",
  };

  const handleLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
    pan.setValue({ x: (width - 150) / 2, y: (height - 80) / 2 });
  };

  const openWhatsonchain = async (txid: string) => {
    const url = `https://whatsonchain.com/tx/${txid}`;
    try {
      await Linking.openURL(url);
    } catch (error) {
      await Clipboard.setStringAsync(txid);
      Alert.alert('TXID Copied', 'Paste into whatsonchain.com/tx/');
    }
  };

  const handleSaveToBlockchain = async () => {
    if (!identityKey || !imageKey) {
      Alert.alert('Error', 'Wallet or image key missing');
      return;
    }

    const FINAL_POSITION = { x: pan.x._value, y: pan.y._value };
    setIsSaving(true);

    try {
      console.log('🔒 Uploading to BSV blockchain...');
      
      const record = await uploadToBlockchainUHRP({
        imageUri,
        watermarkPosition: FINAL_POSITION,
        watermarkText: `UHRP-${Date.now()}-${identityKey.slice(0,8)}`,
        captureTimestamp: watermarkData.timestamp,
        deviceInfo: `${Platform.OS} ${Platform.Version}`,
      });

      console.log('✅ Blockchain verified:', record.txid);

      setSavedTxid(record.txid);
      setUhrpRecord({ ...record, verifiedPosition: FINAL_POSITION });

      // ✅ UPDATE app private gallery entry with blockchain data
      await updateGalleryWithBlockchain(imageKey, {
        imageKey,
        uhrpTxId: record.txid,
        blockchainHash: record.imageHash,
        filename: `BSV-${record.txid.slice(0, 8)}`,
        timestamp: watermarkData.timestamp,
        owner: watermarkData.owner,
        position: FINAL_POSITION,
      });

      Alert.alert(
        '✅ Blockchain Verified!',
        `📍 Position locked: X${FINAL_POSITION.x.toFixed(0)} Y${FINAL_POSITION.y.toFixed(0)}\n🔗 TXID: ${record.txid.slice(0, 16)}...\n\n✓ Updated in private gallery\n✓ Pull-to-refresh to see verification!`,
        [
          { text: 'Whatsonchain', onPress: () => openWhatsonchain(record.txid) },
          { text: 'Show Proof', onPress: () => setShowMetadataModal(true) },
          { text: 'Go to Gallery', onPress: () => router.push('/(tabs)/gallery') },
        ]
      );
    } catch (error: any) {
      console.error('❌ Blockchain upload failed:', error);
      Alert.alert(
        'Upload Failed', 
        error.message || 'Could not verify on blockchain',
        [
          { text: 'Retry', onPress: handleSaveToBlockchain },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      '📱 Image Already Saved',
      'Your photo is in the private gallery (unverified). You can verify it anytime from the gallery.',
      [
        { text: 'Go to Gallery', onPress: () => router.push('/(tabs)/gallery') },
        { text: 'Stay Here', style: 'cancel' }
      ]
    );
  };

  const handleShare = async () => {
    if (!savedTxid) return;
    
    await Share.share({
      message: `🔒 BSV Verified Image\n🔗 https://whatsonchain.com/tx/${savedTxid}\n📍 Position: X${uhrpRecord?.verifiedPosition?.x?.toFixed(0)} Y${uhrpRecord?.verifiedPosition?.y?.toFixed(0)}`,
      title: 'BSV Blockchain Proof',
    });
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('✓', 'Copied to clipboard');
  };

  if (!imageUri || !imageKey) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="error-outline" size={64} color="#ef4444" />
        <Text style={styles.errorText}>Missing image data</Text>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!identityKey) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="account-balance-wallet" size={64} color="#ef4444" />
        <Text style={styles.errorText}>BSV Wallet Required</Text>
        <Text style={styles.errorSubtext}>Connect to verify watermarks</Text>
        <Pressable style={styles.button} onPress={() => router.push('/auth')}>
          <MaterialIcons name="account-balance-wallet" size={20} color="white" />
          <Text style={styles.buttonText}>Connect Wallet</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <MaterialIcons name="shield" size={20} color="#10b981" />
          <Text style={styles.headerBadgeText}>App Private Storage</Text>
        </View>
        
        <Text style={styles.title}>🔒 Position Watermark</Text>
        <Text style={styles.subtitle}>
          {savedTxid 
            ? `✅ Verified • ${savedTxid.slice(0, 16)}...` 
            : 'Drag watermark → Tap LOCK to verify on blockchain'
          }
        </Text>
        <Text style={styles.ownerText}>👤 {watermarkData.owner}</Text>

        <View style={styles.buttonContainer}>
          <Pressable 
            style={[styles.actionButton, styles.cancelButton]} 
            onPress={handleCancel} 
            disabled={isSaving}
          >
            <MaterialIcons name="photo-library" size={20} color="#94a3b8" />
            <Text style={styles.cancelButtonText}>Gallery</Text>
          </Pressable>

          <Pressable 
            style={[styles.actionButton, styles.saveButton, (isSaving || savedTxid) && styles.buttonDisabled]} 
            onPress={handleSaveToBlockchain} 
            disabled={isSaving || !!savedTxid}
          >
            {isSaving ? (
              <>
                <ActivityIndicator color="white" size="small" />
                <Text style={styles.saveButtonText}>Verifying...</Text>
              </>
            ) : savedTxid ? (
              <>
                <MaterialIcons name="verified" size={20} color="white" />
                <Text style={styles.saveButtonText}>Verified</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="lock" size={20} color="white" />
                <Text style={styles.saveButtonText}>LOCK Position</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.imageContainer} onLayout={handleLayout}>
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          
          {containerSize.width > 0 && (
            <Animated.View 
              style={[
                styles.watermark,
                { 
                  transform: [{ translateX: pan.x }, { translateY: pan.y }],
                  borderColor: savedTxid ? "#10b981" : "#3b82f6",
                  backgroundColor: savedTxid ? "rgba(16,185,129,0.95)" : "rgba(0,0,0,0.92)",
                }
              ]} 
              {...(!savedTxid && panResponder.panHandlers)}
            >
              <View style={styles.watermarkContent}>
                <View style={styles.watermarkHeader}>
                  <MaterialIcons 
                    name={savedTxid ? "verified" : "shield"} 
                    size={16} 
                    color="#fff" 
                  />
                  <Text style={styles.watermarkHash} numberOfLines={1}>
                    {savedTxid ? `${savedTxid.slice(0, 12)}...` : watermarkData.hash}
                  </Text>
                </View>
                
                <Text style={styles.watermarkTimestamp}>
                  {new Date(watermarkData.timestamp).toLocaleString()}
                </Text>
                
                <View style={styles.tapHint}>
                  <MaterialIcons 
                    name={savedTxid ? "lock" : "drag-indicator"} 
                    size={12} 
                    color="#fff" 
                  />
                  <Text style={styles.tapHintText}>
                    {savedTxid ? 'Position locked' : 'Drag to position'}
                  </Text>
                </View>
                
                {savedTxid && (
                  <View style={styles.lockedBadge}>
                    <Text style={styles.lockedText}>🔗 BLOCKCHAIN</Text>
                  </View>
                )}
              </View>
            </Animated.View>
          )}
        </View>
      </View>

      <Modal visible={showMetadataModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔒 Blockchain Proof</Text>
              <Pressable onPress={() => setShowMetadataModal(false)}>
                <MaterialIcons name="close" size={24} color="#94a3b8" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll}>
              {uhrpRecord && (
                <>
                  <View style={styles.metadataSection}>
                    <Text style={styles.sectionTitle}>🔗 Transaction ID</Text>
                    <Pressable onPress={() => copyToClipboard(uhrpRecord.txid)}>
                      <Text style={styles.metadataValue}>{uhrpRecord.txid}</Text>
                    </Pressable>
                    <Pressable 
                      style={styles.linkButton} 
                      onPress={() => openWhatsonchain(uhrpRecord.txid)}
                    >
                      <MaterialIcons name="open-in-browser" size={16} color="#3b82f6" />
                      <Text style={styles.linkButtonText}>Open in Whatsonchain</Text>
                    </Pressable>
                  </View>

                  <View style={styles.metadataSection}>
                    <Text style={styles.sectionTitle}>📍 Locked Position</Text>
                    <Text style={styles.metadataValue}>
                      X: {uhrpRecord.verifiedPosition?.x?.toFixed(0)}, Y: {uhrpRecord.verifiedPosition?.y?.toFixed(0)}
                    </Text>
                  </View>

                  <View style={styles.metadataSection}>
                    <Text style={styles.sectionTitle}>🔐 Image Hash</Text>
                    <Pressable onPress={() => copyToClipboard(uhrpRecord.imageHash)}>
                      <Text style={styles.metadataValue}>{uhrpRecord.imageHash}</Text>
                    </Pressable>
                  </View>

                  <View style={styles.verifiedBadge}>
                    <MaterialIcons name="verified" size={48} color="#10b981" />
                    <Text style={styles.verifiedText}>Position Locked on BSV</Text>
                    <Text style={styles.verifiedSubtext}>
                      This watermark position is permanently recorded
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>

            <Pressable style={styles.shareButton} onPress={handleShare}>
              <MaterialIcons name="share" size={20} color="white" />
              <Text style={styles.shareButtonText}>Share Proof</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: "#0f172a", padding: 20, gap: 16 },
  header: { marginBottom: 20, alignItems: 'center' },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    marginBottom: 12,
  },
  headerBadgeText: { color: '#10b981', fontSize: 12, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 8 },
  subtitle: { fontSize: 13, color: "#94a3b8", marginBottom: 8, textAlign: 'center', lineHeight: 18 },
  ownerText: { fontSize: 11, color: "#3b82f6", marginBottom: 16, fontFamily: 'monospace' },
  buttonContainer: { flexDirection: "row", gap: 12, width: '100%' },
  actionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 12, gap: 8 },
  buttonDisabled: { opacity: 0.6 },
  cancelButton: { backgroundColor: "rgba(148,163,184,0.1)", borderWidth: 1, borderColor: "rgba(148,163,184,0.3)" },
  cancelButtonText: { color: "#94a3b8", fontWeight: "600", fontSize: 15 },
  saveButton: { backgroundColor: "#3b82f6" },
  saveButtonText: { color: "white", fontWeight: "600", fontSize: 15 },
  card: { borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(59,130,246,0.3)" },
  imageContainer: { width: "100%", aspectRatio: 16/9, backgroundColor: "#1e293b", position: "relative" },
  image: { width: "100%", height: "100%" },
  watermark: { 
    position: "absolute", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, 
    borderWidth: 2, minWidth: 160, shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  watermarkContent: {},
  watermarkHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  watermarkHash: { fontSize: 11, fontFamily: "monospace", color: "#fff", fontWeight: "bold", flex: 1 },
  watermarkTimestamp: { fontSize: 9, color: "#e2e8f0", marginBottom: 2 },
  tapHint: { flexDirection: "row", alignItems: "center", gap: 4 },
  tapHintText: { fontSize: 9, color: "#e2e8f0", fontWeight: "500" },
  lockedBadge: { backgroundColor: "rgba(255,255,255,0.2)", paddingVertical: 2, paddingHorizontal: 6, borderRadius: 6, marginTop: 2 },
  lockedText: { fontSize: 8, color: "#fff", fontWeight: "bold", textAlign: 'center' },
  button: { flexDirection: 'row', backgroundColor: "#3b82f6", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, gap: 8, alignItems: 'center' },
  buttonText: { color: "white", fontSize: 16, fontWeight: "600" },
  errorText: { color: "#ef4444", fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  errorSubtext: { color: "#94a3b8", fontSize: 14, marginBottom: 20 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#1e293b", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 24, borderBottomWidth: 1, borderBottomColor: "rgba(59,130,246,0.2)" },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  modalScroll: { padding: 24, flex: 1 },
  metadataSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, color: "#94a3b8", marginBottom: 8, fontWeight: '600' },
  metadataValue: { fontSize: 12, color: "#fff", fontFamily: "monospace", backgroundColor: "rgba(0,0,0,0.4)", padding: 12, borderRadius: 10, lineHeight: 18 },
  linkButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: "rgba(59,130,246,0.1)", padding: 12, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: "rgba(59,130,246,0.3)", gap: 6 },
  linkButtonText: { color: "#3b82f6", fontSize: 14, fontWeight: "600" },
  verifiedBadge: { alignItems: "center", padding: 24, marginTop: 12, backgroundColor: "rgba(16,185,129,0.1)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(16,185,129,0.2)" },
  verifiedText: { fontSize: 16, color: "#10b981", fontWeight: "bold", marginTop: 12 },
  verifiedSubtext: { fontSize: 12, color: "#94a3b8", marginTop: 8, textAlign: 'center', lineHeight: 18 },
  shareButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: "#3b82f6", margin: 24, padding: 18, borderRadius: 16 },
  shareButtonText: { color: "white", fontSize: 17, fontWeight: "600" },
});