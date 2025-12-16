<<<<<<< HEAD
// app/(tabs)/gallery.tsx - ✅ APP PRIVATE GALLERY VERSION
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  Image,
  TouchableOpacity,
  Text,
  Dimensions,
  Alert,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { getAppGalleryImages } from '@/services/gallery';  // ✅ CHANGE 1: getAppGalleryImages

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GalleryImage {
  id: string;
  uri: string;
  thumbnailUri: string;
  filename: string;
  timestamp: string;
  uhrpTxId?: string;
  verifiedPosition?: { x: number; y: number };
  isVerified: boolean;
  imageKey?: string;  // ✅ CHANGE 2: ADDED imageKey
}

export default function GalleryScreen() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadGallery = useCallback(async () => {
    try {
      setLoading(true);
      const galleryImages = await getAppGalleryImages();  // ✅ CHANGE 3: getAppGalleryImages()
      console.log('✅ App gallery loaded:', galleryImages.length, 'images');
      setImages(galleryImages);
    } catch (error) {
      console.error('App gallery failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGallery();
    setRefreshing(false);
  };

  const handleImagePress = (image: GalleryImage) => {
    Alert.alert(
      image.isVerified ? '✅ Blockchain Verified' : '🔒 Verify on BSV',  // ✅ CHANGE 4: Better text
      `📱 ${image.filename}\n${image.isVerified ? 
        `🔗 TXID: ${image.uhrpTxId?.slice(0,16)}...\n📍 Pos: X${image.verifiedPosition?.x?.toFixed(0)} Y${image.verifiedPosition?.y?.toFixed(0)}` : 
        'Tap Verify to lock watermark position'}`,
      [
        { text: 'OK' },
        image.isVerified && image.uhrpTxId && { 
          text: '🖥️ Whatsonchain', 
          onPress: () => Linking.openURL(`https://whatsonchain.com/tx/${image.uhrpTxId}`) 
        },
      ]
    );
  };

  const renderImage = ({ item }: { item: GalleryImage }) => (
    <TouchableOpacity style={styles.imageContainer} onPress={() => handleImagePress(item)}>
      <Image source={{ uri: item.thumbnailUri }} style={styles.image} />
      <View style={styles.overlay}>
        <View style={[
          styles.badge,
          item.isVerified ? styles.verifiedBadge : styles.unverifiedBadge
        ]}>
          <MaterialIcons 
            name={item.isVerified ? "verified" : "shield"} 
            size={16} 
            color={item.isVerified ? "#10b981" : "#3b82f6"} 
          />
          <Text style={styles.badgeText}>
            {item.isVerified ? 'Verified' : 'Verify'}
          </Text>
        </View>
        <Text style={styles.filename} numberOfLines={1}>{item.filename}</Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading app gallery...</Text>  // ✅ CHANGE 5: Better text
=======
// Camera Gallery App with BSV Identity Integration
// Install: npm install @bsv/sdk expo-camera expo-file-system

import { useState, useRef, useEffect } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  ScrollView,
  Platform,
  Modal,
} from "react-native";
import {
  WalletClient,
  StorageUploader,
  StorageDownloader,
  Utils,
  PrivateKey,
  P2PKH,
} from "@bsv/sdk";

// BSV Identity & Storage Integration
const bsvIdentity = {
  walletClient: null,
  userIdentity: null,

  async initWallet() {
    if (!this.walletClient) {
      this.walletClient = new WalletClient();
    }
    return this.walletClient;
  },

  async getUserIdentity() {
    try {
      const wallet = await this.initWallet();

      // Get user's public key as their identity
      const identityKey = await wallet.getPublicKey();

      this.userIdentity = {
        publicKey: identityKey,
        address: P2PKH.fromPublicKey(identityKey).toString(),
        timestamp: Date.now(),
      };

      return this.userIdentity;
    } catch (error) {
      console.error("Failed to get user identity:", error);
      throw error;
    }
  },

  async signData(data) {
    try {
      const wallet = await this.initWallet();
      const signature = await wallet.signMessage(data);
      return signature;
    } catch (error) {
      console.error("Failed to sign data:", error);
      throw error;
    }
  },

  async uploadImageWithIdentity(imageUri, metadata, retentionMinutes = 180) {
    try {
      const wallet = await this.initWallet();
      const identity = await this.getUserIdentity();

      const uploader = new StorageUploader({
        wallet,
        storageURL: "https://uhrp.txs.systems",
      });

      // Read image data
      let data;
      if (Platform.OS === "web") {
        const base64Data = imageUri.split(",")[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        data = bytes;
      } else {
        const file = new FileSystem.File(imageUri);
        const arrayBuffer = await file.read();
        data = new Uint8Array(arrayBuffer);
      }

      // Create metadata with identity
      const enrichedMetadata = {
        ...metadata,
        owner: identity.publicKey,
        ownerAddress: identity.address,
        uploadedAt: Date.now(),
        signature: null, // Will be filled after getting hash
      };

      const response = await uploader.publishFile({
        file: {
          data,
          type: "image/jpeg",
          metadata: enrichedMetadata,
        },
        retentionPeriod: retentionMinutes,
      });

      // Sign the file hash to prove ownership
      const hash = response.hash || response.txid;
      const signature = await this.signData(hash);

      return {
        ...response,
        identity: identity.publicKey,
        ownerAddress: identity.address,
        signature,
        metadata: enrichedMetadata,
      };
    } catch (error) {
      console.error("BSV upload error:", error);
      throw error;
    }
  },

  async verifyOwnership(hash, signature, publicKey) {
    try {
      // Verify that the signature matches the hash and public key
      const wallet = await this.initWallet();
      const isValid = await wallet.verifySignature(hash, signature, publicKey);
      return isValid;
    } catch (error) {
      console.error("Verification error:", error);
      return false;
    }
  },

  async downloadImage(hash) {
    try {
      const downloader = new StorageDownloader();
      const response = await downloader.download(hash);

      if (Platform.OS === "web") {
        const blob = new Blob([response.data], { type: "image/jpeg" });
        return {
          uri: URL.createObjectURL(blob),
          metadata: response.metadata,
        };
      } else {
        const cachePath = FileSystem.cacheDirectory + `bsv_${hash}.jpg`;
        const file = new FileSystem.File(cachePath);
        await file.write(response.data);
        return {
          uri: cachePath,
          metadata: response.metadata,
        };
      }
    } catch (error) {
      console.error("BSV download error:", error);
      throw error;
    }
  },
};

export default function CameraWithBSVIdentity() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState("back");
  const [showCamera, setShowCamera] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [debugLog, setDebugLog] = useState([]);
  const [uploadingToBSV, setUploadingToBSV] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingUpload, setPendingUpload] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [userIdentity, setUserIdentity] = useState(null);
  const cameraRef = useRef(null);

  const GALLERY_DIR = FileSystem.documentDirectory + "gallery/";

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    setDebugLog((prev) => [...prev, logEntry].slice(-15));
  };

  useEffect(() => {
    addLog("App started with BSV identity integration");
    initializeIdentity();
    loadGallery();
  }, []);

  const initializeIdentity = async () => {
    try {
      addLog("Initializing user identity...");
      const identity = await bsvIdentity.getUserIdentity();
      setUserIdentity(identity);
      addLog(`Identity loaded: ${identity.address.substring(0, 10)}...`);
    } catch (error) {
      addLog(`Identity error: ${error.message}`);
    }
  };

  const loadGallery = async () => {
    try {
      if (Platform.OS === "web") {
        addLog("Web platform: Using in-memory gallery");
        return;
      }

      addLog(`Loading gallery from: ${GALLERY_DIR}`);

      const directory = new FileSystem.Directory(GALLERY_DIR);

      try {
        const files = await directory.list();
        addLog(`Files found: ${files.length}`);

        const imageFiles = files
          .filter((file) => file.endsWith(".jpg") || file.endsWith(".png"))
          .map((file) => {
            const parts = file.split("_");
            return {
              uri: GALLERY_DIR + file,
              name: file,
              timestamp: parseInt(parts[1]?.split(".")[0] || Date.now()),
              bsvHash: parts[2]?.split(".")[0] || null,
              ownerAddress: parts[3]?.split(".")[0] || null,
            };
          })
          .sort((a, b) => b.timestamp - a.timestamp);

        addLog(`Image files loaded: ${imageFiles.length}`);
        setGallery(imageFiles);
      } catch (dirError) {
        addLog(`Directory does not exist, creating...`);
        await directory.create();
        setGallery([]);
      }
    } catch (error) {
      addLog(`ERROR loading gallery: ${error.message}`);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) {
      addLog("ERROR: Camera ref is null");
      alert("Camera not ready");
      return;
    }

    try {
      addLog("Taking picture...");
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: false,
        skipProcessing: false,
      });

      addLog(`Photo captured`);
      await saveToGallery(photo.uri);
    } catch (error) {
      addLog(`ERROR taking picture: ${error.message}`);
      alert("Failed to take picture: " + error.message);
    }
  };

  const uploadToBSV = async (photoUri, filename) => {
    try {
      setUploadingToBSV(true);
      addLog("Starting BSV upload with identity...");

      // Create metadata for the photo
      const metadata = {
        filename,
        capturedAt: Date.now(),
        deviceInfo: Platform.OS,
      };

      const bsvResponse = await bsvIdentity.uploadImageWithIdentity(
        photoUri,
        metadata,
        180
      );

      const bsvHash = bsvResponse.hash || bsvResponse.txid;
      const ownerAddress = bsvResponse.ownerAddress;

      addLog(`BSV Upload successful!`);
      addLog(`Hash: ${bsvHash}`);
      addLog(`Owner: ${ownerAddress}`);
      addLog(`Signature: ${bsvResponse.signature.substring(0, 20)}...`);

      if (Platform.OS === "web") {
        // Update gallery entry with BSV data
        setGallery((prev) =>
          prev.map((item) =>
            item.uri === photoUri
              ? {
                  ...item,
                  bsvHash,
                  ownerAddress,
                  signature: bsvResponse.signature,
                  name: `photo_${
                    item.timestamp
                  }_${bsvHash}_${ownerAddress.substring(0, 8)}.jpg`,
                }
              : item
          )
        );
      } else {
        // Rename file to include BSV hash and owner
        const newFilename = `photo_${Date.now()}_${bsvHash}_${ownerAddress.substring(
          0,
          8
        )}.jpg`;
        const oldPath = GALLERY_DIR + filename;
        const newPath = GALLERY_DIR + newFilename;

        const oldFile = new FileSystem.File(oldPath);
        const newFile = new FileSystem.File(newPath);
        await oldFile.copy(newFile);
        await oldFile.delete();

        await loadGallery();
      }

      addLog("Gallery updated with BSV data");

      alert(
        `✅ BSV Upload Complete!\n\n` +
          `Hash: ${bsvHash.substring(0, 20)}...\n` +
          `Owner: ${ownerAddress.substring(0, 20)}...\n` +
          `Retention: 180 minutes\n\n` +
          `This photo is now linked to your identity!`
      );

      return bsvHash;
    } catch (error) {
      addLog(`BSV upload error: ${error.message}`);
      alert("Upload Failed: " + error.message);
      return null;
    } finally {
      setUploadingToBSV(false);
      setShowUploadModal(false);
    }
  };

  const saveToGallery = async (photoUri) => {
    try {
      addLog(`Saving photo to gallery`);

      if (Platform.OS === "web") {
        const filename = `photo_${Date.now()}.jpg`;

        const newPhoto = {
          uri: photoUri,
          name: filename,
          timestamp: Date.now(),
          bsvHash: null,
          ownerAddress: userIdentity?.address || null,
        };

        setGallery((prev) => [newPhoto, ...prev]);
        addLog("Photo saved to web gallery");
        setShowCamera(false);

        setPendingUpload({ uri: photoUri, name: filename });
        setShowUploadModal(true);

        return;
      }

      // Native platform code
      let fileToSave = photoUri;

      if (photoUri.startsWith("data:")) {
        const base64Data = photoUri.split(",")[1];
        const tempPath = FileSystem.cacheDirectory + `temp_${Date.now()}.jpg`;
        const tempFile = new FileSystem.File(tempPath);
        await tempFile.create();

        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        await tempFile.write(bytes);
        fileToSave = tempPath;
      }

      const directory = new FileSystem.Directory(GALLERY_DIR);

      try {
        await directory.list();
      } catch {
        await directory.create();
      }

      const filename = `photo_${Date.now()}.jpg`;
      const newPath = GALLERY_DIR + filename;

      const sourceFile = new FileSystem.File(fileToSave);
      const destFile = new FileSystem.File(newPath);

      await sourceFile.copy(destFile);

      if (photoUri.startsWith("data:")) {
        await sourceFile.delete();
      }

      await loadGallery();
      setShowCamera(false);

      alert("Photo saved! Upload to BSV to link to your identity.");
    } catch (error) {
      addLog(`ERROR saving: ${error.message}`);
      alert("Failed to save photo: " + error.message);
    }
  };

  const downloadFromBSV = async (bsvHash) => {
    try {
      addLog(`Downloading from BSV: ${bsvHash}`);
      alert("Downloading from BSV network...");

      const result = await bsvIdentity.downloadImage(bsvHash);
      addLog("Download complete");

      if (result.metadata) {
        addLog(`Owner: ${result.metadata.ownerAddress}`);
      }

      alert("Download complete! Image retrieved from BSV network.");
      return result;
    } catch (error) {
      addLog(`Download error: ${error.message}`);
      alert("Download Failed: " + error.message);
    }
  };

  const verifyImageOwnership = async (item) => {
    if (!item.bsvHash || !item.signature) {
      alert("This photo is not linked to BSV");
      return;
    }

    try {
      addLog("Verifying ownership...");
      const ownerKey = userIdentity?.publicKey;

      if (!ownerKey) {
        alert("Cannot verify: No user identity loaded");
        return;
      }

      const isValid = await bsvIdentity.verifyOwnership(
        item.bsvHash,
        item.signature,
        ownerKey
      );

      if (isValid) {
        addLog("✓ Ownership verified!");
        alert("✅ Verified!\n\nThis photo belongs to you.");
      } else {
        addLog("✗ Ownership verification failed");
        alert("❌ Not Verified\n\nThis photo does not belong to you.");
      }
    } catch (error) {
      addLog(`Verification error: ${error.message}`);
      alert("Verification failed: " + error.message);
    }
  };

  const deleteImage = async (item) => {
    try {
      addLog(`Deleting image: ${item.name}`);

      if (Platform.OS === "web") {
        setGallery((prev) => prev.filter((i) => i.uri !== item.uri));
      } else {
        const file = new FileSystem.File(item.uri);
        await file.delete();
        await loadGallery();
      }

      addLog("Image deleted");
      setShowImageModal(false);
      alert(
        "Photo deleted from local storage\n\n(BSV copy remains on network)"
      );
    } catch (error) {
      addLog(`ERROR deleting: ${error.message}`);
      alert("Failed to delete photo: " + error.message);
    }
  };

  const showImageOptions = (item) => {
    setSelectedImage(item);
    setShowImageModal(true);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionText}>
          We need your permission to use the camera
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showCamera) {
    return (
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraTopBar}>
              <View style={styles.facingIndicator}>
                <Text style={styles.facingText}>
                  {facing === "back" ? "Rear Camera" : "Front Camera"}
                </Text>
              </View>
            </View>

            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => setShowCamera(false)}
              >
                <Text style={styles.controlButtonText}>✕</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.captureButton}
                onPress={takePicture}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={() =>
                  setFacing((f) => (f === "back" ? "front" : "back"))
                }
              >
                <Text style={styles.controlButtonText}>🔄</Text>
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
>>>>>>> a26891f (bsv authentication)
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
<<<<<<< HEAD
        <Text style={styles.title}>🔒 BSV Private Gallery</Text>  // ✅ CHANGE 6: Better title
        <Text style={styles.subtitle}>
          {images.filter(i => i.isVerified).length}/{images.length} verified
        </Text>
      </View>

      {images.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="photo-library" size={64} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No verified images</Text>  // ✅ CHANGE 7: Better text
          <Text style={styles.emptySubtitle}>
            Capture → Watermark → LOCK to see here instantly  // ✅ CHANGE 8: Clear flow
          </Text>
          <TouchableOpacity 
            style={styles.captureButton}
            onPress={() => router.push('/(tabs)/capture')}
          >
            <MaterialIcons name="camera-alt" size={20} color="#fff" />
            <Text style={styles.captureButtonText}>Capture & Verify</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={images}
          renderItem={renderImage}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.list}
        />
      )}
=======
        <View>
          <Text style={styles.headerTitle}>My Gallery</Text>
          <Text style={styles.headerSubtitle}>BSV Identity-Linked</Text>
          {userIdentity && (
            <Text style={styles.identityText}>
              🔑 {userIdentity.address.substring(0, 12)}...
            </Text>
          )}
        </View>
        <View style={styles.badgeContainer}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{gallery.length} photos</Text>
          </View>
          <View style={[styles.badge, styles.bsvBadge]}>
            <Text style={styles.badgeText}>
              {gallery.filter((i) => i.bsvHash).length} linked
            </Text>
          </View>
        </View>
      </View>

      {uploadingToBSV && (
        <View style={styles.uploadingBanner}>
          <Text style={styles.uploadingText}>
            ⏳ Linking to your identity & uploading...
          </Text>
        </View>
      )}

      <View style={styles.debugContainer}>
        <View style={styles.debugHeader}>
          <Text style={styles.debugTitle}>Debug Log</Text>
          <TouchableOpacity onPress={() => setDebugLog([])}>
            <Text style={styles.clearButton}>Clear</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.debugLog}>
          {debugLog.map((log, index) => (
            <Text key={index} style={styles.debugText}>
              {log}
            </Text>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={gallery}
        numColumns={3}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={
          gallery.length === 0 ? styles.emptyContainer : styles.gridContainer
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📸</Text>
            <Text style={styles.emptyTitle}>No photos yet</Text>
            <Text style={styles.emptySubtitle}>
              Take photos and link them to your BSV identity
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.imageContainer}
            onPress={() => showImageOptions(item)}
          >
            <Image source={{ uri: item.uri }} style={styles.thumbnail} />
            {item.bsvHash && (
              <View style={styles.bsvIndicator}>
                <Text style={styles.bsvIndicatorText}>🔗 BSV</Text>
              </View>
            )}
            {item.ownerAddress && (
              <View style={styles.ownerIndicator}>
                <Text style={styles.ownerText}>
                  {item.ownerAddress.substring(0, 6)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cameraButton}
          onPress={() => setShowCamera(true)}
        >
          <Text style={styles.cameraButtonText}>📷 Open Camera</Text>
        </TouchableOpacity>
      </View>

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Link to Your Identity 🔑</Text>
            <Text style={styles.modalText}>
              Upload this photo to BSV and link it to your wallet identity?
            </Text>
            {userIdentity && (
              <Text style={styles.modalSubtext}>
                Identity: {userIdentity.address.substring(0, 20)}...
              </Text>
            )}
            <Text style={styles.modalSubtext}>Storage: 180 minutes</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setShowUploadModal(false);
                  setPendingUpload(null);
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => {
                  if (pendingUpload) {
                    uploadToBSV(pendingUpload.uri, pendingUpload.name);
                  }
                }}
                disabled={uploadingToBSV}
              >
                <Text style={styles.modalButtonTextPrimary}>
                  {uploadingToBSV ? "Linking..." : "Link & Upload"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Options Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Photo Options</Text>
            {selectedImage && (
              <>
                <Text style={styles.modalText}>File: {selectedImage.name}</Text>
                {selectedImage.bsvHash && (
                  <>
                    <Text style={styles.modalSubtext}>
                      Hash: {selectedImage.bsvHash.substring(0, 16)}...
                    </Text>
                    {selectedImage.ownerAddress && (
                      <Text style={styles.modalSubtext}>
                        Owner: {selectedImage.ownerAddress.substring(0, 16)}...
                      </Text>
                    )}
                  </>
                )}

                <View style={styles.modalButtonsColumn}>
                  {selectedImage.bsvHash ? (
                    <>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.modalButtonPrimary]}
                        onPress={() => {
                          verifyImageOwnership(selectedImage);
                        }}
                      >
                        <Text style={styles.modalButtonTextPrimary}>
                          ✓ Verify Ownership
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.modalButton, styles.modalButtonPrimary]}
                        onPress={() => {
                          downloadFromBSV(selectedImage.bsvHash);
                          setShowImageModal(false);
                        }}
                      >
                        <Text style={styles.modalButtonTextPrimary}>
                          Download from BSV
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonPrimary]}
                      onPress={() => {
                        uploadToBSV(selectedImage.uri, selectedImage.name);
                        setShowImageModal(false);
                      }}
                    >
                      <Text style={styles.modalButtonTextPrimary}>
                        Link to BSV Identity
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonDanger]}
                    onPress={() => deleteImage(selectedImage)}
                  >
                    <Text style={styles.modalButtonTextPrimary}>
                      Delete Local Copy
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSecondary]}
                    onPress={() => setShowImageModal(false)}
                  >
                    <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
>>>>>>> a26891f (bsv authentication)
    </View>
  );
}

<<<<<<< HEAD
// YOUR STYLES - NO CHANGES NEEDED
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    padding: 20,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59,130,246,0.2)',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 16, color: '#94a3b8', marginTop: 4 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: { marginTop: 16, color: '#94a3b8', fontSize: 16 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', marginTop: 16 },
  emptySubtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center', marginBottom: 32 },
  captureButton: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  captureButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 32 },
  row: { justifyContent: 'space-between' },
  imageContainer: {
    width: (SCREEN_WIDTH - 48) / 2,
    aspectRatio: 1,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  image: { width: '100%', height: '70%' },
  overlay: { padding: 12, flex: 1 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  verifiedBadge: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  unverifiedBadge: {
    backgroundColor: 'rgba(59,130,246,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: 'white' },
  filename: { fontSize: 12, fontWeight: '600', color: 'white', marginBottom: 4 },
  timestamp: { fontSize: 10, color: 'white', opacity: 0.7 },
=======
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a1a" },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginTop: 100,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    backgroundColor: "#1a1a1a",
  },
  permissionTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  permissionText: {
    color: "#999",
    textAlign: "center",
    marginBottom: 30,
    fontSize: 16,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, backgroundColor: "transparent" },
  cameraTopBar: {
    paddingTop: 50,
    paddingHorizontal: 20,
    alignItems: "flex-start",
  },
  facingIndicator: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  facingText: { color: "#fff", fontSize: 14, fontWeight: "500" },
  cameraControls: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    paddingBottom: 50,
    paddingHorizontal: 30,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  controlButtonText: { fontSize: 28, color: "#fff" },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 5,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  captureButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#252525",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  headerTitle: { color: "#fff", fontSize: 28, fontWeight: "bold" },
  headerSubtitle: { color: "#666", fontSize: 12, marginTop: 2 },
  identityText: {
    color: "#4ade80",
    fontSize: 10,
    marginTop: 4,
    fontFamily: "monospace",
  },
  badgeContainer: { alignItems: "flex-end" },
  badge: {
    backgroundColor: "#333",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 6,
  },
  bsvBadge: { backgroundColor: "#1a4d2e" },
  badgeText: { color: "#999", fontSize: 12, fontWeight: "500" },
  uploadingBanner: {
    backgroundColor: "#1a4d2e",
    padding: 12,
    alignItems: "center",
  },
  uploadingText: { color: "#4ade80", fontSize: 14, fontWeight: "600" },
  debugContainer: {
    backgroundColor: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    maxHeight: 120,
  },
  debugHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: "#1a1a1a",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  debugTitle: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  clearButton: { color: "#007AFF", fontSize: 12 },
  debugLog: { paddingHorizontal: 15, paddingVertical: 5 },
  debugText: {
    color: "#0f0",
    fontSize: 9,
    fontFamily: "monospace",
    marginBottom: 2,
  },
  gridContainer: { padding: 2 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyState: { alignItems: "center", padding: 40 },
  emptyIcon: { fontSize: 64, marginBottom: 20 },
  emptyTitle: {
    color: "#999",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtitle: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
    maxWidth: 250,
  },
  imageContainer: {
    flex: 1 / 3,
    aspectRatio: 1,
    padding: 2,
    position: "relative",
  },
  thumbnail: { flex: 1, borderRadius: 4, backgroundColor: "#333" },
  bsvIndicator: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#1a4d2e",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  bsvIndicatorText: { color: "#4ade80", fontSize: 10, fontWeight: "bold" },
  ownerIndicator: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  ownerText: { color: "#4ade80", fontSize: 8, fontFamily: "monospace" },
  footer: {
    padding: 20,
    backgroundColor: "#252525",
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  cameraButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cameraButtonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#252525",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#333",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  modalText: {
    color: "#ccc",
    fontSize: 14,
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtext: {
    color: "#888",
    fontSize: 12,
    marginBottom: 6,
    textAlign: "center",
    fontFamily: "monospace",
  },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 20 },
  modalButtonsColumn: { gap: 12, marginTop: 20 },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonPrimary: { backgroundColor: "#007AFF" },
  modalButtonSecondary: { backgroundColor: "#333" },
  modalButtonDanger: { backgroundColor: "#dc2626" },
  modalButtonTextPrimary: { color: "#fff", fontSize: 14, fontWeight: "600" },
  modalButtonTextSecondary: { color: "#999", fontSize: 14, fontWeight: "600" },
>>>>>>> a26891f (bsv authentication)
});
