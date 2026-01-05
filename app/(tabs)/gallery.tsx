// app/(tabs)/gallery.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  Share
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
const GALLERY_KEY = "secure_media_gallery_v2";

export default function GalleryScreen() {
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();
  
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [filterMode, setFilterMode] = useState<"all" | "verified">("all");
  const [sortMode, setSortMode] = useState<"newest" | "oldest">("newest");
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const [viewImageModal, setViewImageModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load gallery from storage
  const loadGallery = async () => {
    try {
      setIsLoading(true);
      const json = await AsyncStorage.getItem(GALLERY_KEY);
      if (json) {
        const items: GalleryItem[] = JSON.parse(json);
        setGallery(items.sort((a, b) => b.timestamp - a.timestamp));
      }
    } catch (e) {
      console.error("❌ Load gallery failed:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Save gallery to storage
  const saveGallery = async (items: GalleryItem[]) => {
    try {
      await AsyncStorage.setItem(GALLERY_KEY, JSON.stringify(items));
    } catch (e) {
      console.error("❌ Save gallery failed:", e);
    }
  };

  useEffect(() => {
    loadGallery();
    
    // Refresh gallery when screen comes into focus
    const interval = setInterval(loadGallery, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, []);

  // Filter and sort gallery
  const getFilteredGallery = () => {
    let filtered = [...gallery];
    
    if (filterMode === "verified") {
      filtered = filtered.filter(item => item.uhrpHash);
    }
    
    if (sortMode === "oldest") {
      filtered.sort((a, b) => a.timestamp - b.timestamp);
    } else {
      filtered.sort((a, b) => b.timestamp - a.timestamp);
    }
    
    return filtered;
  };

  // Format date helper
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  // Share image
  const handleShareImage = async (item: GalleryItem) => {
    try {
      if (isWeb) {
        const link = document.createElement("a");
        link.href = item.uri;
        link.download = item.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Alert.alert("✅ Downloaded!", "Check your Downloads folder");
        return;
      }

      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(item.uri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Share UHRP Verified Image',
          UTI: 'public.jpeg'
        });
      } else {
        await Share.share({
          message: `UHRP Verified Image: ${item.name}`,
          url: item.uri,
          title: 'Share Image'
        });
      }
    } catch (error: any) {
      if (error.message?.includes('cancelled') || error.message?.includes('canceled')) {
        return;
      }
      console.error("Share failed:", error);
      Alert.alert("Share Failed", error.message || "Could not share image");
    }
  };

  // Save to camera roll
  const handleSaveToPhotos = async (item: GalleryItem) => {
    try {
      if (isWeb) {
        Alert.alert("Not Available", "This feature is only available on mobile devices");
        return;
      }

      if (!mediaLibraryPermission?.granted) {
        const { granted } = await requestMediaLibraryPermission();
        if (!granted) {
          Alert.alert("Permission Denied", "Cannot save to photos without permission");
          return;
        }
      }

      await MediaLibrary.saveToLibraryAsync(item.uri);
      Alert.alert("✅ Saved to Photos!", "Image saved to your camera roll");
    } catch (error: any) {
      console.error("Save to photos failed:", error);
      Alert.alert("Save Failed", error.message || "Could not save to photos");
    }
  };

  // Delete image
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
              if (!isWeb && item.uri.startsWith("file://")) {
                try {
                  await FileSystem.deleteAsync(item.uri, { idempotent: true });
                } catch (e) {
                  console.log("File delete failed/ignored:", e);
                }
              }

              const updated = gallery.filter(p => p.id !== item.id);
              setGallery(updated);
              await saveGallery(updated);
              
              setViewImageModal(false);
              setSelectedImage(null);
            } catch (e) {
              console.error("Delete failed:", e);
              Alert.alert("⚠️ Error", "Could not delete image.");
            }
          }
        }
      ]
    );
  };

  // Clear all images
  const clearAllImages = async () => {
    if (gallery.length === 0) return;

    Alert.alert(
      "🗑️ Clear All Photos?",
      `Delete ${gallery.length} photos?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            try {
              setGallery([]);
              await AsyncStorage.removeItem(GALLERY_KEY);
              Alert.alert("✅ CLEARED!", "Gallery is empty now!");
            } catch (e) {
              console.error("Clear failed:", e);
              Alert.alert("⚠️ Error", "Could not clear gallery");
            }
          }
        }
      ]
    );
  };

  const filteredGallery = getFilteredGallery();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f7931a" />
        <Text style={styles.loadingText}>Loading gallery...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.galleryHeaderContainer}>
        <View style={styles.galleryHeader}>
          <Text style={styles.galleryTitle}>Secure Gallery</Text>
          <View style={styles.galleryActions}>
            {gallery.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton} 
                onPress={clearAllImages} 
                activeOpacity={0.7}
              >
                <IconSymbol size={20} name="trash" color="#ff3b30" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter & Sort Controls */}
        {gallery.length > 0 && (
          <View style={styles.filterContainer}>
            <View style={styles.filterGroup}>
              <TouchableOpacity
                style={[styles.filterButton, filterMode === "all" && styles.filterButtonActive]}
                onPress={() => setFilterMode("all")}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterButtonText, filterMode === "all" && styles.filterButtonTextActive]}>
                  All ({gallery.length})
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.filterButton, filterMode === "verified" && styles.filterButtonActive]}
                onPress={() => setFilterMode("verified")}
                activeOpacity={0.7}
              >
                <IconSymbol size={14} name="checkmark.seal.fill" color={filterMode === "verified" ? "#fff" : "#8e8e93"} />
                <Text style={[styles.filterButtonText, filterMode === "verified" && styles.filterButtonTextActive]}>
                  Verified ({gallery.filter(i => i.uhrpHash).length})
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => setSortMode(sortMode === "newest" ? "oldest" : "newest")}
              activeOpacity={0.7}
            >
              <IconSymbol 
                size={16} 
                name={sortMode === "newest" ? "arrow.down" : "arrow.up"} 
                color="#8e8e93" 
              />
              <Text style={styles.sortButtonText}>
                {sortMode === "newest" ? "Newest" : "Oldest"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Gallery Content */}
      {filteredGallery.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol size={80} name="photo.on.rectangle.angled" color="#666" />
          <Text style={styles.emptyTitle}>
            {gallery.length === 0 ? "No Photos Yet" : "No Verified Photos"}
          </Text>
          <Text style={styles.emptyText}>
            {gallery.length === 0 
              ? "Take your first blockchain-verified photo"
              : "No UHRP-verified photos found"}
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/(tabs)/camera')}
            activeOpacity={0.8}
          >
            <IconSymbol size={20} name="camera.fill" color="#fff" />
            <Text style={styles.emptyButtonText}>Open Camera</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredGallery}
          keyExtractor={item => item.id}
          numColumns={3}
          contentContainerStyle={styles.galleryGrid}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.galleryItem}
              onPress={() => {
                setSelectedImage(item);
                setViewImageModal(true);
              }}
              onLongPress={() => handleShareImage(item)}
              activeOpacity={0.8}
            >
              <Image source={{ uri: item.uri }} style={styles.galleryThumb} />
              {item.uhrpHash && (
                <View style={styles.verifiedBadge}>
                  <IconSymbol size={16} name="checkmark.seal.fill" color="#34c759" />
                </View>
              )}
              <View style={styles.dateStamp}>
                <Text style={styles.dateStampText}>{formatDate(item.timestamp)}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Full-Screen Image Viewer Modal */}
      <Modal visible={viewImageModal} transparent animationType="fade">
        <View style={styles.imageModalOverlay}>
          <View style={styles.imageModalHeader}>
            <TouchableOpacity
              style={styles.imageModalClose}
              onPress={() => setViewImageModal(false)}
              activeOpacity={0.7}
            >
              <IconSymbol size={28} name="xmark.circle.fill" color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.imageModalActions}>
              {selectedImage && (
                <>
                  {!isWeb && (
                    <TouchableOpacity
                      style={styles.imageModalAction}
                      onPress={() => handleSaveToPhotos(selectedImage)}
                      activeOpacity={0.7}
                    >
                      <IconSymbol size={24} name="photo.on.rectangle" color="#fff" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.imageModalAction}
                    onPress={() => handleShareImage(selectedImage)}
                    activeOpacity={0.7}
                  >
                    <IconSymbol size={24} name="square.and.arrow.up" color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.imageModalAction}
                    onPress={() => handleDeleteImage(selectedImage)}
                    activeOpacity={0.7}
                  >
                    <IconSymbol size={24} name="trash" color="#ff3b30" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {selectedImage && (
            <View style={styles.imageModalContent}>
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.fullImage}
                resizeMode="contain"
              />
              
              {/* Metadata */}
              <View style={styles.metadataContainer}>
                <View style={styles.metadataRow}>
                  <IconSymbol size={16} name="calendar" color="#8e8e93" />
                  <Text style={styles.metadataText}>
                    {new Date(selectedImage.timestamp).toLocaleString()}
                  </Text>
                </View>
                
                {selectedImage.uhrpHash && (
                  <View style={styles.hashInfo}>
                    <View style={styles.hashInfoHeader}>
                      <IconSymbol size={20} name="checkmark.seal.fill" color="#34c759" />
                      <Text style={styles.hashInfoTitle}>Blockchain Verified</Text>
                    </View>
                    <Text style={styles.hashInfoText} numberOfLines={2} ellipsizeMode="middle">
                      {selectedImage.uhrpHash}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* FAB - Open Camera */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(tabs)/camera')}
        activeOpacity={0.8}
      >
        <IconSymbol size={32} name="camera.fill" color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000"
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center"
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 16
  },
  galleryHeaderContainer: {
    backgroundColor: "#1c1c1e",
    borderBottomWidth: 1,
    borderBottomColor: "#2c2c2e"
  },
  galleryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60
  },
  galleryTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff"
  },
  galleryActions: {
    flexDirection: "row",
    gap: 12
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2c2c2e",
    justifyContent: "center",
    alignItems: "center"
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16
  },
  filterGroup: {
    flexDirection: "row",
    gap: 8
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2c2c2e",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6
  },
  filterButtonActive: {
    backgroundColor: "#f7931a"
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8e8e93"
  },
  filterButtonTextActive: {
    color: "#fff"
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2c2c2e",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8e8e93"
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginTop: 24,
    marginBottom: 8
  },
  emptyText: {
    fontSize: 16,
    color: "#8e8e93",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7931a",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff"
  },
  galleryGrid: {
    padding: 2
  },
  galleryItem: {
    flex: 1 / 3,
    aspectRatio: 1,
    padding: 2,
    position: "relative"
  },
  galleryThumb: {
    width: "100%",
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#2c2c2e"
  },
  verifiedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center"
  },
  dateStamp: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6
  },
  dateStampText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff"
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f7931a",
    justifyContent: "center",
    alignItems: "center",
  ...Platform.select({
    ios: {
      shadowColor: '🟨#f7931a',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    android: {
      elevation: 8,
    },
    web: {
      boxShadow: '0 8px 12px rgba(247, 147, 26, 0.3)',
    },
  }),
},
  imageModalOverlay: {
    flex: 1,
    backgroundColor: "#000"
  },
  imageModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "rgba(0, 0, 0, 0.9)"
  },
  imageModalClose: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center"
  },
  imageModalActions: {
    flexDirection: "row",
    gap: 12
  },
  imageModalAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center"
  },
  imageModalContent: {
    flex: 1,
    justifyContent: "center"
  },
  fullImage: {
    width: "100%",
    height: "100%"
  },
  metadataContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12
  },
  metadataText: {
    fontSize: 13,
    color: "#8e8e93",
    fontWeight: "500"
  },
  hashInfo: {
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#34c759"
  },
  hashInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8
  },
  hashInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#34c759"
  },
  hashInfoText: {
    fontSize: 12,
    color: "#fff",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace"
  }
});