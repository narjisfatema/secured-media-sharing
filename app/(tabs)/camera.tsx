import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated,
  PanResponder,
  Platform
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ViewShot, { captureRef } from "react-native-view-shot";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { router } from "expo-router";

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

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  
  const cameraRef = useRef<CameraView | null>(null);
  const fixedPreviewRef = useRef<View | null>(null);
  const hashWatermarkRef = useRef<View | null>(null);

  const [mode, setMode] = useState<"camera" | "watermark" | "hash-watermark">("camera");
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [watermarkedUri, setWatermarkedUri] = useState<string | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  const [isSavingToDevice, setIsSavingToDevice] = useState(false);
  const [currentImageId, setCurrentImageId] = useState<string | null>(null);

  const fixedPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const hashPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const fixedPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        fixedPan.setOffset({ x: fixedPan.x._value, y: fixedPan.y._value });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: fixedPan.x, dy: fixedPan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        fixedPan.flattenOffset();
      }
    })
  ).current;
  
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

  // Storage helpers
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
      }
    } catch (e) {
      console.error("❌ Load gallery failed:", e);
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
            Alert.alert("✅ SAVED!", "Image downloaded, Ready for UHRP upload");
          };
          reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.9);

        return;
      }

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
      Alert.alert("Save to device first");
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
        
        const scaleX = canvas.width / containerSize.width;
        const scaleY = canvas.height / containerSize.height;
        const wmX = hashPan.x._value * scaleX;
        const wmY = hashPan.y._value * scaleY;
        
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
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🔐 UHRP VERIFIED', wmX + wmWidth/2, wmY + 25);
        
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
            Alert.alert(
              "✅ COMPLETE!", 
              "🎉 UHRP verified image saved!\n🔐 Both watermarks are permanent",
              [
                { 
                  text: "View in Gallery", 
                  onPress: () => router.push('/(tabs)/gallery')
                },
                { text: "Take Another", style: "cancel" }
              ]
            );
            
            setMode("camera");
            setCapturedUri(null);
            setWatermarkedUri(null);
            setCurrentImageId(null);
            setUhrpInput("");
          };
          reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.9);

        return;
      }

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

      Alert.alert(
        "✅ COMPLETE!", 
        `📱 ${filename} saved with UHRP verification!`,
        [
          { 
            text: "View in Gallery", 
            onPress: () => router.push('/(tabs)/gallery')
          },
          { text: "Take Another", style: "cancel" }
        ]
      );
      
      setMode("camera");
      setCapturedUri(null);
      setWatermarkedUri(null);
      setCurrentImageId(null);
      setUhrpInput("");
    } catch (error: any) {
      console.error("❌ Hash watermark save failed:", error);
      Alert.alert("❌ Failed", error.message || "Could not save");
    } finally {
      setIsSavingToDevice(false);
    }
  };

  if (!permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <View style={styles.permissionIconContainer}>
            <IconSymbol size={64} name="camera.fill" color="#f7931a" />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need camera permission to capture secure, blockchain-verified photos
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton} 
            onPress={requestPermission}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
            <IconSymbol size={20} name="arrow.right" color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (mode === "camera") {
    return (
      <View style={styles.container}>
        <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity 
                style={styles.cameraBackButton} 
                onPress={() => router.push('/(tabs)/gallery')}
                activeOpacity={0.7}
              >
                <IconSymbol size={28} name="photo.on.rectangle" color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.cameraControls}>
              <View style={styles.controlsSpacer} />
              
              <TouchableOpacity 
                style={styles.shutterButton} 
                onPress={handleTakePicture}
                activeOpacity={0.7}
              >
                <View style={styles.shutterInner} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.flipButton}
                onPress={() => setFacing(facing === "back" ? "front" : "back")}
                activeOpacity={0.7}
              >
                <IconSymbol size={32} name="arrow.triangle.2.circlepath.camera.fill" color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  if (mode === "watermark" && capturedUri) {
    return (
      <View style={styles.container}>
        <View style={styles.previewContainer} onLayout={handleWatermarkLayout}>
          <ViewShot ref={fixedPreviewRef} style={styles.viewShot}>
            <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="cover" />
            {containerSize.width > 0 && (
              <Animated.View
                {...fixedPanResponder.panHandlers}
                style={[
                  styles.watermark,
                  { transform: fixedPan.getTranslateTransform() }
                ]}
              >
                <Text style={styles.watermarkText}>SECURED BY</Text>
                <Text style={styles.watermarkBrand}>UniqueHash</Text>
              </Animated.View>
            )}
          </ViewShot>
        </View>

        <View style={styles.actionBar}>
          <TouchableOpacity 
            style={[styles.actionButton, isSavingToDevice && styles.disabledButton]} 
            onPress={() => setMode("camera")}
            disabled={isSavingToDevice}
            activeOpacity={0.7}
          >
            <IconSymbol size={24} name="arrow.left" color="#fff" />
            <Text style={styles.actionButtonText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton, 
              styles.primaryButton,
              isSavingToDevice && styles.disabledButton
            ]}
            onPress={handleSaveToDevice}
            disabled={isSavingToDevice}
            activeOpacity={0.7}
          >
            {isSavingToDevice ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <IconSymbol size={24} name="square.and.arrow.down.fill" color="#fff" />
                <Text style={styles.actionButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton, 
              (!watermarkedUri || !currentImageId) && styles.disabledButton
            ]}
            onPress={handleOpenUhrp}
            disabled={!watermarkedUri || !currentImageId}
            activeOpacity={0.7}
          >
            <IconSymbol size={24} name="link" color="#fff" />
            <Text style={styles.actionButtonText}>UHRP</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={askForHash} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Enter UHRP Hash</Text>
              <Text style={styles.modalSubtitle}>
                Paste your blockchain hash to add permanent verification
              </Text>
              
              <TextInput
                style={styles.hashInput}
                placeholder="0x..."
                placeholderTextColor="#999"
                value={uhrpInput}
                onChangeText={setUhrpInput}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setAskForHash(false);
                    setUhrpInput("");
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleSaveUhrpHash}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalButtonTextSave}>Save Hash</Text>
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
        <View style={styles.previewContainer} onLayout={handleHashWatermarkLayout}>
          <ViewShot ref={hashWatermarkRef} style={styles.viewShot}>
            <Image source={{ uri: watermarkedUri }} style={styles.previewImage} resizeMode="cover" />
            {containerSize.width > 0 && currentItem?.uhrpHash && (
              <Animated.View
                {...hashPanResponder.panHandlers}
                style={[
                  styles.hashWatermark,
                  { transform: hashPan.getTranslateTransform() }
                ]}
              >
                <Text style={styles.hashWatermarkTitle}>🔐 UHRP VERIFIED</Text>
                <Text style={styles.hashWatermarkHash} numberOfLines={1}>
                  {currentItem.uhrpHash.substring(0, 30)}...
                </Text>
                <Text style={styles.hashWatermarkSub}>Blockchain Secured</Text>
              </Animated.View>
            )}
          </ViewShot>
        </View>

        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actionButton, isSavingToDevice && styles.disabledButton]}
            onPress={() => router.push('/(tabs)/gallery')}
            disabled={isSavingToDevice}
            activeOpacity={0.7}
          >
            <IconSymbol size={24} name="arrow.left" color="#fff" />
            <Text style={styles.actionButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.primaryButton,
              isSavingToDevice && styles.disabledButton
            ]}
            onPress={handleSaveHashWatermark}
            disabled={isSavingToDevice}
            activeOpacity={0.7}
          >
            {isSavingToDevice ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <IconSymbol size={24} name="checkmark.circle.fill" color="#fff" />
                <Text style={styles.actionButtonText}>Finalize</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Something went wrong</Text>
        <TouchableOpacity 
          style={styles.permissionButton} 
          onPress={() => setMode("camera")}
        >
          <Text style={styles.permissionButtonText}>Reset to Camera</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000"
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  permissionCard: {
    backgroundColor: "#1c1c1e",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    maxWidth: 400,
    width: "100%"
  },
  permissionIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#2c2c2e",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
    textAlign: "center"
  },
  permissionText: {
    fontSize: 16,
    color: "#8e8e93",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32
  },
  permissionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7931a",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8
  },
  permissionButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff"
  },
  
  // Camera
  camera: {
    flex: 1
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "space-between"
  },
  cameraHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 20,
    paddingTop: 60
  },
  cameraBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center"
  },
  cameraControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingBottom: 50
  },
  controlsSpacer: {
    width: 60
  },
  shutterButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.3)"
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#000"
  },
  flipButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center"
  },
  
  // Preview/Watermark
  previewContainer: {
    flex: 1,
    backgroundColor: "#000"
  },
  viewShot: {
    flex: 1
  },
  previewImage: {
    flex: 1,
    width: "100%",
    height: "100%"
  },
  watermark: {
    position: "absolute",
    backgroundColor: "rgba(247, 147, 26, 0.9)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center"
  },
  watermarkText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 1
  },
  watermarkBrand: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff"
  },
  hashWatermark: {
    position: "absolute",
    backgroundColor: "rgba(239, 68, 68, 0.95)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
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
  
  // Action bar
  actionBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20,
    backgroundColor: "#1c1c1e",
    borderTopWidth: 1,
    borderTopColor: "#2c2c2e"
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2c2c2e",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    minWidth: 100
  },
  primaryButton: {
    backgroundColor: "#f7931a"
  },
  disabledButton: {
    opacity: 0.4
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff"
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  modalCard: {
    backgroundColor: "#1c1c1e",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8
  },
  modalSubtitle: {
    fontSize: 15,
    color: "#8e8e93",
    marginBottom: 24,
    lineHeight: 20
  },
  hashInput: {
    backgroundColor: "#2c2c2e",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#fff",
    marginBottom: 24,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    minHeight: 80,
    textAlignVertical: "top"
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center"
  },
  modalButtonCancel: {
    backgroundColor: "#2c2c2e"
  },
  modalButtonSave: {
    backgroundColor: "#34c759"
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff"
  },
  modalButtonTextSave: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff"
  }
});