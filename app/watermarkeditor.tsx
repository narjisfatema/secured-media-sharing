import React, { useState, useRef } from "react";
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
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { saveToBlockchain } from '@/services/blockchain';
import { saveToGallery } from '@/services/gallery';

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function WatermarkEditorScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const imageUrl = params.imageUri as string;
  
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isSaving, setIsSaving] = useState(false);
  
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        
        const maxX = containerSize.width - 120;
        const maxY = containerSize.height - 60;
        
        let newX = (pan.x as any)._value;
        let newY = (pan.y as any)._value;
        
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
        
        Animated.spring(pan, {
          toValue: { x: newX, y: newY },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const watermarkData = {
    timestamp: new Date().toISOString(),
    hash: `BSV-${Date.now()}`,
    owner: "User ID",
    position: { x: 0, y: 0 }, // Will be updated on save
  };

  const handleLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
    pan.setValue({ x: (width - 120) / 2, y: (height - 60) / 2 });
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Get final watermark position
      const position = {
        x: (pan.x as any)._value,
        y: (pan.y as any)._value,
      };
      
      watermarkData.position = position;
      
      // Save to blockchain
      const blockchainResult = await saveToBlockchain({
        imageUri: imageUrl,
        watermarkData,
      });
      
      // Save to device gallery
      await saveToGallery(imageUrl, watermarkData);
      
      Alert.alert(
        'Success',
        'Image saved with blockchain verification!',
        [
          {
            text: 'View in Gallery',
            onPress: () => router.push('/viewer'),
          },
          {
            text: 'Take Another',
            onPress: () => router.push('/camera'),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('Error', 'Failed to save image');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel',
      'Discard this image?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', onPress: () => router.back() },
      ]
    );
  };

  if (!imageUrl) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No image selected</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Position Watermark</Text>
        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
            disabled={isSaving}
          >
            <MaterialIcons name="close" size={20} color="#ef4444" />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <MaterialIcons name="save" size={20} color="white" />
                <Text style={styles.saveButtonText}>Save to Blockchain</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.imageContainer} onLayout={handleLayout}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
          
          {containerSize.width > 0 && (
            <Animated.View
              style={[
                styles.watermark,
                {
                  transform: [{ translateX: pan.x }, { translateY: pan.y }],
                },
              ]}
              {...panResponder.panHandlers}
            >
              <View style={styles.watermarkContent}>
                <View style={styles.watermarkHeader}>
                  <MaterialIcons name="shield" size={16} color="#3b82f6" />
                  <Text style={styles.watermarkHash}>{watermarkData.hash}</Text>
                </View>
                <Text style={styles.watermarkTimestamp}>
                  {new Date(watermarkData.timestamp).toLocaleString()}
                </Text>
              </View>
            </Animated.View>
          )}
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <MaterialIcons name="shield" size={20} color="#3b82f6" />
          <Text style={styles.infoTitle}>Watermark Information</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Blockchain Hash:</Text>
          <Text style={styles.infoValueHash}>{watermarkData.hash}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Timestamp:</Text>
          <Text style={styles.infoValue}>
            {new Date(watermarkData.timestamp).toLocaleString()}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Owner:</Text>
          <Text style={styles.infoValue}>{watermarkData.owner}</Text>
        </View>
        
        <Text style={styles.infoDescription}>
          Drag the watermark to position it. This metadata will be verifiable on the BSV blockchain.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.5)",
  },
  cancelButtonText: {
    color: "#ef4444",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#3b82f6",
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
  },
  card: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    marginBottom: 16,
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#1e293b",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  watermark: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.5)",
  },
  watermarkContent: {
    minWidth: 120,
  },
  watermarkHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  watermarkHash: {
    fontSize: 11,
    fontFamily: "monospace",
    color: "#3b82f6",
    fontWeight: "bold",
  },
  watermarkTimestamp: {
    fontSize: 9,
    color: "#94a3b8",
  },
  infoCard: {
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  infoLabel: {
    fontSize: 14,
    color: "#94a3b8",
  },
  infoValue: {
    fontSize: 14,
    color: "#fff",
  },
  infoValueHash: {
    fontSize: 14,
    fontFamily: "monospace",
    color: "#3b82f6",
  },
  infoDescription: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 8,
    lineHeight: 18,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 16,
    textAlign: "center",
    marginTop: 50,
  },
});