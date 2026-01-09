import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Modal,
  Platform,
  Alert
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import ViewShot, { captureRef } from "react-native-view-shot";
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

const GALLERY_KEY = "secure_media_gallery_v3";

export default function GalleryScreen() {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  
  const viewShotRef = useRef<View | null>(null);

  const loadGallery = async () => {
    try {
      const json = await AsyncStorage.getItem(GALLERY_KEY);
      if (json) {
        // Need to check if file exists (optional cleanup)
        setGallery(JSON.parse(json).sort((a: any, b: any) => b.timestamp - a.timestamp));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadGallery();
    const interval = setInterval(loadGallery, 2000);
    return () => clearInterval(interval);
  }, []);

  const updatePosition = async (id: string, type: 'fixed' | 'hash', x: number, y: number) => {
    const updatedGallery = gallery.map(item => {
      if (item.id === id) {
        return {
          ...item,
          watermarkConfig: {
            ...item.watermarkConfig,
            [type]: { ...item.watermarkConfig[type], x, y }
          }
        };
      }
      return item;
    });
    
    setGallery(updatedGallery);
    await AsyncStorage.setItem(GALLERY_KEY, JSON.stringify(updatedGallery));
    
    if (selectedItem?.id === id) {
      setSelectedItem(updatedGallery.find(i => i.id === id) || null);
    }
  };

  const handleExportAndShare = async () => {
    if (!viewShotRef.current) return;
    try {
      const uri = await captureRef(viewShotRef, {
        format: "jpg",
        quality: 0.9,
      });

      if (Platform.OS === 'web') {
        const link = document.createElement("a");
        link.href = uri;
        link.download = `secure_${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri);
        } else {
            Alert.alert("Saved", "Image saved: " + uri);
        }
      }
    } catch (e: any) {
      Alert.alert("Export Failed", e.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Secure Gallery</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)/dashboard")}>
             <IconSymbol size={28} name="camera.fill" color="#f7931a" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={gallery}
        numColumns={3}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.item} 
            onPress={() => setSelectedItem(item)}
          >
            <Image source={{ uri: item.uri }} style={styles.thumb} />
            {item.uhrpHash && (
                <View style={styles.badge}>
                    <IconSymbol name="checkmark.seal.fill" size={14} color="#34c759" />
                </View>
            )}
          </TouchableOpacity>
        )}
      />

      <Modal visible={!!selectedItem} transparent animationType="fade" onRequestClose={() => setSelectedItem(null)}>
        <GestureHandlerRootView style={{flex: 1}}>
          <View style={styles.modalBg}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedItem(null)}>
              <IconSymbol name="xmark.circle.fill" size={36} color="#fff" />
            </TouchableOpacity>

            <View style={styles.viewerContainer}>
              <ViewShot ref={viewShotRef} style={{flex: 1, width: '100%', height: '100%'}}>
                {selectedItem && (
                  <>
                    <Image source={{ uri: selectedItem.uri }} style={styles.fullImage} resizeMode="contain" />
                    
                    <DraggableOverlay
                      initialX={selectedItem.watermarkConfig.fixed.x}
                      initialY={selectedItem.watermarkConfig.fixed.y}
                      onDragEnd={(x, y) => updatePosition(selectedItem.id, 'fixed', x, y)}
                    >
                       <View style={styles.watermarkBadge}>
                          <Text style={styles.wmSmall}>SECURED BY</Text>
                          <Text style={styles.wmLarge}>UniqueHash</Text>
                       </View>
                    </DraggableOverlay>

                    {selectedItem.uhrpHash && (
                      <DraggableOverlay
                        initialX={selectedItem.watermarkConfig.hash.x}
                        initialY={selectedItem.watermarkConfig.hash.y}
                        onDragEnd={(x, y) => updatePosition(selectedItem.id, 'hash', x, y)}
                      >
                         <View style={styles.hashBadge}>
                            <Text style={styles.hashTitle}>🔐 UHRP VERIFIED</Text>
                            <Text style={styles.hashText}>{selectedItem.uhrpHash.substring(0, 20)}...</Text>
                         </View>
                      </DraggableOverlay>
                    )}
                  </>
                )}
              </ViewShot>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.exportBtn} onPress={handleExportAndShare}>
                <Text style={styles.exportText}>Share / Download (Burn-in)</Text>
              </TouchableOpacity>
            </View>

          </View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: { flexDirection: "row", justifyContent: "space-between", padding: 20, paddingTop: 60, alignItems: "center", backgroundColor: "#1c1c1e" },
  title: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  item: { flex: 1/3, aspectRatio: 1, padding: 1 },
  thumb: { flex: 1, backgroundColor: "#333" },
  badge: { position: "absolute", top: 4, right: 4 },
  
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)" },
  closeBtn: { position: "absolute", top: 50, right: 20, zIndex: 999 },
  
  viewerContainer: { flex: 1, marginTop: 100, marginBottom: 100 },
  fullImage: { width: "100%", height: "100%", backgroundColor: '#000' },

  footer: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
  exportBtn: { backgroundColor: '#f7931a', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25 },
  exportText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  watermarkBadge: { backgroundColor: 'rgba(247, 147, 26, 0.9)', padding: 10, borderRadius: 8, alignItems: 'center' },
  wmSmall: { color: '#fff', fontSize: 10, fontWeight: '600' },
  wmLarge: { color: '#fff', fontSize: 16, fontWeight: '800' },
  hashBadge: { backgroundColor: 'rgba(239, 68, 68, 0.9)', padding: 12, borderRadius: 8, borderWidth: 2, borderColor: '#fee2e2' },
  hashTitle: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  hashText: { color: '#fff', fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
});