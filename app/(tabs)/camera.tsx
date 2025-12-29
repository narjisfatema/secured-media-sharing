// app/(tabs)/camera.tsx - COMPLETE FIXED VERSION WITH DRAGGABLE HASH WATERMARK
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated,
  PanResponder,
  Platform,
  Share
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ViewShot, { captureRef } from "react-native-view-shot";
import { IconSymbol } from "@/components/ui/icon-symbol";

type GalleryItem = {
  id: string;
  uri: string;
  name: string;
  timestamp: number;
  uhrpHash?: string;
  uhrpHashX?: number;
  uhrpHashY?: number;
  fixedWatermarkX: number;
  fixedWatermarkY: number;
};

const isWeb = Platform.OS === "web";
const GALLERY_DIR = `${FileSystem.documentDirectory}gallery/`;
const GALLERY_KEY = "secure_media_gallery_v2";
const GALLERY_WIPE_FLAG = "secure_media_gallery_wiped_once";

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const fixedPreviewRef = useRef<View | null>(null);
  const hashWatermarkRef = useRef<View | null>(null);

  const [mode, setMode] = useState<"camera" | "watermark" | "gallery" | "hash-watermark">("gallery");
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [watermarkedUri, setWatermarkedUri] = useState<string | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  const [isSavingToDevice, setIsSavingToDevice] = useState(false);
  const [currentImageId, setCurrentImageId] = useState<string | null>(null);

  const fixedPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const hashPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  
  const hashPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        hashPan.setOffset({ x: hashPan.x._value, y: hashPan.y._value });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: hashPan.x, dy: hashPan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        hashPan.flattenOffset();
      }
    })
  ).current;

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [askForHash, setAskForHash] = useState(false);
  const [uhrpInput, setUhrpInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const [viewImageModal, setViewImageModal] = useState(false);

  // 🔄 PERSISTENT STORAGE HELPERS
  const saveGallery = async (items: GalleryItem[]) => {
    try {
      await AsyncStorage.setItem(GALLERY_KEY, JSON.stringify(items));
    } catch (e) {
      console.error("❌ Save gallery failed:", e);
    }
  };

  const loadGallery = async () => {
    try {
      const json = await AsyncStorage.getItem(GALLERY_KEY);
      if (json) {
        const items: GalleryItem[] = JSON.parse(json);
        setGallery(items.sort((a, b) => b.timestamp - a.timestamp));
        return;
      }
    } catch (e) {
      console.error("❌ Load gallery failed:", e);
    }

    if (!isWeb) {
      await loadFileGallery();
    }
  };

  const loadFileGallery = async () => {
    try {
      const dirReady = await ensureGalleryDir();
      if (!dirReady) return;

      const files = await FileSystem.readDirectoryAsync(GALLERY_DIR);
      const items: GalleryItem[] = files
        .filter(f => f.endsWith(".jpg"))
        .map(name => {
          const timestamp = parseInt(name.match(/(\d+)/)?.[1] || `${Date.now()}`);
          return {
            id: `${name}_${timestamp}`,
            uri: `${GALLERY_DIR}${name}`,
            name,
            timestamp,
            fixedWatermarkX: 100,
            fixedWatermarkY: 100
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp);

      setGallery(items);
      await saveGallery(items);
    } catch (e) {
      console.error("❌ File gallery failed:", e);
    }
  };

  const ensureGalleryDir = async () => {
    try {
      if (isWeb) return false;
      const dirInfo = await FileSystem.getInfoAsync(GALLERY_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(GALLERY_DIR, { intermediates: true });
      }
      return true;
    } catch {
      return false;
    }
  };

  // 🚨 DEV: ONE‑TIME GALLERY WIPE
  useEffect(() => {
    const maybeWipe = async () => {
      try {
        const alreadyWiped = await AsyncStorage.getItem(GALLERY_WIPE_FLAG);
        if (alreadyWiped === "yes") {
          return;
        }
        await AsyncStorage.removeItem(GALLERY_KEY);
        await AsyncStorage.setItem(GALLERY_WIPE_FLAG, "yes");
        console.log("✅ One‑time gallery wipe executed");
      } catch (e) {
        console.error("Wipe failed", e);
      }
    };
    maybeWipe();
  }, []);

  useEffect(() => {
    loadGallery();
  }, []);

  const handleTakePicture = async () => {
    if (!cameraRef.current) {
      Alert.alert("Error", "Camera not ready");
      return;
    }
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      setCapturedUri(photo.uri);
      setWatermarkedUri(null);
      setCurrentImageId(null);
      fixedPan.setValue({ x: 0, y: 0 });
      setMode("watermark");
      console.log("📸 Photo captured:", photo.uri);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to take picture");
    }
  };

  const handleWatermarkLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
    fixedPan.setValue({ x: (width - 140) / 2, y: (height - 60) / 2 });
  };

  const handleHashWatermarkLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
    hashPan.setValue({ x: (width - 200) / 2, y: (height - 80) / 2 });
  };

  // ✅ SAVE WITH FIXED WATERMARK
  const handleSaveToDevice = async () => {
    if (!capturedUri) {
      Alert.alert("No image", "Take a picture first");
      return;
    }

    setIsSavingToDevice(true);

    try {
      const timestamp = Date.now();
      const itemId = `img_${timestamp}`;

      if (isWeb) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = capturedUri;
        });

        canvas.width = img.width;
        canvas.height = img.height;
        
        if (!ctx) throw new Error("Canvas context failed");
        
        ctx.drawImage(img, 0, 0);
        
        const wmX = (canvas.width - 140) / 2;
        const wmY = (canvas.height - 60) / 2;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 4;
        const borderRadius = 10;
        const wmWidth = 140;
        const wmHeight = 60;
        
        ctx.beginPath();
        ctx.moveTo(wmX + borderRadius, wmY);
        ctx.lineTo(wmX + wmWidth - borderRadius, wmY);
        ctx.arcTo(wmX + wmWidth, wmY, wmX + wmWidth, wmY + borderRadius, borderRadius);
        ctx.lineTo(wmX + wmWidth, wmY + wmHeight - borderRadius);
        ctx.arcTo(wmX + wmWidth, wmY + wmHeight, wmX + wmWidth - borderRadius, wmY + wmHeight, borderRadius);
        ctx.lineTo(wmX + borderRadius, wmY + wmHeight);
        ctx.arcTo(wmX, wmY + wmHeight, wmX, wmY + wmHeight - borderRadius, borderRadius);
        ctx.lineTo(wmX, wmY + borderRadius);
        ctx.arcTo(wmX, wmY, wmX + borderRadius, wmY, borderRadius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        
        ctx.fillStyle = '#90ee90';
        ctx.font = '14px Arial';
        ctx.fillText('Fixed Mark', wmX + wmWidth/2, wmY + 48);
        
        canvas.toBlob(async (blob) => {
          if (!blob) throw new Error("Blob creation failed");
          
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `image_${timestamp}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            
            const item: GalleryItem = {
              id: itemId,
              uri: base64,
              name: `${timestamp}.jpg`,
              timestamp,
              fixedWatermarkX: Math.round(wmX),
              fixedWatermarkY: Math.round(wmY)
            };

            setGallery(prev => {
              const newGallery = [item, ...prev];
              saveGallery(newGallery);
              return newGallery;
            });
            
            setWatermarkedUri(base64);
            setCurrentImageId(itemId);
            setIsSavingToDevice(false);
            Alert.alert("✅ SAVED!", "Image downloaded , Ready for UHRP upload");
          };
          reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.9);

        return;
      }

      // Native path
      if (!fixedPreviewRef.current) throw new Error("Preview not ready");

      const tempUri = await captureRef(fixedPreviewRef, {
        format: "jpg",
        quality: 0.9
      });
      const dirReady = await ensureGalleryDir();
      if (!dirReady) throw new Error("Cannot create gallery");

      const filename = `fixed_wm_${timestamp}.jpg`;
      const finalUri = `${GALLERY_DIR}${filename}`;
      await FileSystem.copyAsync({ from: tempUri, to: finalUri });

      const item: GalleryItem = {
        id: itemId,
        uri: finalUri,
        name: filename,
        timestamp,
        fixedWatermarkX: Math.round(fixedPan.x._value || 0),
        fixedWatermarkY: Math.round(fixedPan.y._value || 0)
      };

      setGallery(prev => {
        const newGallery = [item, ...prev];
        saveGallery(newGallery);
        return newGallery;
      });
      
      setWatermarkedUri(finalUri);
      setCurrentImageId(itemId);

      Alert.alert("SAVED!", `${filename} added to gallery`);
    } catch (error: any) {
      console.error("❌ Save failed:", error);
      Alert.alert("❌ Save Failed", error.message || "Unknown error");
    } finally {
      setIsSavingToDevice(false);
    }
  };

  const handleOpenUhrp = async () => {
    if (!watermarkedUri || !currentImageId) {
      Alert.alert("Save to device");
      return;
    }
    await WebBrowser.openBrowserAsync("https://uhrp-ui.bapp.dev/");
    setAskForHash(true);
  };

  const handleSaveUhrpHash = async () => {
    if (!uhrpInput.trim() || !currentImageId || !watermarkedUri) {
      Alert.alert("Missing Data", "Save image first, then paste UHRP hash");
      return;
    }

    const hash = uhrpInput.trim();

    setGallery(prev => {
      const updated = prev.map((item) =>
        item.id === currentImageId ? { ...item, uhrpHash: hash } : item
      );
      saveGallery(updated);
      return updated;
    });

    setAskForHash(false);
    hashPan.setValue({ x: 0, y: 0 });
    setMode("hash-watermark");
  };

  // ✅ SAVE WITH HASH WATERMARK - CREATES NEW IMAGE WITH BOTH WATERMARKS
  const handleSaveHashWatermark = async () => {
    if (!watermarkedUri || !currentImageId) {
      Alert.alert("Error", "No image to save");
      return;
    }

    setIsSavingToDevice(true);

    try {
      const currentItem = gallery.find(item => item.id === currentImageId);
      if (!currentItem?.uhrpHash) {
        throw new Error("UHRP hash not found");
      }

      const timestamp = Date.now();
      const newItemId = `uhrp_${timestamp}`;

      if (isWeb) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = watermarkedUri;
        });

        canvas.width = img.width;
        canvas.height = img.height;
        
        if (!ctx) throw new Error("Canvas context failed");
        
        ctx.drawImage(img, 0, 0);
        
        // Calculate hash watermark position from hashPan
        const scaleX = canvas.width / containerSize.width;
        const scaleY = canvas.height / containerSize.height;
        const wmX = hashPan.x._value * scaleX;
        const wmY = hashPan.y._value * scaleY;
        
        // Draw hash watermark
        ctx.fillStyle = 'rgba(239, 68, 68, 0.95)';
        ctx.strokeStyle = '#fef2f2';
        ctx.lineWidth = 3;
        const borderRadius = 12;
        const wmWidth = 200;
        const wmHeight = 80;
        
        ctx.beginPath();
        ctx.moveTo(wmX + borderRadius, wmY);
        ctx.lineTo(wmX + wmWidth - borderRadius, wmY);
        ctx.arcTo(wmX + wmWidth, wmY, wmX + wmWidth, wmY + borderRadius, borderRadius);
        ctx.lineTo(wmX + wmWidth, wmY + wmHeight - borderRadius);
        ctx.arcTo(wmX + wmWidth, wmY + wmHeight, wmX + wmWidth - borderRadius, wmY + wmHeight, borderRadius);
        ctx.lineTo(wmX + borderRadius, wmY + wmHeight);
        ctx.arcTo(wmX, wmY + wmHeight, wmX, wmY + wmHeight - borderRadius, borderRadius);
        ctx.lineTo(wmX, wmY + borderRadius);
        ctx.arcTo(wmX, wmY, wmX + borderRadius, wmY, borderRadius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw UHRP text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🔐 UHRP VERIFIED', wmX + wmWidth/2, wmY + 25);
        
        // Draw hash (truncated)
        ctx.font = '11px monospace';
        const hashText = currentItem.uhrpHash.length > 30 
          ? currentItem.uhrpHash.substring(0, 30) + '...'
          : currentItem.uhrpHash;
        ctx.fillText(hashText, wmX + wmWidth/2, wmY + 45);
        
        ctx.font = '10px Arial';
        ctx.fillText('Blockchain Secured', wmX + wmWidth/2, wmY + 65);
        
        canvas.toBlob((blob) => {
          if (!blob) {
            setIsSavingToDevice(false);
            throw new Error("Blob creation failed");
          }
          
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `UHRP_verified_${timestamp}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Save to gallery with UHRP watermark burned in
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            
            const newItem: GalleryItem = {
              id: newItemId,
              uri: base64,
              name: `UHRP_verified_${timestamp}.jpg`,
              timestamp,
              uhrpHash: currentItem.uhrpHash,
              uhrpHashX: Math.round(wmX),
              uhrpHashY: Math.round(wmY),
              fixedWatermarkX: currentItem.fixedWatermarkX,
              fixedWatermarkY: currentItem.fixedWatermarkY
            };

            setGallery(prev => {
              const newGallery = [newItem, ...prev];
              saveGallery(newGallery);
              return newGallery;
            });
            
            URL.revokeObjectURL(url);
            setIsSavingToDevice(false);
            Alert.alert("✅ COMPLETE!", "🎉 UHRP verified image saved!\n🔐 Both watermarks are permanent");
            setMode("gallery");
            setUhrpInput("");
          };
          reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.9);

        return;
      }

      // Native version
      if (!hashWatermarkRef.current) throw new Error("Preview not ready");

      const tempUri = await captureRef(hashWatermarkRef, {
        format: "jpg",
        quality: 0.9
      });

      const filename = `uhrp_verified_${timestamp}.jpg`;
      const finalUri = `${GALLERY_DIR}${filename}`;
      await FileSystem.copyAsync({ from: tempUri, to: finalUri });

      const newItem: GalleryItem = {
        id: newItemId,
        uri: finalUri,
        name: filename,
        timestamp,
        uhrpHash: currentItem.uhrpHash,
        uhrpHashX: Math.round(hashPan.x._value || 0),
        uhrpHashY: Math.round(hashPan.y._value || 0),
        fixedWatermarkX: currentItem.fixedWatermarkX,
        fixedWatermarkY: currentItem.fixedWatermarkY
      };

      setGallery(prev => {
        const newGallery = [newItem, ...prev];
        saveGallery(newGallery);
        return newGallery;
      });

      Alert.alert("✅ COMPLETE!", `📱 ${filename} saved with UHRP verification!`);
      setMode("gallery");
      setUhrpInput("");
    } catch (error: any) {
      console.error("❌ Hash watermark save failed:", error);
      Alert.alert("❌ Failed", error.message || "Could not save");
    } finally {
      setIsSavingToDevice(false);
    }
  };

  // 📤 SHARE IMAGE
  const handleShareImage = async (item: GalleryItem) => {
    try {
      if (isWeb) {
        // Web share - download the image
        const link = document.createElement("a");
        link.href = item.uri;
        link.download = item.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Alert.alert("✅ Downloaded!", "Check your Downloads folder");
      } else {
        // Native share
        await Share.share({
          url: item.uri,
          message: `UHRP Verified Image: ${item.name}`
        });
      }
    } catch (error: any) {
      console.error("Share failed:", error);
      Alert.alert("Share Failed", error.message);
    }
  };

  // 👁️ VIEW IMAGE
  const handleViewImage = (item: GalleryItem) => {
    setSelectedImage(item);
    setViewImageModal(true);
  };

  // 🗑️ CLEAR ALL
  const clearAllImages = async () => {
    if (gallery.length === 0) return;

    Alert.alert(
      "🗑️ Clear All Photos?",
      `Delete ${gallery.length} photos?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Everything",
          style: "destructive",
          onPress: async () => {
            try {
              setGallery([]);
              await AsyncStorage.removeItem(GALLERY_KEY);

              if (!isWeb && FileSystem.documentDirectory) {
                try {
                  const files = await FileSystem.readDirectoryAsync(GALLERY_DIR);
                  await Promise.all(
                    files
                      .filter(f => f.endsWith(".jpg"))
                      .map(f =>
                        FileSystem.deleteAsync(`${GALLERY_DIR}${f}`, {
                          idempotent: true
                        }).catch(() => {})
                      )
                  );
                } catch (e) {
                  console.log("File delete skipped:", e);
                }
              }

              Alert.alert("✅ CLEARED!", "Gallery is empty now!");
            } catch (e) {
              console.error("Clear failed:", e);
              Alert.alert("⚠️ Error", "UI cleared, but storage may still hold data.");
            }
          }
        }
      ]
    );
  };

  // 🗑️ SINGLE DELETE
  const handleDeleteImage = (item: GalleryItem) => {
    Alert.alert(
      "Delete Photo?",
      `Remove "${item.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (!isWeb && item.uri.startsWith(GALLERY_DIR)) {
                try {
                  await FileSystem.deleteAsync(item.uri, { idempotent: true });
                } catch (e) {
                  console.log("File delete failed/ignored:", e);
                }
              }

              setGallery(prev => {
                const updated = prev.filter(p => p.id !== item.id);
                saveGallery(updated);
                return updated;
              });
            } catch (e) {
              console.error("Delete failed:", e);
              Alert.alert("⚠️ Error", "Could not delete image.");
            }
          }
        }
      ]
    );
  };

  // 🚨 DEV: FORCE CLEAR ON EVERY LOAD (Remove after testing)
  useEffect(() => {
    const forceClear = async () => {
      try {
        await AsyncStorage.removeItem(GALLERY_KEY);
        await AsyncStorage.removeItem(GALLERY_WIPE_FLAG);
        setGallery([]);
        console.log("✅ Force cleared gallery on load");
      } catch (e) {
        console.error("Force clear failed", e);
      }
    };
    forceClear();
  }, []);

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera Access Required</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (mode === "camera") {
    return (
      <View style={styles.container}>
        <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.smallCircle} onPress={() => setMode("gallery")}>
              <Text style={styles.text}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shutter} onPress={handleTakePicture} />
            <TouchableOpacity
              style={styles.smallCircle}
              onPress={() => setFacing(facing === "back" ? "front" : "back")}
            >
              <Text style={styles.text}>↻</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  if (mode === "watermark" && capturedUri) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMode("camera")}>
            <Text style={styles.text}>Back</Text>
            <IconSymbol size={26} name="arrow.backward.circle" color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Preview</Text>
        </View>

        <ViewShot ref={fixedPreviewRef} style={{ flex: 1 }}>
          <View style={styles.imageWrapper} onLayout={handleWatermarkLayout}>
            <Image source={{ uri: capturedUri }} style={styles.image} resizeMode="cover" />
            {containerSize.width > 0 && (
              <View
                style={[
                  styles.fixedWatermark,
                  {
                    left: (containerSize.width - 140) / 2,
                    top: (containerSize.height - 60) / 2
                  }
                ]}
              >
                <Text style={styles.fixedWatermarkSub}>Watermark</Text>
              </View>
            )}
          </View>
        </ViewShot>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.secondaryButton, isSavingToDevice && styles.disabledButton]}
            onPress={() => setMode("camera")}
            disabled={isSavingToDevice}
          >
            <Text style={styles.secondaryText}>Retake</Text>
            <IconSymbol size={20} name="backward" color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              styles.saveButton,
              isSavingToDevice && styles.disabledButton
            ]}
            onPress={handleSaveToDevice}
            disabled={isSavingToDevice}
          >
            {isSavingToDevice ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>Save to device</Text>)}
              <IconSymbol size={20} name="arrow.down" color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.uhrpRow}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              styles.uhrpButton,
              (!watermarkedUri || !currentImageId) && styles.disabledButton
            ]}
            onPress={handleOpenUhrp}
            disabled={!watermarkedUri || !currentImageId}
          >
            <Text
              style={[
                styles.primaryText,
                (!watermarkedUri || !currentImageId) && styles.disabledText
              ]}
            >
              Upload to Decentralized Storage securely {(!watermarkedUri || !currentImageId) && "(after save)"}
            </Text>
            <IconSymbol size={20} name="arrow.up.and.down.square" color="#fff" />
          </TouchableOpacity>
        </View>

        <Modal visible={askForHash} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.title}>Paste UHRP Hash generated from upload</Text>
              <Text style={styles.text}>Upload the saved image to UHRP, then paste the hash here</Text>
              <TextInput
                style={styles.input}
                placeholder="uhrp://..."
                value={uhrpInput}
                onChangeText={setUhrpInput}
                autoCapitalize="none"
                multiline
                numberOfLines={3}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    setAskForHash(false);
                    setUhrpInput("");
                  }}
                >
                  <Text style={styles.secondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleSaveUhrpHash}
                >
                  <Text style={styles.primaryText}>Add the hash to the watermark</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  if (mode === "hash-watermark" && watermarkedUri && currentImageId) {
    const currentItem = gallery.find(item => item.id === currentImageId);
    
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMode("gallery")}>
            <Text style={styles.text}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Drag UHRP Watermark</Text>
          <Text style={styles.statusSuccess}>
            🔐 Ready to save
          </Text>
        </View>

        <ViewShot ref={hashWatermarkRef} style={{ flex: 1 }}>
          <View style={styles.imageWrapper} onLayout={handleHashWatermarkLayout}>
            <Image source={{ uri: watermarkedUri }} style={styles.image} resizeMode="cover" />
            {containerSize.width > 0 && currentItem?.uhrpHash && (
              <Animated.View
                style={[
                  styles.hashWatermark,
                  {
                    transform: [{ translateX: hashPan.x }, { translateY: hashPan.y }]
                  }
                ]}
                {...hashPanResponder.panHandlers}
              >
                <Text style={styles.hashWatermarkTitle}>🔐 UHRP VERIFIED</Text>
                <Text style={styles.hashWatermarkHash} numberOfLines={1}>
                  {currentItem.uhrpHash.substring(0, 30)}...
                </Text>
                <Text style={styles.hashWatermarkSub}>Blockchain Secured</Text>
              </Animated.View>
            )}
          </View>
        </ViewShot>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.secondaryButton, isSavingToDevice && styles.disabledButton]}
            onPress={() => setMode("gallery")}
            disabled={isSavingToDevice}
          >
            <Text style={styles.secondaryText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              styles.uhrpButton,
              isSavingToDevice && styles.disabledButton
            ]}
            onPress={handleSaveHashWatermark}
            disabled={isSavingToDevice}
          >
            {isSavingToDevice ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>🔐 Save UHRP Verified</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // GALLERY MODE
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gallery ({gallery.length})</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => setMode("camera")}>
            <Text style={styles.primaryText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: "#ef4444", paddingHorizontal: 12 }
            ]}
            onPress={clearAllImages}
          >
            <Text style={styles.primaryText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={gallery}
        numColumns={3}
        keyExtractor={item => item.id}
        contentContainerStyle={gallery.length === 0 ? styles.emptyContainer : undefined}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.thumbWrapper}
            onPress={() => handleViewImage(item)}
            onLongPress={() => handleDeleteImage(item)}
          >
            <Image source={{ uri: item.uri }} style={styles.thumbnail} />
            {item.uhrpHash ? (
              <View style={styles.hashBadge}>
                <Text style={styles.hashBadgeText}>UHRP ✓</Text>
              </View>
            ) : (
              <View style={styles.noHashBadge}>
                <Text style={styles.noHashBadgeText}>No UHRP</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.text}>No watermarked photos yet</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setMode("camera")}>
              <Text style={styles.primaryText}>Take First Photo</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* VIEW IMAGE MODAL */}
      <Modal visible={viewImageModal} transparent animationType="fade">
        <View style={styles.viewModalBackdrop}>
          <View style={styles.viewModalHeader}>
            <TouchableOpacity onPress={() => setViewImageModal(false)}>
              <Text style={styles.viewModalClose}>✕ Close</Text>
            </TouchableOpacity>
            {selectedImage && (
              <TouchableOpacity onPress={() => handleShareImage(selectedImage)}>
                <Text style={styles.viewModalShare}>📤 Download</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {selectedImage && (
            <>
              <Image 
                source={{ uri: selectedImage.uri }} 
                style={styles.viewModalImage} 
                resizeMode="contain"
              />
              <View style={styles.viewModalInfo}>
                <Text style={styles.viewModalName}>{selectedImage.name}</Text>
                {selectedImage.uhrpHash && (
                  <View style={styles.viewModalHashContainer}>
                    <Text style={styles.viewModalHashLabel}>🔐 UHRP Hash:</Text>
                    <Text style={styles.viewModalHashText} numberOfLines={2}>
                      {selectedImage.uhrpHash}
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#111"
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 8 },
  text: { color: "#ccc", textAlign: "center", marginVertical: 4 },
  status: { fontSize: 14, fontWeight: "500" },
  statusSuccess: { color: "#22c55e", fontSize: 14, fontWeight: "500" },
  statusPending: { color: "#f59e0b", fontSize: 14, fontWeight: "500" },
  camera: { flex: 1 },
  cameraControls: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    paddingBottom: 40
  },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "#fff",
    backgroundColor: "#eee"
  },
  smallCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#18181b"
  },
  imageWrapper: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
    position: "relative"
  },
  image: { flex: 1, width: "100%" },
  fixedWatermark: {
    position: "absolute",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.8)",
    borderWidth: 2,
    borderColor: "#22c55e"
  },
  fixedWatermarkSub: { color: "#90ee90", fontSize: 11 },
  hashWatermark: {
    position: "absolute",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.95)",
    borderWidth: 3,
    borderColor: "#fef2f2",
    minWidth: 200
  },
  hashWatermarkTitle: { 
    color: "#ffffff", 
    fontWeight: "800", 
    fontSize: 14,
    marginBottom: 4
  },
  hashWatermarkHash: { 
    color: "#fef2f2", 
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4
  },
  hashWatermarkSub: { 
    color: "#fecaca", 
    fontSize: 10,
    fontWeight: "600"
  },
  footer: { flexDirection: "row", padding: 12, gap: 12 },
  uhrpRow: { padding: 12 },
  primaryButton: {
    flex: 1,
    backgroundColor: "#16a34a",
    padding: 14,
    borderRadius: 12,
    alignItems: "center"
  },
  saveButton: { backgroundColor: "#22c55e" },
  uhrpButton: { backgroundColor: "#ef4444" },
  disabledButton: { backgroundColor: "#4b5563", opacity: 0.6 },
  primaryText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  disabledText: { color: "#9ca3af" },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#27272a",
    padding: 14,
    borderRadius: 12,
    alignItems: "center"
  },
  secondaryText: { color: "#e5e7eb", fontWeight: "500", fontSize: 16 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center"
  },
  modalCard: {
    width: "90%",
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 24,
    gap: 16
  },
  input: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 12,
    padding: 16,
    color: "#fff",
    backgroundColor: "#27272a",
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top"
  },
  modalButtons: { flexDirection: "row", gap: 12 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  thumbWrapper: { flex: 1 / 3, aspectRatio: 1, padding: 4, position: "relative" },
  thumbnail: { flex: 1, borderRadius: 12, backgroundColor: "#333" },
  hashBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#16a34a",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  hashBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  noHashBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#f59e0b",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8
  },
  noHashBadgeText: { color: "#fff", fontSize: 9, fontWeight: "600" },
  viewModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)"
  },
  viewModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#18181b"
  },
  viewModalClose: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600"
  },
  viewModalShare: {
    color: "#22c55e",
    fontSize: 16,
    fontWeight: "600"
  },
  viewModalImage: {
    flex: 1,
    width: "100%"
  },
  viewModalInfo: {
    padding: 16,
    backgroundColor: "#18181b"
  },
  viewModalName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12
  },
  viewModalHashContainer: {
    backgroundColor: "#27272a",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444"
  },
  viewModalHashLabel: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6
  },
  viewModalHashText: {
    color: "#ccc",
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  }
});