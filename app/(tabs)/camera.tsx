import React, { useEffect, useRef, useState, useCallback } from "react";
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
  Platform,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { router } from "expo-router";
import { useIsFocused, useFocusEffect } from "@react-navigation/native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DraggableOverlay } from "../../components/DraggableOverlay";

type GalleryItem = {
  id: string;
  uri: string; 
  name: string;
  timestamp: number;
  uhrpHash?: string;
  watermarkConfig: {
    fixed: { x: number; y: number; visible: boolean };
    hash: { x: number; y: number; visible: boolean };
  };
};

const isWeb = Platform.OS === "web";
const GALLERY_DIR = `${FileSystem.documentDirectory}gallery/`;
const GALLERY_KEY = "secure_media_gallery_v3";

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const [mode, setMode] = useState<"camera" | "edit">("camera");
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  
  const [fixedPos, setFixedPos] = useState({ x: 0, y: 0 });
  const [hashPos, setHashPos] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const [askForHash, setAskForHash] = useState(false);
  const [uhrpInput, setUhrpInput] = useState("");
  const [currentHash, setCurrentHash] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const isFocused = useIsFocused();

  useEffect(() => {
    ensureGalleryDir();
  }, []);

  const ensureGalleryDir = async () => {
    if (isWeb) return;
    try {
      const dirInfo = await FileSystem.getInfoAsync(GALLERY_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(GALLERY_DIR, { intermediates: true });
      }
    } catch (e) {
      console.log("Directory error (ignore if works):", e);
    }
  };

  const handleTakePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1.0 });
      setCapturedUri(photo.uri);
      setMode("edit");
      setCurrentHash(null);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    if (width === 0 || height === 0) return;
    setContainerSize({ width, height });
    setFixedPos({ x: (width - 140) / 2, y: (height - 60) / 2 });
    setHashPos({ x: (width - 200) / 2, y: (height - 180) / 2 });
  };

  const handleSaveData = async () => {
    if (!capturedUri) return;
    setIsSaving(true);

    try {
      await ensureGalleryDir(); // Ensure folder exists before copying
      const timestamp = Date.now();
      const filename = `raw_${timestamp}.jpg`;
      const permanentUri = `${GALLERY_DIR}${filename}`;

      if (!isWeb) {
        // This 'copyAsync' is what was crashing. The legacy import fixes it.
        await FileSystem.copyAsync({ from: capturedUri, to: permanentUri });
      }

      const newItem: GalleryItem = {
        id: `img_${timestamp}`,
        uri: isWeb ? capturedUri : permanentUri, 
        name: filename,
        timestamp: timestamp,
        uhrpHash: currentHash || undefined,
        watermarkConfig: {
          fixed: { x: fixedPos.x, y: fixedPos.y, visible: true },
          hash: { x: hashPos.x, y: hashPos.y, visible: !!currentHash }
        }
      };

      const existingJson = await AsyncStorage.getItem(GALLERY_KEY);
      const existingGallery = existingJson ? JSON.parse(existingJson) : [];
      const newGallery = [newItem, ...existingGallery];
      await AsyncStorage.setItem(GALLERY_KEY, JSON.stringify(newGallery));

      Alert.alert("✅ Saved!", "Added to Secure Gallery");
      setMode("camera");
      setCapturedUri(null);
      setUhrpInput("");
    } catch (e: any) {
      console.error(e);
      Alert.alert("Save Failed", e.message || "Could not save file");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenUhrp = async () => {
    await WebBrowser.openBrowserAsync("https://dropblocks.org/");
    setAskForHash(true);
  };

  const handleConfirmHash = () => {
    if (!uhrpInput.trim()) return;
    setCurrentHash(uhrpInput.trim());
    setAskForHash(false);
  };

  useFocusEffect(
    useCallback(() => {
      return () => {
        cameraRef.current?.pausePreview?.();
      };
    }, [])
  );

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={{color:'#fff', marginBottom: 20}}>Camera permission required</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
            <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        
        {/* MODE: CAMERA */}
        {mode === "camera" && isFocused && (
          <View style={{ flex: 1 }}>
            {/* FIX 2: CameraView is now a self-closing tag or empty container */}
            <CameraView style={styles.camera} facing={facing} ref={cameraRef} />
            
            {/* Controls are placed AFTER CameraView using absolute positioning */}
            <View style={styles.overlay}>
               <TouchableOpacity onPress={() => router.push("/(tabs)/gallery")} style={styles.iconBtn}>
                  <IconSymbol size={28} name="photo.on.rectangle" color="#fff" />
               </TouchableOpacity>
               <TouchableOpacity onPress={handleTakePicture} style={styles.shutterBtn}>
                  <View style={styles.shutterInner} />
               </TouchableOpacity>
               <TouchableOpacity onPress={() => setFacing(p => p === 'back' ? 'front' : 'back')} style={styles.iconBtn}>
                  <IconSymbol size={28} name="arrow.triangle.2.circlepath.camera.fill" color="#fff" />
               </TouchableOpacity>
            </View>
          </View>
        )}

        {/* MODE: EDIT */}
        {mode === "edit" && capturedUri && (
          <View style={styles.container}>
            <View style={styles.previewContainer} onLayout={handleLayout}>
              <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="cover" />

              {containerSize.width > 0 && (
                <DraggableOverlay
                  initialX={fixedPos.x}
                  initialY={fixedPos.y}
                  onDragEnd={(x, y) => setFixedPos({ x, y })}
                >
                  <View style={styles.watermarkBadge}>
                    <Text style={styles.wmSmall}>SECURED BY</Text>
                    <Text style={styles.wmLarge}>UniqueHash</Text>
                  </View>
                </DraggableOverlay>
              )}

              {containerSize.width > 0 && currentHash && (
                <DraggableOverlay
                  initialX={hashPos.x}
                  initialY={hashPos.y}
                  onDragEnd={(x, y) => setHashPos({ x, y })}
                >
                  <View style={styles.hashBadge}>
                    <Text style={styles.hashTitle}>🔐 UHRP VERIFIED</Text>
                    <Text style={styles.hashText} numberOfLines={1}>
                      {currentHash.substring(0, 20)}...
                    </Text>
                  </View>
                </DraggableOverlay>
              )}
            </View>

            <View style={styles.controls}>
              <TouchableOpacity onPress={() => setMode("camera")} style={styles.btnSecondary}>
                <Text style={styles.btnText}>Retake</Text>
              </TouchableOpacity>
              
              {!currentHash ? (
                <TouchableOpacity onPress={handleOpenUhrp} style={styles.btnSecondary}>
                  <Text style={styles.btnText}>Add UHRP</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setCurrentHash(null)} style={styles.btnDestructive}>
                  <Text style={styles.btnText}>Remove Hash</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={handleSaveData} style={styles.btnPrimary}>
                {isSaving ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Modal */}
        <Modal visible={askForHash} transparent animationType="slide">
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Paste UHRP Hash</Text>
              <TextInput 
                style={styles.input} 
                value={uhrpInput} 
                onChangeText={setUhrpInput} 
                placeholder="0x..." 
                placeholderTextColor="#666"
              />
              <View style={styles.modalRow}>
                <TouchableOpacity onPress={() => setAskForHash(false)} style={styles.modalBtnCancel}>
                   <Text style={{color:'#fff'}}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleConfirmHash} style={styles.modalBtnSave}>
                   <Text style={{color:'#fff', fontWeight:'bold'}}>Verify</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  camera: { flex: 1 },
  // FIX: Make overlay absolute so it sits ON TOP of camera, not inside it
  overlay: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-around', 
    paddingBottom: 50,
    paddingTop: 20,
    // Add gradient or background if text is hard to read
    // backgroundColor: 'rgba(0,0,0,0.3)' 
  },
  shutterBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#000' },
  iconBtn: { padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 30 },
  
  previewContainer: { flex: 1, overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%' },
  
  watermarkBadge: { backgroundColor: 'rgba(247, 147, 26, 0.9)', padding: 10, borderRadius: 8, alignItems: 'center' },
  wmSmall: { color: '#fff', fontSize: 10, fontWeight: '600' },
  wmLarge: { color: '#fff', fontSize: 16, fontWeight: '800' },
  
  hashBadge: { backgroundColor: 'rgba(239, 68, 68, 0.9)', padding: 12, borderRadius: 8, borderWidth: 2, borderColor: '#fee2e2' },
  hashTitle: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  hashText: { color: '#fff', fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  controls: { flexDirection: 'row', justifyContent: 'space-around', padding: 20, backgroundColor: '#1c1c1e' },
  btnPrimary: { backgroundColor: '#f7931a', padding: 12, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  btnSecondary: { backgroundColor: '#3a3a3c', padding: 12, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  btnDestructive: { backgroundColor: '#ef4444', padding: 12, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#1c1c1e', padding: 20, borderRadius: 16 },
  modalTitle: { color: '#fff', fontSize: 18, marginBottom: 15, fontWeight: 'bold' },
  input: { backgroundColor: '#2c2c2e', color: '#fff', padding: 15, borderRadius: 8, marginBottom: 20 },
  modalRow: { flexDirection: 'row', gap: 10 },
  modalBtnCancel: { flex: 1, padding: 15, backgroundColor: '#3a3a3c', borderRadius: 8, alignItems: 'center' },
  modalBtnSave: { flex: 1, padding: 15, backgroundColor: '#34c759', borderRadius: 8, alignItems: 'center' },
});