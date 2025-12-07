// app/(tabs)/camera.tsx
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import { useIsFocused, useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const isFocused = useIsFocused();

  // preview state
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Pause camera when screen loses focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (cameraRef.current) {
          try {
            cameraRef.current.pausePreview?.();
          } catch (err) {
            console.log('Camera stop error:', err);
          }
        }
      };
    }, [])
  );

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Loading camera…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>We need your permission to use the camera</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        setPreviewUri(photo.uri);
        setShowPreview(true);
      } else {
        Alert.alert('Error', 'No image captured');
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    }
  };

  const handleRetake = () => {
    setPreviewUri(null);
    setShowPreview(false);
  };

  const handleConfirm = () => {
    if (!previewUri) return;

    const imageKey = `image_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    router.push({
      pathname: '/watermarkeditor',
      params: {
        imageUri: previewUri,
        imageKey,
        captureTimestamp: new Date().toISOString(),
      },
    });

    setShowPreview(false);
  };

  return (
    <View style={styles.container}>
      {/* Camera live view (when not previewing) */}
      {isFocused && !showPreview && (
        <CameraView
          style={styles.camera}
          facing={facing}
          ref={cameraRef}
        />
      )}

      {/* Preview overlay (after capture) */}
      {showPreview && previewUri && (
        <View style={styles.previewOverlay}>
          <Image source={{ uri: previewUri }} style={styles.previewImage} />
          <View style={styles.previewButtons}>
            <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
              <MaterialIcons name="refresh" size={24} color="#ef4444" />
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <MaterialIcons name="check" size={24} color="#ffffff" />
              <Text style={styles.confirmText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bottom controls (only in live camera mode) */}
      {!showPreview && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
            <MaterialIcons name="flip-camera-ios" size={32} color="white" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>

          <View style={styles.placeholder} />
        </View>
      )}

      {/* Optional: simple info for web if camera has issues */}
      {Platform.OS === 'web' && !showPreview && (
        <View style={styles.webBanner}>
          <Text style={styles.webBannerText}>
            If camera preview is blank in the browser, test on a physical device using Expo Go.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: '#fff',
    fontSize: 16,
    paddingHorizontal: 20,
  },
  permissionButton: {
    marginTop: 16,
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'center',
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  flipButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'white',
  },
  placeholder: {
    width: 60,
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  previewImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 140,
    resizeMode: 'contain',
  },
  previewButtons: {
    flexDirection: 'row',
    gap: 24,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(239,68,68,0.85)',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#10b981',
  },
  retakeText: {
    color: '#fff',
    fontWeight: '600',
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
  },
  webBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(15,23,42,0.9)',
  },
  webBannerText: {
    color: '#9ca3af',
    fontSize: 11,
    textAlign: 'center',
  },
});
